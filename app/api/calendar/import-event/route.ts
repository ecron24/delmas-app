// api/calendar/import-event/route.ts
import { createWebhookClient } from '@/lib/supabase/webhook';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ NOUVELLE FONCTION : Détection automatique DEVIS vs INTERVENTION
 */
function detectEventType(summary: string, description: string | null): 'quote' | 'intervention' {
  const searchText = [summary, description].join(' ').toLowerCase();

  // 🎯 Mots-clés pour DEVIS (prospect)
  const quoteKeywords = [
    'devis', 'quote', 'estimation', 'tarif', 'prix', 'coût', 'budget',
    'visite', 'conseil', 'étude', 'projet', 'construction',
    'nouvelle piscine', 'rdv devis', 'rendez-vous devis'
  ];

  // 🔧 Mots-clés pour INTERVENTION (client)
  const interventionKeywords = [
    'entretien', 'réparation', 'installation', 'urgence',
    'diagnostic', 'nettoyage', 'hivernage', 'remise en service', 'autre', 'contrôle'
  ];

  // Prioriser les interventions (plus spécifiques)
  const hasInterventionKeyword = interventionKeywords.some(keyword =>
    searchText.includes(keyword)
  );

  if (hasInterventionKeyword) {
    return 'intervention';
  }

  // Si mots-clés devis trouvés = devis
  const hasQuoteKeyword = quoteKeywords.some(keyword =>
    searchText.includes(keyword)
  );

  if (hasQuoteKeyword) {
    return 'quote';
  }

  // 🎯 DEFAULT : Analyser les hashtags pour décider
  const hashtags = (description || '').match(/#\s*(\S+)/g) || [];
  const hasInterventionHashtag = hashtags.some(tag => {
    const tagValue = tag.replace(/^#\s*/, '').toLowerCase();
    return interventionKeywords.includes(tagValue);
  });

  return hasInterventionHashtag ? 'intervention' : 'quote';
}

/**
 * ✅ NOUVELLE FONCTION : Récupérer le statut prospect par défaut
 */
async function getDefaultProspectStatusId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .schema('piscine_delmas_public')
    .from('prospect_status')
    .select('id')
    .eq('name', 'Prospect - Devis demandé')
    .single();

  return data?.id || null;
}

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
 * ✅ Fonction utilitaire pour parser l'adresse Google Calendar
 */
function parseLocationData(location: string | null) {
  const result = {
    address: null as string | null,
    postal_code: null as string | null,
    city: null as string | null
  };

  if (!location) return result;

  console.log('📍 Location brute:', location);

  // Différents formats possibles :
  // "178 Rue de l'Ancien Lavoir, 31000 Toulouse, France"
  // "178 Rue de l'Ancien Lavoir, Toulouse"
  // "Toulouse, France"
  // "178 Rue de l'Ancien Lavoir"

  const parts = location.split(',').map((p: string) => p.trim());

  if (parts.length === 1) {
    // Format simple : "Toulouse" ou "178 Rue..."
    const singlePart = parts[0];
    const postalMatch = singlePart.match(/(\d{5})\s+(.+)/);
    if (postalMatch) {
      result.postal_code = postalMatch[1];
      result.city = postalMatch[2];
    } else if (!/^\d/.test(singlePart) && singlePart.toLowerCase() !== 'france') {
      // Si ce n'est pas une adresse et pas "France" → c'est la ville
      result.city = singlePart;
    } else if (/^\d/.test(singlePart)) {
      // Commence par un chiffre → probablement une adresse
      result.address = singlePart;
    }
  } else if (parts.length >= 2) {
    // Premier élément = adresse (sauf si c'est juste une ville)
    const firstPart = parts[0];
    if (/^\d/.test(firstPart) || firstPart.toLowerCase().includes('rue') || firstPart.toLowerCase().includes('avenue') || firstPart.toLowerCase().includes('boulevard')) {
      result.address = firstPart;
    }

    // Analyser les autres parties
    for (let i = (result.address ? 1 : 0); i < parts.length; i++) {
      const part = parts[i];

      // Ignorer "France"
      if (part.toLowerCase() === 'france') continue;

      // Chercher code postal + ville dans la même partie
      const postalMatch = part.match(/(\d{5})\s+(.+)/);
      if (postalMatch) {
        result.postal_code = postalMatch[1];
        result.city = postalMatch[2];
      } else if (!result.postal_code && /^\d{5}$/.test(part)) {
        // Code postal seul
        result.postal_code = part;
      } else if (!result.city && part.toLowerCase() !== 'france') {
        // Ville seule (pas "France")
        result.city = part;
      }
    }

    // Si pas d'adresse mais premier élément pas "France" → c'est la ville
    if (!result.address && !result.city && parts[0].toLowerCase() !== 'france') {
      result.city = parts[0];
    }
  }

  console.log('📍 Parsing résultat:', result);
  return result;
}

/**
 * Webhook pour importer des événements depuis Google Calendar
 * ✅ AMÉLIORATION : Gère automatiquement PROSPECTS (devis) vs CLIENTS (interventions)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Événement Google Calendar reçu:', body);

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

    // 🎯 NOUVELLE LOGIQUE : Détecter le type d'événement
    const eventType = detectEventType(summary, description);
    console.log('🎯 Type détecté:', eventType);

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

    // 2️⃣ Parser client, téléphone, technicien, types depuis la description
    let clientName = '';
    let clientPhone = '';
    let technicianId: string | null = null;
    let interventionType: string | null = null;
    let interventionDescription = '';

    if (description) {
      const lines = description.split('\n');
      const firstLine = lines[0] || '';

      const hashtags = firstLine.match(/#\s*(\S+)/g) || [];
      console.log('🔍 Hashtags extraits:', hashtags);

      // ✅ Correspondance types Google Calendar → Base de données (SANS devis)
      const TYPE_MAPPING: { [key: string]: string } = {
        'entretien': 'maintenance',
        'reparation': 'repair',
        'réparation': 'repair',
        'installation': 'installation',
        'diagnostic': 'diagnostic',
        'urgence': 'emergency',
        'nettoyage': 'maintenance',
        'hivernage': 'maintenance',
        'remise en service': 'maintenance',
        'autre': 'other',
        'contrôle': 'diagnostic'
      };

      // ✅ IDs des techniciens
      const TECHNICIAN_MAPPING: { [key: string]: string } = {
        'stephane': 'a5013451-c24e-4ff4-b50a-e66853e10d50', // Stéphane Delmas
        'christophe': '55159a76-e55d-4964-895e-ee7822954e8e'  // Christophe Martin
      };

      let parsedValues: string[] = [];

      // Extraire et classer tous les hashtags
      for (const tag of hashtags) {
        const value = tag.replace(/^#\s*/, '').trim();
        const valueLower = value.toLowerCase();

        // 📞 Téléphone (10 chiffres)
        if (/^\d{10}$/.test(value)) {
          clientPhone = value;
          console.log('📞 Téléphone trouvé:', value);
        }
        // 🔧 Type d'intervention
        else if (TYPE_MAPPING[valueLower]) {
          interventionType = TYPE_MAPPING[valueLower];
          console.log('🔧 Type trouvé:', valueLower, '→', interventionType);
        }
        // 👨‍🔧 Technicien
        else if (TECHNICIAN_MAPPING[valueLower]) {
          technicianId = TECHNICIAN_MAPPING[valueLower];
          console.log('👨‍🔧 Technicien trouvé:', valueLower, '→', technicianId);
        }
        // 👤 Client (tout ce qui reste)
        else if (valueLower !== 'intervention') {
          parsedValues.push(value);
        }
      }

      // Le premier élément restant = nom du client
      if (parsedValues.length > 0) {
        clientName = parsedValues[0];
        console.log('👤 Client trouvé:', clientName);
      }

      console.log('📋 Résumé extraction:', {
        client: clientName,
        phone: clientPhone,
        technician: technicianId,
        type: interventionType,
        eventType: eventType
      });

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
      // 🎯 CRÉATION CLIENT AVEC LOGIQUE PROSPECT/CLIENT
      console.log('🆕 Création client/prospect:', clientName, 'Type:', eventType);

      // ✅ Parser l'adresse avec la nouvelle fonction
      const { address, postal_code, city } = parseLocationData(location);

      // ✅ Générer des notes appropriées selon le type
      const clientNotes = [];

      if (eventType === 'quote') {
        clientNotes.push('🎯 PROSPECT - Demande de devis');
      } else {
        clientNotes.push('🔧 CLIENT - Intervention programmée');
      }

      if (interventionType) {
        const typeLabels: { [key: string]: string } = {
          'maintenance': 'Entretien',
          'repair': 'Réparation',
          'installation': 'Installation',
          'diagnostic': 'Diagnostic',
          'emergency': 'Urgence',
          'other': 'Autre'
        };
        clientNotes.push(`Type: ${typeLabels[interventionType] || interventionType}`);
      }

      if (technicianId) {
        const technicianNames: { [key: string]: string } = {
          'a5013451-c24e-4ff4-b50a-e66853e10d50': 'Stéphane',
          '55159a76-e55d-4964-895e-ee7822954e8e': 'Christophe'
        };
        clientNotes.push(`Technicien: ${technicianNames[technicianId] || 'Assigné'}`);
      }

      clientNotes.push(`Importé de Google Calendar le ${new Date().toLocaleDateString('fr-FR')}`);

      // ✅ DONNÉES CLIENT AVEC STATUT PROSPECT
      const clientData: any = {
        type: 'particulier',
        first_name: '', // ✅ SIMPLE : toujours vide, non bloquant
        last_name: clientName, // ✅ SIMPLE : tout le nom ici
        email: null,
        address,
        postal_code,
        city,
        notes: clientNotes.join(' • '),
        created_from: 'gcal',

        // ✅ NOUVELLE LOGIQUE PROSPECT
        is_prospect: eventType === 'quote',
        prospect_created_at: eventType === 'quote' ? new Date().toISOString() : null,
        prospect_status_id: eventType === 'quote' ? await getDefaultProspectStatusId(supabase) : null
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
      console.log(`✅ ${eventType === 'quote' ? 'Prospect' : 'Client'} créé:`, newClient.id);
    }

    // 4️⃣ LOGIQUE CONDITIONNELLE : Intervention seulement si pas un devis
    if (eventType === 'intervention') {
      // 4️⃣ Générer une référence unique
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const reference = `INT-${year}${month}-${random}`;

      // 5️⃣ Créer l'intervention AVEC technicien et type
      const scheduledDate = parseGoogleCalendarDate(start);

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
          scheduled_date: scheduledDate,
          status: 'scheduled',
          description: interventionDescription || description || summary,
          gcal_event_id: gcalEventId,
          created_from: 'gcal',
          synced_to_gcal: true,
          assigned_to: technicianId,        // ✅ AJOUTÉ : Technicien assigné
          intervention_type: interventionType, // ✅ AJOUTÉ : Type d'intervention
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

      // ✅ Retour avec debug complet
      return NextResponse.json({
        success: true,
        message: '✅ Intervention importée depuis Google Calendar',
        type: 'intervention',
        intervention: {
          id: newIntervention.id,
          reference: newIntervention.reference,
          edit_url: `/dashboard/interventions/${newIntervention.id}/edit`,
        },
        debug: {
          eventType,
          extractedPhone: clientPhone,
          extractedName: clientName,
          extractedTechnician: technicianId,
          extractedType: interventionType,
          isNewClient: !existingClients?.length,
          parsedDate: new Date(scheduledDate).toLocaleString('fr-FR'),
          parsedLocation: parseLocationData(location),
        }
      });

    } else {
      // 🎯 DEVIS : Pas d'intervention, juste le prospect
      const scheduledDate = parseGoogleCalendarDate(start);

      return NextResponse.json({
        success: true,
        message: '✅ Prospect créé - Devis demandé',
        type: 'quote',
        prospect: {
          client_id: clientId,
          name: clientName,
          phone: clientPhone,
          scheduled_date: scheduledDate,
          view_url: `/dashboard/prospects/${clientId}`,
        },
        debug: {
          eventType,
          extractedPhone: clientPhone,
          extractedName: clientName,
          isNewClient: !existingClients?.length,
          parsedDate: new Date(scheduledDate).toLocaleString('fr-FR'),
          parsedLocation: parseLocationData(location),
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur import-event:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
