
import React, { useState, useEffect } from 'react';
import { AppState, User, Program, Task } from '../types';
import { Card, StatBox, Button, Input, Badge } from './UI';
import { RefreshCwIcon, PlusIcon, SearchIcon, Trash2Icon, PlayIcon, LayersIcon, FlameIcon, MessageCircleIcon, SparklesIcon, BarChartIcon, LockIcon } from './Icons';
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
  const [searchTerm, setSearchTerm] = useState("");
  
  const members = state.users.filter(u => u.role === 'member' && u.clubId === state.user?.clubId);
  const filteredMembers = members
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dateA = a.lastWorkoutDate ? new Date(a.lastWorkoutDate).getTime() : 0;
      const dateB = b.lastWorkoutDate ? new Date(b.lastWorkoutDate).getTime() : 0;
      return dateB - dateA;
    });

  const membersAtRisk = members.filter(u => {
    if (!u.lastWorkoutDate) return true;
    const last = new Date(u.lastWorkoutDate).getTime();
    const now = new Date().getTime();
    return (now - last) > (86400000 * 7); // Plus de 7 jours sans séance
  });

  const planRequests = members.filter(u => u.planRequested);
  const isPremium = state.user?.role === 'superadmin' || state.currentClub?.plan === 'premium';

  // Chart Data for Prospects
  const prospectStats = [
    { name: 'Leads', count: state.prospects.filter(p => p.status === 'lead').length },
    { name: 'Contactés', count: state.prospects.filter(p => p.status === 'contacted').length },
    { name: 'Essais', count: state.prospects.filter(p => p.status === 'trial').length },
    { name: 'Abonnés', count: state.prospects.filter(p => p.status === 'won').length },
  ];

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

  const handleEditProgram = (member: User) => {
    const existingProg = state.programs.find(p => p.memberId === member.id);
    if (existingProg) {
      setState(prev => ({ ...prev, editingProg: existingProg }));
    } else {
      const newProg: Program = {
        id: Date.now(),
        clubId: state.user!.clubId,
        memberId: member.id,
        name: `Plan - ${member.name.split(' ')[0]}`,
        presetId: null,
        nbDays: 1,
        durationWeeks: state.currentClub?.settings?.defaultProgramDuration || 7,
        startDate: new Date().toISOString().split('T')[0],
        completedWeeks: [],
        currentDayIndex: 0,
        days: [{ name: "Jour 1", isCoaching: false, exercises: [] }]
      };
      setState(prev => ({ ...prev, editingProg: newProg }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-white">Management <span className="text-velatra-accent">VELATRA</span></h1>
          <p className="text-velatra-textDark text-[10px] uppercase tracking-[3px] font-bold">Performance & Suivi Coach</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onToggleTimer} className="flex-1 sm:flex-none !rounded-2xl !py-3 shadow-xl shadow-white/5">
            <RefreshCwIcon size={18} className="mr-2" /> TIMER
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stats & Alerts */}
        <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBox label="Membres" value={members.length} />
              <StatBox label="Prospects" value={state.prospects.filter(p => p.status === 'lead' || p.status === 'contacted' || p.status === 'trial').length} locked={!isPremium} onClick={() => setState(s => ({ ...s, page: 'crm_pipeline' }))} />
              <StatBox label="Tâches" value={state.tasks.filter(t => t.status === 'todo').length} className={state.tasks.filter(t => t.status === 'todo').length > 0 ? "ring-2 ring-yellow-500/50" : ""} locked={!isPremium} onClick={() => setState(s => ({ ...s, page: 'crm_tasks' }))} />
              <StatBox label="Demandes Plan" value={planRequests.length} className={planRequests.length > 0 ? "ring-2 ring-velatra-accent animate-pulse" : ""} />
            </div>

          <section className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-black uppercase tracking-tight text-white italic">Flux d'activité</h2>
                <Badge variant="blue">RÉCENT</Badge>
             </div>
             <div className="space-y-3">
                {state.feed.filter(f => f.clubId === state.user?.clubId).slice(0, 5).map((item) => (
                  <Card key={item.id} className="!p-4 bg-white/[0.02] border-white/5 flex items-center gap-4 group hover:border-velatra-accent/30 transition-all">
                    <div className="p-2 bg-velatra-accent/10 rounded-xl text-velatra-accent">
                       {item.title.includes("Feedback") ? <MessageCircleIcon size={20}/> : <SparklesIcon size={20}/>}
                    </div>
                    <div className="flex-1">
                       <div className="text-xs font-bold text-white">{item.title}</div>
                       <div className="text-[9px] text-velatra-textDark font-black uppercase tracking-widest mt-1">
                          {new Date(item.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {item.userName}
                       </div>
                    </div>
                  </Card>
                ))}
                {state.feed.length === 0 && (
                  <p className="text-center py-8 text-velatra-textDark italic text-xs uppercase tracking-widest opacity-30">Aucune activité récente</p>
                )}
             </div>
          </section>
        </div>

        {/* Right Column: Inactivity Alert */}
        <div className="lg:col-span-4 space-y-4">
           <h2 className="text-xl font-black uppercase tracking-tight text-white px-1 italic">Alertes Inactivité</h2>
           <div className="space-y-3">
              {membersAtRisk.map(m => (
                <Card key={m.id} className="!p-4 border-red-500/20 bg-red-500/5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-black">{m.avatar}</div>
                      <div>
                         <div className="text-xs font-black text-white">{m.name}</div>
                         <div className="text-[9px] font-bold text-red-500 uppercase">Inactif depuis 7j+</div>
                      </div>
                   </div>
                   <button onClick={() => handleLaunchCoaching(m)} className="p-2 text-velatra-textDark hover:text-white"><PlayIcon size={18}/></button>
                </Card>
              ))}
              {membersAtRisk.length === 0 && <p className="text-xs text-velatra-textDark italic p-4 text-center">Tout le monde est actif 🔥</p>}
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">Fiches Adhérents</h2>
          <div className="relative w-full sm:w-64">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-velatra-textDark" size={16} />
            <Input 
              placeholder="Chercher..." 
              className="pl-12 !py-3 !text-sm !rounded-2xl bg-white/5" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMembers.map(member => {
            const program = state.programs.find(p => p.memberId === member.id);
            const hasFeedback = program?.memberRemarks;
            const progDays = program ? program.nbDays * 7 : 0;
            const progCompletion = program ? Math.round(((program.currentDayIndex + 1) / (progDays || 1)) * 100) : 0;
            
            return (
              <Card key={member.id} className={`flex flex-col gap-5 border border-white/5 hover:border-velatra-accent/30 !p-6 bg-[#0a0a0a] ${hasFeedback ? 'ring-1 ring-orange-500/50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-black border border-white/10 flex items-center justify-center font-black text-xl text-velatra-accent shadow-inner">
                      {member.avatar}
                    </div>
                    {member.planRequested && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-velatra-accent rounded-full border-2 border-black animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black truncate text-base text-white">{member.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-[10px] text-velatra-textDark uppercase font-black tracking-widest">
                        {member.lastWorkoutDate ? `Dernière séance: ${new Date(member.lastWorkoutDate).toLocaleDateString()}` : "Aucune séance"}
                      </div>
                    </div>
                  </div>
                </div>

                {program && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-velatra-textDark">
                      <span>Progression Plan</span>
                      <span className="text-white">{progCompletion}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-velatra-accent transition-all duration-500" style={{ width: `${progCompletion}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-velatra-textDark uppercase tracking-widest bg-white/5 p-3 rounded-xl border border-white/5">
                  <div>Âge: <span className="text-white">{member.age}</span></div>
                  <div>Poids: <span className="text-white">{member.weight}kg</span></div>
                  <div className="col-span-2 mt-1 truncate">But: <span className="text-white">{member.objectifs.join(', ')}</span></div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleLaunchCoaching(member)} className="flex-1 py-3 rounded-2xl bg-velatra-accent text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 shadow-lg shadow-velatra-accent/20 italic">
                    SÉANCE
                  </button>
                  <button 
                    onClick={async () => {
                      handleEditProgram(member);
                      // Reset request flag when coach opens editor
                      const userRef = doc(db, "users", (member as any).firebaseUid);
                      await updateDoc(userRef, { planRequested: false });
                      
                      // Remove the request from the activity feed
                      const feedItems = state.feed.filter(f => f.userId === member.id && f.title.includes('Demande de Plan'));
                      for (const item of feedItems) {
                        await deleteDoc(doc(db, "feed", item.id.toString()));
                      }
                    }} 
                    className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 italic ${member.planRequested ? 'bg-velatra-accent/20 text-velatra-accent border-velatra-accent/50' : 'bg-white/5 text-white border border-white/10'}`}
                  >
                    {member.planRequested ? "CRÉER PLAN" : "PLAN"}
                  </button>
                  <button onClick={() => setState(s => ({ ...s, page: 'users', selectedMember: member }))} className="p-3 rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10">
                    <SearchIcon size={14} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="pt-8">
        <Button variant="primary" fullWidth className="!py-6 !rounded-3xl shadow-2xl shadow-velatra-accent/20 font-black text-lg italic" onClick={() => setState((s:any) => ({ ...s, page: 'users' }))}>
          <PlusIcon size={24} className="mr-3" />
          AJOUTER UN NOUVEL ADHÉRENT
        </Button>
      </div>
    </div>
  );
};
