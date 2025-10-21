'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Camera, Upload, Trash2 } from 'lucide-react';

export default function InterventionPhotosPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const supabase = createClient();

    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('intervention_photos')
      .select('*')
      .eq('intervention_id', params.id)
      .order('created_at', { ascending: false });

    setPhotos(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Seules les images sont acceptées');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ La photo est trop volumineuse (max 5MB)');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      // Upload vers Supabase Storage
      const fileName = `${params.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('intervention-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('intervention-photos')
        .getPublicUrl(fileName);

      // Enregistrer dans la table
      const { error: insertError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_photos')
        .insert({
          intervention_id: params.id,
          photo_url: publicUrl,
          caption: file.name,
        });

      if (insertError) throw insertError;

      alert('✅ Photo ajoutée !');
      loadPhotos();

    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string, photoUrl: string) => {
    if (!confirm('🗑️ Supprimer cette photo ?')) return;

    try {
      const supabase = createClient();

      // Supprimer de la table
      const { error: deleteError } = await supabase
        .schema('piscine_delmas_public')
        .from('intervention_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) throw deleteError;

      // Supprimer du storage
      const filePath = photoUrl.split('/intervention-photos/')[1];
      if (filePath) {
        await supabase.storage
          .from('intervention-photos')
          .remove([filePath]);
      }

      alert('✅ Photo supprimée');
      loadPhotos();

    } catch (error: any) {
      console.error('Erreur suppression:', error);
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
              <Camera className="w-8 h-8 text-purple-600" />
              Photos de l'intervention
            </h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Retour
            </button>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-xl p-8 cursor-pointer hover:bg-purple-50 transition-colors">
            <Upload className="w-12 h-12 text-purple-600 mb-3" />
            <span className="text-lg font-semibold text-purple-900 mb-1">
              {uploading ? '⏳ Upload en cours...' : 'Ajouter une photo'}
            </span>
            <span className="text-sm text-gray-500">JPG, PNG (max 5MB)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {photos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucune photo ajoutée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <img
                  src={photo.photo_url}
                  alt={photo.caption}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3">{photo.caption}</p>
                  <button
                    onClick={() => handleDelete(photo.id, photo.photo_url)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
