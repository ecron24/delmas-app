'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ProductSelector } from './ProductSelector';
import { InterventionTypeSelector } from './InterventionTypeSelector';
import { TaskTemplateSelector } from './TaskTemplateSelector';
import { PoolSelector } from '../pools/PoolSelector';
import { PoolForm } from '../pools/PoolForm';

type Client = {
  id?: string;
  type: string;
  civility: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  postal_code: string;
  city: string;
  notes: string;
};

type InterventionFormProps = {
  existingClient?: Client | null;
};

export function InterventionForm({ existingClient }: InterventionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);

  const [clientData, setClientData] = useState<Client>({
    type: existingClient?.type || 'particulier',
    civility: existingClient?.civility || 'M.',
    first_name: existingClient?.first_name || '',
    last_name: existingClient?.last_name || '',
    company_name: existingClient?.company_name || '',
    email: existingClient?.email || '',
    phone: existingClient?.phone || '',
    mobile: existingClient?.mobile || '',
    address: existingClient?.address || '',
    postal_code: existingClient?.postal_code || '',
    city: existingClient?.city || '',
    notes: existingClient?.notes || '',
  });

  const [poolMode, setPoolMode] = useState<'select' | 'create'>('select');
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [poolData, setPoolData] = useState<any>(null);

  const [interventionData, setInterventionData] = useState({
    scheduled_date: '',
    scheduled_time_start: '',
    scheduled_time_end: '',
    intervention_types: [] as string[],
    selected_templates: [] as any[],
    technician: '',
    travel_type: 'forfait',
    travel_distance_km: '',
    travel_fee: '',
    labor_hours: '',
    labor_rate: '',
    description: '',
    products: [] as any[],
    intervention_notes: '',
  });

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .schema('piscine_delmas_public')
        .from('technicians')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Erreur chargement techniciens:', error);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const handleTemplateChange = (templates: any[]) => {
    if (templates.length > 0) {
      const totalHours = templates.reduce((sum, t) => sum + t.estimated_duration_hours, 0);
      const totalPrice = templates.reduce((sum, t) => sum + t.default_price, 0);
      const avgRate = totalHours > 0 ? totalPrice / totalHours : 0;

      setInterventionData({
        ...interventionData,
        selected_templates: templates,
        labor_hours: totalHours.toFixed(1),
        labor_rate: avgRate.toFixed(2),
      });
    } else {
      setInterventionData({
        ...interventionData,
        selected_templates: [],
        labor_hours: '',
        labor_rate: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (interventionData.intervention_types.length === 0) {
        throw new Error('Sélectionnez au moins un type d\'intervention');
      }

      let clientId = existingClient?.id;

      if (!existingClient) {
        const { data: newClient, error: clientError } = await supabase
          .schema('piscine_delmas_public')
          .from('clients')
          .insert({
            ...clientData,
            created_by: user?.id,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      let poolId = selectedPool?.id;

      if (poolMode === 'create' && poolData && poolData.pool_type_id) {
        const { data: newPool, error: poolError } = await supabase
          .schema('piscine_delmas_public')
          .from('client_pools')
          .insert({
            client_id: clientId,
            pool_type_id: poolData.pool_type_id,
            length_m: poolData.length_m ? parseFloat(poolData.length_m) : null,
            width_m: poolData.width_m ? parseFloat(poolData.width_m) : null,
            depth_min_m: poolData.depth_min_m ? parseFloat(poolData.depth_min_m) : null,
            depth_max_m: poolData.depth_max_m ? parseFloat(poolData.depth_max_m) : null,
            volume_m3: poolData.volume_m3 ? parseFloat(poolData.volume_m3) : null,
            particularity: poolData.particularity || null,
            equipment: poolData.equipment || null,
          })
          .select()
          .single();

        if (poolError) throw poolError;
        poolId = newPool.id;
      }

      const { data: newIntervention, error: interventionError } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .insert({
          client_id: clientId,
          pool_id: poolId || null,
          status: 'scheduled',
          task_template_id: interventionData.selected_templates.length > 0
            ? interventionData.selected_templates[0].id
            : null,
          scheduled_date: interventionData.scheduled_date,
          started_at: interventionData.scheduled_time_start
            ? `${interventionData.scheduled_date}T${interventionData.scheduled_time_start}:00`
            : null,
          completed_at: interventionData.scheduled_time_end
            ? `${interventionData.scheduled_date}T${interventionData.scheduled_time_end}:00`
            : null,
          description: interventionData.description,
          travel_distance_km: interventionData.travel_distance_km ? parseFloat(interventionData.travel_distance_km) : null,
          travel_fee: interventionData.travel_fee ? parseFloat(interventionData.travel_fee) : 0,
          labor_hours: interventionData.labor_hours ? parseFloat(interventionData.labor_hours) : null,
          labor_rate: interventionData.labor_rate ? parseFloat(interventionData.labor_rate) : null,
          assigned_to: interventionData.technician || null,
          technician_notes: interventionData.intervention_notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (interventionError) throw interventionError;

      const typesData = interventionData.intervention_types.map(type => ({
        intervention_id: newIntervention.id,
        intervention_type: type,
      }));

      const { error: typesError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_types_junction')
        .insert(typesData);

      if (typesError) throw typesError;

      if (interventionData.products.length > 0) {
        const productIds = interventionData.products.map(p => p.product_id);
        const { data: productsData } = await supabase
          .schema('piscine_delmas_public')
          .from('products')
          .select('id, selling_price, name, unit')
          .in('id', productIds);

        const interventionItems = interventionData.products.map(p => {
          const product = productsData?.find(prod => prod.id === p.product_id);
          return {
            intervention_id: newIntervention.id,
            product_id: p.product_id,
            product_name: product?.name || p.product_name,
            quantity: p.quantity,
            unit: product?.unit || p.unit,
            unit_price: product?.selling_price || 0,
          };
        });

        const { error: itemsError } = await supabase
          .schema('piscine_delmas_public')
          .from('intervention_items')
          .insert(interventionItems);

        if (itemsError) throw itemsError;
      }

      router.push('/dashboard/interventions');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          👤 Informations Client
        </h2>

        {existingClient && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              ✅ Client existant - Informations en lecture seule
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Type de client
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!!existingClient}
              onClick={() => setClientData({ ...clientData, type: 'particulier' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'particulier'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${existingClient ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Particulier
            </button>
            <button
              type="button"
              disabled={!!existingClient}
              onClick={() => setClientData({ ...clientData, type: 'professionnel' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'professionnel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${existingClient ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Professionnel
            </button>
          </div>
        </div>

        {clientData.type === 'professionnel' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Raison sociale *
            </label>
            <input
              type="text"
              required
              disabled={!!existingClient}
              value={clientData.company_name}
              onChange={(e) => setClientData({ ...clientData, company_name: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="Nom de l'entreprise"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Civilité *
            </label>
            <select
              required
              disabled={!!existingClient}
              value={clientData.civility}
              onChange={(e) => setClientData({ ...clientData, civility: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            >
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
              <option value="Mlle">Mlle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {clientData.type === 'professionnel' ? 'Nom contact *' : 'Nom *'}
            </label>
            <input
              type="text"
              required
              disabled={!!existingClient}
              value={clientData.last_name}
              onChange={(e) => setClientData({ ...clientData, last_name: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="Nom de famille"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prénom {clientData.type === 'professionnel' && 'du contact'}
          </label>
          <input
            type="text"
            disabled={!!existingClient}
            value={clientData.first_name}
            onChange={(e) => setClientData({ ...clientData, first_name: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            placeholder="Prénom (optionnel)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              disabled={!!existingClient}
              value={clientData.email}
              onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="email@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              disabled={!!existingClient}
              value={clientData.phone}
              onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="01 23 45 67 89"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Adresse
          </label>
          <input
            type="text"
            disabled={!!existingClient}
            value={clientData.address}
            onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            placeholder="15 rue de la Piscine"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Code postal
            </label>
            <input
              type="text"
              disabled={!!existingClient}
              value={clientData.postal_code}
              onChange={(e) => setClientData({ ...clientData, postal_code: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="75001"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ville
            </label>
            <input
              type="text"
              disabled={!!existingClient}
              value={clientData.city}
              onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="Paris"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes client
          </label>
          <textarea
            disabled={!!existingClient}
            value={clientData.notes}
            onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            placeholder="Type de piscine, équipements, remarques..."
          />
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t-2 border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🏊 Piscine
            <span className="text-sm font-normal text-gray-500">(optionnel)</span>
          </h2>

          {(selectedPool || poolMode === 'create') && (
            <button
              type="button"
              onClick={() => {
                setSelectedPool(null);
                setPoolMode('select');
                setPoolData(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-800 font-semibold underline"
            >
              ✕ Ignorer la piscine
            </button>
          )}
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>La piscine est optionnelle</strong> - Vous pouvez créer l'intervention sans renseigner de piscine.
            {!existingClient && (
              <span className="block mt-1">
                Pour un nouveau client, les informations piscine seront associées automatiquement après création du client.
              </span>
            )}
          </p>
        </div>

        {existingClient ? (
          <>
            {poolMode === 'select' ? (
              <PoolSelector
                clientId={existingClient.id || null}
                selectedPool={selectedPool}
                onPoolSelect={setSelectedPool}
                onCreateNew={() => setPoolMode('create')}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPoolMode('select');
                    setPoolData(null);
                  }}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Retour aux piscines existantes
                </button>
                <PoolForm onPoolData={setPoolData} />
              </>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setPoolMode('select');
                setPoolData(null);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                poolMode === 'select'
                  ? 'bg-green-50 border-green-500 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⏭️</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Pas de piscine pour le moment</p>
                  <p className="text-xs text-gray-500">Continuer sans renseigner de piscine</p>
                </div>
              </div>
              {poolMode === 'select' && (
                <span className="text-green-600 font-bold text-lg">✓</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPoolMode('create')}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                poolMode === 'create'
                  ? 'bg-blue-50 border-blue-500 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">➕</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Créer une piscine maintenant</p>
                  <p className="text-xs text-gray-500">Renseigner les informations de la piscine</p>
                </div>
              </div>
              {poolMode === 'create' && (
                <span className="text-blue-600 font-bold text-lg">✓</span>
              )}
            </button>

            {poolMode === 'create' && (
              <div className="mt-4">
                <PoolForm onPoolData={setPoolData} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6 border-t-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          🔧 Détails de l'intervention
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              required
              value={interventionData.scheduled_date}
              onChange={(e) => setInterventionData({ ...interventionData, scheduled_date: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Heure début
            </label>
            <input
              type="time"
              value={interventionData.scheduled_time_start}
              onChange={(e) => setInterventionData({ ...interventionData, scheduled_time_start: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Heure fin
            </label>
            <input
              type="time"
              value={interventionData.scheduled_time_end}
              onChange={(e) => setInterventionData({ ...interventionData, scheduled_time_end: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Type(s) d'intervention *
          </label>
          <InterventionTypeSelector
            selectedTypes={interventionData.intervention_types}
            onChange={(types) => setInterventionData({ ...interventionData, intervention_types: types })}
          />
        </div>

        {interventionData.intervention_types.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prestation(s) standard (optionnel)
            </label>
            <TaskTemplateSelector
              selectedTypes={interventionData.intervention_types}
              selectedTemplateIds={interventionData.selected_templates.map(t => t.id)}
              onChange={handleTemplateChange}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Durée estimée (heures)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={interventionData.labor_hours}
              onChange={(e) => setInterventionData({ ...interventionData, labor_hours: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Taux horaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={interventionData.labor_rate}
              onChange={(e) => setInterventionData({ ...interventionData, labor_rate: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="45.00"
            />
          </div>
        </div>

        {interventionData.labor_hours && interventionData.labor_rate && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-900">
              💰 Total main d'œuvre : {(parseFloat(interventionData.labor_hours) * parseFloat(interventionData.labor_rate)).toFixed(2)}€
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Technicien
          </label>
          {loadingTechnicians ? (
            <div className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Chargement...
            </div>
          ) : (
            <select
              value={interventionData.technician}
              onChange={(e) => setInterventionData({ ...interventionData, technician: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">Non assigné</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Déplacement
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setInterventionData({ ...interventionData, travel_type: 'forfait' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                interventionData.travel_type === 'forfait'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Forfait
            </button>
            <button
              type="button"
              onClick={() => setInterventionData({ ...interventionData, travel_type: 'km' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                interventionData.travel_type === 'km'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Au km
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {interventionData.travel_type === 'km' && (
              <div>
                <input
                  type="number"
                  step="0.1"
                  value={interventionData.travel_distance_km}
                  onChange={(e) => setInterventionData({ ...interventionData, travel_distance_km: e.target.value })}
                  className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Distance (km)"
                />
              </div>
            )}
            <div>
              <input
                type="number"
                step="0.01"
                value={interventionData.travel_fee}
                onChange={(e) => setInterventionData({ ...interventionData, travel_fee: e.target.value })}
                className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Montant (€)"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description des travaux *
          </label>
          <textarea
            required
            value={interventionData.description}
            onChange={(e) => setInterventionData({ ...interventionData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Détails de l'intervention..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Produits utilisés
          </label>
          <ProductSelector
            selectedProducts={interventionData.products}
            onChange={(products) => setInterventionData({ ...interventionData, products })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notes complémentaires
          </label>
          <textarea
            value={interventionData.intervention_notes}
            onChange={(e) => setInterventionData({ ...interventionData, intervention_notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Observations, recommandations..."
          />
        </div>
      </div>

      <div className="pt-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Création en cours...
            </span>
          ) : (
            '✅ Créer l\'intervention'
          )}
        </button>
      </div>
    </form>
  );
}
