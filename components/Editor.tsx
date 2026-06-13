import React, { useState, useRef, useEffect } from 'react';
import { Program, Preset, Exercise, Day, ExerciseEntry, AppState } from '../types';
import { Button, Input, Card, Badge } from './UI';
import { 
  PlusIcon, Trash2Icon, ChevronLeftIcon, SaveIcon, 
  DumbbellIcon, LayersIcon, InfoIcon, MessageCircleIcon, RefreshCwIcon, LinkIcon,
  ArrowUpIcon, ArrowDownIcon, CopyIcon, VideoIcon, CalendarIcon, PlayIcon
} from './Icons';
import { EXERCISE_CATEGORIES, GOALS } from '../constants';
import { 
  ChevronDownIcon, SearchIcon, Plus, Trash2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Copy, Link, Eye, Sparkles, MessageCircle, MoreHorizontal, Settings2, Lock,
  Settings, Clock, Dumbbell, Play, Save, ChevronUp, RefreshCw, X
} from 'lucide-react';

const SearchableExerciseSelect: React.FC<{
  exercises: Exercise[];
  value: number;
  onChange: (id: number) => void;
}> = ({ exercises, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedEx = exercises.find(e => e.id === value);

  const filteredExercises = exercises.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="w-full bg-white border border-zinc-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm font-black text-zinc-900 cursor-pointer flex justify-between items-center hover:border-emerald-500 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selectedEx ? selectedEx.name : 'Sélectionner un exercice'}</span>
        <ChevronDownIcon size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 sticky top-0 bg-white border-b border-zinc-200 z-10">
            <div className="relative">
              <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                className="w-full bg-white border border-zinc-200 rounded-lg py-2 pl-9 pr-3 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Rechercher un exercice..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="p-1">
            {filteredExercises.length === 0 ? (
              <div className="p-3 text-xs text-zinc-500 text-center font-medium">Aucun exercice trouvé</div>
            ) : (
              EXERCISE_CATEGORIES.map(cat => {
                const catExs = filteredExercises.filter(e => e.cat === cat);
                if (catExs.length === 0) return null;
                return (
                  <div key={cat} className="mb-2">
                    <div className="px-3 py-1.5 text-xs font-black uppercase text-emerald-600 tracking-widest bg-white/80">{cat}</div>
                    {catExs.map(e => (
                      <div 
                        key={e.id}
                        className={`px-3 py-2.5 text-xs font-bold cursor-pointer rounded-lg transition-colors flex items-center justify-between ${e.id === value ? 'bg-emerald-500/10 text-emerald-500' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        onClick={() => {
                          onChange(e.id);
                          setIsOpen(false);
                          setSearch('');
                        }}
                      >
                        <span>{e.name}</span>
                        {e.id === value && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ProgramEditorProps {
  program: Program | null;
  preset: Preset | null;
  exercises: Exercise[];
  clubId: string; // New prop
  onSave: (data: any, action?: 'plan' | 'start') => void;
  onCancel: () => void;
  allPresets?: Preset[]; 
  member?: any;
  readOnly?: boolean;
}

export const ProgramEditor: React.FC<ProgramEditorProps> = ({ 
  program, 
  preset, 
  exercises, 
  clubId,
  onSave, 
  onCancel,
  allPresets = [],
  member,
  readOnly = false
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
  const [openActionIdx, setOpenActionIdx] = useState<number | null>(null);
  const isSingleSession = formData.isPlannedSession;

  const handleApplyPreset = (p: Preset) => {
    // If we are in "Day Import" mode, we apply to current day
    if (showPresets && formData.days[selectedDayIdx]) {
      handleApplyPresetToDay(p, selectedDayIdx);
      setShowPresets(false);
      return;
    }

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

  const handleCopyExToDay = (dayIdx: number, exIdx: number, targetDayIdx: number) => {
    const newDays = [...formData.days];
    const exToCopy = JSON.parse(JSON.stringify(newDays[dayIdx].exercises[exIdx]));
    newDays[targetDayIdx].exercises.push(exToCopy);
    setFormData({ ...formData, days: newDays });
  };

  const handleToggleLink = (dayIdx: number, exIdx: number) => {
    if (exIdx === 0) return;
    const newDays = [...formData.days];
    const currentEx = newDays[dayIdx].exercises[exIdx];
    const prevEx = newDays[dayIdx].exercises[exIdx - 1];

    if (currentEx.setGroup && currentEx.setGroup === prevEx.setGroup) {
      // Unlink
      newDays[dayIdx].exercises[exIdx] = { ...currentEx, setGroup: null, setType: 'normal' };
    } else {
      // Link
      let groupToUse = prevEx.setGroup;
      if (!groupToUse) {
        const allGroups = newDays[dayIdx].exercises.map((e: ExerciseEntry) => e.setGroup).filter((g: number | null) => g !== null && g > 0) as number[];
        groupToUse = allGroups.length > 0 ? Math.max(...allGroups) + 1 : 1;
        newDays[dayIdx].exercises[exIdx - 1] = { ...prevEx, setGroup: groupToUse, setType: 'superset' };
      }
      newDays[dayIdx].exercises[exIdx] = { ...currentEx, setGroup: groupToUse, setType: prevEx.setType || 'superset' };
    }
    setFormData({ ...formData, days: newDays });
  };

  const handleApplyPresetToDay = (p: Preset, dayIdx: number) => {
    const newDays = [...formData.days];
    // For simplicity, we just take the first day of the preset or let user choose?
    // Let's just append all exercises from the first day of the preset for now, 
    // or if the preset has multiple days, maybe we should show a picker.
    // For now, let's just append exercises from the first day.
    if (p.days.length > 0) {
      const presetExercises = JSON.parse(JSON.stringify(p.days[0].exercises));
      newDays[dayIdx].exercises = [...newDays[dayIdx].exercises, ...presetExercises];
      setFormData({ ...formData, days: newDays });
    }
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
              {isSingleSession ? "PRÉPARER LA SÉANCE" : (isEditingProgram ? "ADAPTER LE PLAN" : "ÉDITION MODÈLE")}
            </h1>
            <p className="text-emerald-500 text-xs font-medium uppercase text-zinc-500 tracking-wider mt-1">Expert Coaching <span className="text-zinc-900">VELATRA</span></p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {allPresets.length > 0 && (
             <Button onClick={() => setShowPresets(!showPresets)} variant="secondary" className="!rounded-full font-black text-[10px] tracking-widest italic shadow-sm">
                {showPresets ? "X" : "APPLIQUER MODÈLE"}
             </Button>
          )}
          {!isSingleSession && (
            <Button onClick={() => {
              import('../services/pdfService').then(m => m.exportProgramToPDF(formData, exercises, null, member?.name));
            }} variant="ghost" className="shadow-sm px-4 py-3 !rounded-full font-black italic">
              <span className="mr-2">📄</span>
              EXPORT PDF
            </Button>
          )}
          {!readOnly && (
            isSingleSession ? (
              <>
                <Button onClick={() => onSave(formData, 'plan')} variant="secondary" className="shadow-sm px-6 py-3 !rounded-full font-black italic">
                  <CalendarIcon size={18} className="mr-2" />
                  PRÉVOIR
                </Button>
                <Button onClick={() => onSave(formData, 'start')} variant="primary" className="shadow-lg px-6 py-3 !rounded-full font-black italic !bg-blue-500 hover:!bg-blue-600">
                  <PlayIcon size={18} className="mr-2" />
                  COMMENCER MTN
                </Button>
              </>
            ) : (
              <Button onClick={() => onSave(formData)} variant="success" className="shadow-lg px-8 py-3 !rounded-full font-black italic">
                <SaveIcon size={18} className="mr-2" />
                VALIDER
              </Button>
            )
          )}
        </div>
      </header>

      {showPresets && allPresets.length > 0 && (
        <Card className="!bg-emerald-500/5 border-emerald-500/20 animate-in slide-in-from-top-4 duration-300">
           <h3 className="text-xs font-black uppercase text-zinc-500 tracking-wider text-emerald-500 mb-4">Choisir un modèle (Preset)</h3>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allPresets.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handleApplyPreset(p)}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left hover:border-emerald-500 transition-all"
                >
                  <div className="text-xs font-black text-zinc-900 uppercase">{p.name}</div>
                  <div className="text-[10px] text-zinc-900 font-black mt-1 uppercase">{p.nbDays} JOURS</div>
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
            <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1">
              {isSingleSession ? "Titre de la séance" : "Titre du Programme"}
            </label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder={isSingleSession ? "Ex: Séance Pectoraux" : "Ex: Hypertrophie Poussée"} 
            />
          </div>
          
          {!isSingleSession && (
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1">Durée (Semaines)</label>
              <select 
                value={formData.durationWeeks || ''} 
                onChange={e => setFormData({...formData, durationWeeks: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-zinc-900 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              >
                <option value="">Pas de délai (Continu)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24].map(w => (
                  <option key={w} value={w}>{w} Semaine{w > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {isEditingProgram ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1">Date de début</label>
                <Input 
                  type="date"
                  value={formData.startDate} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              {member && (
                <div className="space-y-2 col-span-1 md:col-span-2 mt-2 p-4 bg-zinc-100/50 rounded-2xl border border-zinc-200/50">
                  <div className="flex items-center gap-2 text-zinc-900 mb-2">
                    <InfoIcon size={16} className="text-emerald-500" />
                    <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">Profil de {member.name}</span>
                  </div>
                  {member.objectifs && member.objectifs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {member.objectifs.map((o: string) => (
                        <Badge key={o} variant="dark" className="!bg-white !text-zinc-500 !border-zinc-200 !text-[10px]">{o}</Badge>
                      ))}
                    </div>
                  )}
                  {member.notes && (
                    <p className="text-xs text-zinc-500 italic leading-relaxed">"{member.notes}"</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-emerald-600 tracking-widest ml-1">Objectifs du Modèle</label>
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
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-zinc-900' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-900'}`}
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
               <div className="w-12 h-12 rounded-2xl bg-orange-500 text-zinc-900 flex items-center justify-center shrink-0">
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

      {!isSingleSession && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-zinc-800">
              <LayersIcon size={16} className="text-emerald-500" />
              Planification Hebdomadaire
            </h2>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              {formData.days.length} {formData.days.length > 1 ? 'séances programmées' : 'séance programmée'}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
            {formData.days.map((day: Day, idx: number) => {
              const isSelected = selectedDayIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDayIdx(idx);
                    setOpenActionIdx(null);
                  }}
                  className={`
                    relative p-5 rounded-[24px] border text-left min-w-[160px] max-w-[200px] shrink-0 transition-all cursor-pointer select-none group
                    ${isSelected 
                      ? 'bg-zinc-950 border-zinc-950 text-white shadow-xl shadow-zinc-950/20 scale-[1.02]' 
                      : 'bg-white border-zinc-200/80 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50/50'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      Jour {idx + 1}
                    </span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isSelected ? 'bg-white/10 text-emerald-400' : 'bg-zinc-100 text-zinc-500'}`}>
                      {day.exercises?.length || 0} MVTS
                    </span>
                  </div>
                  <div className="font-black text-sm truncate uppercase italic tracking-tight leading-none">
                    {day.name || `Séance ${idx + 1}`}
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleAddDay}
              type="button"
              className="flex flex-col items-center justify-center p-5 rounded-[24px] border-2 border-dashed border-zinc-200 bg-zinc-50/30 hover:bg-emerald-500/[0.03] hover:border-emerald-500/30 text-emerald-600 font-black text-xs uppercase tracking-widest min-w-[140px] shrink-0 transition-all cursor-pointer hover:scale-[1.01]"
            >
              <Plus size={16} className="mb-1.5 shrink-0" />
              Nouveau jour
            </button>
          </div>
        </div>
      )}

      {/* Day Details Workspace */}
      <div className="space-y-6">
        <Card className="border border-zinc-200 !p-7 bg-white rounded-[32px] shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
              {!isSingleSession && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider ml-1">Nom de la Séance</label>
                  <Input 
                    className="!text-lg font-black italic !bg-zinc-50/50 border-zinc-150 !rounded-2xl"
                    value={formData.days[selectedDayIdx]?.name || ''} 
                    onChange={e => {
                      const newDays = [...formData.days];
                      if (newDays[selectedDayIdx]) {
                        newDays[selectedDayIdx].name = e.target.value;
                        setFormData({...formData, days: newDays});
                      }
                    }}
                    placeholder="Ex: Legday Intense, Push Day..."
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider ml-1">Durée Estimée (minutes)</label>
                <div className="relative">
                  <Input 
                    type="number"
                    className="!text-lg font-black italic !bg-zinc-50/50 border-zinc-150 !rounded-2xl pr-10"
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold uppercase pointer-events-none">MIN</div>
                </div>
              </div>
            </div>

            {/* Compact Day actions group */}
            {!isSingleSession && (
              <div className="flex flex-wrap items-center gap-2 lg:self-end">
                <button 
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-4 py-2.5 bg-zinc-50 hover:bg-emerald-500/10 border border-zinc-200 hover:border-emerald-500/20 text-zinc-700 hover:text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Importer un modèle de séance"
                >
                  <LayersIcon size={12} className="shrink-0" />
                  Importer Séance
                </button>

                <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl p-0.5 shadow-sm">
                  <button 
                    type="button"
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
                    className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-white rounded-lg disabled:opacity-20 transition-all cursor-pointer"
                    title="Déplacer à gauche"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" />
                  <button 
                    type="button"
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
                    className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-white rounded-lg disabled:opacity-20 transition-all cursor-pointer"
                    title="Déplacer à droite"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => handleDuplicateDay(selectedDayIdx)}
                  className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Dupliquer ce jour"
                >
                  <Copy size={14} />
                </button>

                <button 
                  type="button"
                  onClick={() => handleRemoveDay(selectedDayIdx)}
                  disabled={formData.days.length <= 1}
                  className="p-2.5 bg-red-500/[0.03] hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-500 rounded-xl disabled:opacity-20 transition-all cursor-pointer shadow-sm"
                  title="Supprimer ce jour"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* List of Exercises */}
          <div className="pt-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Mouvements ({formData.days[selectedDayIdx]?.exercises?.length || 0})
              </span>
            </div>
            
            <div className="space-y-8">
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

                return groupedExercises.map((group, groupIndex) => {
                  const getGroupColor = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case 'superset': return 'from-emerald-500 to-teal-400';
                      case 'biset': return 'from-blue-500 to-indigo-400';
                      case 'triset': return 'from-purple-500 to-pink-400';
                      case 'giantset': return 'from-orange-500 to-amber-400';
                      default: return 'from-emerald-500 to-teal-400';
                    }
                  };

                  return (
                    <div key={groupIndex} className={group.isGroup ? "relative pl-5 sm:pl-8 space-y-4" : "space-y-4"}>
                      {group.isGroup && (
                        <>
                          {/* Beautiful solid gradient bar on the side for connected exercises */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${getGroupColor(group.groupName || '')} rounded-full opacity-80`} />
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 text-white bg-gradient-to-r ${getGroupColor(group.groupName || '')} rounded-full`}>
                              {group.groupName || 'SUPERSET'} (Groupe {group.exercises[0]?.entry.setGroup})
                            </span>
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                              Enchaînez sans temps de repos
                            </span>
                          </div>
                        </>
                      )}

                      {group.exercises.map(({ entry: ex, index: exIdx }, i) => {
                        const baseEx = exercises.find(e => e.id === ex.exId);
                        const isLastInGroup = i === group.exercises.length - 1;
                        const isDropdownOpen = openActionIdx === exIdx;

                        return (
                          <div key={exIdx} className="relative group">
                            <div className={`p-5 sm:p-6 bg-white rounded-[24px] border transition-all duration-300 relative ${group.isGroup ? 'border-zinc-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]' : 'border-zinc-200/80 shadow-sm hover:border-zinc-300'}`}>
                              
                              {/* Exercise Header Row */}
                              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-5">
                                <div className="flex items-center gap-4 w-full md:max-w-2xl">
                                  {/* Thumbnail */}
                                  <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                                    {baseEx?.photo ? (
                                      <img src={baseEx.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-zinc-400">
                                        <Dumbbell size={18} />
                                      </div>
                                    )}
                                    {baseEx?.videoUrl && (
                                      <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 p-0.5 rounded-bl shadow-sm">
                                        <Play size={8} fill="currentColor" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Dropdown Select for Exercise Name */}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Mouvement {exIdx + 1}</span>
                                    <SearchableExerciseSelect
                                      exercises={exercises}
                                      value={ex.exId}
                                      onChange={id => handleUpdateEx(selectedDayIdx, exIdx, 'exId', id)}
                                    />
                                  </div>
                                </div>

                                {/* Clean Actions Bar right aligned */}
                                <div className="flex items-center gap-1.5 self-end md:self-center">
                                  {/* Link Previous superset toggler */}
                                  <button 
                                    type="button"
                                    onClick={() => handleToggleLink(selectedDayIdx, exIdx)}
                                    disabled={exIdx === 0}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 disabled:opacity-20 cursor-pointer ${
                                      ex.setGroup && ex.setGroup === formData.days[selectedDayIdx].exercises[exIdx-1]?.setGroup 
                                        ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/10' 
                                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-800'
                                    }`}
                                    title="Lier avec le mouvement précédent (Superset)"
                                  >
                                    <Link size={12} />
                                    <span>Lier</span>
                                  </button>

                                  {/* Multi-actions dropdown triggers */}
                                  <div className="relative">
                                    <button 
                                      type="button"
                                      onClick={() => setOpenActionIdx(isDropdownOpen ? null : exIdx)}
                                      className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer flex items-center gap-1 text-[10px] uppercase font-black tracking-wider"
                                      title="Plus d'actions"
                                    >
                                      <Settings2 size={13} />
                                      <span className="hidden sm:inline">Options</span>
                                    </button>

                                    {isDropdownOpen && (
                                      <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-[20px] shadow-xl p-2.5 z-40 w-48 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-zinc-100">
                                          <span className="text-[9px] font-black uppercase text-zinc-400">Position & Modèle</span>
                                          <button type="button" onClick={() => setOpenActionIdx(null)} className="text-zinc-400 hover:text-zinc-700">
                                            <X size={12} />
                                          </button>
                                        </div>

                                        <button 
                                          type="button"
                                          onClick={() => {
                                            handleMoveEx(selectedDayIdx, exIdx, 'up');
                                            setOpenActionIdx(null);
                                          }}
                                          disabled={exIdx === 0}
                                          className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg disabled:opacity-20 transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                          <ArrowUp size={12} /> Monter d'un rang
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            handleMoveEx(selectedDayIdx, exIdx, 'down');
                                            setOpenActionIdx(null);
                                          }}
                                          disabled={exIdx === formData.days[selectedDayIdx].exercises.length - 1}
                                          className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg disabled:opacity-20 transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                          <ArrowDown size={12} /> Descendre d'un rang
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            handleDuplicateEx(selectedDayIdx, exIdx);
                                            setOpenActionIdx(null);
                                          }}
                                          className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                                        >
                                          <Copy size={12} /> Dupliquer le mvt
                                        </button>

                                        {/* Copy to Day */}
                                        {formData.days.length > 1 && (
                                          <div className="mt-2 pt-2 border-t border-zinc-100">
                                            <div className="text-[8px] font-black uppercase text-zinc-400 mb-1 px-2">Copier vers :</div>
                                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                              {formData.days.map((d: any, dIdx: number) => dIdx !== selectedDayIdx && (
                                                <button 
                                                  key={dIdx}
                                                  type="button"
                                                  onClick={() => {
                                                    handleCopyExToDay(selectedDayIdx, exIdx, dIdx);
                                                    setOpenActionIdx(null);
                                                  }}
                                                  className="w-full text-left px-2 py-1.5 text-[9px] font-bold text-zinc-600 hover:bg-emerald-500/10 hover:text-emerald-700 rounded-md transition-colors truncate"
                                                >
                                                  J{dIdx + 1} - {d.name || `Jour ${dIdx+1}`}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Absolute delete button */}
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveEx(selectedDayIdx, exIdx)}
                                    className="p-2 bg-red-500/[0.02] hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                                    title="Supprimer ce mouvement"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Spec Dashboard Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-zinc-50/70 p-4 sm:p-5 rounded-[20px] border border-zinc-100">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block">Séries</label>
                                  <Input 
                                    type="number" 
                                    className="text-center !rounded-xl !text-sm font-black !bg-white border-zinc-200/70 focus:!border-zinc-400 !py-2"
                                    value={ex.sets || ''}
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'sets', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block">
                                    {baseEx?.cat === 'Cardio' ? 'Durée/Temps' : 'Répétitions'}
                                  </label>
                                  <Input 
                                    className="text-center !rounded-xl !text-sm font-black !bg-white border-zinc-200/70 focus:!border-zinc-400 !py-2"
                                    value={baseEx?.cat === 'Cardio' ? (ex.duration || '') : ex.reps}
                                    placeholder={baseEx?.cat === 'Cardio' ? "Ex: 15 min" : "Ex: 10,12"}
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, baseEx?.cat === 'Cardio' ? 'duration' : 'reps', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block">Repos (Sec)</label>
                                  <Input 
                                    className="text-center !rounded-xl !text-sm font-black !bg-white border-zinc-200/70 focus:!border-zinc-400 !py-2"
                                    value={ex.rest}
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'rest', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block">
                                    {baseEx?.cat === 'Cardio' ? 'Intensité' : 'Tempo'}
                                  </label>
                                  <Input 
                                    className="text-center !rounded-xl !text-sm font-black !bg-white border-zinc-200/70 focus:!border-zinc-400 !py-2"
                                    value={ex.tempo || ''}
                                    placeholder={baseEx?.cat === 'Cardio' ? "Ex: Niv 5" : "Ex: 2010"}
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'tempo', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 col-span-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block">Type d'effort</label>
                                  <div className="relative">
                                    <select 
                                      className="w-full bg-white border border-zinc-200/70 rounded-xl px-2 py-2 text-center text-xs font-black text-zinc-900 focus:outline-none focus:border-zinc-400 appearance-none cursor-pointer"
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
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                      <ChevronDownIcon size={12} />
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider text-center block" title="Même numéro = même groupe (Superset)">Groupe ID</label>
                                  <Input 
                                    type="number" 
                                    className="text-center !rounded-xl !text-sm font-black !bg-white border-zinc-200/70 focus:!border-zinc-400 !py-2"
                                    value={ex.setGroup || ''}
                                    placeholder="Libre"
                                    onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'setGroup', parseInt(e.target.value) || null)}
                                  />
                                </div>
                              </div>
                              
                              {/* Notes Input styled like continuous conversational guidance */}
                              <div className="mt-4 flex gap-2.5 items-center">
                                <div className="p-2 bg-zinc-50 rounded-xl text-zinc-400 shrink-0">
                                  <MessageCircle size={14} />
                                </div>
                                <Input 
                                  className="!rounded-2xl !text-xs font-medium !bg-zinc-50 border-transparent focus:!border-zinc-200 !py-2.5"
                                  value={ex.notes || ''}
                                  placeholder="Consignes particulières (ex: Focus sur la phase excentrique lente, restez gainé...)"
                                  onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'notes', e.target.value)}
                                />
                              </div>
                            </div>
                            {group.isGroup && !isLastInGroup && (
                              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-zinc-150 border border-zinc-200 text-zinc-400 flex items-center justify-center shadow-sm">
                                  <Link size={10} />
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
            </div>

            <button 
              onClick={() => handleAddExercise(selectedDayIdx)}
              type="button"
              className="w-full py-6 border-2 border-dashed border-zinc-200 hover:border-emerald-500/40 rounded-[28px] text-zinc-800 hover:text-emerald-500 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-zinc-50/50 hover:bg-emerald-505/[0.01] mt-4 cursor-pointer"
            >
              <Plus size={16} /> Ajouter un mouvement
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
