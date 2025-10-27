'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { deleteClient } from '@/lib/actions/client-mutations';
import { Trash2 } from 'lucide-react';

type Client = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  intervention_count?: number;
};

type ClientSearchProps = {
  clients: Client[];
};

export function ClientSearchAndList({ clients }: ClientSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la navigation vers la page du client

    const clientName = client.type === 'professionnel' && client.company_name
      ? client.company_name
      : client.last_name;

    // Confirmation
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le client "${clientName}" ?\n\n` +
      `⚠️ Cette action est irréversible.`
    );

    if (!confirmed) return;

    setDeletingId(client.id);

    try {
      const result = await deleteClient(client.id);

      if (result.success) {
        alert(`✅ ${result.message}`);
        router.refresh(); // Rafraîchir la page pour mettre à jour la liste
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('❌ Erreur lors de la suppression du client');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrage côté client pour une recherche instantanée
  const filteredClients = useMemo(() => {
    if (!search) return clients;

    const searchLower = search.toLowerCase();
    return clients.filter(c => {
      return (
        c.first_name?.toLowerCase().includes(searchLower) ||
        c.last_name?.toLowerCase().includes(searchLower) ||
        c.company_name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search) ||
        c.mobile?.includes(search) ||
        c.city?.toLowerCase().includes(searchLower)
      );
    });
  }, [clients, search]);

  return (
    <>
      {/* Recherche */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 mb-6">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, email, téléphone, ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {search && (
          <p className="text-sm text-gray-600 mt-2">
            {filteredClients.length} résultat(s) trouvé(s)
          </p>
        )}
      </div>

      {/* Liste clients */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-600">
            {search ? 'Aucun client trouvé' : 'Aucun client'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all relative group"
            >
              <div
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                className="cursor-pointer flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  {/* Nom */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {client.type === 'professionnel' ? '🏢' : '👤'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {client.type === 'professionnel' && client.company_name
                        ? client.company_name
                        : client.last_name}
                    </h3>
                  </div>

                  {/* Infos */}
                  <div className="text-sm text-gray-600 space-y-1">
                    {client.type === 'professionnel' && client.company_name && (
                      <p>Contact: {client.last_name}</p>
                    )}
                    {(client.phone || client.mobile) && (
                      <p>
                        📞 {client.mobile || client.phone}
                      </p>
                    )}
                    {client.city && <p>📍 {client.city}</p>}
                  </div>
                </div>

                {/* Compteur interventions */}
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{client.intervention_count || 0}</p>
                  <p className="text-xs text-gray-500">interventions</p>
                </div>
              </div>

              {/* Bouton de suppression - uniquement si 0 interventions */}
              {client.intervention_count === 0 && (
                <button
                  onClick={(e) => handleDelete(client, e)}
                  disabled={deletingId === client.id}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Supprimer le client"
                >
                  {deletingId === client.id ? (
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
