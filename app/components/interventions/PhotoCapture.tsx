// components/interventions/PhotoCapture.tsx
'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoCaptureProps {
  onPhotosChange: (photos: File[]) => void;
}

export function PhotoCapture({ onPhotosChange }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Filtrer uniquement les images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    // Vérifier la taille (max 5MB par photo)
    const validFiles = imageFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`⚠️ ${file.name} est trop volumineux (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Créer les previews
    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Mettre à jour les fichiers
    const updatedPhotos = [...photos, ...validFiles];
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);

    // Reset input pour permettre de reprendre la même photo
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);

    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">
          📸 Photos (optionnel)
        </label>
        <span className="text-xs text-gray-500">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Boutons d'action */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bouton Appareil Photo (Mobile) */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-xl p-4 cursor-pointer hover:bg-purple-50 transition-colors">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment" // 📸 BONUS: Active la caméra arrière sur mobile
            onChange={handleFileSelect}
            className="hidden"
          />
          <Camera className="w-8 h-8 text-purple-600 mb-2" />
          <span className="text-sm font-semibold text-purple-900 text-center">
            Prendre une photo
          </span>
          <span className="text-xs text-gray-500 text-center mt-1">
            Caméra
          </span>
        </label>

        {/* Bouton Sélectionner depuis Galerie */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-blue-600 mb-2" />
          <span className="text-sm font-semibold text-blue-900 text-center">
            Choisir fichier(s)
          </span>
          <span className="text-xs text-gray-500 text-center mt-1">
            Galerie
          </span>
        </label>
      </div>

      <p className="text-xs text-gray-500 text-center">
        JPG, PNG • Max 5MB par photo
      </p>

      {/* Grille de previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                title="Supprimer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                {(photos[index].size / 1024).toFixed(0)} KB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
