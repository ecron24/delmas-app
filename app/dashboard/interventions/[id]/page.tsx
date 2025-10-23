// ✅ SERVER COMPONENT (pas de 'use client')
import { getIntervention } from '@/lib/actions/interventions';
import { BackButton } from '@/app/components/interventions/BackButton';
import { InterventionActions } from '@/app/components/interventions/InterventionActions';
import { ClientLink } from '@/app/components/interventions/ClientLink';
import { EditButton } from '@/app/components/interventions/EditButton';
import { STATUS_LABELS, TYPE_LABELS, type Intervention } from '@/lib/types/intervention';

export default async function InterventionDetailPage({ params }: { params: { id: string } }) {
  // ✅ Récupération des données côté serveur
  const intervention = await getIntervention(params.id);

  if (!intervention) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">❌ Intervention introuvable</p>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_LABELS[intervention.status] || STATUS_LABELS.scheduled;

  // ========================================
  // 🎯 CAS 1 : INTERVENTION PLANIFIÉE
  // ========================================
  if (intervention.status === 'scheduled') {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <BackButton />

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
              {intervention.client && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-3xl">
                    {intervention.client.type === 'professionnel' ? '🏢' : '👤'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Client</p>
                    <ClientLink
                      clientId={intervention.client.id}
                      clientType={intervention.client.type}
                      firstName={intervention.client.first_name}
                      lastName={intervention.client.last_name}
                      companyName={intervention.client.company_name}
                      className="text-lg font-bold text-blue-600 hover:text-blue-700"
                    />
                    {(intervention.client.phone || intervention.client.mobile) && (
                      <p className="text-sm text-gray-600 mt-1">
                        📞 {intervention.client.mobile || intervention.client.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                        {TYPE_LABELS[t.intervention_type] || t.intervention_type}
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

            {/* Détails financiers */}
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

            {/* Actions (Client Component) */}
            <InterventionActions
              interventionId={intervention.id}
              status={intervention.status}
              clientPresent={intervention.client_present}
              clientSignedAt={intervention.client_signed_at}
            />
          </div>

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
        <BackButton />

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
                <ClientLink
                  clientId={intervention.client.id}
                  clientType={intervention.client.type}
                  firstName={intervention.client.first_name}
                  lastName={intervention.client.last_name}
                  companyName={intervention.client.company_name}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2"
                />
              )}
            </div>

            <EditButton interventionId={intervention.id} variant="primary" />
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-semibold">
                  {TYPE_LABELS[t.intervention_type] || t.intervention_type}
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

        {/* Actions (Client Component) */}
        <InterventionActions
          interventionId={intervention.id}
          status={intervention.status}
          clientPresent={intervention.client_present}
          clientSignedAt={intervention.client_signed_at}
        />
      </div>
    );
  }

  // ========================================
  // 🎯 CAS 3 : INTERVENTION TERMINÉE
  // ========================================
  if (intervention.status === 'completed') {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <BackButton />

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
                <ClientLink
                  clientId={intervention.client.id}
                  clientType={intervention.client.type}
                  firstName={intervention.client.first_name}
                  lastName={intervention.client.last_name}
                  companyName={intervention.client.company_name}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2"
                />
              )}
            </div>
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types.map((t, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-semibold">
                  {TYPE_LABELS[t.intervention_type] || t.intervention_type}
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

        {/* Actions (Client Component) */}
        <InterventionActions
          interventionId={intervention.id}
          status={intervention.status}
          clientPresent={intervention.client_present}
          clientSignedAt={intervention.client_signed_at}
        />
      </div>
    );
  }

  // ========================================
  // 🎯 CAS 4 : ANNULÉE
  // ========================================
  return (
    <div className="max-w-4xl mx-auto p-6">
      <BackButton />
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
        <p className="text-2xl mb-2">❌</p>
        <p className="text-red-900 font-bold text-lg">Intervention annulée</p>
      </div>
    </div>
  );
}
