
import React, { useState } from 'react';
import { AppState, Preset, Program, User } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { PlusIcon, LayersIcon, Edit2Icon, Trash2Icon, SearchIcon, CheckIcon, UserIcon, XIcon } from '../components/Icons';
import { db, doc, setDoc } from '../firebase';
import { GOALS } from '../constants';

export const PresetsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [assigningTo, setAssigningTo] = useState<Preset | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [filterGoals, setFilterGoals] = useState<string[]>([]);
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
      memberId: member.id,
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
          <h1 className="text-4xl font-display font-bold tracking-tight text-white leading-none">Modèles <span className="text-velatra-accent">PRESETS</span></h1>
          <p className="text-[10px] text-velatra-textDark font-bold uppercase tracking-[3px] mt-2">{state.presets.length} Templates dispos</p>
        </div>
        <Button onClick={handleNewPreset} variant="primary" className="!py-3 !rounded-2xl shadow-xl shadow-velatra-accent/20">
          <PlusIcon size={18} className="mr-2" /> CRÉER UN MODÈLE
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Recherche</label>
            <div className="relative">
              <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-velatra-textDark" />
              <Input 
                placeholder="Nom du modèle..." 
                className="pl-12 !bg-white/5 !border-white/5" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Jours d'entraînement</label>
            <select 
              className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white focus:border-velatra-accent outline-none appearance-none"
              value={filterDays || ""}
              onChange={e => setFilterDays(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Tous les jours</option>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>{d} {d === 1 ? 'Jour' : 'Jours'}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest ml-1">Objectifs (Multi-choix)</label>
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 border border-white/5 rounded-xl min-h-[48px]">
              {GOALS.map(g => {
                const isSelected = filterGoals.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => {
                      if (isSelected) setFilterGoals(prev => prev.filter(item => item !== g));
                      else setFilterGoals(prev => [...prev, g]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${isSelected ? 'bg-velatra-accent border-velatra-accent text-white' : 'bg-white/5 border-white/5 text-velatra-textDark hover:text-white'}`}
                  >
                    {g}
                  </button>
                );
              })}
              {filterGoals.length > 0 && (
                <button 
                  onClick={() => setFilterGoals([])}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-red-500/10 text-red-500 border border-red-500/20"
                >
                  RESET
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(() => {
          const filteredPresets = state.presets.filter(p => {
            const matchesClub = p.clubId === state.user?.clubId;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDays = filterDays ? p.nbDays === filterDays : true;
            const matchesGoals = filterGoals.length > 0 
              ? filterGoals.some(g => p.objectifs.includes(g as any))
              : true;
            return matchesClub && matchesSearch && matchesDays && matchesGoals;
          });

          if (filteredPresets.length === 0) {
            return (
              <div className="col-span-full py-20 text-center text-velatra-textDark italic bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
                Aucun modèle ne correspond à vos critères.
              </div>
            );
          }

          return filteredPresets.map(p => (
            <Card key={p.id} className="group border-none ring-1 ring-white/5 hover:ring-velatra-accent/30 transition-all !p-8 bg-[#0a0a0a] flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-black text-xl text-white uppercase italic tracking-tighter group-hover:text-velatra-accent transition-colors">{p.name}</div>
                    <div className="text-[10px] font-black text-velatra-textDark uppercase tracking-widest">{p.nbDays} JOURS • {p.durationWeeks ? `${p.durationWeeks} SEMAINES • ` : ''}{p.days.reduce((acc, d) => acc + d.exercises.length, 0)} MOUVEMENTS</div>
                  </div>
                  <Badge variant="blue" className="!bg-blue-500/10 !text-blue-500 !border-blue-500/20 italic">TEMPLATE</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {p.objectifs.map(o => (
                    <Badge key={o} variant="dark" className="!bg-white/5 !text-[8px]">{o}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 space-y-3">
                <Button variant="primary" fullWidth className="!py-3.5 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setAssigningTo(p)}>
                  <CheckIcon size={16} className="mr-2" /> ASSIGNER À UN ATHLÈTE
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth className="!py-3 !text-[10px] !rounded-xl font-black tracking-widest italic" onClick={() => setState((s:AppState) => ({ ...s, editingPreset: p }))}>
                    <Edit2Icon size={14} className="mr-2" /> MODIFIER
                  </Button>
                  <button 
                    onClick={() => {
                      if(confirm("Supprimer ce preset ?")) {
                        setState((s:AppState) => ({ ...s, presets: s.presets.filter(pr => pr.id !== p.id) }));
                      }
                    }}
                    className="p-3 bg-red-500/5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2Icon size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ));
        })()}
      </div>

      {assigningTo && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md !p-10 border-white/10 relative shadow-[0_0_100px_rgba(0,0,0,1)]">
            <button onClick={() => setAssigningTo(null)} className="absolute top-8 right-8 text-white/40 hover:text-white">
              <XIcon size={24} />
            </button>
            
            <h2 className="text-2xl font-black mb-1 uppercase italic">Assigner Preset</h2>
            <p className="text-[10px] text-velatra-accent font-black uppercase tracking-widest mb-8">Modèle : {assigningTo.name}</p>

            <div className="space-y-6">
              <div className="relative">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-velatra-textDark" />
                <Input 
                  placeholder="Chercher un athlète..." 
                  className="pl-12 !bg-black" 
                  value={memberSearch} 
                  onChange={e => setMemberSearch(e.target.value)} 
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar pr-2">
                {state.users
                  .filter(u => u.role === 'member' && u.clubId === state.user?.clubId && u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map(member => (
                    <button 
                      key={member.id}
                      onClick={() => handleAssign(assigningTo, member)}
                      className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-velatra-accent/50 hover:bg-velatra-accent/5 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-velatra-accent group-hover:bg-velatra-accent group-hover:text-white transition-all">{member.avatar}</div>
                        <span className="font-black text-xs uppercase italic text-white">{member.name}</span>
                      </div>
                      <CheckIcon size={18} className="text-velatra-textDark group-hover:text-velatra-accent transition-colors" />
                    </button>
                  ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
