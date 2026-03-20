import React, { useState } from 'react';
import { Program, Preset, Exercise, Day, ExerciseEntry, AppState } from '../types';
import { Button, Input, Card, Badge } from './UI';
import { 
  PlusIcon, Trash2Icon, ChevronLeftIcon, SaveIcon, 
  DumbbellIcon, LayersIcon, InfoIcon, MessageCircleIcon, RefreshCwIcon, LinkIcon
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
}

export const ProgramEditor: React.FC<ProgramEditorProps> = ({ 
  program, 
  preset, 
  exercises, 
  clubId,
  onSave, 
  onCancel,
  allPresets = []
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
    const newEx: ExerciseEntry = {
      exId: exercises[0].id,
      sets: 3,
      reps: "10-12",
      rest: "90",
      tempo: "2010",
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24 px-4 page-transition">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
            <ChevronLeftIcon size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">
              {isEditingProgram ? "ADAPTER LE PLAN" : "ÉDITION MODÈLE"}
            </h1>
            <p className="text-velatra-accent text-[10px] uppercase tracking-[3px] font-bold mt-2">Expert Coaching <span className="text-zinc-900">VELATRA</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditingProgram && (
             <Button onClick={() => setShowPresets(!showPresets)} variant="secondary" className="!rounded-full font-black text-[10px] tracking-widest italic">
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
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-velatra-accent tracking-widest ml-1">Date de début</label>
              <Input 
                type="date"
                value={formData.startDate} 
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
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
          <div className="p-5 bg-orange-500/10 border-2 border-orange-500/30 rounded-[32px] flex gap-5 items-center animate-in zoom-in duration-500">
             <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <MessageCircleIcon size={24} />
             </div>
             <div>
                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">RETOUR ADHÉRENT (À TRAITER) :</div>
                <p className="text-base font-black text-zinc-900 italic leading-tight">"{formData.memberRemarks}"</p>
                <p className="text-[9px] text-zinc-900 font-bold uppercase mt-1">Ajustez les intensités ou remplacez les exercices concernés ci-dessous.</p>
             </div>
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
                <button 
                  onClick={() => handleRemoveDay(selectedDayIdx)}
                  className="p-3 text-red-500/30 hover:text-red-500 transition-colors"
                  title="Supprimer ce jour"
                >
                  <Trash2Icon size={24} />
                </button>
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
                            <div className={`bg-white p-6 rounded-3xl border relative group hover:border-velatra-accent/40 transition-all shadow-xl ${group.isGroup ? 'border-none ring-1 ring-zinc-200' : 'border-zinc-200'}`}>
                              {group.isGroup && (
                                <div className="absolute -left-6 md:-left-10 top-1/2 -translate-y-1/2 w-6 md:w-10 h-1 bg-velatra-accent/30" />
                              )}
                              <div className="flex flex-col gap-6">
                                <div className="flex gap-4 items-end">
                                  <div className="w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
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
                                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-black text-zinc-900 focus:outline-none focus:border-velatra-accent appearance-none cursor-pointer"
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
                                  <button 
                                    onClick={() => handleRemoveEx(selectedDayIdx, exIdx)}
                                    className="p-4 text-red-500/20 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2Icon size={20} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-6 bg-zinc-50 p-5 rounded-2xl border border-zinc-200">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">SÉRIES</label>
                                    <Input 
                                      type="number" 
                                      className="text-center !rounded-xl !text-base font-black !bg-white"
                                      value={ex.sets || ''}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'sets', parseInt(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">RÉPÉTITIONS</label>
                                    <Input 
                                      className="text-center !rounded-xl !text-base font-black !bg-white"
                                      value={ex.reps}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'reps', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">REPOS (SEC)</label>
                                    <Input 
                                      className="text-center !rounded-xl !text-base font-black !bg-white"
                                      value={ex.rest}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'rest', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">TEMPO</label>
                                    <Input 
                                      className="text-center !rounded-xl !text-base font-black !bg-white"
                                      value={ex.tempo || ''}
                                      placeholder="Ex: 2010"
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'tempo', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-900 uppercase tracking-widest text-center block">TYPE</label>
                                    <select 
                                      className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-center text-sm font-black text-zinc-900 focus:outline-none focus:border-velatra-accent appearance-none cursor-pointer"
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
                                      className="text-center !rounded-xl !text-base font-black !bg-white"
                                      value={ex.setGroup || ''}
                                      placeholder="Ex: 1"
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'setGroup', parseInt(e.target.value) || null)}
                                    />
                                  </div>
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
