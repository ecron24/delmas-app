'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type PoolType = {
  id: string;
  name: string;
  description: string;
  typical_volume_m3: number;
};

type Pool = {
  id: string;
  pool_type_id: string;
  length_m: number | null;
  width_m: number | null;
  depth_min_m: number | null;
  depth_max_m: number | null;
  volume_m3: number | null;
  particularity: string | null;
  pool_type?: PoolType;
};

type PoolSelectorProps = {
  clientId: string | null;
  selectedPool: Pool | null;
  onPoolSelect: (pool: Pool | null) => void;
  onCreateNew: () => void;
};

export function PoolSelector({ clientId, selectedPool, onPoolSelect, onCreateNew }: PoolSelectorProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setPools([]);
      return;
    }

    const fetchPools = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .schema('piscine_delmas_public')
        .from('client_pools')
        .select(`
          *,
          pool_type:pool_types(id, name, description, typical_volume_m3)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      setPools(data || []);
      setLoading(false);
    };

    fetchPools();
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">
          Aucune piscine renseignée
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bouton nouvelle piscine - ✅ PLUS DE SÉLECTION PAR DÉFAUT */}
      <button
        type="button"
        onClick={onCreateNew}
        className="w-full text-left px-4 py-3 rounded-lg border-2 bg-white border-gray-200 hover:border-blue-300 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">➕</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Nouvelle piscine</p>
            <p className="text-xs text-gray-500">Créer une piscine pour ce client</p>
          </div>
        </div>
      </button>

      {/* Liste piscines existantes */}
      {pools.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gray-200"></div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Piscines du client
            </p>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          <div className="space-y-2">
            {pools.map((pool) => (
              <button
                key={pool.id}
                type="button"
                onClick={() => onPoolSelect(pool)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                  selectedPool?.id === pool.id
                    ? 'bg-green-50 border-green-500 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">
                      {pool.pool_type?.name || 'Type non défini'}
                    </p>
                    {(pool.length_m || pool.width_m) && (
                      <p className="text-xs text-gray-600 mt-1">
                        📏 {pool.length_m || '?'}m × {pool.width_m || '?'}m
                        {pool.depth_max_m && ` • Profondeur: ${pool.depth_max_m}m`}
                      </p>
                    )}
                    {pool.volume_m3 && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        💧 {pool.volume_m3}m³
                      </p>
                    )}
                    {pool.particularity && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                        {pool.particularity}
                      </p>
                    )}
                  </div>
                  {selectedPool?.id === pool.id && (
                    <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {pools.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-center">
          <p className="text-sm font-semibold text-yellow-800">
            Aucune piscine enregistrée pour ce client
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Cliquez sur "Nouvelle piscine" pour en créer une
          </p>
        </div>
      )}
    </div>
  );
}
