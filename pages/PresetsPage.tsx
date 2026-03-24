
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Preset, Program, User } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { PlusIcon, LayersIcon, Edit2Icon, Trash2Icon, SearchIcon, CheckIcon, UserIcon, XIcon } from '../components/Icons';
import { db, doc, setDoc, deleteDoc } from '../firebase';
import { GOALS } from '../constants';

export const PresetsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [assigningTo, setAssigningTo] = useState<Preset | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [filterGoal, setFilterGoal] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewPreset = () => {
    const newP: Preset = {
      id: Date.now(),
      clubId: state.user!.clubId,
      name: "Nouveau Preset",
      objectifs: [],
      remarks: "",
      nbDays: 1,
      durationWeeks: state.currentClub?.settings?.defaultProgramDuration || 7,
      days: [{ name: "Jour 1", isCoaching: false, exercises: [] }],
      createdBy: state.user!.id
    };
    setState((s: AppState) => ({ ...s, editingPreset: newP }));
  };

  const handleAssign = async (preset: Preset, member: User) => {
    const newProg: Program = {
      id: Date.now(),
      clubId: member.clubId,
      memberId: Number(member.id),
      name: preset.name,
      presetId: preset.id,
      nbDays: preset.nbDays,
      durationWeeks: preset.durationWeeks || state.currentClub?.settings?.defaultProgramDuration || 7,
      startDate: new Date().toISOString().split('T')[0],
      completedWeeks: [],
      currentDayIndex: 0,
      days: JSON.parse(JSON.stringify(preset.days)) // Deep copy
    };

    try {
      await setDoc(doc(db, "programs", newProg.id.toString()), newProg);
      showToast(`Programme assigné à ${member.name}`, "success");
      setAssigningTo(null);
    } catch (err) {
      showToast("Erreur lors de l'assignation", "error");
    }
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Modèles <span className="text-velatra-accent">PRESETS</span></h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">{state.presets.length} Templates dispos</p>
        </div>
        <Button onClick={handleNewPreset} variant="primary" className="!py-3 !rounded-2xl shadow-xl shadow-velatra-accent/20">
          <PlusIcon size={18} className="mr-2" /> CRÉER UN MODÈLE
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <Input 
            placeholder="Rechercher un modèle..." 
            className="pl-14 !bg-zinc-50 !border-zinc-200 !rounded-2xl font-bold" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button 
            onClick={() => { setFilterGoal(""); setFilterDays(null); }} 
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterGoal === "" && filterDays === null ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            Tous
          </button>
          
          <div className="relative">
            <select 
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filterGoal !== "" ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              value={filterGoal}
              onChange={e => setFilterGoal(e.target.value)}
            >
              <option value="">Objectif</option>
              {GOALS.map(g => (
                <option key={g} value={g} className="bg-zinc-50 text-zinc-900">{g}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="relative">
            <select 
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filterDays !== null ? 'bg-velatra-accent text-white' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
              value={filterDays || ""}
              onChange={e => setFilterDays(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Jours/semaine</option>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d} className="bg-zinc-50 text-zinc-900">{d} {d === 1 ? 'Jour' : 'Jours'}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          const filteredPresets = state.presets.filter(p => {
            const matchesClub = p.clubId === state.user?.clubId;
            const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDays = filterDays ? p.nbDays === filterDays : true;
            const matchesGoals = filterGoal !== "" 
              ? p.objectifs.includes(filterGoal as any)
              : true;
            return matchesClub && matchesSearch && matchesDays && matchesGoals;
          });

          if (filteredPresets.length === 0) {
            return (
              <div className="col-span-full py-20 text-center text-zinc-900 italic bg-zinc-50 border border-dashed border-zinc-200 rounded-[40px]">
                Aucun modèle ne correspond à vos critères.
              </div>
            );
          }

          return filteredPresets.map(p => (
            <Card key={p.id} className="group border-none ring-1 ring-zinc-200 hover:ring-velatra-accent/30 transition-all !p-8 bg-white flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-black text-xl text-zinc-900 uppercase italic tracking-tighter group-hover:text-velatra-accent transition-colors">{p.name}</div>
                    <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{p.nbDays} JOURS • {p.durationWeeks ? `${p.durationWeeks} SEMAINES • ` : ''}{p.days.reduce((acc, d) => acc + d.exercises.length, 0)} MOUVEMENTS</div>
                  </div>
                  <Badge variant="blue" className="!bg-blue-500/10 !text-blue-500 !border-blue-500/20 italic">TEMPLATE</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {p.objectifs.map(o => (
                    <Badge key={o} variant="dark" className="!bg-zinc-50 !text-[8px]">{o}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 space-y-3">
                <Button variant="primary" fullWidth className="!py-3.5 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setAssigningTo(p)}>
                  <CheckIcon size={16} className="mr-2" /> ASSIGNER À UN ATHLÈTE
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setState((s:AppState) => ({ ...s, editingPreset: p }))}>
                    <Edit2Icon size={14} className="mr-2" /> MODIFIER
                  </Button>
                  <button 
                    onClick={async () => {
                      const newPreset = JSON.parse(JSON.stringify(p));
                      newPreset.id = Date.now();
                      newPreset.name = `${p.name} (Copie)`;
                      try {
                        await setDoc(doc(db, "presets", newPreset.id.toString()), newPreset);
                        setState((s:AppState) => ({ ...s, presets: [...s.presets, newPreset] }));
                        showToast("Modèle dupliqué", "success");
                      } catch (err) {
                        showToast("Erreur lors de la duplication", "error");
                      }
                    }}
                    className="p-3 bg-zinc-50 text-zinc-400 hover:text-velatra-accent hover:bg-velatra-accent/10 rounded-xl transition-all"
                    title="Dupliquer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm("Supprimer ce preset ?")) {
                        try {
                          await deleteDoc(doc(db, "presets", p.id.toString()));
                          setState((s:AppState) => ({ ...s, presets: s.presets.filter(pr => pr.id !== p.id) }));
                          showToast("Modèle supprimé", "success");
                        } catch (err) {
                          showToast("Erreur lors de la suppression", "error");
                        }
                      }
                    }}
                    className="p-3 bg-red-500/5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2Icon size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ));
        })()}
      </div>

      {createPortal(
      <>
      {assigningTo && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md !p-10 border-zinc-200 relative shadow-[0_0_100px_rgba(0,0,0,1)]">
            <button onClick={() => setAssigningTo(null)} className="absolute top-8 right-8 text-zinc-900/40 hover:text-zinc-900">
              <XIcon size={24} />
            </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Assigner Preset</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Modèle : {assigningTo.name}</p>

            <div className="space-y-6">
              <div className="relative">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900" />
                <Input 
                  placeholder="Chercher un athlète..." 
                  className="pl-12 !bg-white" 
                  value={memberSearch} 
                  onChange={e => setMemberSearch(e.target.value)} 
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-2">
                {state.users
                  .filter(u => u.role === 'member' && u.clubId === state.user?.clubId && (u.name || '').toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(member => (
                    <button 
                      key={member.id}
                      onClick={() => handleAssign(assigningTo, member)}
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-velatra-accent/50 hover:bg-velatra-accent/5 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center font-black text-velatra-accent group-hover:bg-velatra-accent group-hover:text-zinc-900 transition-all">{member.avatar}</div>
                        <span className="font-black text-xs uppercase italic text-zinc-900">{member.name}</span>
                      </div>
                      <CheckIcon size={18} className="text-zinc-900 group-hover:text-velatra-accent transition-colors" />
                    </button>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      )}
      </>,
      document.body
      )}
    </div>
  );
};
