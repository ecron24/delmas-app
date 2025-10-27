// ✅ SERVER COMPONENT (pas de 'use client')
import { getClient } from '@/lib/actions/clients';
import { BackButton } from '@/app/components/interventions/BackButton';
import { NewInterventionButton, ClientEditButton } from '@/app/components/clients/ClientButtons';
import { InterventionHistory } from '@/app/components/clients/InterventionHistory';
import { ClientPhotosLazy } from '@/app/components/lazy';
import { PhotoCaptureSkeleton } from '@/app/components/ui/Skeletons';
import { Suspense } from 'react';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  // ✅ Récupération des données côté serveur
  const { client, interventions } = await getClient(params.id);

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">Client introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <BackButton />

      {/* Infos client */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">
              {client.type === 'professionnel' ? '🏢' : '👤'}
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {client.type === 'professionnel' && client.company_name
                  ? client.company_name
                  : client.last_name}
              </h1>
              {client.type === 'professionnel' && client.company_name && (
                <p className="text-sm md:text-base text-gray-600">
                  Contact: {client.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Bouton Modifier */}
          <ClientEditButton clientId={client.id} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {client.email && (
            <div>
              <p className="text-gray-500 font-semibold">Email</p>
              <p className="text-gray-900">📧 {client.email}</p>
            </div>
          )}
          {(client.phone || client.mobile) && (
            <div>
              <p className="text-gray-500 font-semibold">Téléphone</p>
              <p className="text-gray-900">
                {client.phone && `📞 ${client.phone}`}
                {client.phone && client.mobile && ' • '}
                {client.mobile && `📱 ${client.mobile}`}
              </p>
            </div>
          )}
          {(client.address || client.city) && (
            <div className="md:col-span-2">
              <p className="text-gray-500 font-semibold">Adresse</p>
              <p className="text-gray-900">
                📍 {client.address}
                {client.postal_code && `, ${client.postal_code}`}
                {client.city && ` ${client.city}`}
              </p>
            </div>
          )}
          {client.notes && (
            <div className="md:col-span-2">
              <p className="text-gray-500 font-semibold">Notes</p>
              <p className="text-gray-900">💬 {client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bouton nouvelle intervention */}
      <NewInterventionButton clientId={client.id} />

      {/* Section Photos avec lazy loading */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 md:p-6">
        <Suspense fallback={<PhotoCaptureSkeleton />}>
          <ClientPhotosLazy clientId={client.id} />
        </Suspense>
      </div>

      {/* Historique interventions */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          📋 Historique des interventions ({interventions.length})
        </h2>

        <InterventionHistory interventions={interventions} />
      </div>
    </div>
  );
}
