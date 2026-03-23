import React, { useState } from 'react';
import { Program, Preset, Exercise, Day, ExerciseEntry, AppState } from '../types';
import { Button, Input, Card, Badge } from './UI';
import { 
  PlusIcon, Trash2Icon, ChevronLeftIcon, SaveIcon, 
  DumbbellIcon, LayersIcon, InfoIcon, MessageCircleIcon, RefreshCwIcon, LinkIcon,
  ArrowUpIcon, ArrowDownIcon, CopyIcon
} from './Icons';
import { EXERCISE_CATEGORIES, GOALS } from '../constants';

interface ProgramEditorProps {
  program: Program | null;
  preset: Preset | null;
  exercises: Exercise[];
  clubId: string; // New prop
  onSave: (data: Program | Preset) => void;
  onCancel: () => void;
  allPresets?: Preset[]; 
  member?: any;
}

export const ProgramEditor: React.FC<ProgramEditorProps> = ({ 
  program, 
  preset, 
  exercises, 
  clubId,
  onSave, 
  onCancel,
  allPresets = [],
  member
}) => {
  const isEditingProgram = !!program;
  const initialData = program || preset || {
    id: Date.now(),
    clubId: clubId,
    name: "",
    nbDays: 1,
    days: [{ name: "Jour 1", isCoaching: false, exercises: [] }],
    memberId: 0,
    startDate: new Date().toISOString().split('T')[0],
    completedWeeks: [],
    currentDayIndex: 0,
    objectifs: [],
    remarks: "",
    memberRemarks: "",
    createdBy: 0
  };

  const [formData, setFormData] = useState<any>(initialData);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [showPresets, setShowPresets] = useState(false);

  const handleApplyPreset = (p: Preset) => {
    setFormData({
      ...formData,
      name: p.name,
      nbDays: p.nbDays,
      durationWeeks: p.durationWeeks,
      days: JSON.parse(JSON.stringify(p.days)), // Profonde copie
      presetId: p.id
    });
    setShowPresets(false);
    setSelectedDayIdx(0);
  };

  const handleAddDay = () => {
    const newDay: Day = {
      name: `Jour ${formData.days.length + 1}`,
      isCoaching: false,
      exercises: []
    };
    setFormData({
      ...formData,
      nbDays: formData.days.length + 1,
      days: [...formData.days, newDay]
    });
    setSelectedDayIdx(formData.days.length);
  };

  const handleRemoveDay = (idx: number) => {
    if (formData.days.length <= 1) return;
    const newDays = formData.days.filter((_: any, i: number) => i !== idx);
    setFormData({
      ...formData,
      nbDays: newDays.length,
      days: newDays
    });
    setSelectedDayIdx(Math.max(0, idx - 1));
  };

  const handleAddExercise = (dayIdx: number) => {
    const currentDayExercises = formData.days[dayIdx].exercises;
    const lastEx = currentDayExercises.length > 0 ? currentDayExercises[currentDayExercises.length - 1] : null;

    const newEx: ExerciseEntry = {
      exId: exercises[0].id,
      sets: lastEx ? lastEx.sets : 3,
      reps: lastEx ? lastEx.reps : "10-12",
      rest: lastEx ? lastEx.rest : "90",
      tempo: lastEx ? lastEx.tempo : "2010",
      duration: "",
      notes: "",
      setGroup: null,
      setType: "normal",
      setName: null
    };
    const newDays = [...formData.days];
    newDays[dayIdx].exercises.push(newEx);
    setFormData({ ...formData, days: newDays });
  };

  const handleUpdateEx = (dayIdx: number, exIdx: number, field: keyof ExerciseEntry, value: any) => {
    const newDays = [...formData.days];
    const currentEx = newDays[dayIdx].exercises[exIdx];
    
    if (field === 'setType') {
      const newType = value as string;
      const isGroupType = ['superset', 'biset', 'triset', 'giantset'].includes(newType);
      const currentGroup = currentEx.setGroup;
      
      if (isGroupType) {
        if (currentGroup !== null && currentGroup > 0) {
          // Already in a group, update type for all in the group
          newDays[dayIdx].exercises = newDays[dayIdx].exercises.map((e: ExerciseEntry) => {
            if (e.setGroup === currentGroup) {
              return { ...e, setType: newType as any };
            }
            return e;
          });
        } else {
          // Create a new group
          let count = 2;
          if (newType === 'triset') count = 3;
          if (newType === 'giantset') count = 4;
          
          const allGroups = newDays[dayIdx].exercises.map((e: ExerciseEntry) => e.setGroup).filter((g: number | null) => g !== null && g > 0) as number[];
          const nextGroupId = allGroups.length > 0 ? Math.max(...allGroups) + 1 : 1;
          
          for (let i = 0; i < count; i++) {
            if (exIdx + i < newDays[dayIdx].exercises.length) {
              newDays[dayIdx].exercises[exIdx + i] = {
                ...newDays[dayIdx].exercises[exIdx + i],
                setGroup: nextGroupId,
                setType: newType as any
              };
            }
          }
        }
      } else if (newType === 'normal') {
        if (currentGroup !== null && currentGroup > 0) {
          // Ungroup all in this group
          newDays[dayIdx].exercises = newDays[dayIdx].exercises.map((e: ExerciseEntry) => {
            if (e.setGroup === currentGroup) {
              return { ...e, setGroup: null, setType: 'normal' };
            }
            return e;
          });
        } else {
          newDays[dayIdx].exercises[exIdx] = {
            ...currentEx,
            setGroup: null,
            setType: 'normal'
          };
        }
      } else {
        // Dropset, custom, etc.
        newDays[dayIdx].exercises[exIdx] = {
          ...currentEx,
          [field]: value
        };
      }
    } else {
      newDays[dayIdx].exercises[exIdx] = {
        ...currentEx,
        [field]: value
      };
    }
    
    setFormData({ ...formData, days: newDays });
  };

  const handleRemoveEx = (dayIdx: number, exIdx: number) => {
    const newDays = [...formData.days];
    newDays[dayIdx].exercises = newDays[dayIdx].exercises.filter((_: any, i: number) => i !== exIdx);
    setFormData({ ...formData, days: newDays });
  };

  const handleDuplicateDay = (dayIdx: number) => {
    const dayToDuplicate = JSON.parse(JSON.stringify(formData.days[dayIdx]));
    dayToDuplicate.name = `${dayToDuplicate.name} (Copie)`;
    const newDays = [...formData.days];
    newDays.splice(dayIdx + 1, 0, dayToDuplicate);
    setFormData({
      ...formData,
      nbDays: newDays.length,
      days: newDays
    });
    setSelectedDayIdx(dayIdx + 1);
  };

  const handleDuplicateEx = (dayIdx: number, exIdx: number) => {
    const newDays = [...formData.days];
    const exToDuplicate = JSON.parse(JSON.stringify(newDays[dayIdx].exercises[exIdx]));
    newDays[dayIdx].exercises.splice(exIdx + 1, 0, exToDuplicate);
    setFormData({ ...formData, days: newDays });
  };

  const handleMoveEx = (dayIdx: number, exIdx: number, direction: 'up' | 'down') => {
    const newDays = [...formData.days];
    const exercises = newDays[dayIdx].exercises;
    if (direction === 'up' && exIdx > 0) {
      [exercises[exIdx - 1], exercises[exIdx]] = [exercises[exIdx], exercises[exIdx - 1]];
    } else if (direction === 'down' && exIdx < exercises.length - 1) {
      [exercises[exIdx], exercises[exIdx + 1]] = [exercises[exIdx + 1], exercises[exIdx]];
    }
    setFormData({ ...formData, days: newDays });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24 px-4 page-transition">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 -mx-4 px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors bg-white rounded-full shadow-sm">
            <ChevronLeftIcon size={24} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">
              {isEditingProgram ? "ADAPTER LE PLAN" : "ÉDITION MODÈLE"}
            </h1>
            <p className="text-velatra-accent text-[10px] uppercase tracking-[3px] font-bold mt-1">Expert Coaching <span className="text-zinc-900">VELATRA</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditingProgram && (
             <Button onClick={() => setShowPresets(!showPresets)} variant="secondary" className="!rounded-full font-black text-[10px] tracking-widest italic shadow-sm">
                {showPresets ? "X" : "APPLIQUER MODÈLE"}
             </Button>
          )}
          <Button onClick={() => onSave(formData)} variant="success" className="shadow-lg px-8 py-3 !rounded-full font-black italic">
            <SaveIcon size={18} className="mr-2" />
            VALIDER
          </Button>
        </div>
      </header>

      {showPresets && isEditingProgram && (
        <Card className="!bg-velatra-accent/5 border-velatra-accent/20 animate-in slide-in-from-top-4 duration-300">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-velatra-accent mb-4">Choisir un modèle (Preset)</h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPresets.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handleApplyPreset(p)}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left hover:border-velatra-accent transition-all"
                >
                  <div className="text-xs font-black text-zinc-900 uppercase">{p.name}</div>
                  <div className="text-[8px] text-zinc-900 font-black mt-1 uppercase">{p.nbDays} JOURS</div>
                </button>
              ))}
              {allPresets.length === 0 && <p className="text-[10px] text-zinc-900 italic">Aucun modèle disponible.</p>}
           </div>
        </Card>
      )}

      {/* Main Info Card */}
      <Card className="space-y-6 !p-8 bg-zinc-50 border-zinc-200 ring-1 ring-zinc-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Titre du Programme</label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Hypertrophie Poussée" 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Durée (Semaines)</label>
            <select 
              value={formData.durationWeeks || ''} 
              onChange={e => setFormData({...formData, durationWeeks: e.target.value ? parseInt(e.target.value) : null})}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 text-sm font-medium focus:outline-none focus:border-velatra-accent focus:ring-1 focus:ring-velatra-accent transition-all"
            >
              <option value="">Pas de délai (Continu)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24].map(w => (
                <option key={w} value={w}>{w} Semaine{w > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {isEditingProgram ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Date de début</label>
                <Input 
                  type="date"
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              {member && (
                <div className="space-y-2 col-span-1 md:col-span-2 mt-2 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-200/50">
                  <div className="flex items-center gap-2 text-zinc-900 mb-2">
                    <InfoIcon size={16} className="text-velatra-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Profil de {member.name}</span>
                  </div>
                  {member.objectifs && member.objectifs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {member.objectifs.map((o: string) => (
                        <Badge key={o} variant="dark" className="!bg-white !text-zinc-600 !border-zinc-200 !text-[8px]">{o}</Badge>
                      ))}
                    </div>
                  )}
                  {member.notes && (
                    <p className="text-xs text-zinc-600 italic leading-relaxed">"{member.notes}"</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Objectifs du Modèle</label>
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 border border-zinc-200 rounded-2xl min-h-[48px]">
                {GOALS.map(g => {
                  const isSelected = formData.objectifs?.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        const current = formData.objectifs || [];
                        if (isSelected) {
                          setFormData({ ...formData, objectifs: current.filter((item: string) => item !== g) });
                        } else {
                          setFormData({ ...formData, objectifs: [...current, g] });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${isSelected ? 'bg-velatra-accent border-velatra-accent text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Remarks display for coach - Critical for adaptive coaching */}
        {isEditingProgram && formData.memberRemarks && (
          <div className="p-5 bg-orange-500/10 border-2 border-orange-500/30 rounded-[32px] flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between animate-in zoom-in duration-500">
             <div className="flex gap-5 items-center">
               <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <MessageCircleIcon size={24} />
               </div>
               <div>
                  <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">RETOUR ADHÉRENT (À TRAITER) :</div>
                  <p className="text-base font-black text-zinc-900 italic leading-tight">"{formData.memberRemarks}"</p>
                  <p className="text-[9px] text-zinc-900 font-bold uppercase mt-1">Ajustez les intensités ou remplacez les exercices concernés ci-dessous.</p>
               </div>
             </div>
             <Button 
               variant="secondary" 
               onClick={() => setFormData({...formData, memberRemarks: ""})}
               className="!py-2 !px-4 !rounded-xl !text-[10px] font-black tracking-widest whitespace-nowrap shrink-0"
             >
               MARQUER COMME TRAITÉ
             </Button>
          </div>
        )}
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
            <LayersIcon size={18} className="text-velatra-accent" />
            Planification Hebdomadaire
          </h2>
          <button 
            onClick={handleAddDay}
            className="text-[11px] font-black text-velatra-accent bg-velatra-accent/10 px-4 py-2 rounded-full hover:bg-velatra-accent/20 transition-all flex items-center gap-2"
          >
            <PlusIcon size={14} /> NOUVEAU JOUR
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {formData.days.map((day: Day, idx: number) => (
            <button
              key={idx}
              onClick={() => setSelectedDayIdx(idx)}
              className={`
                px-8 py-4 rounded-[20px] text-xs font-black whitespace-nowrap transition-all border shrink-0
                ${selectedDayIdx === idx 
                  ? 'bg-velatra-accent border-velatra-accent text-zinc-900 shadow-xl shadow-velatra-accent/20 scale-105 italic' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 hover:border-zinc-300'}
              `}
            >
              J{idx + 1} - {(day.name || `Jour ${idx + 1}`).substring(0, 12)}
            </button>
          ))}
        </div>

        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <Card className="border-2 border-zinc-200 !p-8 bg-white">
            <div className="flex flex-col gap-8 mb-8">
              <div className="flex justify-between items-start border-b border-zinc-200 pb-6">
                <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Titre de la séance</label>
                      <Input 
                        className="!text-xl font-black italic !bg-white"
                        value={formData.days[selectedDayIdx]?.name || ''} 
                        onChange={e => {
                          const newDays = [...formData.days];
                          if (newDays[selectedDayIdx]) {
                            newDays[selectedDayIdx].name = e.target.value;
                            setFormData({...formData, days: newDays});
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Durée estimée (minutes)</label>
                      <Input 
                        type="number"
                        className="!text-xl font-black italic !bg-white"
                        placeholder="Ex: 60"
                        value={formData.days[selectedDayIdx]?.duration || ''} 
                        onChange={e => {
                          const newDays = [...formData.days];
                          if (newDays[selectedDayIdx]) {
                            if (e.target.value) {
                              newDays[selectedDayIdx].duration = parseInt(e.target.value);
                            } else {
                              delete newDays[selectedDayIdx].duration;
                            }
                            setFormData({...formData, days: newDays});
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (selectedDayIdx > 0) {
                          const newDays = [...formData.days];
                          const temp = newDays[selectedDayIdx];
                          newDays[selectedDayIdx] = newDays[selectedDayIdx - 1];
                          newDays[selectedDayIdx - 1] = temp;
                          setFormData({...formData, days: newDays});
                          setSelectedDayIdx(selectedDayIdx - 1);
                        }
                      }}
                      disabled={selectedDayIdx === 0}
                      className="p-3 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10"
                      title="Déplacer vers la gauche"
                    >
                      <ArrowUpIcon size={20} className="-rotate-90" />
                    </button>
                    <button 
                      onClick={() => {
                        if (selectedDayIdx < formData.days.length - 1) {
                          const newDays = [...formData.days];
                          const temp = newDays[selectedDayIdx];
                          newDays[selectedDayIdx] = newDays[selectedDayIdx + 1];
                          newDays[selectedDayIdx + 1] = temp;
                          setFormData({...formData, days: newDays});
                          setSelectedDayIdx(selectedDayIdx + 1);
                        }
                      }}
                      disabled={selectedDayIdx === formData.days.length - 1}
                      className="p-3 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10"
                      title="Déplacer vers la droite"
                    >
                      <ArrowDownIcon size={20} className="-rotate-90" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDuplicateDay(selectedDayIdx)}
                      className="p-3 text-zinc-400 hover:text-velatra-accent transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10 flex-1 flex justify-center"
                      title="Dupliquer ce jour"
                    >
                      <CopyIcon size={20} />
                    </button>
                    <button 
                      onClick={() => handleRemoveDay(selectedDayIdx)}
                      className="p-3 text-red-500/30 hover:text-red-500 transition-colors bg-zinc-50 rounded-xl hover:bg-red-50 flex-1 flex justify-center"
                      title="Supprimer ce jour"
                    >
                      <Trash2Icon size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-zinc-900">PROGRAMMATION ({formData.days[selectedDayIdx]?.exercises?.length || 0} MOUVEMENTS)</span>
                </div>
                
                {(() => {
                  const exercisesList = formData.days[selectedDayIdx]?.exercises || [];
                  const groupedExercises: { isGroup: boolean; groupName?: string; exercises: { entry: ExerciseEntry; index: number }[] }[] = [];
                  
                  let currentGroup: number | null = null;
                  let currentGroupType: string | null = null;
                  let currentGroupItems: { entry: ExerciseEntry; index: number }[] = [];

                  exercisesList.forEach((exEntry, exIndex) => {
                    if (exEntry.setGroup && exEntry.setGroup > 0) {
                      if (currentGroup === exEntry.setGroup) {
                        currentGroupItems.push({ entry: exEntry, index: exIndex });
                      } else {
                        if (currentGroupItems.length > 0) {
                          groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
                        }
                        currentGroup = exEntry.setGroup;
                        currentGroupType = exEntry.setType;
                        currentGroupItems = [{ entry: exEntry, index: exIndex }];
                      }
                    } else {
                      if (currentGroupItems.length > 0) {
                        groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
                        currentGroupItems = [];
                        currentGroup = null;
                        currentGroupType = null;
                      }
                      groupedExercises.push({ isGroup: false, exercises: [{ entry: exEntry, index: exIndex }] });
                    }
                  });
                  if (currentGroupItems.length > 0) {
                    groupedExercises.push({ isGroup: currentGroup !== null, groupName: currentGroupType || '', exercises: currentGroupItems });
                  }

                  return groupedExercises.map((group, gIndex) => {
                    const getGroupDescription = (type: string) => {
                      switch (type.toLowerCase()) {
                        case 'superset': return "Enchaînez ces exercices sans temps de repos entre eux.";
                        case 'biset': return "Enchaînez ces 2 exercices ciblant le même muscle sans repos.";
                        case 'triset': return "Enchaînez ces 3 exercices sans temps de repos.";
                        case 'giantset': return "Enchaînez ces 4 exercices ou plus sans temps de repos.";
                        case 'dropset': return "Allez jusqu'à l'échec, baissez le poids de 20% et repartez sans repos.";
                        default: return "Enchaînez ces exercices selon les indications.";
                      }
                    };

                    return (
                      <div key={gIndex} className={group.isGroup ? "relative pl-6 md:pl-10 space-y-8 mt-16" : "space-y-8"}>
                        {group.isGroup && (
                          <>
                            {/* Ligne verticale de liaison */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-velatra-accent to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                            
                            <div className="absolute -top-8 left-0 bg-velatra-accent text-zinc-900 px-4 py-2 rounded-r-2xl rounded-tl-2xl shadow-lg z-10 flex flex-col gap-1">
                              <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <LinkIcon size={12} /> {group.groupName || 'SUPERSET'} {group.exercises[0]?.entry.setGroup}
                              </div>
                              <div className="text-[9px] font-bold opacity-80 leading-tight max-w-[200px]">
                                {getGroupDescription(group.groupName || 'superset')}
                              </div>
                            </div>
                          </>
                        )}
                        {group.exercises.map(({ entry: ex, index: exIdx }, i) => {
                          const baseEx = exercises.find(e => e.id === ex.exId);
                          const isLastInGroup = i === group.exercises.length - 1;
                        
                        return (
                          <div key={exIdx} className="relative">
                            <div className={`bg-white p-4 sm:p-6 rounded-3xl border relative group hover:border-velatra-accent/40 transition-all shadow-xl ${group.isGroup ? 'border-none ring-1 ring-zinc-200' : 'border-zinc-200'}`}>
                              {group.isGroup && (
                                <div className="absolute -left-6 md:-left-10 top-1/2 -translate-y-1/2 w-6 md:w-10 h-1 bg-velatra-accent/30" />
                              )}
                              <div className="flex flex-col gap-4 sm:gap-6">
                                <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                                  <div className="flex items-center gap-4 w-full">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                                      {baseEx?.photo ? (
                                        <img src={baseEx.photo} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="text-velatra-accent">
                                          <DumbbellIcon size={24} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      <label className="text-[9px] font-black text-velatra-accent uppercase tracking-widest ml-1">Mouvement</label>
                                      <select 
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-black text-zinc-900 focus:outline-none focus:border-velatra-accent appearance-none cursor-pointer"
                                        value={ex.exId}
                                        onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'exId', parseInt(e.target.value))}
                                      >
                                        {EXERCISE_CATEGORIES.map(cat => (
                                          <optgroup key={cat} label={cat} className="bg-velatra-bg text-zinc-900">
                                            {exercises.filter(e => e.cat === cat).map(e => (
                                              <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                          </optgroup>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex sm:hidden gap-1">
                                      <button 
                                        onClick={() => handleMoveEx(selectedDayIdx, exIdx, 'up')}
                                        disabled={exIdx === 0}
                                        className="p-2 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors"
                                      >
                                        <ArrowUpIcon size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleMoveEx(selectedDayIdx, exIdx, 'down')}
                                        disabled={exIdx === formData.days[selectedDayIdx].exercises.length - 1}
                                        className="p-2 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors"
                                      >
                                        <ArrowDownIcon size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleDuplicateEx(selectedDayIdx, exIdx)}
                                        className="p-2 text-zinc-400 hover:text-velatra-accent transition-colors"
                                      >
                                        <CopyIcon size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleRemoveEx(selectedDayIdx, exIdx)}
                                        className="p-2 text-red-500/30 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2Icon size={18} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="hidden sm:flex gap-1">
                                    <button 
                                      onClick={() => handleMoveEx(selectedDayIdx, exIdx, 'up')}
                                      disabled={exIdx === 0}
                                      className="p-3 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10"
                                      title="Monter"
                                    >
                                      <ArrowUpIcon size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveEx(selectedDayIdx, exIdx, 'down')}
                                      disabled={exIdx === formData.days[selectedDayIdx].exercises.length - 1}
                                      className="p-3 text-zinc-400 hover:text-velatra-accent disabled:opacity-30 transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10"
                                      title="Descendre"
                                    >
                                      <ArrowDownIcon size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleDuplicateEx(selectedDayIdx, exIdx)}
                                      className="p-3 text-zinc-400 hover:text-velatra-accent transition-colors bg-zinc-50 rounded-xl hover:bg-velatra-accent/10"
                                      title="Dupliquer"
                                    >
                                      <CopyIcon size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveEx(selectedDayIdx, exIdx)}
                                      className="p-3 text-red-500/30 hover:text-red-500 transition-colors bg-zinc-50 rounded-xl hover:bg-red-50"
                                      title="Supprimer"
                                    >
                                      <Trash2Icon size={18} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6 bg-zinc-50 p-4 sm:p-5 rounded-2xl border border-zinc-200">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">SÉRIES</label>
                                    <Input 
                                      type="number" 
                                      className="text-center !rounded-xl !text-sm sm:!text-base font-black !bg-white"
                                      value={ex.sets || ''}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'sets', parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">
                                      {baseEx?.cat === 'Cardio' ? 'DURÉE' : 'RÉPÉTITIONS'}
                                    </label>
                                    <Input 
                                      className="text-center !rounded-xl !text-sm sm:!text-base font-black !bg-white"
                                      value={baseEx?.cat === 'Cardio' ? (ex.duration || '') : ex.reps}
                                      placeholder={baseEx?.cat === 'Cardio' ? "Ex: 15 min" : "Ex: 10 ou 6,8,10"}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, baseEx?.cat === 'Cardio' ? 'duration' : 'reps', e.target.value)}
                                    />
                                    {baseEx?.cat !== 'Cardio' && (
                                      <div className="text-[8px] text-zinc-500 text-center leading-tight mt-1">
                                        Séparez par des virgules pour des reps différentes (ex: 12,10,8)
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">REPOS (SEC)</label>
                                    <Input 
                                      className="text-center !rounded-xl !text-sm sm:!text-base font-black !bg-white"
                                      value={ex.rest}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'rest', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">
                                      {baseEx?.cat === 'Cardio' ? 'INTENSITÉ' : 'TEMPO'}
                                    </label>
                                    <Input 
                                      className="text-center !rounded-xl !text-sm sm:!text-base font-black !bg-white"
                                      value={ex.tempo || ''}
                                      placeholder={baseEx?.cat === 'Cardio' ? "Ex: Niv 5" : "Ex: 2010"}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'tempo', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">TYPE</label>
                                    <select 
                                      className="w-full bg-white border border-zinc-200 rounded-xl p-2 sm:p-3 text-center text-xs sm:text-sm font-black text-zinc-900 focus:outline-none focus:border-velatra-accent appearance-none cursor-pointer"
                                      value={ex.setType || 'normal'}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'setType', e.target.value)}
                                    >
                                      <option value="normal">Normal</option>
                                      <option value="superset">Superset</option>
                                      <option value="biset">Bi-set</option>
                                      <option value="triset">Tri-set</option>
                                      <option value="giantset">Giant-set</option>
                                      <option value="dropset">Drop-set</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block" title="Même numéro = même groupe (Superset)">GROUPE</label>
                                    <Input 
                                      type="number" 
                                      className="text-center !rounded-xl !text-sm sm:!text-base font-black !bg-white"
                                      value={ex.setGroup || ''}
                                      placeholder="Ex: 1"
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'setGroup', parseInt(e.target.value) || null)}
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest ml-1">NOTES / CONSIGNES (OPTIONNEL)</label>
                                  <Input 
                                    className="!rounded-xl !text-sm font-medium !bg-zinc-50"
                                    value={ex.notes || ''}
                                    placeholder="Ex: Focus sur l'excentrique, garder les coudes serrés..."
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'notes', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                            {group.isGroup && !isLastInGroup && (
                              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-velatra-accent/10 text-velatra-accent flex items-center justify-center backdrop-blur-sm border border-velatra-accent/30">
                                  <LinkIcon size={14} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}

                <button 
                  onClick={() => handleAddExercise(selectedDayIdx)}
                  className="w-full py-6 border-2 border-dashed border-zinc-200 rounded-3xl text-zinc-900 hover:border-velatra-accent hover:text-velatra-accent transition-all font-black text-xs uppercase tracking-[4px] flex items-center justify-center gap-3 bg-zinc-50"
                >
                  <PlusIcon size={20} /> AJOUTER UN MOUVEMENT
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
