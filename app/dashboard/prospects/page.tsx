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

  if (loading) return <div>Chargement des prospects...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prospects & Devis</h1>
        <div className="text-sm text-gray-600">
          {prospects.length} prospect{prospects.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {prospects.map((prospect) => (
          <div key={prospect.id} className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {prospect.first_name} {prospect.last_name}
                </h3>
                <p className="text-gray-600">
                  {prospect.phone || prospect.mobile} • {prospect.city}
                </p>
                <p className="text-sm text-gray-500">
                  Créé le {new Date(prospect.prospect_created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: prospect.prospect_status?.color + '20',
                    color: prospect.prospect_status?.color
                  }}
                >
                  {prospect.prospect_status?.name}
                </span>

                <a
                  href={`/dashboard/prospects/${prospect.id}`}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Voir
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
