// api/calendar/import-event/route.ts
import { createWebhookClient } from '@/lib/supabase/webhook';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ Fonction utilitaire pour parser les dates Google Calendar
 */
function parseGoogleCalendarDate(startData: any): string {
  console.log('🔍 Parsing date Google Calendar:', startData);

  let dateString: string;

  // Cas 1: start est directement une string (cas le plus courant depuis n8n)
  if (typeof startData === 'string') {
    dateString = startData;
  }
  // Cas 2: start est un objet Google Calendar standard
  else if (startData?.dateTime) {
    dateString = startData.dateTime;
  }
  else if (startData?.date) {
    // Événement toute la journée : ajouter une heure par défaut
    dateString = `${startData.date}T09:00:00`;
  }
  else {
    console.warn('⚠️ Format de date non reconnu:', startData);
    return new Date().toISOString();
  }

  try {
    const parsedDate = new Date(dateString);

    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Date invalide: ${dateString}`);
    }

    const isoString = parsedDate.toISOString();
    console.log('✅ Date convertie:', {
      input: dateString,
      output: isoString,
      readable: parsedDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });

    return isoString;
  } catch (error) {
    console.error('❌ Erreur parsing date:', error);
    return new Date().toISOString();
  }
}

/**
 * Webhook pour importer des événements depuis Google Calendar
 * Appelé par n8n quand un nouvel événement est créé dans Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Événement Google Calendar reçu:', body);

    // Extraire les données de l'événement Google Calendar
    const {
      id: gcalEventId,
      summary,
      description,
      start,
      end,
      location,
    } = body;

    // Validation basique
    if (!gcalEventId || !summary || !start) {
      return NextResponse.json(
        { error: 'Données incomplètes (id, summary, start requis)' },
        { status: 400 }
      );
    }

    const supabase = createWebhookClient();

    // 1️⃣ Vérifier si cet événement n'a pas déjà été importé
    const { data: existingIntervention } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('id, reference')
      .eq('gcal_event_id', gcalEventId)
      .single();

    if (existingIntervention) {
      console.log('⚠️ Événement déjà importé:', existingIntervention.reference);
      return NextResponse.json({
        success: true,
        message: 'Événement déjà importé',
        intervention: existingIntervention,
      });
    }

    // 2️⃣ Parser le nom du client et téléphone depuis la description
    let clientName = '';
    let clientPhone = '';
    let interventionDescription = '';

    if (description) {
      const lines = description.split('\n');
      const firstLine = lines[0] || '';

      // ✅ Regex améliorée pour gérer les espaces après #
      const hashtags = firstLine.match(/#\s*(\S+)/g) || [];

      console.log('🔍 Hashtags extraits:', hashtags);

      // Extraire le nom (premier hashtag qui n'est pas un numéro)
      for (const tag of hashtags) {
        // ✅ Nettoyer les espaces
        const value = tag.replace(/^#\s*/, '').trim();
        if (!/^\d+$/.test(value) &&
            value.toLowerCase() !== 'intervention' &&
            value.toLowerCase() !== 'devis' &&
            value.toLowerCase() !== 'entretien') {
          clientName = value;
          break;
        }
      }

      // Extraire le téléphone (hashtag qui est un numéro)
      for (const tag of hashtags) {
        // ✅ Nettoyer les espaces
        const value = tag.replace(/^#\s*/, '').trim();
        if (/^\d{10}$/.test(value)) { // Exactement 10 chiffres
          clientPhone = value;
          break;
        }
      }

      // ✅ Fallback : chercher un numéro sans hashtag
      if (!clientPhone) {
        const phoneMatch = firstLine.match(/(\d{10})/);
        if (phoneMatch) {
          clientPhone = phoneMatch[1];
        }
      }

      console.log('📞 Téléphone extrait:', clientPhone);
      console.log('👤 Nom extrait:', clientName);

      // Description = tout après la première ligne
      interventionDescription = lines.slice(1).join('\n').trim() || summary;
    }

    // Fallback: utiliser le summary si pas de hashtags dans description
    if (!clientName && summary) {
      clientName = summary.split(/[-\s]/)[0].trim().replace(/^(M\.|Mme|Mr)\s+/i, '').trim();
    }

    // ✅ S'assurer qu'on a un nom de client
    if (!clientName) {
      clientName = 'Client Inconnu';
    }

    // 3️⃣ Chercher si le client existe déjà
    const { data: existingClients } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('*')
      .ilike('last_name', `%${clientName}%`)
      .limit(5);

    let clientId: string;

    if (existingClients && existingClients.length > 0) {
      // Client trouvé : utiliser le premier résultat
      clientId = existingClients[0].id;
      console.log('✅ Client existant trouvé:', existingClients[0].last_name);
    } else {
      // Client non trouvé : créer un nouveau client
      console.log('🆕 Création d\'un nouveau client:', clientName);

      // Parser l'adresse si disponible dans location
      let address = null;
      let city = null;
      let postal_code = null;

      if (location) {
        const parts = location.split(',').map((p: string) => p.trim());
        if (parts.length >= 1) address = parts[0];
        if (parts.length >= 2) {
          // Essayer d'extraire code postal et ville
          const lastPart = parts[parts.length - 1];
          const postalMatch = lastPart.match(/(\d{5})\s*(.*)/);
          if (postalMatch) {
            postal_code = postalMatch[1];
            city = postalMatch[2] || null;
          } else {
            city = lastPart;
          }
        }
      }

      // ✅ Préparer les données client avec validation téléphone
      const clientData: any = {
        type: 'particulier',
        first_name: '',
        last_name: clientName,
        email: null,
        address,
        postal_code,
        city,
        notes: `Créé depuis Google Calendar le ${new Date().toLocaleDateString('fr-FR')}`,
      };

      // ✅ S'assurer qu'au moins phone OU mobile est renseigné
      if (clientPhone && /^\d{10}$/.test(clientPhone)) {
        // Si le numéro commence par 06/07, c'est un mobile
        if (clientPhone.startsWith('06') || clientPhone.startsWith('07')) {
          clientData.mobile = clientPhone;
          clientData.phone = null;
        } else {
          // Sinon c'est un fixe
          clientData.phone = clientPhone;
          clientData.mobile = null;
        }
      } else {
        // ✅ Fallback : mobile par défaut pour respecter la contrainte
        clientData.mobile = '0000000000'; // Placeholder
        clientData.phone = null;
        console.warn('⚠️ Aucun téléphone valide trouvé, utilisation d\'un placeholder');
      }

      console.log('📋 Données client à insérer:', clientData);

      const { data: newClient, error: clientError } = await supabase
        .schema('piscine_delmas_public')
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientError || !newClient) {
        console.error('❌ Erreur création client:', clientError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du client', details: clientError },
          { status: 500 }
        );
      }

      clientId = newClient.id;
      console.log('✅ Nouveau client créé:', newClient.id);
    }

    // 4️⃣ Générer une référence unique
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const reference = `INT-${year}${month}-${random}`;

    // 5️⃣ Créer l'intervention
    // ✅ Parser correctement la date depuis Google Calendar
    const scheduledDate = parseGoogleCalendarDate(start);

    // Debug final des dates
    console.log('🔍 Debug dates finales:', {
      rawStart: start,
      parsedDate: scheduledDate,
      readableDate: new Date(scheduledDate).toLocaleString('fr-FR')
    });

    const { data: newIntervention, error: interventionError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .insert({
        reference,
        client_id: clientId,
        scheduled_date: scheduledDate, // ✅ Date correctement formatée
        status: 'scheduled',
        description: interventionDescription || description || summary,
        gcal_event_id: gcalEventId,
        created_from: 'gcal',
        synced_to_gcal: true,
        labor_hours: null,
        labor_rate: null,
        travel_fee: 0,
        total_ttc: 0,
      })
      .select()
      .single();

    if (interventionError || !newIntervention) {
      console.error('❌ Erreur création intervention:', interventionError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'intervention', details: interventionError },
        { status: 500 }
      );
    }

    console.log('✅ Intervention créée:', newIntervention.reference);

          // Dans route.ts après création de l'intervention
      return NextResponse.json({
        success: true,
        message: '✅ Intervention importée depuis Google Calendar',
        intervention: {
          id: newIntervention.id,
          reference: newIntervention.reference,
          edit_url: `/dashboard/interventions/${newIntervention.id}/edit`, // ✅ URL d'édition
        },
        debug: {
        extractedPhone: clientPhone,
        extractedName: clientName,
        isNewClient: !existingClients?.length,
        parsedDate: new Date(scheduledDate).toLocaleString('fr-FR'),
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur import-event:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
