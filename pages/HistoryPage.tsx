
import React, { useState } from 'react';
import { AppState } from '../types';
import { Card, Badge, Input } from '../components/UI';
import { HistoryIcon, DumbbellIcon, CalendarIcon } from '../components/Icons';
import { motion } from 'framer-motion';

export const HistoryPage: React.FC<{ state: AppState; setState: any }> = ({ state }) => {
  const user = state.user!;
  const [searchTerm, setSearchTerm] = useState('');
  
  const allArchives = (user.role === 'coach' || user.role === 'owner') 
    ? state.archivedPrograms 
    : state.archivedPrograms.filter(p => p.memberId === Number(user.id));

  const archives = allArchives.filter(prog => {
    const member = state.users.find(u => Number(u.id) === prog.memberId);
    const memberName = ((prog as any).memberName || member?.name || '').toLowerCase();
    const progName = prog.name.toLowerCase();
    return memberName.includes(searchTerm.toLowerCase()) || progName.includes(searchTerm.toLowerCase());
  });

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
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
            className="pl-12 !bg-white/50 ! !rounded-2xl font-bold text-sm shadow-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </motion.div>

      <motion.div variants={containerVariants} className="space-y-4">
        {archives.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="py-20 text-center opacity-50 italic font-medium bg-white/60 backdrop-blur-xl border-dashed  shadow-sm">
              Aucun programme archivé. Terminez un cycle de 7 semaines pour le voir ici.
            </Card>
          </motion.div>
        ) : (
          archives.map((prog) => {
            const member = state.users.find(u => Number(u.id) === prog.memberId);
            return (
              <motion.div variants={itemVariants} key={prog.id}>
                <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 border  bg-white/60 backdrop-blur-xl hover:border-velatra-accent/30 !p-8 group transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-white/50 flex items-center justify-center text-zinc-900 group-hover:text-velatra-accent transition-colors shadow-sm">
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
                     <Badge variant="success" className="!bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20 italic shadow-sm">CYCLE 7 SEM. VALIDÉ</Badge>
                     <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Détails</motion.button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
};
