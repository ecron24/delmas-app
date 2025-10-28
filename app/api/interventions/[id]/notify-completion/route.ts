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
      console.error('❌ Intervention non trouvée:', params.id, error);
      return NextResponse.json(
        { success: false, error: 'Intervention non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier qu'il y a un event Google Calendar lié
    if (!intervention.gcal_event_id) {
      console.warn(`⚠️ Intervention ${params.id} n'a pas d'event Google Calendar`);
      return NextResponse.json({
        success: true,
        message: 'Pas d\'event Google Calendar lié',
        calendar_updated: false
      });
    }

    // 🎯 URL Webhook n8n (CORRIGÉE)
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_VALIDATE_INTERVENTION;

    if (!n8nWebhookUrl) {
      console.error('❌ Variable N8N_WEBHOOK_VALIDATE_INTERVENTION non définie');
      return NextResponse.json(
        { success: false, error: 'Configuration webhook manquante' },
        { status: 500 }
      );
    }

    // 🔐 Headers avec authentification (CORRIGÉS)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeaderName = process.env.N8N_WEBHOOK_AUTH_HEADER_NAME;
    const authHeaderValue = process.env.N8N_WEBHOOK_AUTH_HEADER_VALUE;

    if (authHeaderName && authHeaderValue) {
      headers[authHeaderName] = authHeaderValue;
    }

    console.log('🚀 Envoi vers n8n:', {
      url: n8nWebhookUrl,
      headers: Object.keys(headers),
      gcal_event_id: intervention.gcal_event_id
    });

    // 📡 Appel du webhook
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gcal_event_id: intervention.gcal_event_id,
        reference: intervention.reference,
        description: `Intervention terminée pour ${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur webhook n8n:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Erreur mise à jour Google Calendar',
        details: errorText,
        status: response.status
      });
    }

    let result;
    try {
      result = await response.json();
      console.log('✅ Réponse n8n:', result);
    } catch (e) {
      result = { raw: await response.text() };
      console.log('✅ Réponse n8n (texte):', result);
    }

    return NextResponse.json({
      success: true,
      message: '✅ Google Calendar mis à jour',
      calendar_updated: true,
      data: result,
    });

  } catch (error: any) {
    console.error('❌ Erreur notify-completion:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
