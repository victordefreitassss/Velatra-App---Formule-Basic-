import React from 'react';
import { AppState } from '../types';
import { Card, Button } from '../components/UI';
import { MegaphoneIcon, PlusIcon } from '../components/Icons';

export const MarketingPage: React.FC<{ state: AppState, setState: any }> = ({ state, setState }) => {
  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Campagnes</h1>
          <p className="text-xs text-zinc-700 font-semibold tracking-wide mt-2">Outils de communication en préparation</p>
        </div>
        <Button variant="secondary" disabled className="!py-2 !px-4 cursor-not-allowed">
          <PlusIcon size={16} className="mr-2" /> BIENTÔT DISPONIBLE
        </Button>
      </div>

      <Card className="p-8 text-center bg-white border-dashed ">
        <MegaphoneIcon size={48} className="mx-auto text-zinc-500 mb-4" />
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Marketing en construction</h3>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
          Les outils de campagnes ne sont pas encore disponibles. Cette page reste dans votre espace pour que vous la retrouviez quand la fonctionnalité sera prête.
        </p>
      </Card>
    </div>
  );
};
