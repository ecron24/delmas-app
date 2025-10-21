'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Client = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  city: string;
};

type ClientSearchProps = {
  onClientSelect: (client: Client) => void;
  onCreateNew: () => void;
};

export function ClientSearch({ onClientSelect, onCreateNew }: ClientSearchProps) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 2) {
      setClients([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .schema('piscine_delmas_public')
        .from('clients')
        .select('*')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`)
        .limit(5);

      setClients(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const getClientName = (client: Client) => {
    return client.type === 'professionnel' && client.company_name
      ? client.company_name
      : `${client.first_name} ${client.last_name}`;
  };

  return (
    <div className="space-y-4">
      {/* Input de recherche */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Rechercher un client
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, email, téléphone..."
          className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        <p className="text-xs text-gray-500 mt-2">
          Minimum 2 caractères pour rechercher
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Résultats */}
      {!loading && clients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">
            {clients.length} résultat(s)
          </p>
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientSelect(client)}
              className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-98"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{getClientName(client)}</h3>
                  {client.type === 'professionnel' && (
                    <p className="text-xs text-gray-500">{client.first_name} {client.last_name}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    {client.email && (
                      <p className="text-sm text-gray-600">✉️ {client.email}</p>
                    )}
                    {client.phone && (
                      <p className="text-sm text-gray-600">📞 {client.phone}</p>
                    )}
                    {client.address && (
                      <p className="text-sm text-gray-600">📍 {client.address}, {client.city}</p>
                    )}
                  </div>
                </div>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Aucun résultat */}
      {!loading && search.length >= 2 && clients.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Aucun client trouvé</p>
          <button
            onClick={onCreateNew}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 active:scale-95 transition-all"
          >
            + Créer un nouveau client
          </button>
        </div>
      )}

      {/* Bouton créer (toujours visible) */}
      {search.length < 2 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-4">ou</p>
          <button
            onClick={onCreateNew}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 active:scale-95 transition-all"
          >
            + Créer un nouveau client
          </button>
        </div>
      )}
    </div>
  );
}
