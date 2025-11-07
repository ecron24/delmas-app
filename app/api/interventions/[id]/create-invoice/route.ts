// app/api/interventions/[id]/create-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * API Route pour créer manuellement une facture proforma
 * Utilisé quand une intervention est terminée mais qu'aucune facture n'existe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const interventionId = params.id;

    console.log('📋 Création facture proforma pour intervention:', interventionId);

    // 1️⃣ Vérifier que l'intervention existe et est terminée
    const { data: intervention, error: interventionError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('id, status, client_id, subtotal, tax_amount, total_ttc')
      .eq('id', interventionId)
      .single();

    if (interventionError || !intervention) {
      console.error('❌ Intervention introuvable:', interventionError);
      return NextResponse.json(
        { error: 'Intervention introuvable' },
        { status: 404 }
      );
    }

    if (intervention.status !== 'completed') {
      return NextResponse.json(
        { error: 'L\'intervention doit être terminée pour créer une facture' },
        { status: 400 }
      );
    }

    // 2️⃣ Vérifier si une facture existe déjà
    const { data: existingInvoice } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('id, invoice_number, invoice_type')
      .eq('intervention_id', interventionId)
      .maybeSingle();

    if (existingInvoice) {
      console.log('ℹ️ Facture déjà existante:', existingInvoice.invoice_number);
      return NextResponse.json({
        success: true,
        message: 'Facture déjà existante',
        invoice: existingInvoice,
      });
    }

    // 3️⃣ Générer le numéro de facture proforma
    const year = new Date().getFullYear().toString();

    // Trouver le prochain numéro séquentiel pour l'année
    const { data: lastInvoice } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `PRO-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNumber = 1;
    if (lastInvoice?.invoice_number) {
      // Extraire le numéro de la dernière facture (ex: PRO-2025-0042 → 42)
      const match = lastInvoice.invoice_number.match(/PRO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const invoiceNumber = `PRO-${year}-${nextNumber.toString().padStart(4, '0')}`;

    console.log('🔢 Numéro de facture généré:', invoiceNumber);

    // 4️⃣ Créer la facture proforma
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: newInvoice, error: invoiceError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .insert({
        intervention_id: interventionId,
        client_id: intervention.client_id,
        invoice_number: invoiceNumber,
        invoice_type: 'proforma',
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate,
        subtotal_ht: intervention.subtotal || 0,
        tax_amount: intervention.tax_amount || 0,
        total_ttc: intervention.total_ttc || 0,
      })
      .select('id, invoice_number, invoice_type')
      .single();

    if (invoiceError || !newInvoice) {
      console.error('❌ Erreur création facture:', invoiceError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la facture', details: invoiceError },
        { status: 500 }
      );
    }

    console.log('✅ Facture proforma créée:', newInvoice.invoice_number);

    // 5️⃣ Copier les lignes depuis intervention_items
    const { data: interventionItems } = await supabase
      .schema('piscine_delmas_public')
      .from('intervention_items')
      .select('product_name, quantity, unit_price, subtotal')
      .eq('intervention_id', interventionId);

    if (interventionItems && interventionItems.length > 0) {
      const invoiceItems = interventionItems.map(item => ({
        invoice_id: newInvoice.id,
        description: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tva_rate: 20, // TVA par défaut
        total: item.subtotal || (item.quantity * item.unit_price),
      }));

      const { error: itemsError } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('⚠️ Erreur copie items:', itemsError);
      } else {
        console.log(`✅ ${invoiceItems.length} lignes copiées dans la facture`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Facture proforma créée avec succès',
      invoice: newInvoice,
    });

  } catch (error: any) {
    console.error('❌ Erreur create-invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
