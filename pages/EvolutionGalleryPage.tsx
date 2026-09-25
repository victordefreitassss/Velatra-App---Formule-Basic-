import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, ProgressPhoto } from '../types';
import { CameraIcon, PlusIcon, Trash2Icon as TrashIcon, ImageIcon, CalendarIcon, XIcon, EyeIcon, ShieldIcon } from '../components/Icons';
import { addDoc, db, updateDoc } from '../firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';

interface EvolutionGalleryPageProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EvolutionGalleryPage: React.FC<EvolutionGalleryPageProps> = ({ state, setState, showToast }) => {
  const { user, progressPhotos } = state;
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [additionalDates, setAdditionalDates] = useState<string[]>([]);
  const [newDateInput, setNewDateInput] = useState('');

  const userPhotos = progressPhotos
    .filter(p => p.memberId === user?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group photos by date
  const photosByDate = userPhotos.reduce((acc, photo) => {
    const date = photo.date.split('T')[0];
    if (!acc[date]) acc[date] = photo;
    return acc;
  }, {} as Record<string, ProgressPhoto>);

  const today = new Date().toISOString().split('T')[0];
  const allDates = Array.from(new Set([...Object.keys(photosByDate), today, ...additionalDates]));
  const sortedDates = allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleAddDate = () => {
    if (newDateInput && !allDates.includes(newDateInput)) {
      setAdditionalDates(prev => [...prev, newDateInput]);
      setNewDateInput('');
    }
  };

  const handleVisibilityToggle = async (photo: ProgressPhoto) => {
    if (!photo.id) {
      console.error('No photo ID found');
      showToast('Erreur: ID de photo manquant', 'error');
      return;
    }
    const newVisibility = photo.visibility === 'coach' ? 'private' : 'coach';
    try {
      await updateDoc(doc(db, 'progressPhotos', photo.id), { visibility: newVisibility });
      showToast('Visibilité mise à jour', 'success');
    } catch (error) {
      console.error('Error updating visibility:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleMeasurementChange = async (date: string, field: keyof NonNullable<ProgressPhoto['measurements']>, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const existingPhoto = photosByDate[date];

    try {
      if (existingPhoto) {
        const currentMeasurements = existingPhoto.measurements || {};
        const newMeasurements = { ...currentMeasurements };
        if (numValue === null) {
          delete newMeasurements[field];
        } else {
          newMeasurements[field] = numValue;
        }
        await updateDoc(doc(db, 'progressPhotos', existingPhoto.id), {
          measurements: newMeasurements
        });
      } else {
        if (numValue !== null && user) {
          const newPhoto: Omit<ProgressPhoto, 'id'> = {
            clubId: user.clubId,
            memberId: user.id,
            date: date + 'T12:00:00.000Z',
            visibility: 'private',
            measurements: {
              [field]: numValue
            }
          };
          await addDoc(collection(db, 'progressPhotos'), newPhoto);
        }
      }
    } catch (error) {
      console.error('Error updating measurement:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'frontUrl' | 'sideUrl' | 'backUrl', date: string) => {
    const file = e.target.files?.[0];
    if (!file || !user || !user.clubId) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('L\'image ne doit pas dépasser 5 Mo', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality to keep it well under 1MB
          const base64String = canvas.toDataURL('image/jpeg', 0.7);

          const existingPhoto = photosByDate[date];

          if (existingPhoto) {
            await updateDoc(doc(db, 'progressPhotos', existingPhoto.id), {
              [type]: base64String
            });
            showToast('Photo mise à jour', 'success');
          } else {
            const newPhoto: Omit<ProgressPhoto, 'id'> = {
              clubId: user.clubId,
              memberId: user.id,
              date: date + 'T12:00:00.000Z', // Use the selected date
              visibility: 'private', // Default to private
              [type]: base64String
            };
            await addDoc(collection(db, 'progressPhotos'), newPhoto);
            showToast('Photo ajoutée', 'success');
          }
          setIsUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Erreur lors de l\'upload', 'error');
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ces photos ?')) return;
    try {
      await deleteDoc(doc(db, 'progressPhotos', photoId));
      showToast('Photos supprimées', 'success');
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const PhotoSlot = ({ photo, type, date, label }: { photo?: ProgressPhoto, type: 'frontUrl' | 'sideUrl' | 'backUrl', date: string, label: string }) => {
    const url = photo?.[type];
    
    return (
      <div className="relative aspect-[3/4] bg-zinc-100 rounded-2xl overflow-hidden group border-2 border-dashed border-zinc-200 hover:border-emerald-400 transition-colors">
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover cursor-pointer" onClick={() => setSelectedPhoto(url)} />
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
              <CameraIcon size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">Remplacer</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, type, date)} disabled={isUploading} />
            </label>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 hover:text-emerald-500 cursor-pointer transition-colors">
            <PlusIcon size={32} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, type, date)} disabled={isUploading} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Galerie d'Évolution</h1>
          <p className="text-zinc-500 mt-1">Suivez votre transformation physique au fil du temps.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-zinc-200">
          <input 
            type="date" 
            value={newDateInput}
            onChange={(e) => setNewDateInput(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button 
            onClick={handleAddDate}
            disabled={!newDateInput}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          >
            Ajouter une date
          </button>
        </div>
      </div>

      <div className="space-y-12">
        {sortedDates.map(date => {
          const photo = photosByDate[date];
          const isToday = date === today;
          
          return (
            <motion.div 
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <CalendarIcon size={20} className="text-emerald-500" />
                  {isToday ? "Aujourd'hui" : new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (photo) {
                        handleVisibilityToggle(photo);
                      } else {
                        // Create an empty photo document with the new visibility
                        try {
                          const newPhoto: Omit<ProgressPhoto, 'id'> = {
                            clubId: user?.clubId || '',
                            memberId: user?.id || 0,
                            date: date + 'T12:00:00.000Z',
                            visibility: 'coach' // If it didn't exist, default was private, so toggle to coach
                          };
                          await addDoc(collection(db, 'progressPhotos'), newPhoto);
                          showToast('Visibilité mise à jour', 'success');
                        } catch (error) {
                          console.error('Error creating photo doc:', error);
                          showToast('Erreur lors de la mise à jour', 'error');
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                      photo?.visibility === 'coach' 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {photo?.visibility === 'coach' ? (
                      <><EyeIcon size={16} /> Partagé avec le coach</>
                    ) : (
                      <><ShieldIcon size={16} /> Seulement moi</>
                    )}
                  </button>
                  
                  {photo && (
                    <button 
                      onClick={() => handleDelete(photo.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                      title="Supprimer ces photos"
                    >
                      <TrashIcon size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <PhotoSlot photo={photo} type="frontUrl" date={date} label="Face" />
                <PhotoSlot photo={photo} type="sideUrl" date={date} label="Profil" />
                <PhotoSlot photo={photo} type="backUrl" date={date} label="Dos" />
              </div>

              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 uppercase tracking-wider">Mensurations (cm)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {[
                    { key: 'chest', label: 'Poitrine' },
                    { key: 'waist', label: 'Taille' },
                    { key: 'hips', label: 'Hanches' },
                    { key: 'arm', label: 'Bras' },
                    { key: 'thigh', label: 'Cuisse' },
                    { key: 'calf', label: 'Mollet' }
                  ].map(measurement => (
                    <div key={measurement.key}>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{measurement.label}</label>
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="--"
                        value={photo?.measurements?.[measurement.key as keyof NonNullable<ProgressPhoto['measurements']>] || ''}
                        onChange={(e) => handleMeasurementChange(date, measurement.key as keyof NonNullable<ProgressPhoto['measurements']>, e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-sm font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fullscreen Photo Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedPhoto(null)}
            >
              <XIcon size={32} />
            </button>
            <img src={selectedPhoto} alt="Evolution" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
