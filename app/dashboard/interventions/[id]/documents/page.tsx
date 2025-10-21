'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Trash2, Download } from 'lucide-react';

export default function InterventionDocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const supabase = createClient();

    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('intervention_documents')
      .select('*')
      .eq('intervention_id', params.id)
      .order('created_at', { ascending: false });

    setDocuments(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('⚠️ Le fichier est trop volumineux (max 10MB)');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      // Upload vers Supabase Storage
      const fileName = `${params.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('intervention-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('intervention-documents')
        .getPublicUrl(fileName);

      // Enregistrer dans la table
      const { error: insertError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_documents')
        .insert({
          intervention_id: params.id,
          document_url: publicUrl,
          document_name: file.name,
          document_type: file.type,
        });

      if (insertError) throw insertError;

      alert('✅ Document ajouté !');
      loadDocuments();

    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docUrl: string) => {
    if (!confirm('🗑️ Supprimer ce document ?')) return;

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_documents')
        .delete()
        .eq('id', docId);

      if (deleteError) throw deleteError;

      const filePath = docUrl.split('/intervention-documents/')[1];
      if (filePath) {
        await supabase.storage
          .from('intervention-documents')
          .remove([filePath]);
      }

      alert('✅ Document supprimé');
      loadDocuments();

    } catch (error: any) {
      alert(`❌ Erreur : ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-orange-600" />
              Documents de l'intervention
            </h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Retour
            </button>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-orange-300 rounded-xl p-8 cursor-pointer hover:bg-orange-50 transition-colors">
            <Upload className="w-12 h-12 text-orange-600 mb-3" />
            <span className="text-lg font-semibold text-orange-900 mb-1">
              {uploading ? '⏳ Upload en cours...' : 'Ajouter un document'}
            </span>
            <span className="text-sm text-gray-500">PDF, DOC, XLS... (max 10MB)</span>
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun document ajouté</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="w-10 h-10 text-orange-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{doc.document_name}</p>
                    <p className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id, doc.document_url)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
