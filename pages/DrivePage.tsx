import React from 'react';
import { AppState } from '../types';
import { FolderIcon, DownloadIcon, PlusIcon } from '../components/Icons';
import { Button } from '../components/UI';

export const DrivePage: React.FC<{ state: AppState }> = ({ state }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Drive Intégré</h1>
          <p className="text-zinc-500 mt-1">Stockez et partagez vos documents (PDF, guides, etc).</p>
        </div>
        <Button className="!rounded-full shadow-md">
          <PlusIcon size={18} className="mr-2" />
          Nouveau dossier
        </Button>
      </div>

      <div className="bg-white rounded-3xl p-12 text-center border border-zinc-100 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <FolderIcon size={40} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-4">Votre espace de stockage</h2>
        <p className="text-zinc-500 max-w-md mx-auto mb-8">
          Importez vos PDF, guides nutritionnels, et autres documents pour les partager facilement avec vos clients.
        </p>
        
        <div className="flex justify-center">
          <label className="cursor-pointer">
            <input type="file" className="hidden" multiple />
            <Button as="span" className="!rounded-full shadow-md">
              <DownloadIcon size={18} className="mr-2" />
              Importer des fichiers
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
};
