import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // 🔐 Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    // 📋 Récupérer l'intervention
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
      console.error('❌ Intervention non trouvée:', params.id, interventionError);
      return NextResponse.json(
        { success: false, error: 'Intervention introuvable' },
        { status: 404 }
      );
    }

    const client = intervention.client as any;

    if (!client?.email) {
      console.warn('⚠️ Email client non renseigné pour intervention:', params.id);
      return NextResponse.json(
        { success: false, error: 'Email client non renseigné' },
        { status: 400 }
      );
    }

    // 🔍 Vérifier si l'email a déjà été envoyé avec succès
    const { data: existingEmail } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .select('id, status')
      .eq('intervention_id', params.id)
      .eq('status', 'sent')
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email de confirmation déjà envoyé' },
        { status: 400 }
      );
    }

    // Construire le nom du client
    const clientName = client.type === 'professionnel' && client.company_name
      ? client.company_name
      : `${client.first_name} ${client.last_name}`;

    console.log('📧 Préparation email pour:', clientName, client.email);

    const emailSubject = `✅ Intervention ${intervention.reference} terminée`;

    // 📝 Créer l'enregistrement email_logs avec status='pending'
    const { data: emailLog, error: emailLogError } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .insert({
        intervention_id: params.id,
        client_id: client.id,
        recipient_email: client.email,
        subject: emailSubject,
        status: 'pending',
        sent_by: user.id
      })
      .select()
      .single();

    if (emailLogError) {
      console.error('❌ Erreur création email_log:', emailLogError);
      return NextResponse.json(
        { success: false, error: 'Erreur création log email' },
        { status: 500 }
      );
    }

    // Template email (votre template est parfait !)
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
        subject: emailSubject,
        clientName
      });

      // ✅ Marquer comme "envoyé" en mode dev
      await supabase
        .schema('piscine_delmas_public')
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          body: `Email simulé (dev mode) pour ${clientName}`
        })
        .eq('id', emailLog.id);

      return NextResponse.json({
        success: true,
        message: 'Email simulé (dev mode)',
        recipient: client.email,
        email_sent: true
      });
    }

    // Production : envoyer via Resend
    console.log('📧 Envoi email via Resend...');

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Piscine Delmas <noreply@piscine-delmas.fr>',
          to: client.email,
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('❌ Erreur Resend:', emailResponse.status, errorText);

        // ❌ Marquer comme failed
        await supabase
          .schema('piscine_delmas_public')
          .from('email_logs')
          .update({
            status: 'failed',
            error_message: `Resend error: ${emailResponse.status} - ${errorText}`,
            body: emailHtml
          })
          .eq('id', emailLog.id);

        throw new Error(`Échec envoi email: ${emailResponse.status}`);
      }

      const emailResult = await emailResponse.json();
      console.log('✅ Email envoyé:', emailResult);

      // ✅ Marquer comme sent avec succès
      await supabase
        .schema('piscine_delmas_public')
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          gmail_message_id: emailResult.id,
          body: emailHtml
        })
        .eq('id', emailLog.id);

      return NextResponse.json({
        success: true,
        message: 'Email envoyé avec succès',
        recipient: client.email,
        email_sent: true,
        email_id: emailResult.id
      });

    } catch (emailError: any) {
      console.error('❌ Erreur envoi email:', emailError);

      // ❌ Marquer comme failed
      await supabase
        .schema('piscine_delmas_public')
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: emailError.message || 'Erreur inconnue',
          body: emailHtml
        })
        .eq('id', emailLog.id);

      throw emailError;
    }

  } catch (error: any) {
    console.error('❌ Erreur send-confirmation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur serveur'
      },
      { status: 500 }
    );
  }
}
