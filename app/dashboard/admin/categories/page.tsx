'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  product_count?: number;
};

type FormData = {
  name: string;
  description: string;
  parent_id: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    parent_id: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const supabase = createClient();

    // Récupérer catégories + nombre de produits
    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('product_categories')
      .select(`
        *,
        products:products(count)
      `)
      .order('name');

    const categoriesWithCount = (data || []).map(cat => ({
      ...cat,
      product_count: cat.products?.[0]?.count || 0,
    }));

    setCategories(categoriesWithCount);
    setLoading(false);
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    if (editingId) {
      // Modification
      const { error } = await supabase
        .schema('piscine_delmas_public')
        .from('product_categories')
        .update({
          name: formData.name,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
        })
        .eq('id', editingId);

      if (!error) {
        setShowForm(false);
        setEditingId(null);
        resetForm();
        fetchCategories();
      }
    } else {
      // Création
      const { error } = await supabase
        .schema('piscine_delmas_public')
        .from('product_categories')
        .insert({
          name: formData.name,
          description: formData.description || null,
          parent_id: formData.parent_id || null,
        });

      if (!error) {
        setShowForm(false);
        resetForm();
        fetchCategories();
      }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, productCount: number) => {
    if (productCount > 0) {
      alert(`❌ Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie.`);
      return;
    }

    if (!confirm('Supprimer cette catégorie ?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .schema('piscine_delmas_public')
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchCategories();
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', parent_id: null });
    setEditingId(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🗂️ Catégories Produits
          </h1>
          <p className="text-gray-600">
            Gérer les catégories et copier les UUID pour l'import
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg"
          >
            ➕ Nouvelle catégorie
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-500 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingId ? '✏️ Modifier la catégorie' : '➕ Nouvelle catégorie'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Produits d'entretien"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description optionnelle..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all"
              >
                {editingId ? '💾 Enregistrer' : '➕ Créer'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>UUID pour l'import CSV</strong>
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Cliquez sur "📋 Copier" pour copier l'UUID, puis collez-le dans la colonne{' '}
          <code className="bg-blue-100 px-1 rounded">category_id</code> de votre fichier CSV.
        </p>
      </div>

      {/* Liste catégories */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_auto_auto_auto] gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
          <div>Catégorie</div>
          <div className="text-center">Produits</div>
          <div className="text-center">UUID</div>
          <div></div>
          <div></div>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">📭</p>
            <p>Aucune catégorie trouvée</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 font-semibold hover:underline"
            >
              ➕ Créer la première catégorie
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => (
              <div
                key={category.id}
                className="grid grid-cols-[1fr_80px_auto_auto_auto] gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Nom */}
                <div>
                  <p className="font-semibold text-gray-900">{category.name}</p>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>

                {/* Nb produits */}
                <div className="flex items-center justify-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    category.product_count! > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {category.product_count}
                  </span>
                </div>

                {/* UUID */}
                <div className="font-mono text-xs text-gray-600 flex items-center bg-gray-50 px-3 rounded">
                  {category.id.substring(0, 8)}...
                </div>

                {/* Bouton copier */}
                <button
                  onClick={() => copyToClipboard(category.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    copied === category.id
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied === category.id ? '✓' : '📋'}
                </button>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-semibold text-sm hover:bg-yellow-600 transition-all"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.product_count!)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      category.product_count! > 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    disabled={category.product_count! > 0}
                    title={category.product_count! > 0 ? 'Suppression impossible : produits associés' : 'Supprimer'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            <strong>{categories.length}</strong> catégorie(s)
          </p>
          <p className="text-sm text-gray-700">
            <strong>{categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}</strong> produit(s) total
          </p>
        </div>
      </div>
    </div>
  );
}
