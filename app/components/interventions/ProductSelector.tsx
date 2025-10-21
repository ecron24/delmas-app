'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  selling_price: number;
  category_id: string;
};

type SelectedProduct = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
};

type ProductSelectorProps = {
  selectedProducts: SelectedProduct[];
  onChange: (products: SelectedProduct[]) => void;
};

export function ProductSelector({ selectedProducts, onChange }: ProductSelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const { data: catData } = await supabase
        .schema('piscine_delmas_public')
        .from('product_categories')
        .select('id, name, parent_id')
        .order('name');

      setCategories(catData || []);

      const { data: prodData } = await supabase
        .schema('piscine_delmas_public')
        .from('products')
        .select('id, name, sku, unit, selling_price, category_id')
        .eq('is_active', true)
        .order('name');

      setProducts(prodData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const addOrUpdateProduct = (product: Product, quantity: number = 1) => {
    const existingIndex = selectedProducts.findIndex(p => p.product_id === product.id);

    if (existingIndex >= 0) {
      // Mettre à jour la quantité
      const updated = [...selectedProducts];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity,
      };
      onChange(updated);
    } else {
      // Ajouter nouveau
      onChange([
        ...selectedProducts,
        {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit: product.unit,
          unit_price: product.selling_price,
        },
      ]);
    }
  };

  const removeProduct = (productId: string) => {
    onChange(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(productId);
      return;
    }

    onChange(
      selectedProducts.map(p =>
        p.product_id === productId ? { ...p, quantity } : p
      )
    );
  };

  // Calculer total produits
  const totalProducts = selectedProducts.reduce((sum, p) => {
    const price = p.unit_price || 0;
    return sum + (price * p.quantity);
  }, 0);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : [];

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Catégories avec produits disponibles
  const categoriesWithProducts = categories.filter(cat => {
    const catProducts = products.filter(p => p.category_id === cat.id);
    return catProducts.length > 0;
  });

  return (
    <div className="space-y-3">
      {/* ✅ Résumé produits sélectionnés */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-blue-900">
              {selectedProducts.length} produit(s) sélectionné(s)
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
            >
              Tout retirer
            </button>
          </div>

          {/* Liste produits sélectionnés */}
          <div className="space-y-2">
            {selectedProducts.map((item) => {
              const product = products.find(p => p.id === item.product_id);
              return (
                <div key={item.product_id} className="bg-white rounded-lg p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product?.sku} • {item.unit_price?.toFixed(2)}€/{item.unit}
                    </p>
                  </div>

                  {/* Quantité */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-center text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700"
                    >
                      +
                    </button>
                  </div>

                  <span className="text-xs text-gray-600 w-12 text-right">{item.unit}</span>

                  {/* Total ligne */}
                  <span className="text-sm font-bold text-blue-600 w-16 text-right">
                    {((item.unit_price || 0) * item.quantity).toFixed(2)}€
                  </span>

                  {/* Supprimer */}
                  <button
                    type="button"
                    onClick={() => removeProduct(item.product_id)}
                    className="w-7 h-7 rounded-lg text-red-600 hover:bg-red-100 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total */}
          {totalProducts > 0 && (
            <div className="border-t border-blue-300 mt-2 pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-blue-900">TOTAL PRODUITS</span>
              <span className="text-sm font-bold text-green-600">
                💰 {totalProducts.toFixed(2)}€
              </span>
            </div>
          )}
        </div>
      )}

      {/* ✅ Sélection catégories ou produits */}
      {!selectedCategory ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200"></div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Sélectionner une catégorie
            </p>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {categoriesWithProducts.map((cat) => {
              const catProducts = products.filter(p => p.category_id === cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="text-left px-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <p className="font-semibold text-gray-900 text-sm truncate">{cat.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {catProducts.length} produit(s)
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          {/* Bouton retour */}
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux catégories
          </button>

          {/* Nom catégorie */}
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            {categories.find(c => c.id === selectedCategory)?.name}
          </p>

          {/* ✅ Produits en GRILLE COMPACTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredProducts.map((product) => {
              const selectedProduct = selectedProducts.find(p => p.product_id === product.id);
              const isSelected = !!selectedProduct;
              const quantity = selectedProduct?.quantity || 1;

              return (
                <div
                  key={product.id}
                  className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {product.sku} • {product.unit}
                      </p>
                      <p className="text-xs font-semibold text-green-600 mt-1">
                        💰 {product.selling_price.toFixed(2)}€
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-blue-600 font-bold text-lg flex-shrink-0">✓</span>
                    )}
                  </div>

                  {/* Actions */}
                  {!isSelected ? (
                    <button
                      type="button"
                      onClick={() => addOrUpdateProduct(product, 1)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      + Ajouter
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-white border-2 border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => updateQuantity(product.id, parseFloat(e.target.value) || 0)}
                        className="flex-1 px-2 py-2 border-2 border-gray-200 rounded-lg text-center text-sm font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-white border-2 border-gray-200 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-600 ml-1">{product.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message si aucun produit */}
      {selectedProducts.length === 0 && !selectedCategory && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">
            Sélectionnez une catégorie pour ajouter des produits
          </p>
        </div>
      )}
    </div>
  );
}
