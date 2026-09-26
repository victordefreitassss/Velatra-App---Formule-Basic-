import React, { useState, useRef, useEffect } from 'react';
import { Program, Preset, Exercise, Day, ExerciseEntry } from '../types';
import { Button, Input, Card } from './UI';
import { 
  ChevronLeftIcon, SaveIcon, DumbbellIcon, LayersIcon,
  MessageCircleIcon, LinkIcon, CalendarIcon
} from './Icons';
import { EXERCISE_CATEGORIES, GOALS } from '../constants';
import { 
  ChevronDownIcon, SearchIcon, Plus, Trash2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Copy, MoreHorizontal, Play, RefreshCw, X, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './program-editor.css';

// Quick Presets helper configuration
const REPS_PRESETS = ["8", "10", "12", "15", "8-12", "10-12", "12-15", "MAX", "10/8/6/15"];
const REST_PRESETS = ["30s", "45s", "60s", "90s", "2 min", "3 min"];
const TEMPO_PRESETS = ["2010", "3010", "4010", "Explosif", "Contrôlé"];

// Searchable selection component with modern visual presentation and quick categories
const SearchableExerciseSelect: React.FC<{
  exercises: Exercise[];
  value: number;
  onChange: (id: number) => void;
}> = ({ exercises, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.cat.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? e.cat === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={selectedEx ? `Choisir un exercice. Actuel : ${selectedEx.name}` : 'Choisir un exercice'}
        className="w-full bg-zinc-50 border border-zinc-200 hover:border-emerald-500 rounded-2xl p-4 text-sm font-bold text-zinc-900 cursor-pointer flex justify-between items-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="truncate">{selectedEx ? selectedEx.name : 'Sélectionner un exercice'}</span>
          {selectedEx && (
            <span className="text-[11px] text-zinc-400 bg-zinc-100 rounded-md px-2 py-0.5 font-bold uppercase tracking-wider ml-1 truncate">
              {selectedEx.cat}
            </span>
          )}
        </div>
        <ChevronDownIcon size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-zinc-150 rounded-[28px] shadow-2xl max-h-[420px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 sticky top-0 bg-white border-b border-zinc-100/80 z-10 space-y-2">
            <div className="relative">
              <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                className="w-full bg-zinc-50 border border-zinc-150 rounded-xl py-2.5 pl-11 pr-4 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                placeholder="Rechercher un exercice par nom ou catégorie..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
            
            {/* Category selection bar */}
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(null);
                }}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all capitalize shrink-0 ${
                  selectedCategory === null 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                Tout voir
              </button>
              {EXERCISE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all capitalize shrink-0 ${
                    selectedCategory === cat 
                      ? 'bg-emerald-500 text-zinc-950 font-black' 
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 overflow-y-auto max-h-[260px] custom-scrollbar">
            {filteredExercises.length === 0 ? (
              <div className="p-8 text-xs text-zinc-500 text-center font-semibold italic flex flex-col items-center justify-center gap-2">
                <SearchIcon size={24} className="text-zinc-300" />
                Aucun mouvement trouvé
              </div>
            ) : (
              EXERCISE_CATEGORIES.map(category => {
                const categoryExs = filteredExercises.filter(e => e.cat === category);
                if (categoryExs.length === 0) return null;
                return (
                  <div key={category} className="mb-3">
                    <div className="px-3 py-1 text-[11px] font-extrabold uppercase text-emerald-600 tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                      {category}
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                      {categoryExs.map(e => (
                        <button 
                          key={e.id}
                          type="button"
                          className={`w-full text-left px-3.5 py-3 text-xs font-semibold cursor-pointer rounded-xl transition-all flex items-center justify-between ${
                            e.id === value 
                              ? 'bg-emerald-50 text-emerald-600 font-extrabold border border-emerald-100/50' 
                              : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent'
                          }`}
                          onClick={() => {
                            onChange(e.id);
                            setIsOpen(false);
                            setSearch('');
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {e.id === value && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
                            <span className="truncate">{e.name}</span>
                          </div>
                          <span className="text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-md shrink-0">
                            {e.equip}
                          </span>
                        </button>
                      ))}
                    </div>
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
  clubId: string;
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
  const [selectedExerciseIdx, setSelectedExerciseIdx] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [openActionIdx, setOpenActionIdx] = useState<number | null>(null);
  const isSingleSession = formData.isPlannedSession;

  const handleApplyPreset = (p: Preset) => {
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
      days: JSON.parse(JSON.stringify(p.days)),
      presetId: p.id
    });
    setShowPresets(false);
    setSelectedDayIdx(0);
    setSelectedExerciseIdx(0);
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
    setSelectedExerciseIdx(0);
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
    setSelectedExerciseIdx(0);
  };

  const handleAddExercise = (dayIdx: number) => {
    if (!exercises.length || !formData.days[dayIdx]) return;
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
    setSelectedExerciseIdx(newDays[dayIdx].exercises.length - 1);
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
          newDays[dayIdx].exercises = newDays[dayIdx].exercises.map((e: ExerciseEntry) => {
            if (e.setGroup === currentGroup) {
              return { ...e, setType: newType as any };
            }
            return e;
          });
        } else {
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
    setSelectedExerciseIdx(Math.max(0, Math.min(exIdx, newDays[dayIdx].exercises.length - 1)));
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
    setSelectedExerciseIdx(exIdx + 1);
  };

  const handleMoveEx = (dayIdx: number, exIdx: number, direction: 'up' | 'down') => {
    const newDays = [...formData.days];
    const exercisesList = newDays[dayIdx].exercises;
    if (direction === 'up' && exIdx > 0) {
      [exercisesList[exIdx - 1], exercisesList[exIdx]] = [exercisesList[exIdx], exercisesList[exIdx - 1]];
    } else if (direction === 'down' && exIdx < exercisesList.length - 1) {
      [exercisesList[exIdx], exercisesList[exIdx + 1]] = [exercisesList[exIdx + 1], exercisesList[exIdx]];
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
      newDays[dayIdx].exercises[exIdx] = { ...currentEx, setGroup: null, setType: 'normal' };
    } else {
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
    if (p.days.length > 0) {
      const presetExercises = JSON.parse(JSON.stringify(p.days[0].exercises));
      newDays[dayIdx].exercises = [...newDays[dayIdx].exercises, ...presetExercises];
      setFormData({ ...formData, days: newDays });
    }
  };

  // Auto calculate workout session length dynamically
  const estimateSessionDuration = (day: Day) => {
    if (!day || !day.exercises || day.exercises.length === 0) return 45;
    
    let totalMinutes = 8; // Warmup minutes
    day.exercises.forEach(ex => {
      const numSets = Number(ex.sets) || 3;
      
      // Try to parse rest string (ex: "90", "90s", "1m30s", "2m")
      let restSeconds = 90;
      const cleanRest = String(ex.rest || "").toLowerCase().trim();
      if (cleanRest.includes('m') || cleanRest.includes('min')) {
        const matched = cleanRest.match(/(\d+)\s*(m|min)/);
        if (matched) {
          restSeconds = parseInt(matched[1]) * 60;
        }
      } else {
        const parsedSec = parseInt(cleanRest);
        if (!isNaN(parsedSec)) {
          restSeconds = parsedSec;
        }
      }

      // Rest time + execution time (~45s per set)
      const secondsPerSet = restSeconds + 45;
      totalMinutes += (numSets * secondsPerSet) / 60;
    });

    totalMinutes += 5; // Cooldown/Stretch
    return Math.round(totalMinutes);
  };

  const handleApplyEstimate = (dayIdx: number) => {
    const day = formData.days[dayIdx];
    if (!day) return;
    const est = estimateSessionDuration(day);
    
    const newDays = [...formData.days];
    newDays[dayIdx].duration = est;
    setFormData({ ...formData, days: newDays });
  };

  const activeDay = formData.days[selectedDayIdx];
  const hasMoreActions = allPresets.length > 0 || !isSingleSession || (!readOnly && isSingleSession);

  return (
      <div className="space-y-6 max-w-6xl mx-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] px-4 page-transition">
      
      {/* Top Professional Sticky Header Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200 -mx-4 px-3 sm:px-6 pt-[calc(.5rem+env(safe-area-inset-top))] pb-2 sm:py-3 flex items-center justify-between gap-2 mb-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel} 
            aria-label="Retour"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/80 transition-all rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ChevronLeftIcon size={22} />
          </motion.button>
          <div className="min-w-0">
            <div className="hidden sm:block text-xs font-semibold text-emerald-900 leading-tight">
              {isSingleSession ? 'Séance individuelle' : isEditingProgram ? 'Programme sportif' : 'Nouveau programme'}
            </div>
            <h1 className="truncate text-sm sm:text-xl font-display font-semibold tracking-tight text-zinc-900 leading-tight">
              {formData.name || (isSingleSession ? 'Nouvelle séance' : 'Sans nom')}
            </h1>
            {member?.name && <p className="hidden sm:block truncate text-xs text-zinc-700">Pour {member.name}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!readOnly && (isSingleSession ? (
            <Button type="button" onClick={() => onSave(formData, 'start')} variant="primary" className="!h-11 !min-h-11 !rounded-lg !px-3 !text-xs !font-semibold !normal-case !tracking-normal !bg-emerald-500 hover:!bg-emerald-600 !text-zinc-950">
              <Play size={14} className="mr-1.5 inline fill-zinc-950" /> Démarrer
            </Button>
          ) : (
            <Button type="button" onClick={() => onSave(formData)} variant="success" className="!h-11 !min-h-11 !rounded-lg !px-3 sm:!px-4 !text-xs !font-semibold !normal-case !tracking-normal !bg-emerald-400 hover:!bg-emerald-500 !text-zinc-950">
              <SaveIcon size={15} className="mr-1.5 inline" /> Enregistrer
            </Button>
          ))}
          {hasMoreActions && <details className="relative">
            <summary aria-label="Autres actions du programme" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 [&::-webkit-details-marker]:hidden">
              <MoreHorizontal size={19} />
            </summary>
            <div className="absolute right-0 top-full z-[70] mt-2 min-w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
              {allPresets.length > 0 && <button type="button" onClick={() => setShowPresets(value => !value)} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">{showPresets ? 'Masquer les modèles' : 'Charger un modèle'}</button>}
              {!isSingleSession && <button type="button" onClick={() => { import('../services/pdfService').then(m => m.exportProgramToPDF(formData, exercises, null, member?.name)); }} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Exporter en PDF</button>}
              {!readOnly && isSingleSession && <button type="button" onClick={() => onSave(formData, 'plan')} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><CalendarIcon size={15} className="mr-2" /> Planifier</button>}
            </div>
          </details>}
        </div>
      </header>

      {/* Preset Section (when open) */}
      <AnimatePresence>
        {showPresets && allPresets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="!bg-emerald-50 text-zinc-900 border-emerald-100 !p-6 rounded-[28px] shadow-sm">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                   <LayersIcon size={14} />
                   Sélectionner un modèle pré-configuré (Preset)
                 </h3>
                 <button 
                   type="button" 
                   onClick={() => setShowPresets(false)} 
                   className="text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 p-1 rounded-full text-xs"
                 >
                   <X size={16} />
                 </button>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {allPresets.map(p => (
                    <button 
                      key={p.id} 
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-4 bg-white border border-emerald-100/80 rounded-2xl text-left hover:border-emerald-500 hover:shadow-md transition-all group"
                    >
                      <div className="text-xs font-black text-zinc-900 group-hover:text-emerald-700 uppercase transition-colors">{p.name || "Sans nom"}</div>
                      <div className="flex gap-2 items-center text-[11px] text-zinc-500 font-extrabold mt-2 uppercase">
                        <span className="bg-emerald-100/50 text-emerald-800 py-0.5 px-2 rounded-md">{p.nbDays} SEANCES</span>
                        {p.durationWeeks && <span className="bg-zinc-150 py-0.5 px-2 rounded-md">{p.durationWeeks} SEMAINES</span>}
                      </div>
                    </button>
                  ))}
               </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1.2fr)_minmax(190px,.8fr)_minmax(190px,.8fr)]">
          <div className="min-w-0">
            <label htmlFor="program-name" className="mb-1 block text-xs font-medium text-zinc-700">{isSingleSession ? 'Nom de la séance' : 'Nom du programme'}</label>
            <Input id="program-name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="!h-11 !rounded-lg !bg-white !text-sm !font-semibold" placeholder={isSingleSession ? 'Ex. Séance haut du corps' : 'Ex. Force · Bloc 1'} />
          </div>
          {!isSingleSession && <div>
            <label htmlFor="program-duration" className="mb-1 block text-xs font-medium text-zinc-700">Durée du programme</label>
            <select id="program-duration" value={formData.durationWeeks || ''} onChange={e => setFormData({ ...formData, durationWeeks: e.target.value ? parseInt(e.target.value) : null })} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20">
              <option value="">En continu</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24].map(weeks => <option key={weeks} value={weeks}>{weeks} semaine{weeks > 1 ? 's' : ''}</option>)}
            </select>
          </div>}
          {isEditingProgram ? <div>
            <label htmlFor="program-start-date" className="mb-1 block text-xs font-medium text-zinc-700">Date de début</label>
            <Input id="program-start-date" type="date" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="!h-11 !rounded-lg !bg-white !text-sm" />
          </div> : <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-zinc-700">Objectifs</p>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {GOALS.map(goal => {
                const selected = formData.objectifs?.includes(goal);
                return <button key={goal} type="button" aria-pressed={selected} onClick={() => { const current = formData.objectifs || []; setFormData({ ...formData, objectifs: selected ? current.filter((item: string) => item !== goal) : [...current, goal] }); }} className={`min-h-10 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 ${selected ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}>{goal}</button>;
              })}
            </div>
          </div>}
        </div>
        {member && <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-700">
          <span className="font-semibold text-zinc-900">{member.name}</span>
          {member.experienceLevel && <span>{member.experienceLevel}</span>}
          {member.objectifs?.length > 0 && <span className="truncate">Objectif : {member.objectifs[0]}</span>}
          {member.notes && <span className="min-w-0 max-w-full truncate">Note coach : {member.notes}</span>}
        </div>}
      </section>

      {/* Adherent feedback attached to the current program. */}
      <AnimatePresence>
        {isEditingProgram && formData.memberRemarks && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="p-5 bg-amber-50 border-2 border-amber-300/60 rounded-[32px] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm shadow-amber-100"
          >
             <div className="flex gap-4 items-center">
               <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0">
                  <MessageCircleIcon size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Retour de l’adhérent</h2>
                  <p className="mt-1 text-sm text-zinc-800 leading-relaxed">« {formData.memberRemarks} »</p>
               </div>
             </div>
             <button 
               type="button"
               onClick={() => setFormData({...formData, memberRemarks: ""})}
               className="min-h-11 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 cursor-pointer"
             >
               Marquer comme traité
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Programme workspace: days, exercise list and focused details */}
      <section className="va-editor-workspace relative rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {!isSingleSession && (
          <div className="va-editor-days-mobile border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-zinc-700">Séances du programme</p>
              <button type="button" onClick={handleAddDay} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Ajouter une séance">
                <Plus size={16} /> Ajouter
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Séances du programme">
              {formData.days.map((day: Day, idx: number) => (
                <button key={idx} type="button" aria-pressed={selectedDayIdx === idx} onClick={() => { setSelectedDayIdx(idx); setSelectedExerciseIdx(0); setOpenActionIdx(null); }} className={`min-h-11 shrink-0 rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${selectedDayIdx === idx ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'}`}>
                  <span className="block text-xs font-semibold">{day.name || `Jour ${idx + 1}`}</span>
                  <span className={`mt-0.5 block text-xs ${selectedDayIdx === idx ? 'text-emerald-100' : 'text-zinc-600'}`}>{day.exercises?.length || 0} exercice{day.exercises?.length === 1 ? '' : 's'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="va-editor-workspace-grid min-w-0">
          {!isSingleSession && (
            <aside className="va-editor-days-desktop border-r border-zinc-200 bg-zinc-50/60 p-3" aria-label="Séances du programme">
              <div className="mb-3 flex items-center justify-between px-2 py-1">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-900">Séances</h2>
                  <p className="mt-0.5 text-xs text-zinc-600">{formData.days.length} au total</p>
                </div>
                <button type="button" onClick={handleAddDay} className="flex h-11 w-11 items-center justify-center rounded-lg text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" aria-label="Ajouter une séance"><Plus size={18} /></button>
              </div>
              <div className="space-y-1.5">
                {formData.days.map((day: Day, idx: number) => (
                  <button key={idx} type="button" aria-current={selectedDayIdx === idx ? 'true' : undefined} onClick={() => { setSelectedDayIdx(idx); setSelectedExerciseIdx(0); setOpenActionIdx(null); }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${selectedDayIdx === idx ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-transparent bg-transparent text-zinc-800 hover:border-zinc-200 hover:bg-white'}`}>
                    <span className={`mb-1 block text-xs font-medium ${selectedDayIdx === idx ? 'text-emerald-100' : 'text-zinc-600'}`}>Jour {idx + 1}</span>
                    <span className="block truncate text-sm font-semibold">{day.name || `Jour ${idx + 1}`}</span>
                    <span className={`mt-1 block text-xs ${selectedDayIdx === idx ? 'text-emerald-100' : 'text-zinc-600'}`}>{day.exercises?.length || 0} exercice{day.exercises?.length === 1 ? '' : 's'}{day.duration ? ` · ${day.duration} min` : ''}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleAddDay} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:border-emerald-700 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><Plus size={16} /> Ajouter un jour</button>
            </aside>
          )}

          <main className="min-w-0 p-4 sm:p-5">
            <div className="mb-4 border-b border-zinc-200 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Nom de la séance</label>
                  <Input value={activeDay?.name || ''} onChange={e => { const days = [...formData.days]; if (days[selectedDayIdx]) { days[selectedDayIdx] = { ...days[selectedDayIdx], name: e.target.value }; setFormData({ ...formData, days }); } }} placeholder={`Jour ${selectedDayIdx + 1}`} className="!h-11 !rounded-lg !bg-white !text-base !font-semibold" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="session-duration" className="whitespace-nowrap text-xs font-medium text-zinc-700">Durée (min)</label>
                    <Input id="session-duration" type="number" min="1" value={activeDay?.duration || ''} onChange={e => { const days = [...formData.days]; if (days[selectedDayIdx]) { days[selectedDayIdx] = { ...days[selectedDayIdx], duration: e.target.value ? parseInt(e.target.value) : undefined }; setFormData({ ...formData, days }); } }} className="!h-11 !w-20 !rounded-lg !bg-white" />
                  </div>
                  <button type="button" onClick={() => handleApplyEstimate(selectedDayIdx)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" title="Estimer à partir du nombre de séries et des temps de repos"><RefreshCw size={14} /> Estimer</button>
                  {!isSingleSession && (
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={selectedDayIdx === 0} onClick={() => { const days = [...formData.days]; [days[selectedDayIdx - 1], days[selectedDayIdx]] = [days[selectedDayIdx], days[selectedDayIdx - 1]]; setFormData({ ...formData, days }); setSelectedDayIdx(selectedDayIdx - 1); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" aria-label="Déplacer la séance vers la gauche"><ArrowLeft size={16} /></button>
                      <button type="button" disabled={selectedDayIdx === formData.days.length - 1} onClick={() => { const days = [...formData.days]; [days[selectedDayIdx + 1], days[selectedDayIdx]] = [days[selectedDayIdx], days[selectedDayIdx + 1]]; setFormData({ ...formData, days }); setSelectedDayIdx(selectedDayIdx + 1); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" aria-label="Déplacer la séance vers la droite"><ArrowRight size={16} /></button>
                      <button type="button" onClick={() => handleDuplicateDay(selectedDayIdx)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50" aria-label="Dupliquer la séance"><Copy size={15} /></button>
                      <button type="button" disabled={formData.days.length <= 1} onClick={() => handleRemoveDay(selectedDayIdx)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-red-700 hover:bg-red-50 disabled:opacity-40" aria-label="Supprimer la séance"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Exercices</h2>
                <p className="text-xs text-zinc-600">{activeDay?.exercises?.length || 0} mouvement{activeDay?.exercises?.length === 1 ? '' : 's'} · Sélectionnez-en un pour modifier ses paramètres</p>
              </div>
              {allPresets.length > 0 && <button type="button" onClick={() => setShowPresets(!showPresets)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><LayersIcon size={15} /> Importer une séance</button>}
            </div>

            {!activeDay?.exercises?.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                <DumbbellIcon size={25} className="mx-auto mb-2 text-zinc-500" />
                <p className="text-sm font-semibold text-zinc-900">Commencez par ajouter un exercice</p>
                <p className="mt-1 text-sm text-zinc-700">Les séries, répétitions et consignes se règlent ensuite dans le panneau de détails.</p>
              </div>
            ) : (
              <ol className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200" aria-label="Exercices de la séance">
                {activeDay.exercises.map((entry: ExerciseEntry, idx: number) => {
                  const exercise = exercises.find(item => item.id === entry.exId);
                  const selected = selectedExerciseIdx === idx;
                  return (
                    <li key={`${entry.exId}-${idx}`} className={selected ? 'bg-emerald-50/60' : 'bg-white'}>
                      <div className="flex min-w-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3">
                        <span className="w-6 shrink-0 text-center text-xs font-medium text-zinc-600">{idx + 1}</span>
                        <button type="button" onClick={() => setSelectedExerciseIdx(idx)} aria-pressed={selected} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-600">{exercise?.photo ? <img src={exercise.photo} alt="" className="h-full w-full object-cover" /> : <DumbbellIcon size={16} />}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900">{exercise?.name || 'Exercice à sélectionner'}</span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-700">{entry.sets || 0} séries · {exercise?.cat === 'Cardio' ? entry.duration || 'Durée à définir' : entry.reps || 'Reps à définir'} · repos {entry.rest || '—'}{entry.setGroup ? ` · ${entry.setType}` : ''}</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => handleToggleLink(selectedDayIdx, idx)} disabled={idx === 0} aria-label={entry.setGroup && entry.setGroup === activeDay.exercises[idx - 1]?.setGroup ? 'Délier du mouvement précédent' : 'Lier au mouvement précédent'} title="Lier au mouvement précédent" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border disabled:opacity-30 ${entry.setGroup && entry.setGroup === activeDay.exercises[idx - 1]?.setGroup ? 'border-emerald-800 bg-emerald-900 text-white' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}><LinkIcon size={15} /></button>
                        <div className="relative shrink-0">
                          <button type="button" onClick={() => setOpenActionIdx(openActionIdx === idx ? null : idx)} aria-label={`Actions pour ${exercise?.name || 'cet exercice'}`} aria-expanded={openActionIdx === idx} className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><MoreHorizontal size={17} /></button>
                          {openActionIdx === idx && <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
                            <button type="button" onClick={() => { handleMoveEx(selectedDayIdx, idx, 'up'); setSelectedExerciseIdx(Math.max(0, idx - 1)); setOpenActionIdx(null); }} disabled={idx === 0} className="block min-h-11 w-full rounded-md px-3 text-left text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-40">Monter</button>
                            <button type="button" onClick={() => { handleMoveEx(selectedDayIdx, idx, 'down'); setSelectedExerciseIdx(Math.min(activeDay.exercises.length - 1, idx + 1)); setOpenActionIdx(null); }} disabled={idx === activeDay.exercises.length - 1} className="block min-h-11 w-full rounded-md px-3 text-left text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-40">Descendre</button>
                            <button type="button" onClick={() => { handleDuplicateEx(selectedDayIdx, idx); setOpenActionIdx(null); }} className="block min-h-11 w-full rounded-md px-3 text-left text-sm text-zinc-800 hover:bg-zinc-50">Dupliquer</button>
                            {formData.days.map((day: Day, dayIdx: number) => dayIdx !== selectedDayIdx && <button key={dayIdx} type="button" onClick={() => { handleCopyExToDay(selectedDayIdx, idx, dayIdx); setOpenActionIdx(null); }} className="block min-h-11 w-full truncate rounded-md px-3 text-left text-sm text-zinc-800 hover:bg-zinc-50">Copier vers {day.name || `Jour ${dayIdx + 1}`}</button>)}
                            <button type="button" onClick={() => { handleRemoveEx(selectedDayIdx, idx); setOpenActionIdx(null); }} className="block min-h-11 w-full rounded-md px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50">Supprimer</button>
                          </div>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <button type="button" onClick={() => handleAddExercise(selectedDayIdx)} disabled={!exercises.length} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 text-sm font-semibold text-emerald-900 hover:border-emerald-800 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={17} /> Ajouter un exercice</button>
          </main>

          <aside className="va-editor-details min-w-0 border-t border-zinc-200 bg-zinc-50/60 p-4 sm:p-5" aria-label="Détails de l’exercice sélectionné">
            {activeDay?.exercises?.[selectedExerciseIdx] ? (() => {
              const entry = activeDay.exercises[selectedExerciseIdx];
              const exercise = exercises.find(item => item.id === entry.exId);
              const cardio = exercise?.cat === 'Cardio';
              return <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-zinc-600">Détails de l’exercice {selectedExerciseIdx + 1}</p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900">Paramètres</h2>
                </div>
                <SearchableExerciseSelect exercises={exercises} value={entry.exId} onChange={id => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'exId', id)} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs font-medium text-zinc-700">Séries<input type="number" min="1" value={entry.sets || ''} onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'sets', parseInt(e.target.value) || 0)} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20" /></label>
                  <label className="space-y-1 text-xs font-medium text-zinc-700">{cardio ? 'Durée / temps' : 'Répétitions'}<input value={cardio ? entry.duration || '' : entry.reps || ''} placeholder={cardio ? 'Ex. 15 min' : 'Ex. 8–12'} onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, cardio ? 'duration' : 'reps', e.target.value)} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20" /></label>
                  <label className="space-y-1 text-xs font-medium text-zinc-700">Repos<input value={entry.rest || ''} placeholder="Ex. 90 sec" onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'rest', e.target.value)} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20" /></label>
                  <label className="space-y-1 text-xs font-medium text-zinc-700">{cardio ? 'Intensité' : 'Tempo'}<input value={entry.tempo || ''} placeholder={cardio ? 'Ex. RPE 7' : 'Ex. 2010'} onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'tempo', e.target.value)} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20" /></label>
                </div>
                <label className="block space-y-1 text-xs font-medium text-zinc-700">Type de série<select value={entry.setType || 'normal'} onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'setType', e.target.value)} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"><option value="normal">Série standard</option><option value="superset">Superset</option><option value="biset">Bi-set</option><option value="triset">Tri-set</option><option value="giantset">Giant-set</option><option value="dropset">Drop-set</option></select></label>
                {!cardio && <div className="space-y-2"><p className="text-xs font-medium text-zinc-700">Répétitions rapides</p><div className="flex flex-wrap gap-1.5">{REPS_PRESETS.slice(0, 6).map(value => <button key={value} type="button" onClick={() => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'reps', value)} className="min-h-10 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:border-emerald-700 hover:bg-emerald-50">{value}</button>)}</div></div>}
                <div className="space-y-2"><p className="text-xs font-medium text-zinc-700">Repos rapide</p><div className="flex flex-wrap gap-1.5">{REST_PRESETS.map(value => <button key={value} type="button" onClick={() => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'rest', value.replace('s', ''))} className="min-h-10 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:border-emerald-700 hover:bg-emerald-50">{value}</button>)}</div></div>
                {!cardio && <div className="space-y-2"><p className="text-xs font-medium text-zinc-700">Tempo rapide</p><div className="flex flex-wrap gap-1.5">{TEMPO_PRESETS.slice(0, 3).map(value => <button key={value} type="button" onClick={() => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'tempo', value)} className="min-h-10 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 hover:border-emerald-700 hover:bg-emerald-50">{value}</button>)}</div></div>}
                <label className="block space-y-1 text-xs font-medium text-zinc-700">Consigne du coach<textarea rows={3} value={entry.notes || ''} placeholder="Consignes, adaptations ou points de vigilance" onChange={e => handleUpdateEx(selectedDayIdx, selectedExerciseIdx, 'notes', e.target.value)} className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/20" /></label>
              </div>;
            })() : <div className="flex min-h-40 flex-col items-center justify-center text-center"><DumbbellIcon size={22} className="mb-2 text-zinc-500" /><p className="text-sm font-semibold text-zinc-900">Aucun exercice sélectionné</p><p className="mt-1 text-sm text-zinc-700">Ajoutez un mouvement pour définir ses paramètres.</p></div>}
          </aside>
        </div>
      </section>
    </div>
  );
};
