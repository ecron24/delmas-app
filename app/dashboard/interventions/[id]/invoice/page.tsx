'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Save, Send, Download, Plus, Trash2, CheckCircle } from 'lucide-react';
import { getCompanySettings, CompanySettings } from '@/lib/actions/company-settings';

type InvoiceItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  status: string;
  proforma_validated_at: string | null;
  proforma_validated_by: string | null;
  created_at: string;
  client: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    email: string;
    address: string;
    postal_code: string;
    city: string;
    type: string;
  };
  intervention: {
    reference: string;
    scheduled_date: string;
    description: string;
    duration: number;
    hourly_rate: number;
    travel_fees: number;
    intervention_types_junction: Array<{ intervention_type: string }>;
  };
  invoice_items: InvoiceItem[];
};

export default function InvoiceEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInvoice();
    loadCompanySettings();
  }, [params.id]);

  const loadCompanySettings = async () => {
    const { data } = await getCompanySettings();
    if (data) {
      setCompanySettings(data);
    }
  };

  const loadInvoice = async () => {
    const supabase = createClient();

    // 1️⃣ RECHERCHE FACTURE
    let { data: allInvoices } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('*')
      .eq('intervention_id', params.id);

    // Si pas trouvée par intervention_id, chercher par ID direct
    if (!allInvoices || allInvoices.length === 0) {
      const { data: directInvoice } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .select('*')
        .eq('id', params.id)
        .single();

      if (directInvoice) allInvoices = [directInvoice];
    }

    if (!allInvoices || allInvoices.length === 0) {
      setLoading(false);
      return;
    }

    const latestInvoice = allInvoices[0];

    // 2️⃣ RÉCUPÉRATION INTERVENTION
    const { data: intervention } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('*')
      .eq('id', latestInvoice.intervention_id)
      .single();

    // 3️⃣ RÉCUPÉRATION CLIENT
    const { data: clientData } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('*')
      .eq('id', latestInvoice.client_id)
      .single();

    // 4️⃣ RÉCUPÉRATION ITEMS
    const { data: itemsData } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', latestInvoice.id);

    // 5️⃣ ASSEMBLAGE FINAL
    const fullInvoice = {
      ...latestInvoice,
      client: clientData,
      intervention: {
        reference: intervention?.reference || 'N/A',
        scheduled_date: intervention?.scheduled_date || '',
        description: intervention?.description || '',
        // ✅ CORRECTION : Utiliser les VRAIS noms de colonnes BDD
        duration: intervention?.labor_hours || 0,        // labor_hours → duration
        hourly_rate: intervention?.labor_rate || 0,      // labor_rate → hourly_rate
        travel_fees: intervention?.travel_fee || 0,      // travel_fee → travel_fees
        intervention_types_junction: []
      },
      invoice_items: itemsData || []
    };

    setInvoice(fullInvoice as any);
    setIssueDate(latestInvoice.issue_date);
    setDueDate(latestInvoice.due_date);
    setItems(itemsData || []);
    setNotes(latestInvoice.notes || '');
    setLoading(false);
  };

  const calculateTotals = () => {
    if (!invoice) return { subtotal_ht: 0, total_tva: 0, total_ttc: 0 };

    const laborHT = (invoice.intervention.duration || 0) * (invoice.intervention.hourly_rate || 0);
    const laborTVA = laborHT * 0.20;

    const travelHT = invoice.intervention.travel_fees || 0;
    const travelTVA = travelHT * 0.20;

    const productsHT = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const productsTVA = items.reduce((sum, item) => {
      const item_ht = item.quantity * item.unit_price;
      const item_tva = item_ht * (item.tva_rate / 100);
      return sum + item_tva;
    }, 0);

    const subtotal_ht = laborHT + travelHT + productsHT;
    const total_tva = laborTVA + travelTVA + productsTVA;
    const total_ttc = subtotal_ht + total_tva;

    return {
      subtotal_ht,
      total_tva,
      total_ttc,
      labor: { ht: laborHT, tva: laborTVA },
      travel: { ht: travelHT, tva: travelTVA },
      products: { ht: productsHT, tva: productsTVA }
    };
  };

  const totals = calculateTotals();

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        tva_rate: 20,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    const supabase = createClient();

    try {
      const { error: invoiceError } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .update({
          issue_date: issueDate,
          due_date: dueDate,
          subtotal_ht: totals.subtotal_ht,
          total_tva: totals.total_tva,
          tax_amount: totals.total_tva,  // ✅ Cohérence : tax_amount = total_tva
          total_ttc: totals.total_ttc,
          notes,
          status: 'draft',
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      await supabase
        .schema('piscine_delmas_compta')
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tva_rate: item.tva_rate,
        }));

        const { error: itemsError } = await supabase
          .schema('piscine_delmas_compta')
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      alert('✅ Facture sauvegardée !');
      await loadInvoice();

    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!invoice) return;

    if (!confirm('🔒 Valider cette facture ?\n\n✅ Elle deviendra une FACTURE FINALE\n📋 Elle apparaîtra dans "Factures en attente"\n🚫 Elle ne pourra plus être modifiée')) {
      return;
    }

    setSaving(true);

    try {
      await handleSave();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .update({
          status: 'sent',
          invoice_type: 'final',
          proforma_validated_at: new Date().toISOString(),
          proforma_validated_by: user?.id,
        })
        .eq('id', invoice.id);

      if (!error) {
        alert('✅ Facture finale créée !\n\n📋 Redirection vers "Factures en attente"');
        router.push('/dashboard/invoices?filter=sent');
      } else {
        throw new Error('Erreur lors de la validation');
      }

    } catch (error: any) {
      console.error('Erreur validation:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!invoice) return;

    if (!confirm('📧 Envoyer la facture finale au client ?\n\n✅ Email avec PDF en pièce jointe\n📋 Statut passera à "Envoyée"')) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send-to-client`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✅ Facture envoyée au client avec succès !');
        setInvoice(prev => prev ? { ...prev, status: 'sent' } : null);
      } else {
        alert(`❌ Erreur lors de l'envoi: ${data.error || 'Erreur inconnue'}`);
      }

    } catch (error: any) {
      console.error('Erreur envoi facture:', error);
      alert(`❌ Erreur de connexion: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">❌ Aucune facture trouvée</p>
          <p className="text-sm text-gray-600 mt-2">
            La facture sera créée automatiquement quand l'intervention sera terminée.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  const isEditable = invoice && (
    (invoice.invoice_type === 'proforma' && invoice.status === 'draft') ||
    (!invoice.invoice_type && invoice.status === 'draft') ||
    (invoice.status === 'draft')
  );

  const clientName = invoice.client.type === 'professionnel' && invoice.client.company_name
    ? invoice.client.company_name
    : `${invoice.client.first_name} ${invoice.client.last_name}`;

  const typeLabels: Record<string, string> = {
    maintenance: '🔧 Entretien',
    repair: '🛠️ Réparation',
    installation: '⚙️ Installation',
    emergency: '🚨 Urgence',
    diagnostic: '🔍 Diagnostic',
    cleaning: '🧹 Nettoyage',
    winterization: '❄️ Hivernage',
    startup: '🌊 Remise en service',
    other: '📋 Autre',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          <div className="flex gap-3">
            {isEditable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>

                <button
                  onClick={handleValidate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {invoice?.invoice_type === 'final' ? 'Finaliser' : 'Valider'}
                </button>
              </>
            )}

            {invoice && invoice.invoice_type === 'final' && invoice.status !== 'draft' && (
              <button
                onClick={handleSendToClient}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {saving ? 'Envoi...' : 'Envoyer au client'}
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>

        {invoice && (
          <div className={`border-2 rounded-xl p-4 mb-6 ${
            invoice.invoice_type === 'final'
              ? 'bg-blue-50 border-blue-200'
              : invoice.status === 'sent'
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-center gap-2">
              {invoice.invoice_type === 'final' ? (
                <>
                  <FileText className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-800 font-semibold">
                    📋 Facture finale
                    {invoice.proforma_validated_at && ` créée le ${new Date(invoice.proforma_validated_at).toLocaleDateString('fr-FR')}`}
                    {invoice.status === 'sent' ? ' - Envoyée au client' : ' - Prête à envoyer'}
                  </p>
                </>
              ) : invoice.status === 'sent' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-semibold">
                    ✅ Facture validée
                    {invoice.proforma_validated_at && ` le ${new Date(invoice.proforma_validated_at).toLocaleDateString('fr-FR')}`}
                    - Lecture seule
                  </p>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 text-yellow-600" />
                  <p className="text-yellow-800 font-semibold">
                    📝 Facture en cours d'édition - Brouillon
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
                {invoice.invoice_type === 'final'
                  ? 'FACTURE FINALE'
                  : invoice.invoice_type === 'proforma'
                    ? 'FACTURE PROFORMA'
                    : 'FACTURE'
                }
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-mono">{invoice.invoice_number}</p>
              <p className="text-xs sm:text-sm text-gray-600">Intervention : {invoice.intervention.reference}</p>

              <div className="flex flex-wrap gap-1 mt-2">
                {invoice.intervention.intervention_types_junction?.map((t: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {typeLabels[t.intervention_type] || t.intervention_type}
                  </span>
                ))}
              </div>
            </div>

            <div className="sm:text-right">
              <p className="font-bold text-base sm:text-lg text-gray-900 mb-1">
                {companySettings?.company_name || 'PISCINE DELMAS'}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">{companySettings?.company_address || 'Le bois Simon (les linguettes)'}</p>
              <p className="text-xs sm:text-sm text-gray-600">
                {companySettings?.company_postal_code || '24370'} {companySettings?.company_city || 'Pechs de l\'esperance'}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">SIRET: {companySettings?.siret || '483 093 118'}</p>
              <p className="text-xs sm:text-sm text-gray-600">TVA: {companySettings?.tva_number || 'FR38483093118'}</p>
              {companySettings?.legal_form && companySettings?.rcs_number && (
                <p className="text-xs sm:text-sm text-gray-600">
                  {companySettings.legal_form} - RCS {companySettings.rcs_city || ''} {companySettings.rcs_number}
                </p>
              )}
              {companySettings?.share_capital && (
                <p className="text-xs sm:text-sm text-gray-600">Capital: {companySettings.share_capital}</p>
              )}
              <p className="text-xs sm:text-sm text-gray-600 mt-2">📧 {companySettings?.email || 'contact@piscine-delmas.fr'}</p>
              <p className="text-xs sm:text-sm text-gray-600">📞 {companySettings?.phone || '06 87 84 24 99'}</p>
              {companySettings?.website && (
                <p className="text-xs sm:text-sm text-gray-600">🌐 {companySettings.website}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-2 sm:mb-3">FACTURÉ À</h3>
              <p className="font-semibold text-sm sm:text-base text-gray-900">{clientName}</p>
              <p className="text-xs sm:text-sm text-gray-600">{invoice.client.address}</p>
              <p className="text-xs sm:text-sm text-gray-600">
                {invoice.client.postal_code} {invoice.client.city}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">📧 {invoice.client.email}</p>
            </div>

            <div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date d'émission
                </label>
                {isEditable ? (
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-gray-900 font-semibold">
                    {new Date(issueDate).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date d'échéance
                </label>
                {isEditable ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-gray-900 font-semibold">
                    {new Date(dueDate).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {invoice.intervention.description && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">📝 Travaux réalisés</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {invoice.intervention.description}
              </p>
            </div>
          )}

          <div className="mb-6 sm:mb-8 overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm">Désignation</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm w-16 sm:w-24">Qté</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm w-20 sm:w-32">P.U. HT</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm w-16 sm:w-24">TVA</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-bold text-xs sm:text-sm w-20 sm:w-32">Total HT</th>
                  {isEditable && <th className="w-10 sm:w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {invoice.intervention.duration > 0 && (
                  <tr className="border-b border-gray-200 bg-blue-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-blue-900 text-xs sm:text-sm">
                      🛠️ Main d'œuvre
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">{invoice.intervention.duration}h</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{invoice.intervention.hourly_rate}€</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">20%</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-blue-900 text-xs sm:text-sm">
                      {totals.labor?.ht.toFixed(2)}€
                    </td>
                    {isEditable && <td></td>}
                  </tr>
                )}

                {invoice.intervention.travel_fees > 0 && (
                  <tr className="border-b border-gray-200 bg-orange-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-orange-900 text-xs sm:text-sm">
                      🚗 Frais de déplacement
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">1</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm">{invoice.intervention.travel_fees}€</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center text-xs sm:text-sm">20%</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-orange-900 text-xs sm:text-sm">
                      {totals.travel?.ht.toFixed(2)}€
                    </td>
                    {isEditable && <td></td>}
                  </tr>
                )}

                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      {isEditable ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                          placeholder="Description..."
                        />
                      ) : (
                        <span className="text-gray-900 text-xs sm:text-sm">{item.description}</span>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                      {isEditable ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900 text-xs sm:text-sm">{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded text-right focus:border-blue-500 focus:outline-none"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900 text-xs sm:text-sm">{item.unit_price.toFixed(2)}€</span>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                      {isEditable ? (
                        <select
                          value={item.tva_rate}
                          onChange={(e) => handleUpdateItem(index, 'tva_rate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="5.5">5.5%</option>
                          <option value="10">10%</option>
                          <option value="20">20%</option>
                        </select>
                      ) : (
                        <span className="text-gray-900 text-xs sm:text-sm">{item.tva_rate}%</span>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-gray-900 text-xs sm:text-sm">
                      {(item.quantity * item.unit_price).toFixed(2)}€
                    </td>
                    {isEditable && (
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {isEditable && (
              <button
                onClick={handleAddItem}
                className="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </button>
            )}
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-96">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">Total HT</span>
                <span className="font-semibold text-gray-900">{totals.subtotal_ht.toFixed(2)}€</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-700">TVA</span>
                <span className="font-semibold text-gray-900">{totals.total_tva.toFixed(2)}€</span>
              </div>

              <div className="flex justify-between py-3 bg-blue-50 px-4 rounded-lg mt-2">
                <span className="text-lg font-bold text-gray-900">TOTAL TTC</span>
                <span className="text-2xl font-bold text-blue-600">
                  {totals.total_ttc.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2">
            <h3 className="font-bold text-gray-900 mb-2">Notes et conditions</h3>
            {isEditable ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={4}
                placeholder="Conditions de paiement, remarques..."
              />
            ) : (
              <div className="text-sm text-gray-600 space-y-3">
                {notes && <p className="whitespace-pre-wrap">{notes}</p>}

                {companySettings?.invoice_footer_notes && (
                  <p className="whitespace-pre-wrap">{companySettings.invoice_footer_notes}</p>
                )}

                {companySettings?.legal_mentions && (
                  <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs whitespace-pre-wrap">{companySettings.legal_mentions}</p>
                  </div>
                )}

                {!notes && !companySettings?.invoice_footer_notes && (
                  <p className="text-gray-400 italic">Configurez vos CGV dans Paramètres → Configuration entreprise</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500">
            <p>
              {companySettings?.company_name || 'Piscine Delmas'} - SIRET {companySettings?.siret || '483 093 118'} - TVA {companySettings?.tva_number || 'FR38483093118'}
            </p>
            <p className="mt-1">Document généré le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white, .bg-white * {
            visibility: visible;
          }
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
