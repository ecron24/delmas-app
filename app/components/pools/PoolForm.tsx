'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type PoolType = {
  id: string;
  name: string;
  description: string;
};

type PoolFormData = {
  pool_type_id: string;
  length_m: string;
  width_m: string;
  depth_min_m: string;
  depth_max_m: string;
  volume_m3: string;
  particularity: string;
  equipment: string;
};

type PoolFormProps = {
  onPoolData: (data: PoolFormData) => void;
  initialData?: PoolFormData;
};

export function PoolForm({ onPoolData, initialData }: PoolFormProps) {
  const [poolTypes, setPoolTypes] = useState<PoolType[]>([]);
  const [poolData, setPoolData] = useState<PoolFormData>(
    initialData || {
      pool_type_id: '',
      length_m: '',
      width_m: '',
      depth_min_m: '',
      depth_max_m: '',
      volume_m3: '',
      particularity: '',
      equipment: '',
    }
  );

  useEffect(() => {
    const fetchPoolTypes = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .schema('piscine_delmas_public')
        .from('pool_types')
        .select('*')
        .order('name');

      setPoolTypes(data || []);
    };

    fetchPoolTypes();
  }, []);

  useEffect(() => {
    onPoolData(poolData);
  }, [poolData, onPoolData]);

  // Calcul automatique volume (approximatif)
  const calculateVolume = () => {
    const length = parseFloat(poolData.length_m) || 0;
    const width = parseFloat(poolData.width_m) || 0;
    const depthAvg = ((parseFloat(poolData.depth_min_m) || 0) + (parseFloat(poolData.depth_max_m) || 0)) / 2;

    if (length > 0 && width > 0 && depthAvg > 0) {
      const volume = length * width * depthAvg;
      setPoolData({ ...poolData, volume_m3: volume.toFixed(1) });
    }
  };

  const selectedType = poolTypes.find(t => t.id === poolData.pool_type_id);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        🏊 Informations Piscine
      </h3>

      {/* Type de piscine */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Type de piscine *
        </label>
        <select
          required
          value={poolData.pool_type_id}
          onChange={(e) => setPoolData({ ...poolData, pool_type_id: e.target.value })}
          className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="">Sélectionner un type</option>
          {poolTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {selectedType?.description && (
          <p className="text-xs text-gray-500 mt-1">
            💡 {selectedType.description}
          </p>
        )}
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Longueur (m)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={poolData.length_m}
            onChange={(e) => setPoolData({ ...poolData, length_m: e.target.value })}
            onBlur={calculateVolume}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="8.0"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Largeur (m)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={poolData.width_m}
            onChange={(e) => setPoolData({ ...poolData, width_m: e.target.value })}
            onBlur={calculateVolume}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="4.0"
          />
        </div>
      </div>

      {/* Profondeur */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Profondeur min (m)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={poolData.depth_min_m}
            onChange={(e) => setPoolData({ ...poolData, depth_min_m: e.target.value })}
            onBlur={calculateVolume}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="1.20"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Profondeur max (m)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={poolData.depth_max_m}
            onChange={(e) => setPoolData({ ...poolData, depth_max_m: e.target.value })}
            onBlur={calculateVolume}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="1.60"
          />
        </div>
      </div>

      {/* Volume */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Volume (m³)
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            step="0.1"
            min="0"
            value={poolData.volume_m3}
            onChange={(e) => setPoolData({ ...poolData, volume_m3: e.target.value })}
            className="flex-1 px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="32.0"
          />
          <button
            type="button"
            onClick={calculateVolume}
            className="w-full sm:w-auto px-4 py-4 bg-blue-100 text-blue-700 rounded-xl font-semibold hover:bg-blue-200 transition-colors"
          >
            🔢 Calculer
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          💡 Calcul automatique : Longueur × Largeur × Profondeur moyenne
        </p>
      </div>

      {/* Particularités */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Particularités
        </label>
        <input
          type="text"
          value={poolData.particularity}
          onChange={(e) => setPoolData({ ...poolData, particularity: e.target.value })}
          className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="Liner bleu, éclairage LED, chauffage solaire..."
        />
      </div>

      {/* Équipements */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Équipements
        </label>
        <textarea
          value={poolData.equipment}
          onChange={(e) => setPoolData({ ...poolData, equipment: e.target.value })}
          rows={2}
          className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="Pompe Hayward 1.5CV, Filtre à sable 14m³/h, Robot Dolphin..."
        />
      </div>
    </div>
  );
}
