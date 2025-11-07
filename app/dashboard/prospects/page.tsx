'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  mobile: string;
  city: string;
  prospect_created_at: string;
  prospect_status: {
    name: string;
    color: string;
  };
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select(`
        id,
        first_name,
        last_name,
        phone,
        mobile,
        city,
        prospect_created_at,
        prospect_status:prospect_status_id (
          name,
          color
        )
      `)
      .eq('is_prospect', true)
      .order('prospect_created_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement prospects:', error);
    } else {
      setProspects(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-gray-600">⏳ Chargement des prospects...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* 📱 HEADER RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          🎯 Prospects & Devis
        </h1>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold w-fit">
          <span>{prospects.length}</span>
          <span>prospect{prospects.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* 📱 LISTE PROSPECTS - RESPONSIVE */}
      {prospects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
          <p className="text-4xl mb-2">🔭</p>
          <p className="text-gray-600">Aucun prospect trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {prospects.map((prospect) => (
            <div
              key={prospect.id}
              className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* 📱 LAYOUT MOBILE-FIRST */}
              <div className="flex flex-col gap-3">
                {/* Ligne 1 : Nom + Badge statut (desktop uniquement) */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                      {prospect.first_name} {prospect.last_name}
                    </h3>
                  </div>

                  {/* 🖥️ Badge desktop uniquement */}
                  <span
                    className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: prospect.prospect_status?.color + '20',
                      color: prospect.prospect_status?.color
                    }}
                  >
                    {prospect.prospect_status?.name}
                  </span>
                </div>

                {/* Ligne 2 : Infos contact */}
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    📞 {prospect.phone || prospect.mobile}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1">
                    📍 {prospect.city}
                  </span>
                </div>

                {/* Ligne 3 : Date + Actions */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-xs text-gray-500">
                    Créé le {new Date(prospect.prospect_created_at).toLocaleDateString('fr-FR')}
                  </p>

                  <div className="flex items-center gap-2">
                    {/* 📱 Badge mobile uniquement */}
                    <span
                      className="sm:hidden inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: prospect.prospect_status?.color + '20',
                        color: prospect.prospect_status?.color
                      }}
                    >
                      {prospect.prospect_status?.name}
                    </span>

                    <a
                      href={`/dashboard/prospects/${prospect.id}`}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors active:scale-95"
                    >
                      Voir
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
