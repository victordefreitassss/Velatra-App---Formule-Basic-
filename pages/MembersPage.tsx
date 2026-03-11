
import React, { useState, useEffect } from 'react';
import { AppState, User, Performance, BodyData, Program, Gender, Goal, Subscription, Plan } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { 
  SearchIcon, InfoIcon, 
  XIcon, DumbbellIcon, BarChartIcon, CheckIcon, SaveIcon, LayersIcon, MessageCircleIcon, Edit2Icon
} from '../components/Icons';
import { db, doc, setDoc, updateDoc, deleteDoc } from '../firebase';
import { GOALS } from '../constants';

export const MembersPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [search, setSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<User | null>(state.selectedMember || null);

  useEffect(() => {
    if (state.selectedMember) {
      setSelectedProfile(state.selectedMember);
    }
  }, [state.selectedMember]);

  const closeProfile = () => {
    setSelectedProfile(null);
    if (state.selectedMember) {
      setState((prev: AppState) => ({ ...prev, selectedMember: null }));
    }
  };
  const [newScan, setNewScan] = useState({ weight: "", fat: "", muscle: "" });
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoData, setEditInfoData] = useState<Partial<User>>({});
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberData, setNewMemberData] = useState<Partial<User>>({
    name: '', email: '', phone: '', gender: 'M', age: 30, weight: 70, height: 175, objectifs: [], notes: ''
  });

  const members = state.users.filter(u => u.role === 'member' && u.name.toLowerCase().includes(search.toLowerCase()));

  const handleSaveScan = async () => {
    if (!selectedProfile || !newScan.weight) return;
    
    // Remplacer les virgules par des points pour parseFloat
    const weightVal = parseFloat(newScan.weight.replace(',', '.'));
    const fatVal = parseFloat(newScan.fat.replace(',', '.')) || 0;
    const muscleVal = parseFloat(newScan.muscle.replace(',', '.')) || 0;

    if (isNaN(weightVal)) {
      showToast("Poids invalide", "error");
      return;
    }

    const scanData: BodyData = {
      id: Date.now(),
      clubId: selectedProfile.clubId,
      memberId: Number(selectedProfile.id),
      date: new Date().toISOString(),
      weight: weightVal,
      fat: fatVal,
      muscle: muscleVal
    };

    try {
      await setDoc(doc(db, "bodyData", scanData.id.toString()), scanData);
      showToast("Scan balancé enregistré");
      setNewScan({ weight: "", fat: "", muscle: "" });
    } catch (err) {
      console.error("Error saving scan:", err);
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDeleteScan = async (scanId: number) => {
    if (!confirm("Supprimer cette mesure ?")) return;
    try {
      await deleteDoc(doc(db, "bodyData", scanId.toString()));
      showToast("Mesure supprimée");
    } catch (err) {
      showToast("Erreur de suppression", "error");
    }
  };

  const handleUpdateMemberInfo = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    
    try {
      const userRef = doc(db, "users", selectedProfile.firebaseUid);
      await updateDoc(userRef, editInfoData);
      showToast("Informations mises à jour");
      setSelectedProfile({ ...selectedProfile, ...editInfoData } as User);
      setIsEditingInfo(false);
    } catch (err) {
      console.error("Error updating member info:", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedProfile || !selectedProfile.firebaseUid) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedProfile.name} ? Cette action est irréversible.`)) return;
    
    try {
      await deleteDoc(doc(db, "users", selectedProfile.firebaseUid));
      showToast("Membre supprimé avec succès");
      setIsEditingInfo(false);
      closeProfile();
    } catch (err) {
      console.error("Error deleting member:", err);
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const handleEditProgram = (member: User) => {
    const mid = Number(member.id);
    const existingProg = state.programs.find(p => Number(p.memberId) === mid);
    if (existingProg) {
      setState((prev: AppState) => ({ ...prev, editingProg: existingProg }));
    } else {
      const newProg: Program = {
        id: Date.now(),
        clubId: member.clubId,
        memberId: Number(member.id),
        name: `Plan - ${member.name.split(' ')[0]}`,
        presetId: null,
        nbDays: 1,
        startDate: new Date().toISOString().split('T')[0],
        completedWeeks: [],
        currentDayIndex: 0,
        days: [{ name: "Jour 1", isCoaching: false, exercises: [] }]
      };
      setState((prev: AppState) => ({ ...prev, editingProg: newProg }));
    }
    closeProfile(); 
  };

  const getMemberStats = (memberId: number) => {
    const mid = Number(memberId);
    const memberPerfs = state.performances.filter(p => Number(p.memberId) === mid);
    const memberBody = state.bodyData.filter(b => Number(b.memberId) === mid);
    const program = state.programs.find(p => Number(p.memberId) === mid);

    const topPerfs = memberPerfs.reduce((acc: any, curr) => {
      if (!acc[curr.exId] || acc[curr.exId].weight < curr.weight) {
        acc[curr.exId] = curr;
      }
      return acc;
    }, {});

    const memberOrders = state.supplementOrders.filter(o => Number(o.adherentId) === mid);
    const totalSpent = memberOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
    const subscription = state.subscriptions.find(s => s.memberId === mid && s.status === 'active');

    return { 
      perfs: Object.values(topPerfs) as Performance[], 
      body: memberBody.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      program,
      totalSpent,
      memberOrders,
      subscription
    };
  };

  const handleAssignSubscription = async () => {
    if (!selectedProfile || !selectedPlanId || !state.user?.clubId) return;
    
    const plan = state.plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    const subId = Date.now().toString();
    const subscription: Subscription = {
      id: subId,
      clubId: state.user.clubId,
      memberId: selectedProfile.id,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      startDate: new Date().toISOString(),
      status: 'active'
    };

    try {
      await setDoc(doc(db, "subscriptions", subId), subscription);
      showToast("Abonnement assigné avec succès");
      setIsAssigningPlan(false);
      setSelectedPlanId('');
    } catch (err) {
      console.error("Error assigning subscription", err);
      showToast("Erreur lors de l'assignation", "error");
    }
  };

  const handleCreateMember = async () => {
    if (!newMemberData.name || !state.user?.clubId) {
      showToast("Veuillez renseigner au moins le nom", "error");
      return;
    }
    
    const newUserId = Date.now();
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const newUser: User = {
      id: newUserId,
      clubId: state.user.clubId,
      code,
      pwd: code,
      name: newMemberData.name,
      email: newMemberData.email || '',
      phone: newMemberData.phone || '',
      role: 'member',
      avatar: newMemberData.name.substring(0, 2).toUpperCase(),
      gender: newMemberData.gender as Gender || 'M',
      age: newMemberData.age || 30,
      weight: newMemberData.weight || 70,
      height: newMemberData.height || 175,
      objectifs: newMemberData.objectifs || [],
      notes: newMemberData.notes || '',
      createdAt: new Date().toISOString(),
      xp: 0,
      streak: 0,
      pointsFidelite: 0
    };

    try {
      await setDoc(doc(db, "users", newUserId.toString()), newUser);
      showToast("Membre créé avec succès !");
      setIsAddingMember(false);
      setNewMemberData({ name: '', email: '', phone: '', gender: 'M', age: 30, weight: 70, height: 175, objectifs: [], notes: '' });
      // Select the new member automatically
      setSelectedProfile(newUser);
    } catch (err) {
      console.error("Error creating member", err);
      showToast("Erreur lors de la création", "error");
    }
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white">Fiches Athlètes</h1>
          <p className="text-[10px] text-velatra-accent font-bold uppercase tracking-[3px]">{members.length} Profils Actifs</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddingMember(true)} className="!py-3 !px-6 !rounded-2xl shadow-xl shadow-velatra-accent/20 font-black text-xs italic">
          + NOUVEAU PROFIL
        </Button>
      </div>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-velatra-textDark" />
        <Input placeholder="Rechercher par nom..." className="pl-14 !bg-white/[0.03] !border-white/5 !rounded-2xl font-bold" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(u => {
          const stats = getMemberStats(u.id);
          const hasFeedback = stats.program?.memberRemarks;
          return (
            <Card key={u.id} className={`flex flex-col gap-4 border-none ring-1 transition-all !p-6 bg-[#0a0a0a] ${hasFeedback ? 'ring-orange-500/30' : 'ring-white/5 hover:ring-velatra-accent/30'}`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-velatra-accent/20 to-black border border-white/10 flex items-center justify-center font-black text-2xl text-velatra-accent shadow-lg">
                  {u.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg text-white leading-none mb-2">{u.name}</div>
                  <div className="flex gap-2">
                    <Badge variant="dark" className="!bg-white/5 !p-1 !text-[8px]">{stats.perfs.length} PR</Badge>
                    {hasFeedback && <Badge variant="orange" className="!p-1 !text-[8px] animate-pulse">FEEDBACK</Badge>}
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="!py-3.5 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setSelectedProfile(u)}>
                VOIR LE DOSSIER
              </Button>
            </Card>
          );
        })}
      </div>

      {selectedProfile && (() => {
        const stats = getMemberStats(selectedProfile.id);
        const progDays = stats.program ? stats.program.nbDays * 7 : 0;
        const progCompletion = stats.program ? Math.round(((stats.program.currentDayIndex + 1) / (progDays || 1)) * 100) : 0;

        const weightHistory = [...stats.body].reverse();
        const maxW = weightHistory.length > 0 ? Math.max(...weightHistory.map(b => b.weight)) + 2 : 100;
        const minW = weightHistory.length > 0 ? Math.min(...weightHistory.map(b => b.weight)) - 2 : 40;
        const svgPoints = weightHistory.map((b, i) => {
          const x = weightHistory.length > 1 ? (i / (weightHistory.length - 1)) * 100 : 50;
          const y = 100 - ((b.weight - minW) / (maxW - minW || 1)) * 100;
          return `${x},${y}`;
        }).join(' ');

        return (
          <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[500] flex items-center justify-center p-0 md:p-8 overflow-y-auto">
            <div className="w-full max-w-6xl bg-[#050505] min-h-screen md:min-h-0 md:rounded-[48px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden animate-in zoom-in duration-300">
              <button onClick={closeProfile} className="absolute top-10 right-10 p-4 bg-white/5 rounded-full text-white/50 hover:text-white z-50 hover:bg-red-500 transition-all"><XIcon size={24} /></button>

              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* SIDEBAR */}
                <div className="lg:col-span-4 bg-white/[0.02] border-r border-white/10 p-10 space-y-10">
                  <div className="text-center relative">
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl">{selectedProfile.avatar}</div>
                    <button 
                      onClick={() => {
                        setEditInfoData({
                          name: selectedProfile.name,
                          age: selectedProfile.age,
                          gender: selectedProfile.gender,
                          weight: selectedProfile.weight,
                          height: selectedProfile.height,
                          objectifs: selectedProfile.objectifs,
                          notes: selectedProfile.notes
                        });
                        setIsEditingInfo(true);
                      }}
                      className="absolute top-0 right-1/4 p-2 bg-white/10 rounded-full text-white/50 hover:text-white hover:bg-velatra-accent transition-all"
                      title="Modifier les infos"
                    >
                      <Edit2Icon size={16} />
                    </button>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedProfile.name}</h2>
                    <Badge variant="accent" className="mt-3 !px-4 !py-1.5">ÉVOLUTION</Badge>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Fidélité & Achats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-[8px] font-black text-velatra-textDark uppercase tracking-widest mb-1">Points</div>
                        <div className="text-xl font-black text-white">{selectedProfile.pointsFidelite || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-black text-velatra-textDark uppercase tracking-widest mb-1">Total Achats</div>
                        <div className="text-xl font-black text-emerald-500">{stats.totalSpent}€</div>
                      </div>
                    </div>
                  </div>

                  {selectedProfile.notes && (
                    <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Notes d'Inscription</h3>
                      <p className="text-xs text-velatra-textMuted leading-relaxed italic">"{selectedProfile.notes}"</p>
                    </div>
                  )}

                  {/* Remarks Display */}
                  {stats.program?.memberRemarks && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl space-y-3">
                       <div className="flex items-center gap-2 text-orange-500">
                          <MessageCircleIcon size={18} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Feedback Adhérent</span>
                       </div>
                       <p className="text-sm font-bold text-white italic leading-relaxed">"{stats.program.memberRemarks}"</p>
                       <Button variant="secondary" fullWidth className="!py-2 !text-[9px] !rounded-xl" onClick={() => handleEditProgram(selectedProfile)}>
                          ADAPTER LE PLAN
                       </Button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Abonnement</h3>
                    </div>
                    {stats.subscription ? (
                      <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 shadow-inner">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-white text-lg uppercase italic">{stats.subscription.planName}</span>
                          <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-black uppercase tracking-widest">Actif</span>
                        </div>
                        <div className="text-[10px] font-bold text-velatra-textDark uppercase tracking-widest">
                          {stats.subscription.price}€ / {stats.subscription.billingCycle === 'monthly' ? 'mois' : stats.subscription.billingCycle === 'yearly' ? 'an' : 'fois'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-velatra-textMuted font-medium px-1">Aucun abonnement actif.</p>
                        {isAssigningPlan ? (
                          <div className="space-y-2 bg-white/5 p-4 rounded-3xl border border-white/10">
                            <select 
                              value={selectedPlanId} 
                              onChange={e => setSelectedPlanId(e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white text-xs font-medium focus:outline-none focus:border-velatra-accent"
                            >
                              <option value="">Sélectionner une formule</option>
                              {state.plans.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price}€</option>)}
                            </select>
                            <div className="flex gap-2">
                              <button onClick={() => setIsAssigningPlan(false)} className="flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-velatra-textDark hover:text-white transition-colors">Annuler</button>
                              <button onClick={handleAssignSubscription} disabled={!selectedPlanId} className="flex-1 bg-velatra-accent text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50">Confirmer</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setIsAssigningPlan(true)} className="w-full border border-dashed border-white/10 text-velatra-textDark hover:text-white hover:border-white/30 rounded-3xl py-4 text-[10px] font-black uppercase tracking-widest transition-colors">
                            + Assigner une formule
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Plan Actif</h3>
                       <button onClick={() => handleEditProgram(selectedProfile)} className="text-white/40 hover:text-white transition-colors">
                          <LayersIcon size={14} />
                       </button>
                    </div>
                    {stats.program ? (
                      <div className="bg-black border border-white/10 rounded-3xl p-6 shadow-inner">
                        <div className="font-black text-white text-lg mb-1 uppercase italic">{stats.program.name}</div>
                        <div className="flex justify-between text-[10px] font-bold text-velatra-textDark uppercase mb-4 tracking-widest">
                           <span>Cycle complété</span>
                           <span className="text-white">{progCompletion}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-velatra-accent shadow-[0_0_10px_rgba(196,30,58,0.5)] transition-all duration-1000" style={{ width: `${progCompletion}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-3xl p-8 border border-dashed border-white/10 text-center">
                         <p className="text-xs italic text-velatra-textDark mb-4">Aucun cycle en cours</p>
                         <Button variant="primary" fullWidth onClick={() => handleEditProgram(selectedProfile)} className="!py-3 !text-[10px]">
                            CRÉER UN PROGRAMME
                         </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 bg-black/40 p-8 rounded-3xl border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[4px] text-velatra-accent">Nouveau Scan</h3>
                    <div className="space-y-4">
                      <Input placeholder="Poids (kg)" type="number" className="!bg-white/5" value={newScan.weight} onChange={e => setNewScan({...newScan, weight: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Gras (%)" type="number" className="!bg-white/5" value={newScan.fat} onChange={e => setNewScan({...newScan, fat: e.target.value})} />
                        <Input placeholder="Muscle (kg)" type="number" className="!bg-white/5" value={newScan.muscle} onChange={e => setNewScan({...newScan, muscle: e.target.value})} />
                      </div>
                      <Button variant="success" fullWidth onClick={handleSaveScan} className="!py-4 shadow-xl shadow-emerald-500/10">
                        <SaveIcon size={16} className="mr-2" /> ENREGISTRER SCAN
                      </Button>
                    </div>
                  </div>
                </div>

                {/* MAIN GRAPHS */}
                <div className="lg:col-span-8 p-12 space-y-12 max-h-[90vh] overflow-y-auto no-scrollbar">
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><BarChartIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Courbe de Poids</h3>
                    </div>
                    
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-[40px] p-10 h-72 relative overflow-hidden shadow-inner">
                      {weightHistory.length > 0 ? (
                        <div className="w-full h-full relative">
                          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                            {weightHistory.length > 1 && (
                              <polyline 
                                fill="none" 
                                stroke="#6366f1" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                points={svgPoints} 
                                className="drop-shadow-[0_0_10px_rgba(196,30,58,0.5)]"
                              />
                            )}
                            {weightHistory.map((b, i) => {
                               const x = weightHistory.length > 1 ? (i / (weightHistory.length - 1)) * 100 : 50;
                               const y = 100 - ((b.weight - minW) / (maxW - minW || 1)) * 100;
                               return (
                                 <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#6366f1" strokeWidth="2" />
                               );
                            })}
                          </svg>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-velatra-textDark italic uppercase tracking-widest font-black text-[10px]">Attente de scans réguliers...</div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-velatra-accent/10 rounded-2xl text-velatra-accent"><DumbbellIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Tableau des Records (PR)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {stats.perfs.length > 0 ? stats.perfs.map(p => {
                        const ex = state.exercises.find(e => e.perfId === p.exId);
                        return (
                          <div key={p.id} className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl flex justify-between items-center group hover:bg-white/[0.05] transition-all">
                             <div>
                               <div className="text-[9px] uppercase font-black text-velatra-accent tracking-widest mb-1">{ex?.cat || 'FORCE'}</div>
                               <div className="font-black text-white text-lg italic tracking-tight">{ex?.name || p.exId}</div>
                             </div>
                             <div className="text-right">
                               <div className="text-2xl font-black text-white tracking-tighter">{p.weight}kg</div>
                               <div className="text-[10px] font-black text-velatra-textDark uppercase tracking-widest">{p.reps} REPS</div>
                             </div>
                          </div>
                        );
                      }) : (
                        <div className="col-span-full py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] text-[10px] uppercase font-black text-velatra-textDark tracking-[4px] italic">Aucun PR enregistré</div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-8 pb-12">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CheckIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Journaux Biométriques</h3>
                    </div>
                    <div className="space-y-4">
                       {stats.body.length > 0 ? stats.body.map(b => (
                         <div key={b.id} className="bg-white/[0.02] border border-white/10 p-6 rounded-3xl flex justify-between items-center group hover:border-white/20 transition-all">
                            <div className="flex flex-col">
                              <span className="text-white font-black text-sm uppercase tracking-widest italic">{new Date(b.date).toLocaleDateString('fr-FR', {month:'long', day:'numeric', year:'numeric'})}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] text-velatra-textDark font-black uppercase tracking-widest">Scan effectué en club</span>
                                <button onClick={() => handleDeleteScan(b.id)} className="text-[8px] text-red-500/40 hover:text-red-500 font-black uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100">Supprimer</button>
                              </div>
                            </div>
                            <div className="flex gap-10">
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-velatra-textDark tracking-widest mb-1">POIDS</div>
                                  <div className="text-xl font-black text-white">{b.weight}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-velatra-textDark tracking-widest mb-1">GRAS</div>
                                  <div className="text-xl font-black text-emerald-500">{b.fat}<span className="text-xs ml-0.5 opacity-50">%</span></div>
                               </div>
                               <div className="text-center group-hover:scale-110 transition-transform">
                                  <div className="text-[8px] font-black uppercase text-velatra-textDark tracking-widest mb-1">MUSCLE</div>
                                  <div className="text-xl font-black text-velatra-accent">{b.muscle}<span className="text-xs ml-0.5 opacity-50">KG</span></div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] text-[10px] uppercase font-black text-velatra-textDark tracking-[4px] italic">Aucun historique biométrique</div>
                       )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {isEditingInfo && selectedProfile && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg !p-8 border-white/10 relative shadow-2xl">
            <button onClick={() => setIsEditingInfo(false)} className="absolute top-6 right-6 text-white/40 hover:text-white">
              <XIcon size={24} />
            </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Modifier Profil</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Informations de base de l'athlète</p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={editInfoData.name}
                    onChange={e => setEditInfoData({...editInfoData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Genre</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-velatra-accent outline-none appearance-none"
                    value={editInfoData.gender}
                    onChange={e => setEditInfoData({...editInfoData, gender: e.target.value as Gender})}
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={editInfoData.age}
                    onChange={e => setEditInfoData({...editInfoData, age: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={editInfoData.weight}
                    onChange={e => setEditInfoData({...editInfoData, weight: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={editInfoData.height}
                    onChange={e => setEditInfoData({...editInfoData, height: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Objectifs</label>
                <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl border border-white/10 max-h-32 overflow-y-auto no-scrollbar">
                  {GOALS.map(g => {
                    const isSelected = editInfoData.objectifs?.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => {
                          const current = editInfoData.objectifs || [];
                          const next = isSelected 
                            ? current.filter(item => item !== g)
                            : [...current, g];
                          setEditInfoData({...editInfoData, objectifs: next});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-velatra-accent border-velatra-accent text-white' : 'bg-white/5 border-white/5 text-velatra-textDark'}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Notes d'Inscription</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-velatra-accent outline-none h-24 resize-none"
                  value={editInfoData.notes || ""}
                  onChange={e => setEditInfoData({...editInfoData, notes: e.target.value})}
                  placeholder="Notes renseignées lors de l'inscription..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsEditingInfo(false)}>ANNULER</Button>
                <Button variant="success" fullWidth onClick={handleUpdateMemberInfo}>
                  ENREGISTRER <CheckIcon size={18} className="ml-2" />
                </Button>
              </div>
              <div className="pt-2">
                <Button variant="secondary" fullWidth onClick={handleDeleteMember} className="!bg-red-500/10 !text-red-500 hover:!bg-red-500/20">
                  SUPPRIMER LE MEMBRE
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg !p-8 border-white/10 relative shadow-2xl">
            <button onClick={() => setIsAddingMember(false)} className="absolute top-6 right-6 text-white/40 hover:text-white">
              <XIcon size={24} />
            </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Nouveau Profil</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Créer un membre manuellement</p>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Nom Complet</label>
                  <Input 
                    value={newMemberData.name}
                    onChange={e => setNewMemberData({...newMemberData, name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Email</label>
                  <Input 
                    type="email"
                    value={newMemberData.email}
                    onChange={e => setNewMemberData({...newMemberData, email: e.target.value})}
                    placeholder="jean@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Âge</label>
                  <Input 
                    type="number"
                    value={newMemberData.age}
                    onChange={e => setNewMemberData({...newMemberData, age: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Poids (kg)</label>
                  <Input 
                    type="number"
                    value={newMemberData.weight}
                    onChange={e => setNewMemberData({...newMemberData, weight: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Taille (cm)</label>
                  <Input 
                    type="number"
                    value={newMemberData.height}
                    onChange={e => setNewMemberData({...newMemberData, height: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="secondary" fullWidth onClick={() => setIsAddingMember(false)}>ANNULER</Button>
                <Button variant="success" fullWidth onClick={handleCreateMember}>
                  CRÉER LE MEMBRE <CheckIcon size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
