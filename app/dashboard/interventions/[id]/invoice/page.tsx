'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Save, Send, Download, Plus, Trash2, CheckCircle } from 'lucide-react';

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
    intervention_types_junction: Array<{ intervention_type: string }>;
  };
  invoice_items: InvoiceItem[];
};

export default function InvoiceEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // États éditables
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  const loadInvoice = async () => {
    const supabase = createClient();

    // Récupérer la facture proforma de cette intervention
    const { data, error } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select(`
        *,
        client:client_id(
          first_name,
          last_name,
          company_name,
          email,
          address,
          postal_code,
          city,
          type
        ),
        intervention:intervention_id(
          reference,
          scheduled_date,
          description,
          intervention_types_junction(intervention_type)
        ),
        invoice_items(*)
      `)
      .eq('intervention_id', params.id)
      .eq('invoice_type', 'proforma')
      .single();

    if (error) {
      console.error('Erreur:', error);
      setLoading(false);
      return;
    }

    setInvoice(data as any);
    setIssueDate(data.issue_date);
    setDueDate(data.due_date);
    setItems(data.invoice_items || []);
    setNotes(data.notes || '');
    setLoading(false);
  };

  const calculateTotals = () => {
    const subtotal_ht = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const total_tva = items.reduce((sum, item) => {
      const item_ht = item.quantity * item.unit_price;
      const item_tva = item_ht * (item.tva_rate / 100);
      return sum + item_tva;
    }, 0);
    const total_ttc = subtotal_ht + total_tva;

    return {
      subtotal_ht,
      total_tva,
      total_ttc,
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
      // 1. Mettre à jour la facture
      const { error: invoiceError } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .update({
          issue_date: issueDate,
          due_date: dueDate,
          subtotal_ht: totals.subtotal_ht,
          total_tva: totals.total_tva,
          total_ttc: totals.total_ttc,
          notes,
          status: 'draft',
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // 2. Supprimer anciennes lignes
      await supabase
        .schema('piscine_delmas_compta')
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      // 3. Insérer nouvelles lignes
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
    if (!confirm('🔒 Valider cette facture proforma ? Elle ne pourra plus être modifiée.')) return;

    const supabase = createClient();

    // Récupérer l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .update({
        status: 'validated',
        proforma_validated_at: new Date().toISOString(),
        proforma_validated_by: user?.id,
      })
      .eq('id', invoice.id);

    if (!error) {
      alert('✅ Facture validée !');
      router.push(`/dashboard/interventions/${params.id}`);
    } else {
      alert('❌ Erreur lors de la validation');
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
          <p className="text-red-900 font-bold">❌ Aucune facture proforma trouvée</p>
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

  const isEditable = invoice.status === 'draft';
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
        {/* Header */}
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
                  Valider
                </button>
              </>
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

        {/* Badge statut */}
        {invoice.status === 'validated' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-semibold">
                Facture validée le {new Date(invoice.proforma_validated_at!).toLocaleDateString('fr-FR')} - Lecture seule
              </p>
            </div>
          </div>
        )}

        {/* Facture */}
        <div className="bg-white rounded-xl shadow-lg p-8 print:shadow-none">
          {/* En-tête facture */}
          <div className="flex justify-between mb-8 pb-6 border-b-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">FACTURE PROFORMA</h1>
              <p className="text-sm text-gray-600 font-mono">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-600">Intervention : {invoice.intervention.reference}</p>

              {/* Types d'intervention */}
              <div className="flex flex-wrap gap-1 mt-2">
                {invoice.intervention.intervention_types_junction?.map((t: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {typeLabels[t.intervention_type] || t.intervention_type}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-lg text-gray-900 mb-1">PISCINE DELMAS</p>
              <p className="text-sm text-gray-600">123 Avenue de la Piscine</p>
              <p className="text-sm text-gray-600">31000 Toulouse</p>
              <p className="text-sm text-gray-600">SIRET: 123 456 789 00012</p>
              <p className="text-sm text-gray-600 mt-2">📧 contact@piscine-delmas.fr</p>
              <p className="text-sm text-gray-600">📞 05 61 XX XX XX</p>
            </div>
          </div>

          {/* Client + Dates */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">FACTURÉ À</h3>
              <p className="font-semibold text-gray-900">{clientName}</p>
              <p className="text-sm text-gray-600">{invoice.client.address}</p>
              <p className="text-sm text-gray-600">
                {invoice.client.postal_code} {invoice.client.city}
              </p>
              <p className="text-sm text-gray-600 mt-2">📧 {invoice.client.email}</p>
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

          {/* Description intervention */}
          {invoice.intervention.description && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">📝 Travaux réalisés</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {invoice.intervention.description}
              </p>
            </div>
          )}

          {/* Tableau des lignes */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold">Désignation</th>
                  <th className="text-center py-3 px-4 font-bold w-24">Qté</th>
                  <th className="text-right py-3 px-4 font-bold w-32">P.U. HT</th>
                  <th className="text-center py-3 px-4 font-bold w-24">TVA</th>
                  <th className="text-right py-3 px-4 font-bold w-32">Total HT</th>
                  {isEditable && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {isEditable ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                          placeholder="Description..."
                        />
                      ) : (
                        <span className="text-gray-900">{item.description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isEditable ? (
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:border-blue-500 focus:outline-none"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900">{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:border-blue-500 focus:outline-none"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900">{item.unit_price.toFixed(2)}€</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isEditable ? (
                        <select
                          value={item.tva_rate}
                          onChange={(e) => handleUpdateItem(index, 'tva_rate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="5.5">5.5%</option>
                          <option value="10">10%</option>
                          <option value="20">20%</option>
                        </select>
                      ) : (
                        <span className="text-gray-900">{item.tva_rate}%</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {(item.quantity * item.unit_price).toFixed(2)}€
                    </td>
                    {isEditable && (
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
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
                Ajouter une ligne
              </button>
            )}
          </div>

          {/* Totaux */}
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

          {/* Notes */}
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
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes || 'Aucune note'}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-xs text-gray-500">
            <p>Piscine Delmas - SIRET 123 456 789 00012 - TVA FR12345678900</p>
            <p className="mt-1">Document généré le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
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
