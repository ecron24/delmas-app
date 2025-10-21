'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type Photo = {
  id: string;
  file_path: string;
  file_name: string;
  caption: string | null;
  created_at: string;
};

type ClientPhotosProps = {
  clientId: string;
};

export function ClientPhotos({ clientId }: ClientPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [clientId]);

  const loadPhotos = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .schema('piscine_delmas_public')
        .from('client_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Erreur chargement photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('❌ Fichier trop volumineux (max 5MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('❌ Seules les images sont acceptées');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${clientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .schema('piscine_delmas_public')
        .from('client_photos')
        .insert({
          client_id: clientId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      loadPhotos();
      e.target.value = '';
    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert('❌ Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Supprimer cette photo ?')) return;

    try {
      const supabase = createClient();

      const { error: storageError } = await supabase.storage
        .from('client-photos')
        .remove([photo.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .schema('piscine_delmas_public')
        .from('client_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      loadPhotos();
      setSelectedImage(null);
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const getPhotoUrl = (filePath: string) => {
    const supabase = createClient();
    const { data } = supabase.storage
      .from('client-photos')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Upload */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          📸 Photos ({photos.length})
        </h3>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="hidden sm:inline">Upload...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Ajouter</span>
              </>
            )}
          </span>
        </label>
      </div>

      {/* Grille photos */}
      {photos.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-gray-500">Aucune photo pour ce client</p>
          <p className="text-sm text-gray-400 mt-1">
            Ajoutez des photos de la piscine, des équipements, etc.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedImage(photo)}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all group"
            >
              <Image
                src={getPhotoUrl(photo.file_path)}
                alt={photo.file_name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal image agrandie */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video">
              <Image
                src={getPhotoUrl(selectedImage.file_path)}
                alt={selectedImage.file_name}
                fill
                className="object-contain"
              />
            </div>

            <div className="p-4 flex items-center justify-between border-t">
              <div>
                <p className="font-semibold text-gray-900">{selectedImage.file_name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(selectedImage.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(selectedImage)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  🗑️ Supprimer
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
