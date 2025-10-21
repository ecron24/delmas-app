'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Client = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  postal_code: string;
  city: string;
  notes: string;
};

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientData, setClientData] = useState<Client>({
    id: '',
    type: 'particulier',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    postal_code: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    fetchClient();
  }, [params.id]);

  const fetchClient = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) {
      setClientData(data);
    }
    if (error) {
      setError('Client introuvable');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema('piscine_delmas_public')
        .from('clients')
        .update({
          type: clientData.type,
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          company_name: clientData.company_name || null,
          email: clientData.email || null,
          phone: clientData.phone || null,
          mobile: clientData.mobile || null,
          address: clientData.address || null,
          postal_code: clientData.postal_code || null,
          city: clientData.city || null,
          notes: clientData.notes || null,
        })
        .eq('id', params.id);

      if (error) throw error;

      router.push(`/dashboard/clients/${params.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Annuler
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        ✏️ Modifier le client
      </h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Type de client
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setClientData({ ...clientData, type: 'particulier' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'particulier'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Particulier
            </button>
            <button
              type="button"
              onClick={() => setClientData({ ...clientData, type: 'professionnel' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'professionnel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Professionnel
            </button>
          </div>
        </div>

        {/* Raison sociale */}
        {clientData.type === 'professionnel' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Raison sociale *
            </label>
            <input
              type="text"
              required
              value={clientData.company_name}
              onChange={(e) => setClientData({ ...clientData, company_name: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Nom de l'entreprise"
            />
          </div>
        )}

        {/* Nom Prénom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prénom *
            </label>
            <input
              type="text"
              required
              value={clientData.first_name}
              onChange={(e) => setClientData({ ...clientData, first_name: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Prénom"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nom *
            </label>
            <input
              type="text"
              required
              value={clientData.last_name}
              onChange={(e) => setClientData({ ...clientData, last_name: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Nom"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={clientData.email}
              onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="email@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={clientData.phone}
              onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="01 23 45 67 89"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Mobile
          </label>
          <input
            type="tel"
            value={clientData.mobile}
            onChange={(e) => setClientData({ ...clientData, mobile: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="06 12 34 56 78"
          />
        </div>

        {/* Adresse */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Adresse
          </label>
          <input
            type="text"
            value={clientData.address}
            onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="15 rue de la Piscine"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Code postal
            </label>
            <input
              type="text"
              value={clientData.postal_code}
              onChange={(e) => setClientData({ ...clientData, postal_code: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="75001"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ville
            </label>
            <input
              type="text"
              value={clientData.city}
              onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Paris"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={clientData.notes}
            onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
            rows={4}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Type de piscine, équipements, remarques..."
          />
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
