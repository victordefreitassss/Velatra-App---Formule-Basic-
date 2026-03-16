
import React, { useState, useEffect } from 'react';
import { AppState, User, Program, Task } from '../types';
import { Card, StatBox, Button, Input, Badge } from './UI';
import { RefreshCwIcon, PlusIcon, SearchIcon, Trash2Icon, PlayIcon, LayersIcon, FlameIcon, MessageCircleIcon, SparklesIcon, BarChartIcon, LockIcon, CalendarIcon, InfoIcon, ClockIcon, CheckCircleIcon, UserIcon, FileTextIcon, TargetIcon } from './Icons';
import { db, doc, deleteDoc, updateDoc, setDoc } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // 2. Agenda du Jour (Placeholder since events aren't in state yet)
  const eventsToday: any[] = []; // Future feature

  // 3. Alertes de Rétention
  const membersAtRisk = members.filter(u => {
    if (!u.lastWorkoutDate) return true;
    const last = new Date(u.lastWorkoutDate).getTime();
    const now = new Date().getTime();
    return (now - last) > (86400000 * 7); // Plus de 7 jours sans séance
  });
  const failedSubs = state.subscriptions?.filter(s => (s.status === 'past_due' || s.status === 'unpaid') && s.clubId === state.user?.clubId) || [];

  // 5. Chiffres Clés
  const isPremium = state.user?.role === 'superadmin' || state.currentClub?.plan === 'premium';
  const isClassic = isPremium || state.currentClub?.plan === 'classic';

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
    const program = state.programs.find(p => p.memberId === member.id);
    if (!program) {
      showToast("Aucun programme actif", "error");
      return;
    }
    setState(prev => ({ ...prev, workout: program, workoutMember: member, workoutData: {}, validatedExercises: [] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">Accueil</h1>
          <p className="text-zinc-900 text-[10px] uppercase tracking-[3px] font-bold">Votre Centre de Contrôle</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onToggleTimer} className="flex-1 sm:flex-none !rounded-2xl !py-3 shadow-xl shadow-white/5">
            <RefreshCwIcon size={18} className="mr-2" /> TIMER
          </Button>
        </div>
      </div>

      {/* 4. Raccourcis Rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => setState(s => ({ ...s, page: 'users' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-zinc-200 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-velatra-accent/10 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouveau Membre</span>
        </button>
        <button onClick={() => setState(s => ({ ...s, page: 'presets' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-zinc-200 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-velatra-accent/10 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileTextIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Créer Programme</span>
        </button>
        <button onClick={() => setState(s => ({ ...s, page: 'crm_finances' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-zinc-200 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-velatra-accent/10 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <BarChartIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouvelle Vente</span>
        </button>
        <button onClick={() => setState(s => ({ ...s, page: 'crm_pipeline' }))} className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-zinc-200 rounded-3xl hover:border-velatra-accent/30 hover:shadow-lg hover:shadow-velatra-accent/10 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-velatra-accent/10 text-velatra-accent flex items-center justify-center group-hover:scale-110 transition-transform">
            <TargetIcon size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Nouveau Prospect</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 5. Chiffres Clés */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Chiffres Clés</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBox label="Séances (mois)" value={sessionsThisMonth} />
              <StatBox label="Moyenne / jour" value={avgSessionsPerDay} />
              <StatBox 
                label={showAnnual ? "ARR" : "MRR"} 
                value={`${showAnnual ? (mrr * 12).toFixed(0) : mrr.toFixed(0)}€`} 
                locked={!isClassic} 
                onClick={() => isClassic ? setShowAnnual(!showAnnual) : setState(s => ({ ...s, page: 'crm_finances' }))} 
                className={isClassic ? "cursor-pointer hover:ring-2 hover:ring-velatra-accent/50 transition-all" : ""}
              />
              <StatBox label="Panier Moyen" value={`${arpu.toFixed(0)}€`} locked={!isClassic} onClick={() => setState(s => ({ ...s, page: 'crm_finances' }))} />
            </div>
          </section>

          {/* 1. Actions Urgentes */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Actions Urgentes</h2>
              <Badge variant="blue">AUJOURD'HUI</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="!p-5 bg-white border-zinc-200 hover:border-velatra-accent/30 cursor-pointer" onClick={() => setState(s => ({ ...s, page: 'users' }))}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><FileTextIcon size={20} /></div>
                  <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Plans</div>
                </div>
                <div className="text-3xl font-black text-zinc-900">{planRequests.length}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase mt-1">En attente</div>
              </Card>
              <Card className="!p-5 bg-white border-zinc-200 hover:border-velatra-accent/30 cursor-pointer" onClick={() => setState(s => ({ ...s, page: 'chat' }))}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><MessageCircleIcon size={20} /></div>
                  <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Messages</div>
                </div>
                <div className="text-3xl font-black text-zinc-900">{unreadMessages.length}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Non lus</div>
              </Card>
              <Card className="!p-5 bg-white border-zinc-200 hover:border-velatra-accent/30 cursor-pointer" onClick={() => setState(s => ({ ...s, page: 'crm_tasks' }))}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><CheckCircleIcon size={20} /></div>
                  <div className="font-black text-sm uppercase tracking-widest text-zinc-900">Tâches</div>
                </div>
                <div className="text-3xl font-black text-zinc-900">{tasksToday.length}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Pour aujourd'hui</div>
              </Card>
            </div>
          </section>

          {/* 2. Agenda du Jour */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Agenda du Jour</h2>
              <Button variant="secondary" className="!py-1.5 !px-3 !text-[9px]" onClick={() => setState(s => ({ ...s, page: 'calendar' }))}>VOIR PLANNING</Button>
            </div>
            <Card className="!p-8 bg-zinc-50 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center">
              <CalendarIcon size={32} className="text-zinc-400 mb-3" />
              <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Aucune séance prévue aujourd'hui</p>
              <p className="text-[10px] text-zinc-500 mt-2">Gérez vos créneaux depuis l'onglet Planning.</p>
            </Card>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 3. Alertes de Rétention */}
          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 px-1 italic">Alertes Rétention</h2>
            <div className="space-y-3">
              {failedSubs.map(sub => {
                const member = members.find(m => m.id === sub.memberId);
                if (!member) return null;
                return (
                  <Card key={`sub_${sub.id}`} className="!p-4 border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><InfoIcon size={20}/></div>
                      <div>
                        <div className="text-xs font-black text-zinc-900">{member.name}</div>
                        <div className="text-[9px] font-bold text-orange-500 uppercase">Paiement Échoué</div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {membersAtRisk.map(m => (
                <Card key={`risk_${m.id}`} className="!p-4 border-red-500/20 bg-red-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-black">{m.avatar}</div>
                    <div>
                      <div className="text-xs font-black text-zinc-900">{m.name}</div>
                      <div className="text-[9px] font-bold text-red-500 uppercase">Inactif depuis 7j+</div>
                    </div>
                  </div>
                  <button onClick={() => handleLaunchCoaching(m)} className="p-2 text-zinc-500 hover:text-zinc-900"><PlayIcon size={18}/></button>
                </Card>
              ))}

              {membersAtRisk.length === 0 && failedSubs.length === 0 && (
                <p className="text-xs text-zinc-900 italic p-4 text-center">Tout est au vert ✅</p>
              )}
            </div>
          </section>

          {/* Flux d'activité */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 italic">Activité</h2>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {state.feed.filter(f => f.clubId === state.user?.clubId).map((item) => (
                <Card key={item.id} className="!p-4 bg-zinc-50 border-zinc-200 flex items-center gap-4 group hover:border-velatra-accent/30 transition-all">
                  <div className="p-2 bg-velatra-accent/10 rounded-xl text-velatra-accent">
                    {item.title.includes("Feedback") ? <MessageCircleIcon size={20}/> : <SparklesIcon size={20}/>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-zinc-900">{item.title}</div>
                    <div className="text-[9px] text-zinc-900 font-black uppercase tracking-widest mt-1">
                      {new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {item.userName}
                    </div>
                  </div>
                </Card>
              ))}
              {state.feed.length === 0 && (
                <p className="text-center py-8 text-zinc-900 italic text-xs uppercase tracking-widest opacity-30">Aucune activité récente</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
