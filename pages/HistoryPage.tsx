
import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import { Card, Badge, Input } from '../components/UI';
import { HistoryIcon, DumbbellIcon, CalendarIcon, UserIcon, ClockIcon } from '../components/Icons';
import { motion } from 'framer-motion';

export const HistoryPage: React.FC<{ state: AppState; setState: any }> = ({ state }) => {
  const user = state.user!;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'programs' | 'sessions'>('sessions');
  
  const allArchives = (user.role === 'coach' || user.role === 'owner') 
    ? state.archivedPrograms 
    : state.archivedPrograms.filter(p => p.memberId === Number(user.id));

  const archives = allArchives.filter(prog => {
    const member = state.users.find(u => Number(u.id) === prog.memberId);
    const memberName = ((prog as any).memberName || member?.name || '').toLowerCase();
    const progName = prog.name.toLowerCase();
    return memberName.includes(searchTerm.toLowerCase()) || progName.includes(searchTerm.toLowerCase());
  });

  const pastSessions = useMemo(() => {
    const sessions: any[] = [];
    
    // 1. Add bookings
    if (state.bookings) {
      const pastB = user.role === 'member' 
        ? state.bookings.filter(b => b.memberId === Number(user.id) && new Date(b.endTime) < new Date())
        : state.bookings.filter(b => b.coachId === String(user.id) && new Date(b.endTime) < new Date());
      
      pastB.forEach(b => {
        sessions.push({
          type: 'booking',
          data: b,
          date: new Date(b.startTime)
        });
      });
    }

    // 2. Add autonomous logs
    if (state.logs) {
      const autonomousLogs = state.logs.filter(l => !l.isCoaching);
      const userLogs = user.role === 'member'
        ? autonomousLogs.filter(l => l.memberId === Number(user.id))
        : autonomousLogs;
      
      userLogs.forEach(l => {
        sessions.push({
          type: 'autonomous',
          data: l,
          date: new Date(l.date)
        });
      });
    }

    return sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [state.bookings, state.logs, user]);

  const filteredSessions = useMemo(() => {
    return pastSessions
      .filter(s => {
        if (s.type === 'booking') {
          const b = s.data;
          const member = state.users.find(u => Number(u.id) === b.memberId);
          const memberName = (member?.name || '').toLowerCase();
          const bookingSettings = state.currentClub?.settings?.booking;
          const sessionType = bookingSettings?.sessionTypes?.find(t => t.id === b.sessionTypeId);
          const typeName = (sessionType?.name || 'Coaching').toLowerCase();
          return memberName.includes(searchTerm.toLowerCase()) || typeName.includes(searchTerm.toLowerCase());
        } else {
          const l = s.data;
          const member = state.users.find(u => Number(u.id) === l.memberId);
          const memberName = (member?.name || '').toLowerCase();
          const typeName = 'séance en autonomie';
          return memberName.includes(searchTerm.toLowerCase()) || typeName.includes(searchTerm.toLowerCase());
        }
      });
  }, [pastSessions, state.users, searchTerm, state.currentClub]);

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
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Historique <span className="text-emerald-500">VELATRA</span></h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">
            {activeTab === 'programs' ? `${archives.length} Cycles archivés` : `${filteredSessions.length} Séances passées`}
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <Input 
            placeholder="Rechercher..." 
            className="pl-12 \!bg-white \!border-zinc-200 !rounded-2xl font-bold text-sm shadow-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-4 border-b border-zinc-200 pb-2">
        <button 
          onClick={() => setActiveTab('sessions')}
          className={`pb-2 px-1 border-b-2 font-black uppercase tracking-widest text-xs transition-colors ${activeTab === 'sessions' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          Séances
        </button>
        <button 
          onClick={() => setActiveTab('programs')}
          className={`pb-2 px-1 border-b-2 font-black uppercase tracking-widest text-xs transition-colors ${activeTab === 'programs' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
        >
          Programmes
        </button>
      </motion.div>

      <motion.div variants={containerVariants} className="space-y-4">
        {activeTab === 'programs' ? (
          archives.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="py-20 text-center opacity-50 italic font-medium bg-white backdrop-blur-xl border-dashed shadow-sm">
                Aucun programme archivé. Terminez un cycle de 7 semaines pour le voir ici.
              </Card>
            </motion.div>
          ) : (
            archives.map((prog) => {
              const member = state.users.find(u => Number(u.id) === prog.memberId);
              return (
                <motion.div variants={itemVariants} key={prog.id}>
                  <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200 bg-white backdrop-blur-xl hover:border-emerald-500/30 !p-8 group transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-900 group-hover:text-emerald-500 transition-colors shadow-sm">
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
                              <span className="text-emerald-500">•</span> ATHLÈTE : {(prog as any).memberName || member?.name || 'Inconnu'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Badge variant="success" className="!bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20 italic shadow-sm">CYCLE 7 SEM. VALIDÉ</Badge>
                       <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors">Détails</motion.button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )
        ) : (
          filteredSessions.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="py-20 text-center opacity-50 italic font-medium bg-white backdrop-blur-xl border-dashed shadow-sm">
                Aucune séance passée.
              </Card>
            </motion.div>
          ) : (
            filteredSessions.map((session, index) => {
              if (session.type === 'booking') {
                const booking = session.data;
                const member = state.users.find(u => Number(u.id) === booking.memberId);
                const coach = state.users.find(u => String(u.id) === booking.coachId);
                const bookingSettings = state.currentClub?.settings?.booking;
                const sessionType = bookingSettings?.sessionTypes?.find(t => t.id === booking.sessionTypeId);
                
                const isConfirmedOrCompleted = booking.status === 'confirmed' || booking.status === 'completed';

                return (
                  <motion.div variants={itemVariants} key={`booking-${booking.id}-${index}`}>
                    <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200 bg-white backdrop-blur-xl hover:border-emerald-500/30 !p-8 group transition-all shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-900 group-hover:text-emerald-500 transition-colors shadow-sm">
                          <ClockIcon size={32} />
                        </div>
                        <div>
                          <div className="font-black text-xl text-zinc-900 uppercase italic tracking-tighter">
                            {sessionType?.name || (booking.type === 'trial' ? 'Séance d\'essai' : 'Séance Coaching')}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-zinc-900 font-black uppercase tracking-widest mt-2">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon size={12} /> {new Date(booking.startTime).toLocaleDateString()} {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            {(user.role === 'coach' || user.role === 'owner') ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-500">•</span> <UserIcon size={12} /> ATHLÈTE : {booking.type === 'trial' ? 'Prospect' : (member?.name || 'Inconnu')}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-500">•</span> <UserIcon size={12} /> COACH : {coach?.name || 'Inconnu'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <Badge variant={isConfirmedOrCompleted ? "success" : "dark"} className={`italic shadow-sm ${isConfirmedOrCompleted ? '!bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20' : '!bg-zinc-100 !text-zinc-500 !border-zinc-200'}`}>
                           {booking.status === 'completed' ? 'TERMINÉ' : (booking.status === 'cancelled' ? 'ANNULÉ' : 'PASSÉ')}
                         </Badge>
                      </div>
                    </Card>
                  </motion.div>
                );
              } else {
                // it is 'autonomous' log
                const log = session.data;
                const member = state.users.find(u => Number(u.id) === log.memberId);
                const logDate = new Date(log.date);

                return (
                  <motion.div variants={itemVariants} key={`auton-${log.id}-${index}`}>
                    <Card className="flex flex-col md:flex-row md:items-center justify-between gap-6 border border-zinc-200 bg-emerald-50/30 backdrop-blur-xl hover:border-emerald-500/30 !p-8 group transition-all shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-white border border-emerald-500/20 flex items-center justify-center text-emerald-600 transition-colors shadow-sm">
                          <DumbbellIcon size={32} />
                        </div>
                        <div>
                          <div className="font-black text-xl text-emerald-900 uppercase italic tracking-tighter">
                            Séance en autonomie
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-zinc-900 font-black uppercase tracking-widest mt-2">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon size={12} /> {logDate.toLocaleDateString()}
                            </div>
                            {(user.role === 'coach' || user.role === 'owner') && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-500">•</span> <UserIcon size={12} /> ATHLÈTE : {member?.name || 'Inconnu'}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                               <span className="text-emerald-500">•</span> JOUR : {log.dayName || 'Inconnu'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <Badge variant="success" className="italic shadow-sm !bg-emerald-500/10 !text-emerald-500 !border-emerald-500/20">
                           TERMINÉ
                         </Badge>
                      </div>
                    </Card>
                  </motion.div>
                );
              }
            })
          )
        )}
      </motion.div>
    </motion.div>
  );
};
