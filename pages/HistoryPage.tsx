
import React, { useState } from 'react';
import { AppState } from '../types';
import { Card, Badge, Input } from '../components/UI';
import { HistoryIcon, DumbbellIcon, CalendarIcon } from '../components/Icons';

export const HistoryPage: React.FC<{ state: AppState; setState: any }> = ({ state }) => {
  const user = state.user!;
  const [searchTerm, setSearchTerm] = useState('');
  
  const allArchives = (user.role === 'coach' || user.role === 'owner') 
    ? state.archivedPrograms 
    : state.archivedPrograms.filter(p => p.memberId === user.id);

  const archives = allArchives.filter(prog => {
    const member = state.users.find(u => u.id === prog.memberId);
    const memberName = ((prog as any).memberName || member?.name || '').toLowerCase();
    const progName = prog.name.toLowerCase();
    return memberName.includes(searchTerm.toLowerCase()) || progName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Historique <span className="text-velatra-accent">VELATRA</span></h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">{archives.length} Cycles archivés</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <Input 
            placeholder="Rechercher..." 
            className="pl-12 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold text-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="space-y-4">
        {archives.length === 0 ? (
          <Card className="py-20 text-center opacity-30 italic font-medium bg-transparent border-dashed border-zinc-200">
            Aucun programme archivé. Terminez un cycle de 7 semaines pour le voir ici.
          </Card>
        ) : (
          archives.map((prog) => {
            const member = state.users.find(u => u.id === prog.memberId);
            return (
              <Card key={prog.id} className="flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200 bg-white hover:border-velatra-accent/20 !p-8 group transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-900 group-hover:text-velatra-accent transition-colors">
                    <HistoryIcon size={32} />
                  </div>
                  <div>
                    <div className="font-black text-xl text-zinc-900 uppercase italic tracking-tighter">{prog.name}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-zinc-900 font-black uppercase tracking-widest mt-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon size={12} /> FINI LE : {new Date((prog as any).endDate || Date.now()).toLocaleDateString()}
                      </div>
                      {(user.role === 'coach' || user.role === 'owner') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-velatra-accent">•</span> ATHLÈTE : {(prog as any).memberName || member?.name || 'Inconnu'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <Badge variant="success" className="!bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20 italic">CYCLE 7 SEM. VALIDÉ</Badge>
                   <button className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Détails</button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
