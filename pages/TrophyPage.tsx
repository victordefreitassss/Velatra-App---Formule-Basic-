
import React from 'react';
import { AppState } from '../types';
import { Card, Badge } from '../components/UI';
import { TrophyIcon, CheckIcon } from '../components/Icons';

export const TrophyPage: React.FC<{ state: AppState, setState: any }> = ({ state }) => {
  const user = state.user!;
  const sessions = state.logs.filter(l => l.memberId === user.id).length;

  const milestones = [
    { title: "Débutant", target: 1, desc: "Première séance validée" },
    { title: "Régulier", target: 10, desc: "Le sport devient une habitude" },
    { title: "Déterminé", target: 25, desc: "Membre Fidèle du club" },
    { title: "Guerrier", target: 50, desc: "Statut VIP atteint" },
    { title: "Légende", target: 100, desc: "Inspiration pour tout le club" },
  ];

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="text-center space-y-2">
        <div className="inline-block p-4 bg-velatra-accent/10 rounded-full shadow-inner mb-2">
           <TrophyIcon size={48} className="text-velatra-accent" />
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Tableau des Trophées</h1>
        <p className="text-zinc-900 text-[10px] uppercase font-bold tracking-[3px]">Validé {sessions} séances à ce jour</p>
      </div>

      <div className="space-y-4">
        {milestones.map((m, i) => {
          const unlocked = sessions >= m.target;
          return (
            <Card key={i} className={`flex items-center gap-4 ${!unlocked ? 'opacity-40 grayscale' : 'border-velatra-warning'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${unlocked ? 'bg-velatra-warning text-velatra-bg' : 'bg-velatra-bg border border-velatra-border text-zinc-900'}`}>
                {unlocked ? <CheckIcon size={24} /> : m.target}
              </div>
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                   {m.title} 
                   {unlocked && <Badge variant="orange">Débloqué</Badge>}
                </div>
                <div className="text-xs text-zinc-500">{m.desc}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
