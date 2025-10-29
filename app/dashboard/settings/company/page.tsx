'use client';

import { useState, useEffect } from 'react';
import { Building2, FileText, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getCompanySettings, updateCompanySettings, CompanySettings } from '@/lib/actions/company-settings';

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await getCompanySettings();
    if (data) {
      setSettings(data);
      setFormData(data);
    } else if (error) {
      showMessage('error', 'Erreur de chargement: ' + error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    const result = await updateCompanySettings(settings.id, formData);

    if (result.success) {
      showMessage('success', '✅ Paramètres sauvegardés avec succès !');
      await loadSettings();
    } else {
      showMessage('error', '❌ Erreur : ' + result.error);
    }

    setSaving(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateField = (field: keyof CompanySettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Paramètres de l'entreprise</h1>
          <p className="text-gray-600">Configuration white label pour vos factures et documents</p>
        </div>

        {/* Message feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Save button fixed top */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>

        {/* Section 1: Informations générales */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Informations générales</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="PISCINE DELMAS"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="06 00 00 00 00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Site web
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="https://www.example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse *
              </label>
              <input
                type="text"
                value={formData.company_address || ''}
                onChange={(e) => updateField('company_address', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="123 Rue de la Piscine"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Code postal *
              </label>
              <input
                type="text"
                value={formData.company_postal_code || ''}
                onChange={(e) => updateField('company_postal_code', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="31000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                value={formData.company_city || ''}
                onChange={(e) => updateField('company_city', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Toulouse"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Informations légales */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2">
            <FileText className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Informations légales</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SIRET *
              </label>
              <input
                type="text"
                value={formData.siret || ''}
                onChange={(e) => updateField('siret', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="483 093 118"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro TVA *
              </label>
              <input
                type="text"
                value={formData.tva_number || ''}
                onChange={(e) => updateField('tva_number', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="FR38483093118"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Forme juridique
              </label>
              <select
                value={formData.legal_form || ''}
                onChange={(e) => updateField('legal_form', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Sélectionner...</option>
                <option value="EI">Entreprise Individuelle (EI)</option>
                <option value="EIRL">EIRL</option>
                <option value="EURL">EURL</option>
                <option value="SARL">SARL</option>
                <option value="SAS">SAS</option>
                <option value="SASU">SASU</option>
                <option value="SA">SA</option>
                <option value="SNC">SNC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Capital social
              </label>
              <input
                type="text"
                value={formData.share_capital || ''}
                onChange={(e) => updateField('share_capital', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="10 000€"
              />
              <p className="text-xs text-gray-500 mt-1">Uniquement pour SARL, SAS, SA</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numéro RCS
              </label>
              <input
                type="text"
                value={formData.rcs_number || ''}
                onChange={(e) => updateField('rcs_number', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="123 456 789"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ville RCS
              </label>
              <input
                type="text"
                value={formData.rcs_city || ''}
                onChange={(e) => updateField('rcs_city', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Toulouse"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Paramètres de facturation */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2">
            <FileText className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Paramètres de facturation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Préfixe facture *
              </label>
              <input
                type="text"
                value={formData.invoice_prefix || ''}
                onChange={(e) => updateField('invoice_prefix', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="PRO"
              />
              <p className="text-xs text-gray-500 mt-1">Ex: PRO-2025-0001</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Délai de paiement (jours) *
              </label>
              <input
                type="number"
                value={formData.payment_delay_days || 30}
                onChange={(e) => updateField('payment_delay_days', parseInt(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Taux pénalités retard (%) *
              </label>
              <input
                type="number"
                value={formData.late_payment_rate || 12}
                onChange={(e) => updateField('late_payment_rate', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Légal: 3x taux BCE ≈ 12%</p>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Indemnité forfaitaire de recouvrement (€) *
              </label>
              <input
                type="number"
                value={formData.recovery_fee || 40}
                onChange={(e) => updateField('recovery_fee', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum légal: 40€</p>
            </div>
          </div>
        </div>

        {/* Section 4: Mentions légales et CGV */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b-2">
            <FileText className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Conditions de vente et mentions légales</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note de bas de page (facture) *
              </label>
              <textarea
                value={formData.invoice_footer_notes || ''}
                onChange={(e) => updateField('invoice_footer_notes', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Conditions de paiement : règlement sous 30 jours à compter de la date d'émission."
              />
              <p className="text-xs text-gray-500 mt-1">Apparaît en bas de chaque facture</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mentions légales obligatoires *
              </label>
              <textarea
                value={formData.legal_mentions || ''}
                onChange={(e) => updateField('legal_mentions', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={6}
                placeholder="En cas de retard de paiement, seront exigibles conformément à l'article L441-6 du Code de Commerce : une indemnité forfaitaire de 40€ pour frais de recouvrement, ainsi que des pénalités de retard..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Pénalités de retard, indemnité de recouvrement, clause de réserve de propriété
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conditions générales de vente (CGV complètes)
              </label>
              <textarea
                value={formData.general_conditions || ''}
                onChange={(e) => updateField('general_conditions', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                rows={10}
                placeholder="Vos conditions générales de vente complètes (optionnel, peut être ajouté en annexe des devis)..."
              />
              <p className="text-xs text-gray-500 mt-1">Optionnel - Peut être ajouté en annexe des devis</p>
            </div>
          </div>
        </div>

        {/* Save button bottom */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ Configuration White Label</h3>
          <p className="text-sm text-blue-800">
            Ces paramètres seront utilisés automatiquement dans toutes vos factures, devis et documents officiels.
            Vous pouvez les modifier à tout moment. Les champs marqués d'un astérisque (*) sont obligatoires.
          </p>
        </div>
      </div>
    </div>
  );
}
