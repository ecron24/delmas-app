import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Récupérer l'intervention
    const { data: intervention, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        gcal_event_id,
        reference,
        description,
        client:clients(first_name, last_name)
      `)
      .eq('id', params.id)
      .single();

    if (error || !intervention) {
      return NextResponse.json(
        { error: 'Intervention non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier qu'il y a un event Google Calendar lié
    if (!intervention.gcal_event_id) {
      console.warn(`Intervention ${params.id} n'a pas d'event Google Calendar`);
      return NextResponse.json(
        { success: false, message: 'Pas d\'event Google Calendar lié' },
        { status: 200 }
      );
    }

    // Appeler le webhook n8n
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_VALIDATE_INTERVENTION;

    if (!n8nWebhookUrl) {
      console.error('Variable N8N_WEBHOOK_VALIDATE_INTERVENTION non définie');
      return NextResponse.json(
        { error: 'Configuration webhook manquante' },
        { status: 500 }
      );
    }

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gcal_event_id: intervention.gcal_event_id,
        reference: intervention.reference,
        description: `Intervention terminée pour ${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur webhook n8n:', errorText);
      return NextResponse.json(
        { error: 'Erreur mise à jour Google Calendar', details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: '✅ Google Calendar mis à jour',
      data: result,
    });

  } catch (error: any) {
    console.error('Erreur notify-completion:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
