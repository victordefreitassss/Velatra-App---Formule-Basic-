
import React from 'react';
import { AppState } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { PlayIcon, CalendarIcon } from '../components/Icons';

export const CalendarPage: React.FC<{ state: AppState, setState: any }> = ({ state, setState }) => {
  const user = state.user!;
  const program = state.programs.find(p => p.memberId === user.id);

  if (!program) {
    return (
      <div className="py-20 text-center opacity-50">
         Aucun programme actif. Contactez votre coach.
      </div>
    );
  }

  const startSession = (dayIdx: number) => {
    setState((s: AppState) => ({ 
      ...s, 
      workout: { ...program, currentDayIndex: dayIdx },
      workoutMember: user
    }));
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Mon Programme</h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">{program.name}</p>
        </div>
      </div>

      <div className="space-y-4">
        {program.days.map((day, idx) => (
          <Card key={idx} className="flex items-center justify-between group !p-6 bg-white border-zinc-200 hover:border-velatra-accent/30 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center font-bold text-xl text-zinc-900 group-hover:text-velatra-accent group-hover:border-velatra-accent/50 group-hover:bg-velatra-accent/10 transition-all shadow-inner">
                {idx + 1}
              </div>
              <div>
                <div className="font-bold text-lg text-zinc-900 mb-1">{day.name}</div>
                <div className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest flex items-center gap-2">
                  {day.exercises.length} Exercices
                </div>
              </div>
            </div>
            <Button variant="primary" className="!p-4 !rounded-2xl shadow-lg" onClick={() => startSession(idx)}>
               <PlayIcon size={20} className="ml-1" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
