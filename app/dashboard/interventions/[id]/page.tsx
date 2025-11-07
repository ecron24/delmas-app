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
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <BackButton />

          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 mb-6">
            {/* 📱 HEADER RESPONSIVE */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                  {currentStatus.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                    Intervention planifiée
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-semibold text-xs sm:text-sm ${currentStatus.color} self-start sm:self-auto shrink-0`}>
                {currentStatus.emoji} {currentStatus.label}
              </span>
            </div>

            {/* Informations client */}
            <div className="space-y-4 mb-8">
              {intervention.client && (
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl sm:text-3xl">
                    {intervention.client.type === 'professionnel' ? '🏢' : '👤'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Client</p>
                    <ClientLink
                      clientId={intervention.client.id}
                      clientType={intervention.client.type}
                      firstName={intervention.client.first_name}
                      lastName={intervention.client.last_name}
                      companyName={intervention.client.company_name}
                      className="text-base sm:text-lg font-bold text-blue-600 hover:text-blue-700"
                    />
                    {(intervention.client.phone || intervention.client.mobile) && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        📞 {intervention.client.mobile || intervention.client.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {intervention.client?.address && (
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <span className="text-2xl sm:text-3xl">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">Adresse d'intervention</p>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {intervention.client.address}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {intervention.client.postal_code} {intervention.client.city}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${intervention.client.address}, ${intervention.client.postal_code} ${intervention.client.city}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-semibold mt-2"
                    >
                      🗺️ Ouvrir dans Maps →
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                <span className="text-2xl sm:text-3xl">🔧</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">Type(s) d'intervention</p>
                  <div className="flex flex-wrap gap-2">
                    {intervention.intervention_types_junction?.map((item, index) => (
                      <span key={item.id} className="bg-blue-100 text-blue-800 px-2.5 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold">
                        {TYPE_LABELS[item.intervention_type] || item.intervention_type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {intervention.description && (
                <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs sm:text-sm text-gray-500 mb-2">📝 Description</p>
                  <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
                </div>
              )}
            </div>

            {/* Détails financiers */}
            {(intervention.labor_hours || intervention.travel_fee) && (
              <div className="mb-8 pt-6 border-t border-gray-200">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-4">💰 Estimation</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {intervention.labor_hours && (
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Durée</p>
                      <p className="text-lg sm:text-xl font-bold">{intervention.labor_hours}h</p>
                    </div>
                  )}
                  {intervention.labor_rate && (
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Taux horaire</p>
                      <p className="text-lg sm:text-xl font-bold">{intervention.labor_rate}€/h</p>
                    </div>
                  )}
                  {intervention.travel_fee > 0 && (
                    <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Déplacement</p>
                      <p className="text-lg sm:text-xl font-bold">{intervention.travel_fee}€</p>
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

          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
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
    // ✅ Utiliser total_ttc de la base de données (calculé automatiquement par les triggers)
    const total = intervention.total_ttc || 0;

    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <BackButton />

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-800">
                  📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${currentStatus.color}`}>
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
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2 text-sm sm:text-base"
                />
              )}
            </div>

            <EditButton interventionId={intervention.id} variant="primary" />
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types_junction?.map((item, index) => (
                <span key={item.id} className="bg-blue-100 text-blue-800 px-2.5 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold">
                  {TYPE_LABELS[item.intervention_type] || item.intervention_type}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {intervention.description && (
            <div className="mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
            </div>
          )}

          {/* Détails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            {intervention.labor_hours && (
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-semibold">Durée</p>
                <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.labor_hours}h</p>
              </div>
            )}
            {intervention.labor_rate && (
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-semibold">Taux horaire</p>
                <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.labor_rate}€/h</p>
              </div>
            )}
            {intervention.travel_fee > 0 && (
              <div>
                <p className="text-gray-500 text-xs sm:text-sm font-semibold">Frais déplacement</p>
                <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.travel_fee}€</p>
              </div>
            )}
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-bold text-gray-900">TOTAL</span>
                <span className="text-2xl sm:text-3xl font-bold text-green-600">{total.toFixed(2)}€</span>
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
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <BackButton />

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-800">
                  📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold ${currentStatus.color}`}>
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
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2 text-sm sm:text-base"
                />
              )}
            </div>
          </div>

          {/* Types */}
          <div className="mb-4">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
            <div className="flex flex-wrap gap-2">
              {intervention.intervention_types_junction?.map((item, index) => (
                <span key={item.id} className="bg-blue-100 text-blue-800 px-2.5 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold">
                  {TYPE_LABELS[item.intervention_type] || item.intervention_type}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          {intervention.description && (
            <div className="mb-4">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
            </div>
          )}

          {/* ✅ Détails DEPUIS LA FACTURE (valeurs correctes) */}
          {intervention.invoice_items && intervention.invoice_items.length > 0 ? (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Détail de la facturation</h3>
              <div className="space-y-2">
                {intervention.invoice_items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {item.unit_price.toFixed(2)}€ HT (TVA {item.tva_rate}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {(item.quantity * item.unit_price * (1 + item.tva_rate / 100)).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              {intervention.labor_hours && (
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-semibold">Durée</p>
                  <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.labor_hours}h</p>
                </div>
              )}
              {intervention.labor_rate && (
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-semibold">Taux horaire</p>
                  <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.labor_rate}€/h</p>
                </div>
              )}
              {intervention.travel_fee > 0 && (
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-semibold">Frais déplacement</p>
                  <p className="text-gray-900 text-sm sm:text-base font-bold">{intervention.travel_fee}€</p>
                </div>
              )}
            </div>
          )}

          {/* Total */}
          {intervention.total_ttc > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-col gap-2">
                {intervention.subtotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Sous-total HT</span>
                    <span className="font-semibold text-gray-900">{intervention.subtotal.toFixed(2)}€</span>
                  </div>
                )}
                {intervention.tax_amount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">TVA</span>
                    <span className="font-semibold text-gray-900">{intervention.tax_amount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-base sm:text-lg font-bold text-gray-900">TOTAL TTC</span>
                  <span className="text-2xl sm:text-3xl font-bold text-green-600">{intervention.total_ttc.toFixed(2)}€</span>
                </div>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <BackButton />
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 sm:p-8 text-center">
        <p className="text-2xl mb-2">❌</p>
        <p className="text-red-900 font-bold text-base sm:text-lg">Intervention annulée</p>
      </div>
    </div>
  );
}
