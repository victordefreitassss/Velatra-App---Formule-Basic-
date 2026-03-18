import React from 'react';
import { AppState } from '../types';
import { PlayCircleIcon, PlusIcon, VideoIcon } from '../components/Icons';
import { Button } from '../components/UI';

export const VideoLibraryPage: React.FC<{ state: AppState }> = ({ state }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Vidéothèque</h1>
          <p className="text-zinc-500 mt-1">Hébergez vos cours en ligne et vidéos d'exécution.</p>
        </div>
        <Button className="!rounded-full shadow-md">
          <PlusIcon size={18} className="mr-2" />
          Ajouter une vidéo
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-12 text-center border border-zinc-100 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <PlayCircleIcon size={40} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Votre bibliothèque vidéo</h2>
        <p className="text-zinc-500 max-w-md mx-auto mb-8">
          Hébergez vos cours en ligne, vos tutoriels d'exercices et vos vidéos d'exécution pour offrir une expérience premium à vos clients.
        </p>
        
        <div className="flex justify-center">
          <label className="cursor-pointer">
            <input type="file" accept="video/*" className="hidden" multiple />
            <Button className="!rounded-full shadow-md pointer-events-none">
              <VideoIcon size={18} className="mr-2" />
              Importer une vidéo
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
};
