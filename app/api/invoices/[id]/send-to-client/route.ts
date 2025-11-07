import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCompanySettings } from '@/lib/actions/company-settings';
import { generateInvoiceHTML } from '@/lib/pdf/generate-invoice-html';
import { generateInvoicePDF } from '@/lib/pdf/generate-invoice-pdf';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🚀 Déclenchement envoi facture ID:', params.id);

    const supabase = createClient();

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Non authentifié'
      }, { status: 401 });
    }

    if (!params.id) {
      return NextResponse.json({
        success: false,
        error: 'ID de facture manquant'
      }, { status: 400 });
    }

    // 🏢 Charger les paramètres de l'entreprise
    const { data: companySettings } = await getCompanySettings();
    if (!companySettings) {
      return NextResponse.json({
        success: false,
        error: 'Configuration entreprise manquante'
      }, { status: 500 });
    }

    // Récupérer la facture (lecture seule)
    const { data: invoice, error: invoiceError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Facture introuvable:', invoiceError);
      return NextResponse.json({
        success: false,
        error: 'Facture introuvable'
      }, { status: 404 });
    }

    // Vérifier que c'est une facture finale
    if (invoice.invoice_type !== 'final') {
      return NextResponse.json({
        success: false,
        error: 'Seules les factures finales peuvent être envoyées au client'
      }, { status: 400 });
    }

    // Récupérer le client (avec toutes les données nécessaires)
    const { data: client, error: clientError } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('first_name, last_name, company_name, email, address, postal_code, city, type')
      .eq('id', invoice.client_id)
      .single();

    if (clientError || !client) {
      console.error('❌ Client introuvable:', clientError);
      return NextResponse.json({
        success: false,
        error: 'Client introuvable'
      }, { status: 404 });
    }

    // Récupérer l'intervention
    const { data: intervention, error: interventionError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('reference, scheduled_date, description, labor_hours, labor_rate, travel_fee')
      .eq('id', invoice.intervention_id)
      .single();

    if (interventionError || !intervention) {
      console.error('❌ Intervention introuvable:', interventionError);
      return NextResponse.json({
        success: false,
        error: 'Intervention introuvable'
      }, { status: 404 });
    }

    // Récupérer les items de la facture
    const { data: invoiceItems, error: itemsError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    // ✅ VÉRIFIER SI DÉJÀ ENVOYÉ (AVANT DE GÉNÉRER LE PDF)
    const { data: existingEmail } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .select('id, sent_at')
      .eq('invoice_id', invoice.id)
      .eq('status', 'sent')
      .maybeSingle();

    if (existingEmail) {
      console.log('⚠️ Facture déjà envoyée le:', existingEmail.sent_at);
      return NextResponse.json({
        success: false,
        error: 'Facture déjà envoyée au client'
      }, { status: 400 });
    }

    // 🏷️ Déterminer le nom du client pour le fichier PDF
    const clientName = (client.company_name || `${client.first_name} ${client.last_name}`).trim();

    // 1️⃣ GÉNÉRER LE PDF
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

    // ✅ Passer le nom du client à generateInvoicePDF
    const pdfBuffer = await generateInvoicePDF(invoiceHTML, invoice.invoice_number, clientName);

    // 2️⃣ UPLOAD PDF SUR SUPABASE STORAGE
    // 🏷️ Nettoyer le nom du client pour le nom de fichier
    const sanitizedClientName = clientName
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .replace(/\s+/g, '_')
      .trim();

    const fileName = `Facture_${invoice.invoice_number}_${sanitizedClientName}.pdf`;
    const filePath = `invoices/${fileName}`;

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      console.error('❌ Tentative d\'upload d\'un fichier non-PDF');
      return NextResponse.json({
        success: false,
        error: 'Seuls les fichiers PDF sont autorisés'
      }, { status: 400 });
    }

    console.log('📤 Upload PDF sur Supabase Storage:', filePath);

    const { error: uploadError } = await supabase
      .storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur upload Supabase Storage:', uploadError);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'upload du PDF'
      }, { status: 500 });
    }

    console.log('✅ PDF uploadé sur Supabase Storage:', filePath);

    // 3️⃣ GÉNÉRER UNE URL SIGNÉE POUR LE PDF (valide 1 heure)
    console.log('🔗 Génération URL signée pour:', filePath);

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('documents')
      .createSignedUrl(filePath, 3600);

    console.log('DEBUG signedUrlData:', signedUrlData);
    console.log('DEBUG signedUrlError:', signedUrlError);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('❌ Erreur génération URL signée:', signedUrlError);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la génération du lien de téléchargement'
      }, { status: 500 });
    }

    const pdfSignedUrl = signedUrlData.signedUrl;
    console.log('DEBUG pdfSignedUrl:', pdfSignedUrl);
    console.log('✅ URL signée générée (valide 1h):', pdfSignedUrl);

    // 4️⃣ SIMULER L'ENVOI EMAIL (Resend désactivé)
    console.log('📧 Email simulé pour:', client.email);
    console.log('📄 Facture:', invoice.invoice_number);
    console.log('👤 Client:', clientName);
    console.log('🔧 Intervention:', intervention.reference);

    // 5️⃣ DÉCLENCHER LE WORKFLOW N8N POUR GOOGLE DRIVE
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_INVOICE_TO_DRIVE;
    let n8nSuccess = false;
    let driveUrl = null;

    if (n8nWebhookUrl) {
      try {
        console.log('🔄 Appel webhook n8n pour Google Drive...');

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-Auth': process.env.N8N_WEBHOOK_AUTH_HEADER_VALUE || '',
          },
          body: JSON.stringify({
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            client_name: clientName,
            client_email: client.email,
            intervention_ref: intervention.reference,
            intervention_date: intervention.scheduled_date,
            pdf_url: pdfSignedUrl,
            pdf_filename: fileName,
            total_ttc: invoice.total_ttc,
            issue_date: invoice.issue_date,
            action: 'send_to_client'
          }),
        });

        if (n8nResponse.ok) {
          try {
            const n8nData = await n8nResponse.json();
            console.log('✅ Webhook n8n appelé avec succès:', n8nData);
            n8nSuccess = true;
            driveUrl = n8nData.drive_url || null;
          } catch (parseError) {
            console.log('✅ Webhook n8n appelé (réponse non-JSON)');
            n8nSuccess = true;
            driveUrl = null;
          }

          // 6️⃣ METTRE À JOUR LA FACTURE AVEC L'URL GOOGLE DRIVE
          if (driveUrl) {
            await supabase
              .schema('piscine_delmas_compta')
              .from('invoices')
              .update({
                google_drive_url: driveUrl,
                google_drive_uploaded_at: new Date().toISOString()
              })
              .eq('id', invoice.id);

            console.log('✅ URL Google Drive enregistrée:', driveUrl);
          }
        } else {
          console.warn('⚠️ Erreur webhook n8n:', await n8nResponse.text());
        }
      } catch (n8nError: any) {
        console.warn('⚠️ Erreur appel n8n:', n8nError.message);
      }
    } else {
      console.warn('⚠️ N8N_WEBHOOK_INVOICE_TO_DRIVE non configuré');
    }

    // 7️⃣ ENREGISTRER L'ACTION DANS LES LOGS
    const { error: logError } = await supabase
      .schema('piscine_delmas_public')
      .from('email_logs')
      .insert({
        invoice_id: invoice.id,
        intervention_id: invoice.intervention_id,
        recipient_email: client.email,
        email_type: 'invoice_final',
        subject: `Facture finale - ${invoice.invoice_number}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        notes: `Envoi simulé - PDF généré et uploadé - n8n ${n8nSuccess ? 'succès' : 'échec'}${driveUrl ? ' - Drive: ' + driveUrl : ''}`
      });

    if (logError) {
      console.error('❌ Erreur log email:', logError);
    }

    console.log('✅ Processus déclenché avec succès');

    return NextResponse.json({
      success: true,
      message: 'Facture générée, uploadée et classement Drive déclenché',
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        sent_to: client.email,
        client_name: clientName,
        intervention_ref: intervention.reference,
        pdf_uploaded: true,
        pdf_url: pdfSignedUrl,
        pdf_filename: fileName,
        n8n_triggered: n8nSuccess,
        drive_url: driveUrl,
        mode: 'simulation'
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur déclenchement envoi:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    }, { status: 500 });
  }
}
