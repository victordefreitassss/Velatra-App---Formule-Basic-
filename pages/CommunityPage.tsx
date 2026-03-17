import React from 'react';
import { AppState } from '../types';
import { Card, Badge } from '../components/UI';
import { TrophyIcon, FlameIcon, UsersIcon } from '../components/Icons';

export const CommunityPage: React.FC<{ state: AppState }> = ({ state }) => {
  const user = state.user!;
  
  // Get all members of the same club, sorted by XP
  const leaderboard = state.users
    .filter(u => u.clubId === user.clubId && u.role === 'client')
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50); // Top 50

  const myRank = leaderboard.findIndex(u => u.id === user.id) + 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Communauté</h1>
          <p className="text-[10px] uppercase tracking-[2px] font-bold text-zinc-500">Classement du club</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-velatra-accent/10 flex items-center justify-center text-velatra-accent">
          <UsersIcon size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="!p-6 bg-gradient-to-br from-velatra-accent to-velatra-accentDark text-white border-none shadow-[0_10px_40px_rgba(99,102,241,0.3)]">
          <div className="flex items-center gap-3 mb-4 opacity-80">
            <TrophyIcon size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest">Mon Classement</h3>
          </div>
          <div className="text-5xl font-black tabular-nums">
            {myRank > 0 ? `#${myRank}` : '-'}
          </div>
          <p className="text-sm mt-2 opacity-80">Sur {leaderboard.length} membres</p>
        </Card>

        <Card className="!p-6 bg-zinc-50 border-zinc-200 md:col-span-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-6 flex items-center gap-2">
            <FlameIcon size={16} /> Top 10 du Club
          </h3>
          
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((member, index) => (
              <div 
                key={member.id} 
                className={`flex items-center justify-between p-3 rounded-xl border ${member.id === user.id ? 'bg-velatra-accent/5 border-velatra-accent/30' : 'bg-white border-zinc-100'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-zinc-200 text-zinc-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-zinc-50 text-zinc-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center font-bold text-lg text-zinc-900 ring-2 ring-white shrink-0">
                    {member.avatar || '👤'}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900">{member.name} {member.id === user.id && '(Moi)'}</p>
                    <p className="text-xs text-zinc-500">Niveau {Math.floor(member.xp / 1000) + 1}</p>
                  </div>
                </div>
                <Badge variant="success" className="uppercase tracking-widest text-[10px]">
                  {member.xp} XP
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
