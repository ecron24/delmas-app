'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const supabase = createClient();

    // Récupérer clients avec comptage interventions
    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select(`
        *,
        interventions(count)
      `)
      .order('last_name')
      .order('first_name');

    const clientsWithCount = data?.map(c => ({
      ...c,
      intervention_count: c.interventions?.[0]?.count || 0,
    })) || [];

    setClients(clientsWithCount);
    setLoading(false);
  };

  // Filtrer clients
  const filteredClients = clients.filter(c => {
    const searchLower = search.toLowerCase();
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
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-600">
            {search ? 'Aucun client trouvé' : 'Aucun client'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Nom */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {client.type === 'professionnel' ? '🏢' : '👤'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {client.type === 'professionnel' && client.company_name
                        ? client.company_name
                        : `${client.first_name} ${client.last_name}`}
                    </h3>
                  </div>

                  {/* Infos */}
                  <div className="text-sm text-gray-600 space-y-1">
                    {client.type === 'professionnel' && client.company_name && (
                      <p>Contact: {client.first_name} {client.last_name}</p>
                    )}
                    {(client.email || client.phone || client.mobile) && (
                      <p>
                        {client.email && `📧 ${client.email}`}
                        {client.email && (client.phone || client.mobile) && ' • '}
                        {(client.phone || client.mobile) && `📞 ${client.phone || client.mobile}`}
                      </p>
                    )}
                    {client.city && <p>📍 {client.city}</p>}
                  </div>
                </div>

                {/* Badge interventions */}
                <div className="text-center">
                  <div className={`px-4 py-2 rounded-lg ${
                    client.intervention_count && client.intervention_count > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <p className="text-2xl font-bold">{client.intervention_count || 0}</p>
                    <p className="text-xs font-semibold">intervention(s)</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
