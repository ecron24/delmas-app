'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signatureText, setSignatureText] = useState('');

  useEffect(() => {
    loadIntervention();
  }, []);

  const loadIntervention = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('*, client:clients(*)')
      .eq('id', params.id)
      .single();

    setIntervention(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!signatureText.trim()) {
      alert('⚠️ Veuillez saisir votre nom pour valider');
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          client_signature_url: `Signé par: ${signatureText}`,
          client_signed_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      alert('✅ Signature enregistrée !');
      router.push(`/dashboard/interventions/${params.id}`);

    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'enregistrement');
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

  if (!intervention) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">Intervention introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">✍️ Validation par le client</h1>
          <p className="text-gray-600">
            Client : <strong>{intervention.client.first_name} {intervention.client.last_name}</strong>
          </p>
          <p className="text-gray-600">
            Intervention : <strong>{intervention.reference}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nom et prénom du signataire
          </label>
          <input
            type="text"
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Cette validation confirme que l'intervention a été réalisée conformément aux attentes.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.back()}
            disabled={saving}
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ← Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50"
          >
            {saving ? '⏳ Enregistrement...' : '✅ Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
