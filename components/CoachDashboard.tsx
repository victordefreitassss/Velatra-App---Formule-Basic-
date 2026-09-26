
import React, { useState, useEffect } from 'react';
import { AppState, User, Program, Task } from '../types';
import { Card, StatBox, Button, Input, Badge } from './UI';
import { RefreshCwIcon, PlusIcon, SearchIcon, Trash2Icon, PlayIcon, LayersIcon, FlameIcon, MessageCircleIcon, SparklesIcon, BarChartIcon, LockIcon, CalendarIcon, InfoIcon, ClockIcon, CheckCircleIcon, UserIcon, FileTextIcon, TargetIcon, GiftIcon, DollarSignIcon } from './Icons';
import { db, doc, deleteDoc, updateDoc, setDoc } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { countTodayUpcomingSessions } from './appShellHelpers';

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
  const reduceMotion = useReducedMotion();
  const members = (state.users || []).filter(u => u.role === 'member' && u.clubId === state.user?.clubId);

  // 1. Actions Urgentes
  const planRequests = members.filter(u => u.planRequested);
  const unreadMessages = (state.messages || []).filter(m => !m.read && m.to === state.user?.id);
  const todayStr = new Date().toISOString().split('T')[0];
  const tasksToday = (state.tasks || []).filter(t => t.status === 'todo' && t.dueDate === todayStr);

  // 2. Prochaines Séances
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySessionsCount = countTodayUpcomingSessions(state.bookings || []);
  const upcomingEvents = (state.bookings || []).filter(b => {
    const bDate = new Date(b.startTime);
    return bDate.getTime() >= todayStart.getTime() && b.status === 'confirmed';
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5);
  const prospectsToFollowUp = (state.prospects || []).filter(prospect => {
    if (prospect.clubId !== state.user?.clubId || prospect.status === 'won' || prospect.status === 'lost') return false;
    return prospect.status === 'call_pending' || Boolean(prospect.nextReminderDate && prospect.nextReminderDate.slice(0, 10) <= todayStr);
  });

  // 3. Alertes de Rétention
  const membersAtRisk = members.filter(u => {
    if (!u.lastWorkoutDate) return true;
    const last = new Date(u.lastWorkoutDate).getTime();
    const now = new Date().getTime();
    const isInactive = (now - last) > (86400000 * 7); // Plus de 7 jours sans séance
    
    if (!isInactive) return false;

    // Si le coach a déjà traité l'alerte (tâche "Relance" terminée récemment), on n'affiche plus l'alerte
    const hasRecentDoneTask = (state.tasks || []).some(t => 
      t.relatedMemberId === u.id && 
      t.title.includes('Relance') && 
      t.status === 'done' &&
      (now - new Date(t.dueDate).getTime()) < (86400000 * 7)
    );

    return !hasRecentDoneTask;
  });
  const failedSubs = (state.subscriptions || []).filter(s => (s.status === 'past_due' || s.status === 'unpaid') && s.clubId === state.user?.clubId);

  const endingSubs = (state.subscriptions || []).filter(s => {
    if (s.clubId !== state.user?.clubId || s.status !== 'active') return false;
    const targetDate = s.endDate || s.commitmentEndDate;
    if (!targetDate) return false;
    
    const targetTime = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const diffDays = (targetTime - now) / (1000 * 3600 * 24);
    
    // Alert if ending in 30 days or less, and hasn't ended yet
    return diffDays >= 0 && diffDays <= 30;
  }) || [];

  // 4. Anniversaires
  const upcomingBirthdays = members.filter(u => {
    if (!u.birthDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDate = new Date(u.birthDate);
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday.getTime() < today.getTime()) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // Upcoming in the next 30 days
  }).sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDateA = new Date(a.birthDate!);
    const nextBirthdayA = new Date(today.getFullYear(), birthDateA.getMonth(), birthDateA.getDate());
    if (nextBirthdayA.getTime() < today.getTime()) nextBirthdayA.setFullYear(today.getFullYear() + 1);
    
    const birthDateB = new Date(b.birthDate!);
    const nextBirthdayB = new Date(today.getFullYear(), birthDateB.getMonth(), birthDateB.getDate());
    if (nextBirthdayB.getTime() < today.getTime()) nextBirthdayB.setFullYear(today.getFullYear() + 1);
    
    return nextBirthdayA.getTime() - nextBirthdayB.getTime();
  });

  // 5. Chiffres Clés
  const activeSubscriptions = (state.subscriptions || []).filter(s => s.status === 'active' && s.clubId === state.user?.clubId);
  const mrr = activeSubscriptions.reduce((acc, sub) => {
    if (sub.billingCycle === 'monthly') return acc + (sub.price || 0);
    if (sub.billingCycle === 'yearly') return acc + ((sub.price || 0) / 12);
    return acc;
  }, 0);
  const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentDay = Math.max(1, new Date().getDate());
  
  const sessionsThisMonth = (state.logs || []).filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && l.clubId === state.user?.clubId;
  }).length;
  
  const avgSessionsPerDay = (sessionsThisMonth / currentDay).toFixed(1);
  
  const [sessionsPeriod, setSessionsPeriod] = useState<'month' | 'week' | 'day'>('month');
  const [caPeriod, setCaPeriod] = useState<'month' | 'year' | 'week'>('month');

  // Calculations for Key metrics
  const {
    sessionsThisWeek,
    sessionsToday,
    revenueThisMonth,
    revenueThisYear,
    revenueThisWeek
  } = React.useMemo(() => {
    const now = new Date();
    const currM = now.getMonth();
    const currY = now.getFullYear();
    const todayStrStr = now.toISOString().split('T')[0];

    // Start of this week (Monday)
    const Monday = new Date(now);
    const dayOfWeek = Monday.getDay();
    const diffToMonday = Monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    Monday.setDate(diffToMonday);
    Monday.setHours(0,0,0,0);
    const startOfWeekMs = Monday.getTime();

    const startOfMonthMs = new Date(currY, currM, 1).getTime();
    const startOfYearMs = new Date(currY, 0, 1).getTime();

    const clubId = state.user?.clubId;
    const clubLogs = (state.logs || []).filter(l => l.clubId === clubId);
    const clubPayments = (state.payments || []).filter(p => p.status === 'paid' && p.clubId === clubId);

    const sThisWeek = clubLogs.filter(l => {
      const d = new Date(l.date).getTime();
      return d >= startOfWeekMs && d <= now.getTime();
    }).length;

    const sToday = clubLogs.filter(l => {
      return l.date.split('T')[0] === todayStrStr;
    }).length;

    const rThisMonth = clubPayments.reduce((acc, p) => {
      const t = new Date(p.date).getTime();
      if (t >= startOfMonthMs && t <= now.getTime()) {
        return acc + p.amount;
      }
      return acc;
    }, 0);

    const rThisYear = clubPayments.reduce((acc, p) => {
      const t = new Date(p.date).getTime();
      if (t >= startOfYearMs && t <= now.getTime()) {
        return acc + p.amount;
      }
      return acc;
    }, 0);

    const rThisWeek = clubPayments.reduce((acc, p) => {
      const t = new Date(p.date).getTime();
      if (t >= startOfWeekMs && t <= now.getTime()) {
        return acc + p.amount;
      }
      return acc;
    }, 0);

    return {
      sessionsThisWeek: sThisWeek,
      sessionsToday: sToday,
      revenueThisMonth: rThisMonth,
      revenueThisYear: rThisYear,
      revenueThisWeek: rThisWeek
    };
  }, [state.logs, state.payments, state.user?.clubId]);

  const [showAnnual, setShowAnnual] = useState(false);

  useEffect(() => {
    // Generate automated tasks for members at risk
    if (!state.user?.clubId) return;
    
    membersAtRisk.forEach(async (member) => {
      const taskExists = (state.tasks || []).some(t => t.relatedMemberId === member.id && t.status === 'todo' && t.title.includes('Relance'));
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

  useEffect(() => {
    // Generate automated tasks for upcoming birthdays
    if (!state.user?.clubId) return;
    
    upcomingBirthdays.forEach(async (member) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = new Date(member.birthDate!);
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (nextBirthday.getTime() < today.getTime()) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      const diffTime = nextBirthday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Create task if birthday is in exactly 7 days or less, and no task exists for this year
      if (diffDays <= 7) {
        const taskTitle = `Anniversaire : ${member.name}`;
        const taskId = `bday_${member.id}_${nextBirthday.getFullYear()}`;
        
        const taskExists = (state.tasks || []).some(t => t.id === taskId);
        
        if (!taskExists) {
          const newTask: Task = {
            id: taskId,
            clubId: state.user.clubId!,
            title: taskTitle,
            description: `C'est l'anniversaire de ${member.name} le ${nextBirthday.toLocaleDateString('fr-FR')}. Pensez à lui souhaiter !`,
            dueDate: nextBirthday.toISOString().split('T')[0],
            assignedTo: state.user.id.toString(),
            status: 'todo',
            relatedMemberId: member.id
          };
          try {
            await setDoc(doc(db, "tasks", taskId), newTask);
          } catch (e) {
            console.error("Error creating automated birthday task", e);
          }
        }
      }
    });
  }, [upcomingBirthdays.length, state.tasks.length, state.user?.clubId]);

  const handleLaunchCoaching = (member: User) => {
    const program = (state.programs || []).find(p => p.memberId === Number(member.id) && !p.isPlannedSession);
    if (!program) {
      showToast("Aucun programme actif", "error");
      return;
    }
    setState(prev => ({ ...prev, workout: program, workoutMember: member, workoutData: {}, validatedExercises: [] }));
  };

  const handleCongratulate = async (member: User) => {
    try {
      const userRef = doc(db, "users", member.firebaseUid!);
      const rewardXp = (member.xp || 0) + 20;
      await updateDoc(userRef, { xp: rewardXp });

      // Create check-in congratulation message
      const messageId = `msg_${Date.now()}`;
      const congratsMessage = {
        id: Date.now(),
        clubId: state.user?.clubId!,
        from: state.user?.id!,
        to: member.id,
        text: `Félicitations de la part de ton coach ! Ton assiduité et ton rituel quotidien me font super plaisir, continue sur cette lancée ! 🔥 (+20 XP offerts)`,
        date: new Date().toISOString(),
        read: false,
        file: null
      };
      await setDoc(doc(db, "messages", messageId), congratsMessage);

      // Create a notification
      const notificationId = `noti_${Date.now()}`;
      const newNoti = {
        id: notificationId,
        clubId: state.user?.clubId!,
        userId: member.id,
        title: "Félicitations du Coach ! 🏆",
        message: `${state.user?.name} t'a félicité pour ta régularité et t'offre +20 XP !`,
        type: 'success' as const,
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "notifications", notificationId), newNoti);

      // Update state
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === member.id ? { ...u, xp: rewardXp } : u),
        messages: [...(prev.messages || []), congratsMessage],
        notifications: [...(prev.notifications || []), newNoti]
      }));

      showToast(`Félicitations envoyées à ${member.name} ! (+20 XP offerts)`, "success");
    } catch (err) {
      console.error(err);
      showToast("Une erreur est survenue lors de l'envoi des félicitations.", "error");
    }
  };

  // 6. Statistiques d'Assiduité (7 derniers jours)
  const chartData = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      const dayKey = d.toISOString().split('T')[0];
      
      const count = (state.logs || []).filter(l => {
        if (l.clubId !== state.user?.clubId) return false;
        return l.date.split('T')[0] === dayKey;
      }).length;
      
      days.push({ name: dateStr, 'Séances': count });
    }
    return days;
  }, [state.logs, state.user?.clubId]);

  const todayPriorities = [
    { id: 'sessions', page: 'calendar', label: 'Séances à venir', count: todaySessionsCount, icon: CalendarIcon },
    { id: 'payments', page: 'crm_finances', label: 'Paiements à vérifier', count: failedSubs.length, icon: DollarSignIcon },
    { id: 'tasks', page: 'crm_tasks', label: 'Tâches à terminer', count: tasksToday.length, icon: CheckCircleIcon },
    { id: 'programs', page: 'users', label: 'Programmes demandés', count: planRequests.length, icon: FileTextIcon },
    { id: 'prospects', page: 'crm_pipeline', label: 'Prospects à relancer', count: prospectsToFollowUp.length, icon: TargetIcon },
  ].filter(item => item.count > 0).slice(0, 4);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="va-coach-dashboard space-y-8 pb-20"
    >
      {/* En-tête sobre : accueil, contexte, date */}
      <motion.div variants={itemVariants} className="va-dashboard-welcome relative overflow-hidden text-white rounded-3xl p-7 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img src="/brand/velatra-mark.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
              <span className="text-xs font-semibold tracking-wide text-emerald-100">Espace coach · Vue d’ensemble</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight leading-tight mb-2">
                Bonjour, {state.user?.name || "Coach"}.
              </h1>
              <p className="text-emerald-50 text-sm md:text-base max-w-xl font-normal">
                Voici ce qui mérite votre attention aujourd’hui.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 p-3.5 rounded-2xl border border-white/15 shrink-0 self-start md:self-auto">
            <div className="p-2.5 bg-white/10 rounded-xl text-emerald-100">
              <ClockIcon size={20} />
            </div>
            <div>
              <div className="text-xs font-medium text-emerald-100">Aujourd’hui</div>
              <div className="text-sm font-semibold tracking-tight">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {members.length === 0 && (
        <motion.section variants={itemVariants} className="flex flex-col gap-5 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">Démarrage</p>
            <h2 className="text-xl font-display font-bold text-zinc-900">Ajoute ton premier adhérent</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">Crée son profil, vérifie son affectation à ton compte, puis prépare ses programmes sportifs et alimentaires depuis sa fiche.</p>
          </div>
          <Button onClick={() => setState(previous => ({ ...previous, page: 'users' }))} className="shrink-0">
            Ajouter un adhérent
          </Button>
        </motion.section>
      )}

      <motion.section variants={itemVariants} aria-labelledby="today-priorities-title" className="va-today-priorities">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-emerald-800">VOTRE JOURNÉE</p>
            <h2 id="today-priorities-title" className="text-xl font-display font-semibold text-zinc-900">À traiter aujourd’hui</h2>
          </div>
          {todayPriorities.length > 0 && <span className="text-xs text-zinc-600">{todayPriorities.length} priorité{todayPriorities.length > 1 ? 's' : ''}</span>}
        </div>
        {todayPriorities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {todayPriorities.map(priority => {
              const Icon = priority.icon;
              return (
                <button key={priority.id} type="button" onClick={() => setState(current => ({ ...current, page: priority.page as any }))} className="va-priority-item group">
                  <span className="va-priority-icon"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1 text-left"><strong>{priority.count}</strong><span>{priority.label}</span></span>
                  <span aria-hidden="true" className="va-priority-arrow">→</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="va-priority-empty"><CheckCircleIcon size={19} /><span>Rien d’urgent à traiter pour l’instant.</span></div>
        )}
      </motion.section>

      {/* Accès directs aux outils principaux */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: UserIcon, label: "Membres", page: "users" },
          { icon: FileTextIcon, label: "Programmes", page: "presets" },
          { icon: BarChartIcon, label: "Finances", page: "crm_finances" },
          { icon: TargetIcon, label: "Prospects", page: "crm_pipeline" }
        ].map((btn, idx) => (
          <motion.button
            key={idx}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            onClick={() => setState(s => ({ ...s, page: btn.page as any }))}
            className="va-dashboard-shortcut flex flex-col items-center justify-center text-center gap-3.5 p-5 bg-white border border-zinc-200/80 rounded-2xl transition-all duration-200 group cursor-pointer"
          >
            <div className="va-dashboard-shortcut-icon w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200">
              <btn.icon size={22} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-zinc-900">{btn.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* 3. Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Key Metrics Section */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-emerald-500" />
                <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Chiffres Clés</h2>
              </div>
              <Badge variant="blue">SYNCHRONISÉ</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 1. SÉANCES COUNTER (CLIQUEZ POUR SWITCHER MOIS/SEMAINE/JOUR) */}
              <div 
                onClick={() => setSessionsPeriod(prev => prev === 'month' ? 'week' : prev === 'week' ? 'day' : 'month')}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 cursor-pointer transition-all relative group"
              >
                <div className="text-[12px] font-black uppercase tracking-widest text-zinc-600 mb-2 mr-1">
                  Séances ({sessionsPeriod === 'month' ? 'Mois' : sessionsPeriod === 'week' ? 'Semaine' : 'Jour'})
                </div>
                <div className="text-3xl font-display font-black text-zinc-900 group-hover:scale-105 transition-transform origin-left">
                  {sessionsPeriod === 'month' ? sessionsThisMonth : sessionsPeriod === 'week' ? sessionsThisWeek : sessionsToday}
                </div>
                <div className="text-[12px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
                  Cliquez pour changer
                </div>
              </div>
              
              {/* 2. NOMBRE D'ADHÉRENTS DE L'UTILISATEUR */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-[12px] font-black uppercase tracking-widest text-zinc-600 mb-2">Adhérents Actifs</div>
                <div className="text-3xl font-display font-black text-indigo-600">{members.length}</div>
                <div className="text-[12px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">Athlètes du club</div>
              </div>

              {/* 3. CHIFFRE D'AFFAIRES (CA) CLIQUEZ POUR SWITCHER CE MOIS/CETTE ANNÉE/CETTE SEMAINE */}
              <div 
                onClick={() => setCaPeriod(prev => prev === 'month' ? 'year' : prev === 'year' ? 'week' : 'month')}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 cursor-pointer transition-all relative group"
              >
                <div className="text-[12px] font-black uppercase tracking-widest text-zinc-600 mb-2 mr-1">
                  CA ({caPeriod === 'month' ? 'Mois' : caPeriod === 'year' ? 'Année' : 'Semaine'})
                </div>
                <div className="text-3xl font-display font-black text-emerald-600 group-hover:scale-105 transition-transform origin-left">
                  {(caPeriod === 'month' ? revenueThisMonth : caPeriod === 'year' ? revenueThisYear : revenueThisWeek).toFixed(0)}€
                </div>
                <div className="text-[12px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">
                  Cliquez pour changer
                </div>
              </div>

              {/* 4. ABO MOYEN */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-[12px] font-black uppercase tracking-widest text-zinc-600 mb-2">Abo Moyen</div>
                <div className="text-3xl font-display font-black text-zinc-900">{arpu.toFixed(0)}€</div>
                <div className="text-[12px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">Valeur par athlète</div>
              </div>
            </div>
          </motion.section>

          {/* Engagement Analytics Chart */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-indigo-500" />
                <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Volume d'Activité Hebdomadaire</h2>
              </div>
              <span className="text-[12px] font-black uppercase tracking-widest text-zinc-600">7 derniers jours</span>
            </div>
            
            <Card className="!p-6 bg-white border border-zinc-200/80 shadow-sm">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="neonEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                      axisLine={{ stroke: '#e4e4e7' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f4f4f5', opacity: 0.5 }}
                      contentStyle={{ 
                        background: '#18181b', 
                        border: 'none', 
                        borderRadius: '12px', 
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: '11px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700
                      }}
                    />
                    <Bar 
                      dataKey="Séances" 
                      fill="url(#neonEmerald)" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.section>

          {/* Urgent Actions Section */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-orange-500" />
                <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Actions Prioritaires</h2>
              </div>
              <Badge variant="orange" className="font-extrabold">INTERACTIVITÉ RECOMMANDÉE</Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }} 
                onClick={() => setState(s => ({ ...s, page: 'users', memberFilter: 'Demande de Plan' }))}
              >
                <Card className="!p-5 bg-white border border-zinc-200/80 hover:border-emerald-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all h-full relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-500/10 text-orange-600 rounded-xl"><FileTextIcon size={18} strokeWidth={2.5} /></div>
                    {planRequests.length > 0 && <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />}
                  </div>
                  <div className="text-3xl font-display font-black text-zinc-900">{planRequests.length}</div>
                  <div className="text-[12px] font-black text-zinc-500 uppercase mt-2 tracking-widest flex items-center justify-between">
                    <span>Créations de Plans</span>
                    <span className="text-zinc-600 group-hover:text-orange-500 transition-colors">→</span>
                  </div>
                </Card>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }} 
                onClick={() => setState(s => ({ ...s, page: 'chat' }))}
              >
                <Card className="!p-5 bg-white border border-zinc-200/80 hover:border-emerald-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all h-full relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl"><MessageCircleIcon size={18} strokeWidth={2.5} /></div>
                    {unreadMessages.length > 0 && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />}
                  </div>
                  <div className="text-3xl font-display font-black text-zinc-900">{unreadMessages.length}</div>
                  <div className="text-[12px] font-black text-zinc-500 uppercase mt-2 tracking-widest flex items-center justify-between">
                    <span>Messages non lus</span>
                    <span className="text-zinc-600 group-hover:text-blue-500 transition-colors">→</span>
                  </div>
                </Card>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }} 
                onClick={() => setState(s => ({ ...s, page: 'crm_tasks' }))}
              >
                <Card className="!p-5 bg-white border border-zinc-200/80 hover:border-emerald-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all h-full relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><CheckCircleIcon size={18} strokeWidth={2.5} /></div>
                    {tasksToday.length > 0 && <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />}
                  </div>
                  <div className="text-3xl font-display font-black text-zinc-900">{tasksToday.length}</div>
                  <div className="text-[12px] font-black text-zinc-500 uppercase mt-2 tracking-widest flex items-center justify-between">
                    <span>Tâches du jour</span>
                    <span className="text-zinc-600 group-hover:text-emerald-500 transition-colors">→</span>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Agenda / Upcoming Bookings */}
          {state.currentClub?.settings?.booking?.enabled !== false && (
            <motion.section variants={itemVariants} className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded bg-teal-500" />
                  <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Agenda des Cours Prochains</h2>
                </div>
                <Button 
                  onClick={() => setState(s => ({ ...s, page: 'calendar' }))}
                  className="!py-1.5 !px-3.5 !text-[12px] hover:scale-105 transition-transform"
                >
                  GÉRER LE SCHÉDULE
                </Button>
              </div>
              
              {upcomingEvents.length === 0 ? (
                <Card className="!p-8 bg-zinc-50/50 border-dashed border-2 border-zinc-200 flex flex-col items-center justify-center text-center shadow-inner rounded-3xl">
                  <CalendarIcon size={28} className="text-zinc-600 mb-2.5" />
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-wider">Aucune réservation active</p>
                  <p className="text-[12px] text-zinc-500 mt-1 max-w-xs">Vos athlètes n'ont pas encore réservé de séances sur vos créneaux.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingEvents.map((event, idx) => {
                    const member = (state.users || []).find(u => Number(u.id) === event.memberId);
                    const startTime = new Date(event.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const endTime = new Date(event.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    const isToday = new Date(event.startTime).toDateString() === new Date().toDateString();
                    const eventDate = new Date(event.startTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    
                    return (
                      <Card key={idx} className="!p-4 bg-white border border-zinc-200/80 shadow-sm flex items-center justify-between hover:border-teal-500/30 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex flex-col items-center justify-center font-black text-[11px] leading-none shrink-0">
                            <span className="text-[8px] mb-0.5 opacity-80 font-black">{isToday ? "AUJ" : eventDate}</span>
                            <span>{startTime}</span>
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-zinc-900 max-w-[120px] truncate">{member?.name || 'Inscrit Direct'}</div>
                            <div className="text-[12px] text-zinc-500 font-medium">{startTime} à {endTime}</div>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          className="!py-1.5 !px-3 !text-[12px]"
                          onClick={() => setState(s => ({ ...s, page: 'calendar' }))}
                        >
                          Détails
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.section>
          )}
        </div>

        {/* Right Side (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Recent Live Feed/Activities */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded bg-emerald-500" />
                <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Flux Temps-Réel</h2>
              </div>
              {(() => {
                const clubFeed = (state.feed || []).filter(f => f.clubId === state.user?.clubId);
                if (clubFeed.length > 0) {
                  return (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Voulez-vous valider et effacer l’intégralité des activités de votre flux ?")) {
                          try {
                            const promises = clubFeed.map(item => deleteDoc(doc(db, "feed", item.id.toString())));
                            await Promise.all(promises);
                            showToast("Flux d'activité vidé", "success");
                          } catch (err) {
                            console.error("Error clearing feed:", err);
                            showToast("Erreur lors de la validation", "error");
                          }
                        }
                      }}
                      className="text-[12px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 py-1.5 px-3 rounded-full transition-all flex items-center gap-1 border border-emerald-500/10 cursor-pointer"
                    >
                      <CheckCircleIcon size={10} strokeWidth={3} />
                      Tout vider
                    </button>
                  );
                }
                return null;
              })()}
            </div>
            
            <div className="space-y-3 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
              {(() => {
                const clubFeed = (state.feed || []).filter(f => f.clubId === state.user?.clubId);
                if (clubFeed.length === 0) {
                  return (
                    <div className="text-center py-10 bg-zinc-50 border border-zinc-200/80 rounded-3xl text-zinc-600 italic text-xs font-black uppercase tracking-widest opacity-60">
                      Rien à signaler
                    </div>
                  );
                }
                return clubFeed.map((item, i) => (
                  <motion.div 
                    key={item.id} 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="!p-4 bg-white border border-zinc-200/80 flex items-center gap-3 px-3.5 group hover:border-emerald-500/30 transition-all shadow-sm">
                      <div className="p-2 bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 rounded-xl text-emerald-600 shadow-inner shrink-0 leading-none">
                        {item.title.includes("Feedback") ? <MessageCircleIcon size={16}/> : <SparklesIcon size={16}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black text-zinc-900 leading-snug truncate group-hover:text-emerald-600 transition-colors">{item.title}</div>
                        <div className="text-[8px] text-zinc-405 font-black uppercase tracking-widest mt-0.5 whitespace-nowrap">
                          {new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {item.userName}
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "feed", item.id.toString()));
                            showToast("Activité validée !", "success");
                          } catch (err) {
                            console.error("Error deleting feed item:", err);
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-emerald-500/10 text-zinc-600 hover:text-emerald-600 transition-all cursor-pointer select-none"
                        title="Marquer comme traité"
                      >
                        <CheckCircleIcon size={16} strokeWidth={2.5} />
                      </button>
                    </Card>
                  </motion.div>
                ));
              })()}
            </div>
          </motion.section>

          {/* Retention / Warning Alerts */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 rounded bg-rose-500" />
              <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Alertes Rétention & Baisse</h2>
            </div>
            
            <div className="space-y-3">
              {failedSubs.map(sub => {
                const member = members.find(m => Number(m.id) === sub.memberId);
                if (!member) return null;
                return (
                  <motion.div key={`sub_${sub.id}`} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>
                    <Card className="!p-4 border-l-4 border-l-rose-500 border-zinc-200/80 bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 bg-rose-100/10 flex items-center justify-center text-rose-500 shrink-0"><InfoIcon size={18}/></div>
                        <div>
                          <div className="text-xs font-black text-zinc-900 leading-tight">{member.name}</div>
                          <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Paiement Échoué / Rejeté</div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {endingSubs.map(sub => {
                const member = members.find(m => Number(m.id) === sub.memberId);
                if (!member) return null;
                const targetDate = sub.endDate || sub.commitmentEndDate;
                const daysLeft = targetDate ? Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
                
                return (
                  <motion.div key={`end_sub_${sub.id}`} whileHover={{ scale: 1.02 }}>
                    <Card className="!p-4 border-l-4 border-l-amber-500 border-zinc-200/80 bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0"><InfoIcon size={18}/></div>
                        <div>
                          <div className="text-xs font-black text-zinc-900 leading-tight">{member.name}</div>
                          <div className="text-[8px] font-black text-amber-600 uppercase tracking-widest mt-0.5">Abonnement fini dans {daysLeft}j</div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {membersAtRisk.map(m => (
                <motion.div key={`risk_${m.id}`} whileHover={{ scale: 1.02 }}>
                  <Card className="!p-4 border-l-4 border-l-rose-400 border-zinc-200/80 bg-white flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-rose-500 font-extrabold border border-zinc-200 shrink-0 overflow-hidden">
                        {m.avatar?.startsWith('http') ? (
                          <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          m.avatar || (m.name || '??').substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-black text-zinc-900 leading-tight">{m.name}</div>
                        <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Aucune activité depuis 7j+</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleLaunchCoaching(m)} 
                      className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-zinc-100/80 rounded-lg transition-all shrink-0 cursor-pointer border border-zinc-150 bg-zinc-50"
                      title="Lancer le coaching"
                    >
                      <PlayIcon size={14}/>
                    </button>
                  </Card>
                </motion.div>
              ))}

              {membersAtRisk.length === 0 && failedSubs.length === 0 && endingSubs.length === 0 && (
                <div className="text-xs text-zinc-500 font-black uppercase tracking-widest p-5 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-600">
                  Zéro alerte, performance maximale ✨
                </div>
              )}
            </div>
          </motion.section>

          {/* Active Streaks / Rituels Leaderboard */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 rounded bg-indigo-500" />
              <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Séries Actives & Rituels</h2>
            </div>
            
            <div className="space-y-3">
              {members
                .slice()
                .sort((a, b) => {
                  const streakDiff = (b.streak || 0) - (a.streak || 0);
                  if (streakDiff !== 0) return streakDiff;
                  return (b.xp || 0) - (a.xp || 0);
                })
                .slice(0, 4)
                .map(m => {
                  const isHighStreak = (m.streak || 0) > 0;
                  return (
                    <motion.div key={`streak_leader_${m.id}`} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>
                      <Card className="!p-4 bg-white border border-zinc-200/80 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-[12px] text-zinc-800 border border-zinc-200 shrink-0 overflow-hidden">
                            {m.avatar?.startsWith('http') ? (
                              <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              m.avatar || m.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-zinc-900 leading-tight truncate max-w-[100px]">{m.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider">Lvl {Math.floor((m.xp || 0) / 1000) + 1}</span>
                              {isHighStreak && (
                                <div className="flex items-center gap-0.5 text-[8px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-505/10">
                                  <FlameIcon size={8} fill="currentColor" /> {m.streak} J
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleCongratulate(m)}
                          type="button"
                          className="py-1.5 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 hover:border-emerald-600 transition-all border border-emerald-500/10 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <SparklesIcon size={9} /> Féliciter
                        </button>
                      </Card>
                    </motion.div>
                  );
                })}
            </div>
          </motion.section>

          {/* Upcoming Birthdays Section */}
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 rounded bg-emerald-500" />
              <h2 className="text-lg font-black uppercase tracking-wider text-zinc-900 italic">Fêtes & Anniversaires</h2>
            </div>
            
            <div className="space-y-3">
              {upcomingBirthdays.slice(0, 3).map(member => {
                const birthDate = new Date(member.birthDate!);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                const nextAge = age + 1;
                const isToday = today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
                
                return (
                  <motion.div key={`bday_${member.id}`} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 450, damping: 30 }}>
                    <Card className={`!p-4 border border-zinc-200/80 ${isToday ? 'bg-gradient-to-r from-emerald-500/10 to-transparent border-l-4 border-l-emerald-500' : 'bg-white'} backdrop-blur-md flex items-center justify-between shadow-sm hover:shadow-md transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><GiftIcon size={18}/></div>
                        <div>
                          <div className="text-xs font-black text-zinc-900 leading-tight">{member.name}</div>
                          <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">
                            {isToday ? `C'EST AUJOURD'HUI ! (${nextAge} ans)` : `${birthDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} (${nextAge} ans)`}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
              {upcomingBirthdays.length === 0 && (
                <div className="text-xs text-zinc-500 font-black uppercase tracking-widest p-5 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-600">
                  Aucun anniversaire ce mois-ci 🎂
                </div>
              )}
            </div>
          </motion.section>

        </div>
      </div>
    </motion.div>
  );
};
