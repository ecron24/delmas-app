'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'products' | 'templates' | 'pools' | 'clients'>('products');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      const headers = lines[0].split(';');

      // Parser les données
      const rows = lines.slice(1).map(line => {
        const values = line.split(';');
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h.trim()] = values[i]?.trim() || '';
        });
        return obj;
      });

      const supabase = createClient();
      let data: any[] = [];
      let table = '';

      // Transformer selon le type
      if (importType === 'products') {
        table = 'products';
        data = rows.map(r => ({
          name: r.nom || r.name,
          sku: r.reference || r.sku,
          category_id: r.category_id || r.categorie_id,
          selling_price: parseFloat(r.prix || r.selling_price || '0'),
          unit: r.unite || r.unit || 'unité',
          description: r.description || '',
          is_active: true,
        }));
      } else if (importType === 'templates') {
        table = 'task_templates';
        data = rows.map(r => ({
          name: r.nom || r.name,
          category: r.categorie || r.category,
          description: r.description || '',
          estimated_duration_hours: parseFloat(r.duree || r.duration || '1'),
          default_price: parseFloat(r.prix || r.price || '0'),
        }));
      } else if (importType === 'pools') {
        table = 'pool_types';
        data = rows.map(r => ({
          name: r.nom || r.name,
          description: r.description || '',
          typical_volume_m3: parseFloat(r.volume || r.typical_volume_m3 || '0') || null,
        }));
      } else if (importType === 'clients') {
        table = 'clients';
        const { data: { user } } = await supabase.auth.getUser();

        data = rows.map(r => ({
          type: r.type || 'particulier',
          first_name: r.prenom || r.first_name,
          last_name: r.nom || r.last_name,
          company_name: r.entreprise || r.company_name || null,
          email: r.email || null,
          phone: r.telephone || r.phone || null,
          mobile: r.mobile || null,
          address: r.adresse || r.address || null,
          postal_code: r.code_postal || r.postal_code || null,
          city: r.ville || r.city || null,
          notes: r.notes || null,
          created_by: user?.id,
        }));
      }

      // Import par batch de 50
      let imported = 0;
      for (let i = 0; i < data.length; i += 50) {
        const batch = data.slice(i, i + 50);
        const { error } = await supabase
          .schema('piscine_delmas_public')
          .from(table)
          .insert(batch);

        if (error) throw error;
        imported += batch.length;
      }

      setResult(`✅ ${imported} ligne(s) importée(s) avec succès !`);
    } catch (err: any) {
      setResult(`❌ Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadExample = () => {
    let csv = '';

    if (importType === 'products') {
      csv = '# TEMPLATE IMPORT PRODUITS - Delmas Piscine\n';
      csv += '# Instructions: Remplissez les lignes ci-dessous, supprimez les lignes de commentaire (#)\n';
      csv += '# Format: point-virgule (;) comme séparateur\n';
      csv += '# IMPORTANT: Récupérez d\'abord vos IDs de catégories dans la base\n';
      csv += '#\n';
      csv += 'nom;reference;category_id;prix;unite;description\n';
      csv += '# EXEMPLES (à supprimer après remplissage):\n';
      csv += 'Chlore choc 5kg;CHLORE-001;REMPLACER-PAR-UUID-CATEGORIE;45.00;kg;Désinfectant rapide action choc\n';
      csv += 'pH minus 1L;PH-002;REMPLACER-PAR-UUID-CATEGORIE;12.00;L;Réducteur pH pour eau alcaline\n';
      csv += 'Floculant 5L;FLOC-003;REMPLACER-PAR-UUID-CATEGORIE;28.00;L;Clarifiant eau trouble\n';
      csv += 'Anti-algues 2L;ALGUE-004;REMPLACER-PAR-UUID-CATEGORIE;22.00;L;Traitement préventif algues\n';
      csv += 'Bandelettes test;TEST-005;REMPLACER-PAR-UUID-CATEGORIE;15.00;boite;Analyse pH et Chlore 50 bandelettes\n';
      csv += '#\n';
      csv += '# LIGNES À REMPLIR (ajoutez autant de lignes que nécessaire):\n';
      for (let i = 0; i < 10; i++) {
        csv += ';;;;;;\n';
      }
    } else if (importType === 'templates') {
      csv = '# TEMPLATE IMPORT PRESTATIONS - Delmas Piscine\n';
      csv += '# Instructions: Remplissez les lignes ci-dessous\n';
      csv += '# Catégories valides: maintenance, repair, installation, emergency, diagnostic, cleaning, winterization, startup, other\n';
      csv += '#\n';
      csv += 'nom;categorie;description;duree;prix\n';
      csv += '# EXEMPLES (à supprimer après remplissage):\n';
      csv += 'Nettoyage complet;maintenance;Nettoyage fond parois et ligne eau;2.5;125.00\n';
      csv += 'Hivernage actif;winterization;Préparation piscine pour hiver avec surveillance;3.0;150.00\n';
      csv += 'Diagnostic panne;diagnostic;Diagnostic complet équipement et analyse;1.5;75.00\n';
      csv += 'Changement filtre;maintenance;Remplacement média filtrant sable ou cartouche;2.0;100.00\n';
      csv += 'Mise en service;startup;Remise en route complète après hivernage;3.0;150.00\n';
      csv += 'Réparation pompe;repair;Intervention réparation pompe de filtration;2.5;125.00\n';
      csv += 'Entretien hebdo;maintenance;Entretien hebdomadaire standard;1.0;50.00\n';
      csv += 'Traitement choc;maintenance;Traitement choc complet avec produits;1.5;75.00\n';
      csv += '#\n';
      csv += '# LIGNES À REMPLIR:\n';
      for (let i = 0; i < 10; i++) {
        csv += ';;;;;\n';
      }
    } else if (importType === 'pools') {
      csv = '# TEMPLATE IMPORT TYPES PISCINES - Delmas Piscine\n';
      csv += '# Instructions: Remplissez les lignes ci-dessous\n';
      csv += '# Volume: volume typique moyen en m³ (optionnel)\n';
      csv += '#\n';
      csv += 'nom;description;volume\n';
      csv += '# EXEMPLES (à supprimer après remplissage):\n';
      csv += 'Piscine enterrée béton;Construction maçonnée entièrement personnalisable durable;45\n';
      csv += 'Piscine acier;Installation rapide structure modulaire robuste en kit;35\n';
      csv += 'Piscine naturelle;Écosystème végétalisé zone baignade équilibrée écologique;60\n';
      csv += 'Piscine coque polyester;Coque monobloc installation rapide garantie étanchéité;30\n';
      csv += 'Piscine hors-sol;Installation temporaire ou permanente économique;20\n';
      csv += 'Piscine bois;Structure bois esthétique intégration naturelle jardin;25\n';
      csv += 'Piscine couloir nage;Bassin sportif dimensions optimisées natation;40\n';
      csv += '#\n';
      csv += '# LIGNES À REMPLIR:\n';
      for (let i = 0; i < 10; i++) {
        csv += ';;\n';
      }
    } else if (importType === 'clients') {
      csv = '# TEMPLATE IMPORT CLIENTS - Delmas Piscine\n';
      csv += '# Instructions: Remplissez les lignes ci-dessous\n';
      csv += '# Type: particulier ou professionnel\n';
      csv += '#\n';
      csv += 'type;prenom;nom;entreprise;email;telephone;mobile;adresse;code_postal;ville;notes\n';
      csv += '# EXEMPLES (à supprimer après remplissage):\n';
      csv += 'particulier;Jean;Dupont;;jean.dupont@email.com;0123456789;0612345678;15 rue de la Piscine;75001;Paris;Client depuis 2020\n';
      csv += 'professionnel;Marie;Martin;Hôtel des Palmiers;contact@hotel.com;0198765432;0687654321;25 avenue de la Plage;06000;Nice;Piscine 15x7m\n';
      csv += 'particulier;Pierre;Bernard;;pierre.b@email.com;0145678912;;8 impasse du Lac;33000;Bordeaux;\n';
      csv += '#\n';
      csv += '# LIGNES À REMPLIR (50 lignes):\n';
      for (let i = 0; i < 50; i++) {
        csv += ';;;;;;;;;;;\n';
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${importType}_delmas.csv`;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Import de données
        </h1>
        <p className="text-gray-600">
          Importer des produits, templates, types de piscine ou clients en masse
        </p>
      </div>

      {/* Type de données */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
        <label className="block text-sm font-bold text-gray-900 mb-3">
          1. Type de données
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setImportType('products')}
            className={`py-4 px-2 rounded-xl font-semibold transition-all text-sm md:text-base ${
              importType === 'products'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🛒<span className="block md:inline md:ml-1">Produits</span>
          </button>
          <button
            onClick={() => setImportType('templates')}
            className={`py-4 px-2 rounded-xl font-semibold transition-all text-sm md:text-base ${
              importType === 'templates'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋<span className="block md:inline md:ml-1">Templates</span>
          </button>
          <button
            onClick={() => setImportType('pools')}
            className={`py-4 px-2 rounded-xl font-semibold transition-all text-sm md:text-base ${
              importType === 'pools'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🏊<span className="block md:inline md:ml-1">Piscines</span>
          </button>
          <button
            onClick={() => setImportType('clients')}
            className={`py-4 px-2 rounded-xl font-semibold transition-all text-sm md:text-base ${
              importType === 'clients'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥<span className="block md:inline md:ml-1">Clients</span>
          </button>
        </div>
      </div>

      {/* Format attendu */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg">
        <p className="text-sm font-bold text-blue-900 mb-2">
          📄 Format CSV requis
        </p>
        <div className="bg-white p-3 rounded font-mono text-xs text-gray-800 overflow-x-auto">
          {importType === 'products' && 'nom;reference;category_id;prix;unite;description'}
          {importType === 'templates' && 'nom;categorie;description;duree;prix'}
          {importType === 'pools' && 'nom;description;volume'}
          {importType === 'clients' && 'type;prenom;nom;entreprise;email;telephone;mobile;adresse;code_postal;ville;notes'}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-blue-700">
            💡 Séparateur : <strong>point-virgule (;)</strong>
          </p>
          <button
            onClick={downloadExample}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700"
          >
            📥 Télécharger exemple
          </button>
        </div>
      </div>

      {/* Upload fichier */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
        <label className="block text-sm font-bold text-gray-900 mb-3">
          2. Fichier CSV
        </label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {file && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm text-green-800">
              ✅ <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} Ko)
            </p>
          </div>
        )}
      </div>

      {/* Bouton import */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-5 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 active:scale-95"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Import en cours...
          </span>
        ) : (
          '🚀 Lancer l\'import'
        )}
      </button>

      {/* Résultat */}
      {result && (
        <div className={`mt-6 p-6 rounded-xl border-2 ${
          result.startsWith('✅')
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'
        }`}>
          <p className={`text-lg font-bold ${
            result.startsWith('✅') ? 'text-green-900' : 'text-red-900'
          }`}>
            {result}
          </p>
        </div>
      )}

      {/* Aide */}
      <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <p className="text-sm font-bold text-gray-900 mb-3">
          ℹ️ Comment préparer ton fichier ?
        </p>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Ouvre Excel ou Google Sheets</li>
          <li>Remplis tes données selon le format ci-dessus</li>
          <li>Enregistre en <strong>CSV (délimiteur : point-virgule)</strong></li>
          <li>Upload le fichier ici</li>
        </ol>
        <p className="text-xs text-gray-500 mt-4">
          ⚠️ Pour les produits, récupère d'abord les IDs de catégories depuis la base
        </p>
      </div>
    </div>
  );
}
