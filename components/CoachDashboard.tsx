
import React, { useState, useEffect } from 'react';
import { AppState, User, Program, Task } from '../types';
import { Card, StatBox, Button, Input, Badge } from './UI';
import { RefreshCwIcon, PlusIcon, SearchIcon, Trash2Icon, PlayIcon, LayersIcon, FlameIcon, MessageCircleIcon, SparklesIcon, BarChartIcon, LockIcon, CalendarIcon, InfoIcon, ClockIcon, CheckCircleIcon, UserIcon, FileTextIcon, TargetIcon } from './Icons';
import { db, doc, deleteDoc, updateDoc, setDoc } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface CoachDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onExport: () => void;
  onToggleTimer: () => void;
  showToast: (m: string, t?: any) => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({ state, setState, onToggleTimer, showToast }) => {
  const members = state.users.filter(u => u.role === 'member' && u.clubId === state.user?.clubId);

  // 1. Actions Urgentes
  const planRequests = members.filter(u => u.planRequested);
  const unreadMessages = state.messages?.filter(m => !m.read && m.to === state.user?.id) || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const tasksToday = state.tasks?.filter(t => t.status === 'todo' && t.dueDate === todayStr) || [];

  // 2. Prochaines Séances
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingEvents = state.bookings.filter(b => {
    const bDate = new Date(b.startTime);
    return bDate.getTime() >= todayStart.getTime() && b.status === 'confirmed';
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5);

  // 3. Alertes de Rétention
  const membersAtRisk = members.filter(u => {
    if (!u.lastWorkoutDate) return true;
    const last = new Date(u.lastWorkoutDate).getTime();
    const now = new Date().getTime();
    const isInactive = (now - last) > (86400000 * 7); // Plus de 7 jours sans séance
    
    if (!isInactive) return false;

    // Si le coach a déjà traité l'alerte (tâche "Relance" terminée récemment), on n'affiche plus l'alerte
    const hasRecentDoneTask = state.tasks?.some(t => 
      t.relatedMemberId === u.id && 
      t.title.includes('Relance') && 
      t.status === 'done' &&
      (now - new Date(t.dueDate).getTime()) < (86400000 * 7)
    );

    return !hasRecentDoneTask;
  });
  const failedSubs = state.subscriptions?.filter(s => (s.status === 'past_due' || s.status === 'unpaid') && s.clubId === state.user?.clubId) || [];

  // 5. Chiffres Clés
  const activeSubscriptions = state.subscriptions?.filter(s => s.status === 'active' && s.clubId === state.user?.clubId) || [];
  const mrr = activeSubscriptions.reduce((acc, sub) => {
    if (sub.billingCycle === 'monthly') return acc + sub.price;
    if (sub.billingCycle === 'yearly') return acc + (sub.price / 12);
    return acc;
  }, 0);
  const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentDay = Math.max(1, new Date().getDate());
  
  const sessionsThisMonth = state.logs?.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && l.clubId === state.user?.clubId;
  }).length || 0;
  
  const avgSessionsPerDay = (sessionsThisMonth / currentDay).toFixed(1);
  const [showAnnual, setShowAnnual] = useState(false);

  useEffect(() => {
    // Generate automated tasks for members at risk
    if (!state.user?.clubId) return;
    
    membersAtRisk.forEach(async (member) => {
      const taskExists = state.tasks.some(t => t.relatedMemberId === member.id && t.status === 'todo' && t.title.includes('Relance'));
      if (!taskExists) {
        const taskId = `auto_${member.id}_${Date.now()}`;
        const newTask: Task = {
          id: taskId,
          clubId: state.user.clubId!,
          title: `Relance : ${member.name}`,
          description: `Ce membre n'a pas fait de séance depuis plus de 7 jours. Un appel ou un message est recommandé.`,
          dueDate: new Date().toISOString().split('T')[0],
          assignedTo: state.user.id.toString(),
          status: 'todo',
          relatedMemberId: member.id
        };
        try {
          await setDoc(doc(db, "tasks", taskId), newTask);
        } catch (e) {
          console.error("Error creating automated task", e);
        }
      }
    });
  }, [membersAtRisk.length, state.tasks.length, state.user?.clubId]);

  const handleLaunchCoaching = (member: User) => {
    const program = state.programs.find(p => p.memberId === Number(member.id));
    if (!program) {
      showToast("Aucun programme actif", "error");
      return;
    }
    setState(prev => ({ ...prev, workout: program, workoutMember: member, workoutData: {}, validatedExercises: [] }));
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">Accueil</h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-[3px] font-bold">Votre Centre de Contrôle</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={onToggleTimer} className="flex-1 sm:flex-none !rounded-2xl !py-3 shadow-xl shadow-white/5">
            <RefreshCwIcon size={18} className="mr-2" /> TIMER
          </Button>
        </div>
      </motion.div>

      {/* 4. Raccourcis Rapides */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setState(s => ({ ...s, page: 'users', memberFilter: 'Tous' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-velatra-accent/5 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UserIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouveau Membre</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setState(s => ({ ...s, page: 'presets' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-velatra-accent/5 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <FileTextIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Créer Programme</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setState(s => ({ ...s, page: 'crm_finances' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-velatra-accent/5 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <BarChartIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouvelle Vente</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setState(s => ({ ...s, page: 'crm_pipeline' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/60 backdrop-blur-xl border border-zinc-200/50 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-velatra-accent/5 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <TargetIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouveau Prospect</span>
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 5. Chiffres Clés */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Chiffres Clés</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBox label="Séances (mois)" value={sessionsThisMonth} className="bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm" />
              <StatBox label="Moyenne / jour" value={avgSessionsPerDay} className="bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm" />
              <StatBox 
                label={showAnnual ? "ARR" : "MRR"} 
                value={`${showAnnual ? (mrr * 12).toFixed(0) : mrr.toFixed(0)}€`} 
                onClick={() => setShowAnnual(!showAnnual)} 
                className={`bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm cursor-pointer hover:ring-2 hover:ring-velatra-accent/50 transition-all`}
              />
              <StatBox label="Panier Moyen" value={`${arpu.toFixed(0)}€`} onClick={() => setState(s => ({ ...s, page: 'crm_finances' }))} className="bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm" />
            </div>
          </motion.section>

          {/* 1. Actions Urgentes */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Actions Urgentes</h2>
              <Badge variant="blue">AUJOURD'HUI</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 hover:border-velatra-accent/30 cursor-pointer shadow-sm hover:shadow-md transition-all h-full" onClick={() => setState(s => ({ ...s, page: 'users', memberFilter: 'Demande de Plan' }))}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl"><FileTextIcon size={20} /></div>
                    <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Plans</div>
                  </div>
                  <div className="text-4xl font-display font-bold text-zinc-900">{planRequests.length}</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">En attente</div>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 hover:border-velatra-accent/30 cursor-pointer shadow-sm hover:shadow-md transition-all h-full" onClick={() => setState(s => ({ ...s, page: 'chat' }))}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl"><MessageCircleIcon size={20} /></div>
                    <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Messages</div>
                  </div>
                  <div className="text-4xl font-display font-bold text-zinc-900">{unreadMessages.length}</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">Non lus</div>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Card className="!p-6 bg-white/60 backdrop-blur-xl border-zinc-200/50 hover:border-velatra-accent/30 cursor-pointer shadow-sm hover:shadow-md transition-all h-full" onClick={() => setState(s => ({ ...s, page: 'crm_tasks' }))}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl"><CheckCircleIcon size={20} /></div>
                    <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Tâches</div>
                  </div>
                  <div className="text-4xl font-display font-bold text-zinc-900">{tasksToday.length}</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">Pour aujourd'hui</div>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* 2. Prochaines Séances */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Prochaines Séances</h2>
              <Button variant="secondary" className="!py-1.5 !px-3 !text-[9px]" onClick={() => setState(s => ({ ...s, page: 'planning' }))}>VOIR PLANNING</Button>
            </div>
            {upcomingEvents.length === 0 ? (
              <Card className="!p-8 bg-white/60 backdrop-blur-xl border-dashed border-zinc-200/50 flex flex-col items-center justify-center text-center shadow-sm">
                <CalendarIcon size={32} className="text-zinc-400 mb-3" />
                <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Aucune séance prévue</p>
                <p className="text-[10px] text-zinc-500 mt-2">Gérez vos créneaux depuis l'onglet Planning.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event, idx) => {
                  const member = state.users.find(u => Number(u.id) === event.memberId);
                  const startTime = new Date(event.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(event.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  const isToday = new Date(event.startTime).toDateString() === new Date().toDateString();
                  const eventDate = new Date(event.startTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  return (
                    <Card key={idx} className="!p-4 bg-white/60 backdrop-blur-xl border-zinc-200/50 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-velatra-accent/10 text-velatra-accent flex flex-col items-center justify-center font-black text-xs leading-none">
                          <span className="text-[9px] mb-0.5 opacity-80">{isToday ? "AUJ" : eventDate.slice(0, 5)}</span>
                          <span>{startTime}</span>
                        </div>
                        <div>
                          <div className="font-bold text-zinc-900">{member?.name || 'Membre Inconnu'}</div>
                          <div className="text-xs text-zinc-500">{startTime} - {endTime}</div>
                        </div>
                      </div>
                      <Button variant="secondary" className="!py-2 !px-3 !text-[10px]" onClick={() => setState(s => ({ ...s, page: 'planning' }))}>
                        DÉTAILS
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 3. Alertes de Rétention */}
          <motion.section variants={itemVariants} className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 px-1 italic">Alertes Rétention</h2>
            <div className="space-y-3">
              {failedSubs.map(sub => {
                const member = members.find(m => Number(m.id) === sub.memberId);
                if (!member) return null;
                return (
                  <motion.div key={`sub_${sub.id}`} whileHover={{ scale: 1.02, x: -4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                    <Card className="!p-4 border-orange-500/30 bg-orange-500/10 backdrop-blur-md flex items-center justify-between shadow-sm hover:shadow-orange-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-600 shadow-inner"><InfoIcon size={20}/></div>
                        <div>
                          <div className="text-xs font-black text-zinc-900">{member.name}</div>
                          <div className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Paiement Échoué</div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {membersAtRisk.map(m => (
                <motion.div key={`risk_${m.id}`} whileHover={{ scale: 1.02, x: -4 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                  <Card className="!p-4 border-red-500/30 bg-red-500/10 backdrop-blur-md flex items-center justify-between shadow-sm hover:shadow-red-500/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-600 font-black shadow-inner">{m.avatar}</div>
                      <div>
                        <div className="text-xs font-black text-zinc-900">{m.name}</div>
                        <div className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-0.5">Inactif depuis 7j+</div>
                      </div>
                    </div>
                    <button onClick={() => handleLaunchCoaching(m)} className="p-2 text-zinc-500 hover:text-red-600 transition-colors bg-white/50 rounded-lg hover:bg-white/80"><PlayIcon size={18}/></button>
                  </Card>
                </motion.div>
              ))}

              {membersAtRisk.length === 0 && failedSubs.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-500 font-bold uppercase tracking-widest p-6 text-center bg-white/40 backdrop-blur-md rounded-3xl border border-zinc-200/50">
                  Tout est au vert <span className="text-green-500 ml-1">✅</span>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* Flux d'activité */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Activité</h2>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {state.feed.filter(f => f.clubId === state.user?.clubId).map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="!p-4 bg-white/60 backdrop-blur-xl border-zinc-200/50 flex items-center gap-4 group hover:border-velatra-accent/30 transition-all shadow-sm hover:shadow-md">
                    <div className="p-2.5 bg-gradient-to-br from-velatra-accent/20 to-velatra-accent/5 rounded-xl text-velatra-accent shadow-inner group-hover:scale-110 transition-transform">
                      {item.title.includes("Feedback") ? <MessageCircleIcon size={20}/> : <SparklesIcon size={20}/>}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-zinc-900 group-hover:text-velatra-accent transition-colors">{item.title}</div>
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                        {new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {item.userName}
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, "feed", item.id.toString()));
                        } catch (err) {
                          console.error("Error deleting feed item:", err);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Marquer comme traité"
                    >
                      <CheckCircleIcon size={18} />
                    </button>
                  </Card>
                </motion.div>
              ))}
              {state.feed.length === 0 && (
                <p className="text-center py-8 text-zinc-500 italic text-xs uppercase tracking-widest opacity-50">Aucune activité récente</p>
              )}
            </div>
          </motion.section>

        </div>
      </div>
    </motion.div>
  );
};
