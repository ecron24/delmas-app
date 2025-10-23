'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Upload, Trash2, Download, File, FileSpreadsheet, FileImage } from 'lucide-react';

export default function InterventionDocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Reset input pour permettre de réuploader le même fichier
      e.target.value = '';

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

  // Fonction pour déterminer l'icône selon le type de fichier
  const getFileIcon = (docType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (docType.includes('pdf') || extension === 'pdf') {
      return <FileText className="w-10 h-10 text-red-600" />;
    }
    if (docType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension || '')) {
      return <FileSpreadsheet className="w-10 h-10 text-green-600" />;
    }
    if (docType.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <FileImage className="w-10 h-10 text-purple-600" />;
    }
    if (docType.includes('word') || ['doc', 'docx'].includes(extension || '')) {
      return <FileText className="w-10 h-10 text-blue-600" />;
    }
    return <File className="w-10 h-10 text-gray-600" />;
  };

  // Fonction pour formater la taille du fichier
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
              Gérer les documents
            </h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Retour
            </button>
          </div>

          {/* Zone d'upload unique */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-orange-300 rounded-xl p-8 cursor-pointer hover:bg-orange-50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-orange-600 mb-3" />
            <span className="text-lg font-semibold text-orange-900 mb-1">
              {uploading ? '⏳ Upload en cours...' : 'Ajouter un document'}
            </span>
            <span className="text-sm text-gray-500 text-center">
              PDF, Word, Excel, Images...
            </span>
            <span className="text-xs text-gray-400 mt-1">
              Max 10MB par fichier
            </span>
          </label>

          {/* Info sur les types acceptés */}
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <p className="text-xs text-blue-700">
              <strong>Types acceptés :</strong> PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, Images (.jpg, .png), Texte (.txt)
            </p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun document pour le moment</p>
            <p className="text-gray-400 text-sm mt-2">
              Utilisez le bouton ci-dessus pour ajouter des documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Icône + Infos */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {getFileIcon(doc.document_type, doc.document_name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate" title={doc.document_name}>
                        {doc.document_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {doc.document_type && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {doc.document_type.split('/')[1]?.toUpperCase() || 'DOC'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Télécharger</span>
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id, doc.document_url)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compteur de documents */}
        {documents.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length > 1 ? 's' : ''} total{documents.length > 1 ? 'aux' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
