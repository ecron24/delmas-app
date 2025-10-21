'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';

export default function SignInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [saving, setSaving] = useState(false);
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('⚠️ Veuillez signer avant de continuer');
      return;
    }

    setSaving(true);

    try {
      // 1. Récupérer la signature en base64
      const signatureData = sigCanvas.current?.toDataURL('image/png');

      const supabase = createClient();

      // 2. Mettre à jour l'intervention
      await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          client_signature_url: signatureData,
          client_signed_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      // 3. Générer la fiche avec signature
      await fetch(`/api/interventions/${params.id}/generate-fiche`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_present: true,
          signature: signatureData,
        }),
      });

      alert('✅ Signature enregistrée et fiche envoyée au client !');
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
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">
            ✍️ Signature du client
          </h1>
          <p className="text-gray-600">
            Client : <strong>{intervention.client.first_name} {intervention.client.last_name}</strong>
          </p>
          <p className="text-gray-600">
            Intervention : <strong>{intervention.reference}</strong>
          </p>
        </div>

        {/* Canvas signature */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <p className="text-sm text-gray-600 mb-4 text-center">
            Merci de signer dans le cadre ci-dessous avec votre doigt ou un stylet
          </p>

          <div className="border-4 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-64 touch-none',
              }}
              backgroundColor="white"
            />
          </div>

          <button
            onClick={handleClear}
            className="w-full mt-4 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            🗑️ Effacer
          </button>
        </div>

        {/* Actions */}
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
            {saving ? '⏳ Enregistrement...' : '✅ Valider la signature'}
          </button>
        </div>
      </div>
    </div>
  );
}
