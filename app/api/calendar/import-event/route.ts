import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    const supabase = createClient();

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
    // Format attendu: "#NomClient #TéléphoneClient #Intervention\ndescription détaillée"
    // Exemple: "#Delmou #0663589521 #Intervention\nintervention moteur de chauffe"
    let clientName = '';
    let clientPhone = '';
    let interventionDescription = '';

    if (description) {
      const lines = description.split('\n');
      const firstLine = lines[0] || '';
      const hashtags = firstLine.match(/#(\w+)/g) || [];

      // Extraire le nom (premier hashtag qui n'est pas un numéro)
      for (const tag of hashtags) {
        const value = tag.replace('#', '');
        if (!/^\d+$/.test(value) && value.toLowerCase() !== 'intervention') {
          clientName = value;
          break;
        }
      }

      // Extraire le téléphone (hashtag qui est un numéro)
      for (const tag of hashtags) {
        const value = tag.replace('#', '');
        if (/^\d{10}$/.test(value)) {
          clientPhone = value;
          break;
        }
      }

      // Description = tout après la première ligne
      interventionDescription = lines.slice(1).join('\n').trim() || summary;
    }

    // Fallback: utiliser le summary si pas de hashtags dans description
    if (!clientName && summary) {
      clientName = summary.split('-')[0].trim().replace(/^(M\.|Mme|Mr)\s+/i, '').trim();
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

      const { data: newClient, error: clientError } = await supabase
        .schema('piscine_delmas_public')
        .from('clients')
        .insert({
          type: 'particulier',
          first_name: '', // Pas de prénom depuis Google Calendar
          last_name: clientName,
          email: null,
          phone: null,
          mobile: clientPhone || null,
          address,
          postal_code,
          city,
          notes: `Créé depuis Google Calendar le ${new Date().toLocaleDateString('fr-FR')}`,
        })
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
    const scheduledDate = start.dateTime || start.date;

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

    return NextResponse.json({
      success: true,
      message: '✅ Intervention importée depuis Google Calendar',
      intervention: {
        id: newIntervention.id,
        reference: newIntervention.reference,
        client_id: clientId,
      },
    });

  } catch (error: any) {
    console.error('❌ Erreur import-event:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
