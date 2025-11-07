'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ProductSelector } from './ProductSelector';
import { InterventionTypeSelector } from './InterventionTypeSelector';
import { TaskTemplateSelector } from './TaskTemplateSelector';
import { PoolSelector } from '../pools/PoolSelector';
import { PoolForm } from '../pools/PoolForm';
import { PhotoCapture } from './PhotoCapture';

type Client = {
  id?: string;
  type: string;
  civility: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  notes: string | null;
};

type Intervention = {
  id: string;
  client_id: string;
  technician_id: string | null;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  created_from: string | null;
  intervention_types_junction: Array<{ intervention_type: string }>;
  pool_id?: string | null;
  task_template_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  travel_distance_km?: number | null;
  assigned_to?: string | null;
  technician_notes?: string | null;
};

type InterventionFormProps = {
  existingClient?: Client | null;
  existingIntervention?: Intervention | null;
  mode?: 'create' | 'edit';
};

export function InterventionForm({
  existingClient = null,
  existingIntervention = null,
  mode = 'create'
}: InterventionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);

  // 🎯 Mode édition : intervention Google Calendar qui peut être complétée
  const isGcalImport = existingIntervention?.created_from === 'gcal';
  const isEdit = mode === 'edit';

  // 📝 États pour le client (modifiable si import Google Calendar)
  const [clientData, setClientData] = useState<Client>({
    id: existingClient?.id,
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

  // 🏊 États pour la piscine
  const [poolMode, setPoolMode] = useState<'select' | 'create'>('select');
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [poolData, setPoolData] = useState<any>(null);

  // 🔧 États pour l'intervention
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
    status: 'scheduled',
  });

  // 🛠️ FONCTIONS UTILITAIRES
  const safeFormatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const safeFormatTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toTimeString().slice(0, 5);
    } catch {
      return '';
    }
  };

  // 📊 CHARGEMENT DES DONNÉES
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

  const loadExistingData = async (interventionId: string) => {
    try {
      const supabase = createClient();

      // 🏊 Charger la piscine associée
      if (existingIntervention?.pool_id) {
        const { data: poolData } = await supabase
          .schema('piscine_delmas_public')
          .from('client_pools')
          .select(`
            *,
            pool_types (name)
          `)
          .eq('id', existingIntervention.pool_id)
          .single();

        if (poolData) {
          setSelectedPool(poolData);
        }
      }

      // 📦 Charger les produits existants
      const { data: existingProducts } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_items')
        .select('*')
        .eq('intervention_id', interventionId);

      if (existingProducts && existingProducts.length > 0) {
        const formattedProducts = existingProducts.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price || 0, // ✅ Ajouté pour afficher les prix
        }));
        setInterventionData(prev => ({
          ...prev,
          products: formattedProducts
        }));
      }

    } catch (error) {
      console.error('Erreur chargement données existantes:', error);
    }
  };

  // 🎯 EFFECTS
  useEffect(() => {
    loadTechnicians();
  }, []);

  useEffect(() => {
    if (isEdit && existingIntervention?.id) {
      loadExistingData(existingIntervention.id);
    }
  }, [isEdit, existingIntervention?.id]);

  // 🎯 Préremplissage en mode édition
  useEffect(() => {
    if (isEdit && existingIntervention) {
      setInterventionData({
        scheduled_date: safeFormatDate(existingIntervention.scheduled_date),
        scheduled_time_start: safeFormatTime(existingIntervention.started_at),
        scheduled_time_end: safeFormatTime(existingIntervention.completed_at),
        intervention_types: existingIntervention.intervention_types_junction?.map(t => t.intervention_type) || [],
        selected_templates: [],
        technician: existingIntervention.assigned_to || existingIntervention.technician_id || '',
        travel_type: 'forfait',
        travel_distance_km: existingIntervention.travel_distance_km?.toString() || '',
        travel_fee: existingIntervention.travel_fee?.toString() || '',
        labor_hours: existingIntervention.labor_hours?.toString() || '',
        labor_rate: existingIntervention.labor_rate?.toString() || '',
        description: existingIntervention.description || '',
        products: [],
        intervention_notes: existingIntervention.technician_notes || '',
        status: existingIntervention.status || 'scheduled',
      });
    }
  }, [isEdit, existingIntervention]);

  // 🎯 HANDLERS
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

  const uploadPhotos = async (interventionId: string, photoFiles: File[]) => {
    const supabase = createClient();
    let successCount = 0;

    for (const photo of photoFiles) {
      try {
        const fileName = `${interventionId}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('intervention-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('intervention-photos')
          .getPublicUrl(fileName);

        await supabase
          .schema('piscine_delmas_public')
          .from('intervention_photos')
          .insert({
            intervention_id: interventionId,
            photo_url: publicUrl,
            caption: photo.name,
          });

        successCount++;
      } catch (error) {
        console.error(`❌ Erreur upload ${photo.name}:`, error);
      }
    }

    if (successCount > 0) {
      console.log(`✅ ${successCount}/${photoFiles.length} photo(s) uploadée(s)`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ Validations
    if (!interventionData.scheduled_date) {
      setError('La date d\'intervention est obligatoire');
      setLoading(false);
      return;
    }

    if (!interventionData.description.trim()) {
      setError('La description des travaux est obligatoire');
      setLoading(false);
      return;
    }

    if (interventionData.intervention_types.length === 0) {
      setError('Sélectionnez au moins un type d\'intervention');
      setLoading(false);
      return;
    }

    // Validation client pour nouveaux clients
    if (!existingClient) {
      if (!clientData.last_name.trim()) {
        setError('Le nom du client est obligatoire');
        setLoading(false);
        return;
      }

      if (clientData.type === 'professionnel' && !clientData.company_name?.trim()) {
        setError('La raison sociale est obligatoire pour les professionnels');
        setLoading(false);
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let clientId = existingClient?.id;

      // 👤 GESTION CLIENT
      if (isEdit && existingClient) {
        if (isGcalImport) {
          const { error: clientError } = await supabase
            .schema('piscine_delmas_public')
            .from('clients')
            .update({
              type: clientData.type,
              civility: clientData.civility,
              first_name: clientData.first_name,
              last_name: clientData.last_name,
              company_name: clientData.company_name,
              email: clientData.email,
              phone: clientData.phone,
              mobile: clientData.mobile,
              address: clientData.address,
              postal_code: clientData.postal_code,
              city: clientData.city,
              notes: clientData.notes,
            })
            .eq('id', existingClient.id);

          if (clientError) throw clientError;
        }
        clientId = existingClient.id;
      } else if (!existingClient) {
        const { data: newClient, error: clientError } = await supabase
          .schema('piscine_delmas_public')
          .from('clients')
          .insert({
            type: clientData.type,
            civility: clientData.civility,
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            company_name: clientData.company_name,
            email: clientData.email,
            phone: clientData.phone,
            mobile: clientData.mobile,
            address: clientData.address,
            postal_code: clientData.postal_code,
            city: clientData.city,
            notes: clientData.notes,
            created_by: user?.id,
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // 🏊 GESTION PISCINE
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

      // 🔧 GESTION INTERVENTION
      let interventionId: string;

      if (isEdit && existingIntervention) {
        const { error: interventionError } = await supabase
          .schema('piscine_delmas_public')
          .from('interventions')
          .update({
            pool_id: poolId || null,
            status: interventionData.status,
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
          })
          .eq('id', existingIntervention.id);

        if (interventionError) throw interventionError;

        // Supprimer les anciens types d'intervention
        await supabase
          .schema('piscine_delmas_public')
          .from('intervention_types_junction')
          .delete()
          .eq('intervention_id', existingIntervention.id);

        interventionId = existingIntervention.id;
      } else {
        const { data: newIntervention, error: interventionError } = await supabase
          .schema('piscine_delmas_public')
          .from('interventions')
          .insert({
            client_id: clientId,
            pool_id: poolId || null,
            status: interventionData.status,
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
        interventionId = newIntervention.id;
      }

      // Upload des photos
      if (photos.length > 0) {
        await uploadPhotos(interventionId, photos);
      }

      // 🔧 Insérer les nouveaux types d'intervention
      const typesData = interventionData.intervention_types.map(type => ({
        intervention_id: interventionId,
        intervention_type: type,
      }));

      const { error: typesError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_types_junction')
        .insert(typesData);

      if (typesError) throw typesError;

      // 📦 Gestion optimisée des produits
      if (interventionData.products.length > 0) {
        // Supprimer tous les anciens produits en mode édition
        if (isEdit) {
          await supabase
            .schema('piscine_delmas_public')
            .from('intervention_items')
            .delete()
            .eq('intervention_id', interventionId);
        }

        const productIds = interventionData.products.map(p => p.product_id);
        const { data: productsData } = await supabase
          .schema('piscine_delmas_public')
          .from('products')
          .select('id, selling_price, name, unit')
          .in('id', productIds);

        const interventionItems = interventionData.products.map(p => {
          const product = productsData?.find(prod => prod.id === p.product_id);
          return {
            intervention_id: interventionId,
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
      } else if (isEdit) {
        // Supprimer tous les produits si la liste est vide en mode édition
        await supabase
          .schema('piscine_delmas_public')
          .from('intervention_items')
          .delete()
          .eq('intervention_id', interventionId);
      }

      // 🎯 Redirection
      if (isEdit) {
        router.push(`/dashboard/interventions/${interventionId}`);
      } else {
        router.push('/dashboard/interventions');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ RETURN - JSX COMPLET
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* SECTION CLIENT */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          👤 Informations Client
        </h2>

        {existingClient && !isGcalImport && (
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
              disabled={existingClient && !isGcalImport}
              onClick={() => setClientData({ ...clientData, type: 'particulier' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'particulier'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${(existingClient && !isGcalImport) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Particulier
            </button>
            <button
              type="button"
              disabled={existingClient && !isGcalImport}
              onClick={() => setClientData({ ...clientData, type: 'professionnel' })}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                clientData.type === 'professionnel'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              } ${(existingClient && !isGcalImport) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              disabled={existingClient && !isGcalImport}
              value={clientData.company_name || ''}
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
              disabled={existingClient && !isGcalImport}
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
              disabled={existingClient && !isGcalImport}
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
            disabled={existingClient && !isGcalImport}
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
              disabled={existingClient && !isGcalImport}
              value={clientData.email || ''}
              onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="email@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Téléphone fixe
            </label>
            <input
              type="tel"
              disabled={existingClient && !isGcalImport}
              value={clientData.phone || ''}
              onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
              placeholder="01 23 45 67 89"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Mobile
          </label>
          <input
            type="tel"
            disabled={existingClient && !isGcalImport}
            value={clientData.mobile || ''}
            onChange={(e) => setClientData({ ...clientData, mobile: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            placeholder="06 12 34 56 78"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Adresse
          </label>
          <input
            type="text"
            disabled={existingClient && !isGcalImport}
            value={clientData.address || ''}
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
              disabled={existingClient && !isGcalImport}
              value={clientData.postal_code || ''}
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
              disabled={existingClient && !isGcalImport}
              value={clientData.city || ''}
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
            disabled={existingClient && !isGcalImport}
            value={clientData.notes || ''}
            onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50"
            placeholder="Type de piscine, équipements, remarques..."
          />
        </div>
      </div>

      {/* SECTION PISCINE */}
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
            💡 <strong>La piscine est optionnelle</strong> - Vous pouvez {isEdit ? 'modifier' : 'créer'} l'intervention sans renseigner de piscine.
            {!existingClient && !isEdit && (
              <span className="block mt-1">
                Pour un nouveau client, les informations piscine seront associées automatiquement après création du client.
              </span>
            )}
          </p>
        </div>

        {existingClient || isEdit ? (
          <>
            {poolMode === 'select' ? (
              <PoolSelector
                clientId={existingClient?.id || null}
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

      {/* SECTION INTERVENTION */}
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

        {/* Statut (uniquement en mode édition) */}
        {isEdit && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={interventionData.status}
              onChange={(e) => setInterventionData({ ...interventionData, status: e.target.value })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="scheduled">📅 Planifiée</option>
              <option value="in_progress">⏳ En cours</option>
              <option value="completed">✅ Terminée</option>
              <option value="cancelled">❌ Annulée</option>
            </select>
          </div>
        )}

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

      {/* SECTION PHOTOS */}
      <div className="pt-6 border-t-2 border-gray-200">
        <PhotoCapture onPhotosChange={setPhotos} />
      </div>

      {/* BOUTON SUBMIT */}
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
              {isEdit ? 'Mise à jour...' : 'Création en cours...'}
            </span>
          ) : (
            <>
              {isEdit ? (
                isGcalImport ? (
                  '🎯 Finaliser l\'intervention'
                ) : (
                  '✅ Enregistrer les modifications'
                )
              ) : (
                '✅ Créer l\'intervention'
              )}
            </>
          )}
        </button>
      </div>

      {/* INFO BOX POUR ÉDITION */}
      {isEdit && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Info :</strong> {isGcalImport
              ? 'Une fois finalisée, cette intervention sera complètement opérationnelle avec toutes ses informations.'
              : 'Les modifications seront sauvegardées et visibles immédiatement dans le planning.'
            }
          </p>
        </div>
      )}
    </form>
  );
}
