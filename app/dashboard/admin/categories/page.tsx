'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .schema('piscine_delmas_public')
        .from('product_categories')
        .select('*')
        .order('name');

      setCategories(data || []);
      setLoading(false);
    };

    fetchCategories();
  }, []);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🗂️ Catégories Produits
        </h1>
        <p className="text-gray-600">
          Liste des catégories avec leurs identifiants pour l'import CSV
        </p>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 <strong>Comment utiliser ces IDs ?</strong>
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Cliquez sur "Copier" pour copier l'UUID, puis collez-le dans la colonne <code className="bg-blue-100 px-1 rounded">category_id</code> de votre fichier CSV d'import produits.
        </p>
      </div>

      {/* Liste catégories */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
          <div>Catégorie</div>
          <div className="text-center">UUID</div>
          <div></div>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">📭</p>
            <p>Aucune catégorie trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => (
              <div
                key={category.id}
                className="grid grid-cols-[1fr_auto_auto] gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Nom */}
                <div>
                  <p className="font-semibold text-gray-900">{category.name}</p>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>

                {/* UUID */}
                <div className="font-mono text-xs text-gray-600 flex items-center bg-gray-50 px-3 rounded">
                  {category.id}
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
                  {copied === category.id ? '✓ Copié' : '📋 Copier'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>{categories.length}</strong> catégorie(s) disponible(s)
        </p>
      </div>
    </div>
  );
}
