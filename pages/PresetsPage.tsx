import { localDateKey, createNumericId } from '../components/dataHelpers';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppState, Preset, Program, User } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { VelatraMascot } from '../components/VelatraMascot';
import { PlusIcon, LayersIcon, Edit2Icon, Trash2Icon, SearchIcon, CheckIcon, UserIcon, XIcon } from '../components/Icons';
import { db, doc, setDoc, deleteDoc } from '../firebase';
import { GOALS } from '../constants';
import { trackProductEventOnce } from '../components/productEvents';

export const PresetsPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [assigningTo, setAssigningTo] = useState<Preset | null>(null);
  const assignDialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => { if (assigningTo && !assignDialogRef.current?.open) assignDialogRef.current?.showModal(); }, [assigningTo]);
  const [memberSearch, setMemberSearch] = useState("");
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [filterGoal, setFilterGoal] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewPreset = () => {
    const newP: Preset = {
      id: createNumericId(),
      clubId: state.user!.clubId,
      name: "Nouveau modèle",
      objectifs: [],
      remarks: "",
      nbDays: 1,
      durationWeeks: state.currentClub?.settings?.defaultProgramDuration || 7,
      days: [{ name: "Jour 1", isCoaching: false, exercises: [] }],
      createdBy: state.user!.id
    };
    setState((s: AppState) => ({ ...s, editingPreset: newP }));
  };

  React.useEffect(() => {
    if (state.pendingUiAction !== 'add-preset') return;
    handleNewPreset();
    setState((previous: AppState) => ({ ...previous, pendingUiAction: undefined }));
  }, [state.pendingUiAction]);

  const [confirmDeletePresetId, setConfirmDeletePresetId] = useState<number | null>(null);

  const confirmDeletePreset = async () => {
    if (!confirmDeletePresetId) return;
    try {
      await deleteDoc(doc(db, "presets", confirmDeletePresetId.toString()));
      setState((s:AppState) => ({ ...s, presets: s.presets.filter(pr => pr.id !== confirmDeletePresetId) }));
      showToast("Modèle supprimé", "success");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setConfirmDeletePresetId(null);
    }
  };

  const handleAssign = async (preset: Preset, member: User) => {
    const newProg: Program = {
      id: createNumericId(),
      clubId: member.clubId,
      memberId: Number(member.id),
      name: preset.name,
      presetId: preset.id,
      nbDays: preset.nbDays,
      durationWeeks: preset.durationWeeks || state.currentClub?.settings?.defaultProgramDuration || 7,
      startDate: localDateKey(),
      completedWeeks: [],
      currentDayIndex: 0,
      days: JSON.parse(JSON.stringify(preset.days)) // Deep copy
    };

    try {
      await setDoc(doc(db, "programs", newProg.id.toString()), newProg);
      trackProductEventOnce('first_program_created', state.user?.firebaseUid || state.user?.id);
      trackProductEventOnce('first_program_assigned', state.user?.firebaseUid || state.user?.id);
      showToast(`Programme assigné à ${member.name}`, "success");
      setAssigningTo(null);
    } catch (err) {
      showToast("Erreur lors de l'assignation", "error");
    }
  };

  return (
    <div className="va-presets-page va-polish-page space-y-6 page-transition pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Modèles de programmes</h1>
          <p className="text-sm text-zinc-600 mt-2">Des séances réutilisables, adaptées à chaque adhérent.</p>
        </div>
        <Button onClick={handleNewPreset} variant="primary" className="!py-2.5 sm:!py-3 !px-4 sm:!px-6 !rounded-2xl font-semibold text-sm whitespace-nowrap">
          <PlusIcon size={18} className="mr-2 inline" /> Créer un modèle
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <SearchIcon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-900" />
          <Input 
            aria-label="Rechercher un modèle" placeholder="Rechercher un modèle…"
            className="pl-14 \!bg-white \!border-zinc-200 !rounded-2xl font-bold" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button 
            onClick={() => { setFilterGoal(""); setFilterDays(null); }} 
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filterGoal === "" && filterDays === null ? 'bg-emerald-500 text-zinc-900' : 'bg-white text-zinc-500 hover:text-zinc-900 hover:bg-white'}`}
          >
            Tous
          </button>
          
          <div className="relative">
            <select 
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filterGoal !== "" ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              aria-label="Filtrer par objectif"
              value={filterGoal}
              onChange={e => setFilterGoal(e.target.value)}
            >
              <option value="">Objectif</option>
              {GOALS.map(g => (
                <option key={g} value={g} className="bg-white text-zinc-900">{g}</option>
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
              className={`appearance-none px-4 py-2 pr-8 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer outline-none ${filterDays !== null ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              aria-label="Filtrer par nombre de jours"
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
            const clubHasPresets = state.presets.some(preset => preset.clubId === state.user?.clubId);
            const hasActiveFilter = Boolean(searchQuery.trim() || filterGoal || filterDays);
            return (
              <div className="col-span-full flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
                <div className="max-w-sm">
                  <VelatraMascot state={hasActiveFilter ? 'thinking' : 'idle'} size={112} interactive={false} autoWave={!hasActiveFilter} className="mx-auto" />
                  <h2 className="mt-1 font-display text-xl font-semibold text-zinc-900">
                    {clubHasPresets ? 'Aucun modèle trouvé' : 'Créez votre premier modèle'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-6 text-zinc-600">
                    {clubHasPresets
                      ? 'Ajustez la recherche ou les filtres pour retrouver un autre modèle.'
                      : 'Préparez une structure réutilisable pour créer les prochains programmes plus rapidement.'}
                  </p>
                  {!clubHasPresets && (
                    <Button onClick={handleNewPreset} variant="primary" className="mt-5 !rounded-xl !px-5 !py-3 !text-sm !font-semibold">
                      <PlusIcon size={16} className="mr-2 inline" /> Créer un modèle
                    </Button>
                  )}
                </div>
              </div>
            );
          }

          return filteredPresets.map(p => (
            <Card key={p.id} className="va-preset-card group bg-white flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-display font-semibold text-lg text-zinc-900 tracking-tight group-hover:text-emerald-500 transition-colors">{p.name}</div>
                    <div className="text-xs font-medium text-zinc-600">{p.nbDays} {p.nbDays > 1 ? 'jours' : 'jour'} · {p.durationWeeks ? `${p.durationWeeks} semaines · ` : ''}{p.days.reduce((acc, d) => acc + d.exercises.length, 0)} mouvement{p.days.reduce((acc, d) => acc + d.exercises.length, 0) > 1 ? 's' : ''}</div>
                  </div>
                  <Badge variant="dark">Modèle</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {p.objectifs.map(o => (
                    <Badge key={o} variant="dark" className="!bg-zinc-50 !text-[10px]">{o}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 space-y-3">
                <Button variant="primary" fullWidth className="min-h-11" onClick={() => setAssigningTo(p)}>
                  <CheckIcon size={16} className="mr-2" /> Attribuer à un adhérent
                </Button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="secondary" fullWidth className="min-h-11" onClick={() => setState((s:AppState) => ({ ...s, editingPreset: p }))}>
                    <Edit2Icon size={14} className="mr-2" /> Modifier
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
                    className="p-3 bg-zinc-50 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                    title="Dupliquer" aria-label="Dupliquer le modèle"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                  <button 
                    onClick={() => setConfirmDeletePresetId(p.id)}
                    className="p-3 bg-red-500/5 text-red-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Supprimer" aria-label="Supprimer le modèle"
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
        <dialog ref={assignDialogRef} onCancel={() => setAssigningTo(null)} aria-labelledby="assign-preset-title" className="va-assign-dialog">
          <div className="relative">
            <button onClick={() => setAssigningTo(null)} aria-label="Fermer l’attribution" className="absolute top-0 right-0 h-11 w-11 flex items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
              <XIcon size={24} />
            </button>
            
            <h2 id="assign-preset-title" className="font-display text-2xl font-semibold mb-2 pr-12">Attribuer le modèle</h2>
            <p className="text-sm text-zinc-600 mb-6 pr-10">Modèle : {assigningTo.name}</p>

            <div className="space-y-6">
              <div className="relative">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-900" />
                <Input 
                  autoFocus aria-label="Rechercher un adhérent" placeholder="Rechercher un adhérent…"
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
                      className="w-full p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center font-semibold text-emerald-900 group-hover:bg-emerald-100 group-hover:text-emerald-950 transition-all overflow-hidden">
                          {member.avatar?.startsWith('http') ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            member.avatar || member.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-semibold text-sm text-zinc-900">{member.name}</span>
                      </div>
                      <CheckIcon size={18} className="text-zinc-900 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </dialog>
      )}
      </>,
      document.body
      )}

      {confirmDeletePresetId && createPortal(
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Supprimer ce modèle ?</h3>
            <p className="text-zinc-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmDeletePresetId(null)}>Annuler</Button>
              <Button variant="danger" fullWidth onClick={confirmDeletePreset}>Supprimer</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
