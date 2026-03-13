import React from 'react';
import { AppState } from '../types';
import { Card, Button } from '../components/UI';
import { CalendarIcon, PlusIcon } from '../components/Icons';

export const PlanningPage: React.FC<{ state: AppState, setState: any }> = ({ state, setState }) => {
  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Planning</h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">Réservation de Séances</p>
        </div>
        <Button variant="primary" className="!rounded-full !py-2 !px-4">
          <PlusIcon size={16} className="mr-2" /> NOUVEAU CRÉNEAU
        </Button>
      </div>

      <Card className="p-8 text-center bg-zinc-50 border-dashed border-zinc-200">
        <CalendarIcon size={48} className="mx-auto text-zinc-500 mb-4" />
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Planning en construction</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          La fonctionnalité de réservation de séances sera bientôt disponible. Vous pourrez définir vos créneaux et vos membres pourront réserver directement depuis leur espace.
        </p>
      </Card>
    </div>
  );
};
