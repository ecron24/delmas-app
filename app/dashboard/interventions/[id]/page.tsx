'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Intervention = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  total_ttc: number;
  client_present: boolean | null;
  client_signed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
    mobile: string | null;
  } | null;
  intervention_types: Array<{ intervention_type: string }>;
};

export default function InterventionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchIntervention();
  }, [params.id]);

  const fetchIntervention = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(*),
        intervention_types:intervention_types_junction(intervention_type)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Erreur:', error);
    }

    setIntervention(data);
    setLoading(false);
  };

  const handleStartIntervention = async () => {
    setActionLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (!error) {
      await fetchIntervention();
    } else {
      alert('❌ Erreur lors du démarrage');
    }
    setActionLoading(false);
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
          <p className="text-red-900 font-bold">❌ Intervention introuvable</p>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
    scheduled: { label: 'Planifiée', color: 'bg-blue-100 text-blue-800', emoji: '📅' },
    in_progress: { label: 'En cours', color: 'bg-orange-100 text-orange-800', emoji: '⏳' },
    completed: { label: 'Terminée', color: 'bg-green-100 text-green-800', emoji: '✅' },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', emoji: '❌' },
  };

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

  const currentStatus = statusLabels[intervention.status] || statusLabels.scheduled;

  // ========================================
  // 🎯 CAS 1 : INTERVENTION PLANIFIÉE
  // ========================================
  if (intervention.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 font-semibold mb-6 hover:text-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>

          {/* Card principale */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                  {currentStatus.emoji}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Intervention planifiée
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span className={`px-4 py-2 rounded-full font-semibold text-sm ${currentStatus.color}`}>
                {currentStatus.emoji} {currentStatus.label}
              </span>
            </div>

            {/* Informations client */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <span className="text-3xl">
                  {intervention.client?.type === 'professionnel' ? '🏢' : '👤'}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Client</p>
                  <button
                    onClick={() => router.push(`/dashboard/clients/${intervention.client?.id}`)}
                    className="text-lg font-bold text-blue-600 hover:text-blue-700"
                  >
                    {intervention.client?.type === 'professionnel' && intervention.client?.company_name
                      ? intervention.client.company_name
                      : `${intervention.client?.first_name} ${intervention.client?.last_name}`}
                  </button>
                  {(intervention.client?.phone || intervention.client?.mobile) && (
                    <p className="text-sm text-gray-600 mt-1">
                      📞 {intervention.client?.mobile || intervention.client?.phone}
                    </p>
                  )}
                </div>
              </div>

              {intervention.client?.address && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-3xl">📍</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Adresse d'intervention</p>
                    <p className="font-semibold text-gray-900">
                      {intervention.client.address}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {intervention.client.postal_code} {intervention.client.city}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${intervention.client.address}, ${intervention.client.postal_code} ${intervention.client.city}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2"
                    >
                      🗺️ Ouvrir dans Maps →
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <span className="text-3xl">🔧</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-2">Type(s) d'intervention</p>
                  <div className="flex flex-wrap gap-2">
                    {intervention.intervention_types?.map((t, i) => (
                      <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {typeLabels[t.intervention_type] || t.intervention_type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {intervention.description && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">📝 Description</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
                </div>
              )}
            </div>

            {/* Détails financiers (si renseignés) */}
            {(intervention.labor_hours || intervention.travel_fee) && (
              <div className="mb-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">💰 Estimation</h3>
                <div className="grid grid-cols-3 gap-4">
                  {intervention.labor_hours && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Durée</p>
                      <p className="text-xl font-bold">{intervention.labor_hours}h</p>
                    </div>
                  )}
                  {intervention.labor_rate && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Taux horaire</p>
                      <p className="text-xl font-bold">{intervention.labor_rate}€/h</p>
                    </div>
                  )}
                  {intervention.travel_fee > 0 && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Déplacement</p>
                      <p className="text-xl font-bold">{intervention.travel_fee}€</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleStartIntervention}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Démarrage...
                  </>
                ) : (
                  <>🚀 Démarrer l'intervention</>
                )}
              </button>

              <button
                onClick={() => router.push(`/dashboard/interventions/${params.id}/edit`)}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
              >
                ✏️ Modifier la planification
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Info :</strong> Une fois l'intervention démarrée, vous pourrez ajouter photos, documents et terminer la mission.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ========================================
  // 🎯 CAS 2 : INTERVENTION EN COURS
  // ========================================
  if (intervention.status === 'in_progress') {
    const total = (intervention.labor_hours || 0) * (intervention.labor_rate || 0) + (intervention.travel_fee || 0);

    return (
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        {/* Card infos */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                  📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentStatus.color}`}>
                  {currentStatus.emoji} {currentStatus.label}
                </span>
              </div>

              {intervention.client && (
                <button
                  onClick={() => router.push(`/dashboard/clients/${intervention.client!.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2"
                >
                  <span className="text-xl">
                    {intervention.client.type === 'professionnel' ? '🏢' : '👤'}
                  </span>
                  {intervention.client.type === 'professionnel' && intervention.client.company_name
                    ? intervention.client.company_name
                    : `${intervention.client.first_name} ${intervention.client.last_name}`}
                </button>
              )}
            </div>

            <button
              onClick={() => router.push(`/dashboard/interventions/${intervention.id}/edit`)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 shrink-0"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Modifier</span>
            </button>
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-semibold">
                  {typeLabels[t.intervention_type] || t.intervention_type}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {intervention.description && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
            </div>
          )}

          {/* Détails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            {intervention.labor_hours && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Durée</p>
                <p className="text-gray-900 font-bold">{intervention.labor_hours}h</p>
              </div>
            )}
            {intervention.labor_rate && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Taux horaire</p>
                <p className="text-gray-900 font-bold">{intervention.labor_rate}€/h</p>
              </div>
            )}
            {intervention.travel_fee > 0 && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Frais déplacement</p>
                <p className="text-gray-900 font-bold">{intervention.travel_fee}€</p>
              </div>
            )}
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">TOTAL</span>
                <span className="text-3xl font-bold text-green-600">{total.toFixed(2)}€</span>
              </div>
            </div>
          )}
        </div>

        {/* Boutons Photos/Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/photos`)}
            className="bg-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all"
          >
            📸 Photos
          </button>
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/documents`)}
            className="bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-700 transition-all"
          >
            📄 Documents
          </button>
        </div>

        {/* Bouton Terminer */}
        <button
          onClick={() => router.push(`/dashboard/interventions/${intervention.id}/complete`)}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all"
        >
          🏁 Terminer l'intervention
        </button>
      </div>
    );
  }

  // ========================================
  // 🎯 CAS 3 : INTERVENTION TERMINÉE
  // ========================================
  if (intervention.status === 'completed') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        {/* Card infos (lecture seule) */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                  📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${currentStatus.color}`}>
                  {currentStatus.emoji} {currentStatus.label}
                </span>
              </div>

              {intervention.client && (
                <button
                  onClick={() => router.push(`/dashboard/clients/${intervention.client!.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2"
                >
                  <span className="text-xl">
                    {intervention.client.type === 'professionnel' ? '🏢' : '👤'}
                  </span>
                  {intervention.client.type === 'professionnel' && intervention.client.company_name
                    ? intervention.client.company_name
                    : `${intervention.client.first_name} ${intervention.client.last_name}`}
                </button>
              )}
            </div>
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-semibold">
                  {typeLabels[t.intervention_type] || t.intervention_type}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {intervention.description && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
            </div>
          )}

          {/* Détails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            {intervention.labor_hours && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Durée</p>
                <p className="text-gray-900 font-bold">{intervention.labor_hours}h</p>
              </div>
            )}
            {intervention.labor_rate && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Taux horaire</p>
                <p className="text-gray-900 font-bold">{intervention.labor_rate}€/h</p>
              </div>
            )}
            {intervention.travel_fee > 0 && (
              <div>
                <p className="text-gray-500 text-sm font-semibold">Frais déplacement</p>
                <p className="text-gray-900 font-bold">{intervention.travel_fee}€</p>
              </div>
            )}
          </div>

          {/* Total */}
          {intervention.total_ttc > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">TOTAL</span>
                <span className="text-3xl font-bold text-green-600">{intervention.total_ttc.toFixed(2)}€</span>
              </div>
            </div>
          )}
        </div>

        {/* Boutons (mode lecture) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/photos`)}
            className="bg-purple-100 text-purple-800 py-4 rounded-xl font-bold text-lg hover:bg-purple-200 transition-all"
          >
            📸 Voir photos
          </button>
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/documents`)}
            className="bg-orange-100 text-orange-800 py-4 rounded-xl font-bold text-lg hover:bg-orange-200 transition-all"
          >
            📄 Voir documents
          </button>
        </div>

        {/* ✅ NOUVEAUX BOUTONS POUR INTERVENTION TERMINÉE */}
        <div className="space-y-4">
          {/* Email confirmation client */}
          <button
            onClick={async () => {
              if (!confirm('📧 Envoyer l\'email de confirmation au client ?')) return;

              const response = await fetch(`/api/interventions/${intervention.id}/send-confirmation`, {
                method: 'POST',
              });

              if (response.ok) {
                alert('✅ Email envoyé !');
              } else {
                alert('❌ Erreur lors de l\'envoi');
              }
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
          >
            📧 Envoyer confirmation au client
          </button>

          {/* Facture proforma (interne patron) */}
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/invoice`)}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-purple-700 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
          >
            📄 Gérer facture proforma (Interne)
          </button>

          {/* 🆕 LOGIQUE DE SIGNATURE AMÉLIORÉE */}
          {(() => {
            // Cas 1 : Client présent ET pas encore signé → Bouton signature
            if (intervention.client_present === true && !intervention.client_signed_at) {
              return (
                <button
                  onClick={() => router.push(`/dashboard/interventions/${intervention.id}/sign`)}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  ✍️ Faire signer le client
                </button>
              );
            }

            // Cas 2 : Client présent ET a signé → Badge confirmation
            if (intervention.client_present === true && intervention.client_signed_at) {
              return (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <p className="text-green-800 font-semibold text-lg">
                      Client a signé
                    </p>
                  </div>
                  <p className="text-green-600 text-sm text-center">
                    Signé le {new Date(intervention.client_signed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              );
            }

            // Cas 3 : Client absent → Badge info
            if (intervention.client_present === false) {
              return (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">ℹ️</span>
                    <p className="text-blue-800 font-semibold text-lg">
                      Client absent lors de l'intervention
                    </p>
                  </div>
                  <p className="text-blue-600 text-sm text-center">
                    Email de confirmation envoyé • Paiement ultérieur
                  </p>
                </div>
              );
            }

            // Cas 4 : Statut non renseigné (anciennes interventions) → Badge neutre
            return (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">❓</span>
                  <p className="text-gray-800 font-semibold text-lg">
                    Présence client non renseignée
                  </p>
                </div>
                <p className="text-gray-600 text-sm text-center">
                  Information manquante pour cette intervention
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ========================================
  // 🎯 CAS 4 : ANNULÉE
  // ========================================
  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 font-semibold mb-6">
        ← Retour
      </button>
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
        <p className="text-2xl mb-2">❌</p>
        <p className="text-red-900 font-bold text-lg">Intervention annulée</p>
      </div>
    </div>
  );
}
