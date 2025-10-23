// ✅ SERVER COMPONENT (pas de 'use client')
import { getClients } from '@/lib/actions/clients';
import { ClientSearchAndList } from '@/app/components/clients/ClientSearchAndList';

export default async function ClientsPage() {
  // ✅ Récupération des données côté serveur
  const clients = await getClients();

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          👥 Clients
        </h1>
        <p className="text-gray-600">
          {clients.length} client(s) • Recherchez et consultez l'historique
        </p>
      </div>

      {/* Recherche et liste (Client Component pour recherche instantanée) */}
      <ClientSearchAndList clients={clients} />
    </div>
  );
}
