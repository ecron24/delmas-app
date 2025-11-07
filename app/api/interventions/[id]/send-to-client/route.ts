import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { getCompanySettings } from '@/lib/actions/company-settings';
import { generateInvoiceHTML } from '@/lib/pdf/generate-invoice-html';
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice-pdf';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // 🔐 Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    // 🏢 Charger les paramètres de l'entreprise
    const { data: companySettings } = await getCompanySettings();
    if (!companySettings) {
      return NextResponse.json({ success: false, error: 'Configuration entreprise manquante' }, { status: 500 });
    }

    console.log('📧 Envoi facture:', params.id);

    // 1️⃣ RÉCUPÉRER LA FACTURE COMPLÈTE
    const { data: invoice, error: invoiceError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Facture introuvable:', invoiceError);
      return NextResponse.json({ success: false, error: 'Facture introuvable' }, { status: 404 });
    }

    // 2️⃣ VÉRIFIER QUE C'EST UNE FACTURE FINALE
    if (invoice.invoice_type !== 'final') {
      return NextResponse.json({
        success: false,
        error: 'Seules les factures finales peuvent être envoyées au client'
      }, { status: 400 });
    }

    // 3️⃣ RÉCUPÉRER LES DONNÉES CLIENT ET INTERVENTION
    const { data: client, error: clientError } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('first_name, last_name, company_name, email, address, postal_code, city, type')
      .eq('id', invoice.client_id)
      .single();

    const { data: intervention, error: interventionError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('reference, scheduled_date, description, labor_hours, labor_rate, travel_fee')
      .eq('id', invoice.intervention_id)
      .single();

    // Récupérer les items de la facture
    const { data: invoiceItems, error: itemsError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (clientError || !client || interventionError || !intervention) {
      console.error('❌ Données manquantes:', { clientError, interventionError });
      return NextResponse.json({ success: false, error: 'Données client ou intervention manquantes' }, { status: 400 });
    }

    // 4️⃣ VÉRIFIER SI DÉJÀ ENVOYÉ
    const { data: existingEmail } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .select('id')
      .eq('invoice_id', invoice.id)
      .eq('status', 'sent')
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        error: 'Facture déjà envoyée au client'
      }, { status: 400 });
    }

    // 5️⃣ PRÉPARER L'EMAIL
    const clientName = client.type === 'professionnel' && client.company_name
      ? client.company_name
      : `${client.first_name} ${client.last_name}`;

    const emailSubject = `Facture finale - Intervention ${intervention.reference}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${companySettings.primary_color}, ${companySettings.primary_color}dd); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${companySettings.company_name}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre facture finale est prête</p>
        </div>

        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Bonjour <strong>${clientName}</strong>,
          </p>

          <p style="color: #6b7280; line-height: 1.6;">
            Nous vous remercions pour votre confiance. Vous trouverez ci-joint la facture finale pour l'intervention réalisée.
          </p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">📋 Détails de l'intervention</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Référence :</strong> ${intervention.reference}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Date :</strong> ${new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Facture :</strong> ${invoice.invoice_number}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Montant TTC :</strong> <span style="font-size: 18px; color: #059669; font-weight: bold;">${invoice.total_ttc.toFixed(2)}€</span></p>
          </div>

          ${intervention.description ? `
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af;"><strong>🔧 Travaux réalisés :</strong></p>
              <p style="margin: 10px 0 0 0; color: #1f2937; white-space: pre-wrap;">${intervention.description}</p>
            </div>
          ` : ''}

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>💳 Paiement :</strong> Cette facture est payable dans les 30 jours suivant sa réception.
            </p>
          </div>

          <p style="color: #6b7280; line-height: 1.6; margin-top: 25px;">
            Pour toute question concernant cette facture, n'hésitez pas à nous contacter.
          </p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              📧 <a href="mailto:${companySettings.email}" style="color: ${companySettings.primary_color};">${companySettings.email}</a>
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              📞 ${companySettings.phone}
            </p>
            ${companySettings.website ? `
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              🌐 <a href="${companySettings.website}" style="color: ${companySettings.primary_color};">${companySettings.website}</a>
            </p>
            ` : ''}
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
              ${companySettings.company_name} - ${companySettings.company_address}, ${companySettings.company_postal_code} ${companySettings.company_city}
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin-top: 5px;">
              SIRET: ${companySettings.siret} - TVA: ${companySettings.tva_number}
            </p>
          </div>
        </div>
      </div>
    `;

    // 6️⃣ GÉNÉRER LE PDF avec Gotenberg
    console.log('📄 Génération du PDF pour la facture:', invoice.invoice_number);

    const invoiceHTML = generateInvoiceHTML({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        subtotal_ht: invoice.subtotal_ht,
        total_tva: invoice.total_tva,
        total_ttc: invoice.total_ttc,
        notes: invoice.notes,
      },
      client: {
        first_name: client.first_name,
        last_name: client.last_name,
        company_name: client.company_name,
        email: client.email,
        address: client.address,
        postal_code: client.postal_code,
        city: client.city,
        type: client.type,
      },
      intervention: {
        reference: intervention.reference,
        scheduled_date: intervention.scheduled_date,
        description: intervention.description,
         duration: intervention.labor_hours,
         hourly_rate: intervention.labor_rate,
         travel_fees: intervention.travel_fee,
      },
      items: (invoiceItems || []).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: item.tva_rate,
        total: item.total,
      })),
      companySettings,
    });

    const pdfBuffer = await generateInvoicePDF(invoiceHTML, invoice.invoice_number);

    // 7️⃣ ENVOYER L'EMAIL
    const fromEmail = companySettings.email.includes('@')
      ? `${companySettings.company_name} <${companySettings.email}>`
      : `${companySettings.company_name} <factures@${companySettings.email.split('@')[1] || 'example.com'}>`;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [client.email],
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: `Facture_${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
        }
      ],
    });

    if (emailResponse.error) {
      console.error('❌ Erreur envoi email:', emailResponse.error);
      return NextResponse.json({ success: false, error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 });
    }

    // 8️⃣ METTRE À JOUR LE STATUT DE LA FACTURE
    const { error: updateError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.id
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour facture:', updateError);
      // Email envoyé mais statut pas mis à jour - on continue quand même
    }

    // 9️⃣ ENREGISTRER DANS LES LOGS EMAIL
    const { error: logError } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .insert({
        invoice_id: invoice.id,
        intervention_id: invoice.intervention_id,
        recipient_email: client.email,
        email_type: 'invoice_final',
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_id: emailResponse.data?.id,
        sent_by: user.id
      });

    if (logError) {
      console.error('❌ Erreur log email:', logError);
      // Email envoyé mais log pas créé - on continue quand même
    }

    console.log('✅ Facture envoyée avec succès:', {
      invoiceId: invoice.id,
      clientEmail: client.email,
      resendId: emailResponse.data?.id
    });

    return NextResponse.json({
      success: true,
      message: 'Facture envoyée avec succès',
      data: {
        invoice_id: invoice.id,
        sent_to: client.email,
        resend_id: emailResponse.data?.id
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur envoi facture:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    }, { status: 500 });
  }
}
