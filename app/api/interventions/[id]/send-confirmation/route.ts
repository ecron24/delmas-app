import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Récupérer l'intervention
    const { data: intervention, error: interventionError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        id,
        reference,
        scheduled_date,
        description,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          company_name,
          type
        )
      `)
      .eq('id', params.id)
      .single();

    if (interventionError || !intervention) {
      return NextResponse.json(
        { error: 'Intervention introuvable' },
        { status: 404 }
      );
    }

    const client = intervention.client as any;

    if (!client?.email) {
      return NextResponse.json(
        { error: 'Email client non renseigné' },
        { status: 400 }
      );
    }

    // Construire le nom du client
    const clientName = client.type === 'professionnel' && client.company_name
      ? client.company_name
      : `${client.first_name} ${client.last_name}`;

    // Template email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Intervention terminée</h1>
          </div>
          <div class="content">
            <p>Bonjour ${clientName},</p>

            <p>Nous vous confirmons que l'intervention suivante a été réalisée avec succès :</p>

            <ul>
              <li><strong>Référence :</strong> ${intervention.reference}</li>
              <li><strong>Date :</strong> ${new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}</li>
              <li><strong>Description :</strong> ${intervention.description || 'Intervention technique'}</li>
            </ul>

            <p>Vous recevrez prochainement la facture détaillée par email.</p>

            <p>Pour toute question, n'hésitez pas à nous contacter.</p>

            <p>Cordialement,<br><strong>Piscine Delmas</strong></p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Mode dev : logger sans envoyer
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 EMAIL (DEV MODE):', {
        to: client.email,
        subject: `✅ Intervention ${intervention.reference} terminée`,
      });

      return NextResponse.json({
        success: true,
        message: 'Email simulé (dev mode)',
        recipient: client.email,
      });
    }

    // Production : envoyer via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Piscine Delmas <noreply@piscine-delmas.fr>',
        to: client.email,
        subject: `✅ Intervention ${intervention.reference} terminée`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error('Échec envoi email');
    }

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      recipient: client.email,
    });

  } catch (error: any) {
    console.error('Erreur send-confirmation:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
