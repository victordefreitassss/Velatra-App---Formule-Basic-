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
  Settings, Clock, Play, Save, ChevronUp, RefreshCw, X, HelpCircle, Flame, Heart, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        className="w-full bg-zinc-50 border border-zinc-200 hover:border-emerald-500 rounded-2xl p-4 text-sm font-bold text-zinc-900 cursor-pointer flex justify-between items-center transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="truncate">{selectedEx ? selectedEx.name : 'Sélectionner un exercice'}</span>
          {selectedEx && (
            <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded-md px-2 py-0.5 font-bold uppercase tracking-wider ml-1 truncate">
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
                className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all capitalize shrink-0 ${
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
                  className={`px-3 py-1 text-[9px] font-bold rounded-lg transition-all capitalize shrink-0 ${
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
                    <div className="px-3 py-1 text-[9px] font-extrabold uppercase text-emerald-600 tracking-wider sticky top-0 bg-white/95 backdrop-blur-sm z-10">
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
                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-md shrink-0">
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
  const [showPresets, setShowPresets] = useState(false);
  const [openActionIdx, setOpenActionIdx] = useState<number | null>(null);
  const isSingleSession = formData.isPlannedSession;

  // Track the custom calculated state for session duration
  const [autoCalculatedDurations, setAutoCalculatedDurations] = useState<Record<number, number>>({});

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-32 px-4 page-transition">
      
      {/* Top Professional Sticky Header Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-100/80 -mx-4 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shadow-sm">
        <div className="flex items-center gap-4">
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel} 
            className="p-3 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 transition-all rounded-full"
          >
            <ChevronLeftIcon size={22} />
          </motion.button>
          <div>
            <div className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-1.5 leading-none">
              <Activity size={12} />
              CONCEPTEUR DE PROGRAMME SPORTIF
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-zinc-900 mt-1 uppercase leading-none">
              {isSingleSession ? "PLAN DE SÉANCE INDIVIDUELLE" : (isEditingProgram ? `ÉDITION PLAN ATHLÈTE` : "CRÉATION DE MODÈLE")}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allPresets.length > 0 && (
             <Button 
               type="button"
               onClick={() => setShowPresets(!showPresets)} 
               variant={showPresets ? "primary" : "secondary"}
               className="!rounded-2xl font-extrabold text-[11px] tracking-wider py-2.5 px-4 shadow-sm"
             >
                {showPresets ? "Masquer Modèles" : "Charger un Modèle"}
             </Button>
          )}
          {!isSingleSession && (
            <Button 
              type="button"
              onClick={() => {
                import('../services/pdfService').then(m => m.exportProgramToPDF(formData, exercises, null, member?.name));
              }} 
              variant="secondary" 
              className="shadow-sm font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-2xl bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            >
              📄 EXPORT PDF
            </Button>
          )}
          {!readOnly && (
            isSingleSession ? (
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  onClick={() => onSave(formData, 'plan')} 
                  variant="secondary" 
                  className="shadow-sm text-[11px] font-extrabold py-2.5 px-4 rounded-2xl uppercase tracking-wider"
                >
                  <CalendarIcon size={14} className="mr-1.5 inline" />
                  Prévoyez
                </Button>
                <Button 
                  type="button"
                  onClick={() => onSave(formData, 'start')} 
                  variant="primary" 
                  className="shadow-md text-[11px] font-extrabold py-2.5 px-4 rounded-2xl uppercase tracking-wider !bg-emerald-500 hover:!bg-emerald-600 !text-zinc-950"
                >
                  <Play size={14} className="mr-1.5 inline fill-zinc-950" />
                  Démarrer
                </Button>
              </div>
            ) : (
              <Button 
                type="button"
                onClick={() => onSave(formData)} 
                variant="success" 
                className="shadow-lg shadow-emerald-500/15 py-3 px-6 !rounded-2xl font-extrabold text-[11px] tracking-widest uppercase !bg-emerald-400 hover:!bg-emerald-500 !text-zinc-950"
              >
                <SaveIcon size={14} className="mr-2 inline" />
                Valider et Enregistrer
              </Button>
            )
          )}
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
                      <div className="flex gap-2 items-center text-[10px] text-zinc-500 font-extrabold mt-2 uppercase">
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

      {/* Main Grid: Meta Info on left, Program options on right (bento styled) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Parameters Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="!p-6 bg-zinc-50 border-zinc-200 ring-1 ring-zinc-200/50 rounded-[32px] space-y-6">
            <div className="border-b border-zinc-200/60 pb-3">
              <h2 className="text-sm font-black uppercase text-zinc-800 tracking-widest flex items-center gap-2">
                <Settings size={16} className="text-emerald-500" />
                PARAMÈTRES GÉNÉRAUX DU PLAN
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">
                  {isSingleSession ? "Nom de la séance programmée" : "Nom complet du programme"}
                </label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="!rounded-2xl !bg-white border-zinc-200 font-bold !py-3.5 focus:!border-emerald-500 focus:!ring-emerald-500 text-sm"
                  placeholder={isSingleSession ? "Ex: Haut Du Corps - Force & Densité" : "Ex: Hypertrophie Avancée Trimestre 1"} 
                />
              </div>
              
              {!isSingleSession && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Durée Prévue</label>
                  <select 
                    value={formData.durationWeeks || ''} 
                    onChange={e => setFormData({...formData, durationWeeks: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl px-4 py-3.5 text-zinc-900 text-sm font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                  >
                    <option value="">Pas de durée limite (Continu)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24].map(w => (
                      <option key={w} value={w}>{w} Semaine{w > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {isEditingProgram ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Date de début</label>
                  <Input 
                    type="date"
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="!rounded-2xl !bg-white border-zinc-200 font-bold !py-3.5"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-1">Objectifs Ciblés</label>
                  <div className="dropdown w-full relative">
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-zinc-200 rounded-[20px] min-h-[46px] shadow-sm">
                      {GOALS.map(g => {
                        const isSelected = formData.objectifs?.includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              const current = formData.objectifs || [];
                              if (isSelected) {
                                setFormData({ ...formData, objectifs: current.filter((item: string) => item !== g) });
                              } else {
                                setFormData({ ...formData, objectifs: [...current, g] });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all tracking-wide border ${
                              isSelected 
                                ? 'bg-emerald-500 border-emerald-500 text-zinc-950 font-black scale-[1.02] shadow-sm' 
                                : 'bg-zinc-50 border-zinc-200/60 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Member Profile Insights Card or general coach notes */}
        <div className="space-y-6">
          {member ? (
            <Card className="!p-6 bg-white border border-zinc-200 rounded-[32px] h-full shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <DumbbellIcon className="text-emerald-500" size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Informations Athlète</div>
                  <h3 className="text-base font-black text-zinc-900 uppercase leading-none mt-0.5">{member.name}</h3>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-transparent text-[10px] font-bold">
                    {member.gender === 'F' ? 'Femme' : 'Homme'} • {member.age} ans
                  </Badge>
                  {member.weight && (
                    <Badge variant="dark" className="!bg-zinc-100 !text-zinc-600 !border-transparent text-[10px] font-bold">
                      {member.weight} kg
                    </Badge>
                  )}
                  {member.experienceLevel && (
                    <Badge variant="accent" className="!bg-emerald-50 !text-emerald-700 !border-transparent text-[10px] font-extrabold uppercase">
                      {member.experienceLevel}
                    </Badge>
                  )}
                </div>

                {member.objectifs && member.objectifs.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">Objectifs :</span>
                    <div className="flex flex-wrap gap-1">
                      {member.objectifs.map((obj: string) => (
                        <span key={obj} className="px-2 py-0.5 bg-zinc-100 border border-zinc-150 rounded-md text-[9px] text-zinc-600 font-bold uppercase">
                          {obj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {member.notes && (
                  <div className="p-3 bg-zinc-50 border border-zinc-150 rounded-2xl mt-2">
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Notes Coach :</span>
                    <p className="text-xs text-zinc-500 italic leading-relaxed font-semibold">"{member.notes}"</p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="!p-6 bg-zinc-950 text-white rounded-[32px] h-full flex flex-col justify-between relative overflow-hidden">
               {/* Background glowing decorations */}
               <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
               
               <div className="space-y-3">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                   <Sparkles className="text-emerald-400" size={18} />
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-wider col-white">RECOMMANDATIONS ERGONOMIQUES</h3>
                 <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">
                   Utilisez les boutons de raccourcis <strong>- / +</strong> et de réglages automatiques pour ajuster instantanément les séries, reps et temps de repos en un seul clic, particulièrement sur mobile.
                 </p>
               </div>
               
               <div className="pt-3 border-t border-white/10 mt-4 flex items-center justify-between text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <span>VELATRA ATHLETE HUB</span>
                  <span>PRECISE WORKOUTS</span>
               </div>
            </Card>
          )}
        </div>
      </div>

      {/* Critical Highlight Box for the User Appeal (such as Victor's June 9 feedback context) */}
      <AnimatePresence>
        {isEditingProgram && formData.memberRemarks && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="p-5 bg-amber-50 border-2 border-amber-300/60 rounded-[32px] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm shadow-amber-100"
          >
             <div className="flex gap-4 items-center">
               <div className="w-11 h-11 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                  <MessageCircleIcon size={20} />
               </div>
               <div>
                  <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-0.5">
                    RETOUR CO-CONSTRUCTION ATHLÈTE (FAIT APPEL EN DATE DU 9 JUIN) :
                  </div>
                  <p className="text-sm font-black text-zinc-900 italic leading-snug">
                    "{formData.memberRemarks}"
                  </p>
                  <p className="text-[10px] text-zinc-600 font-bold mt-1">
                    Veuillez évaluer ses performances et adapter temporairement l'intensité de la séance.
                  </p>
               </div>
             </div>
             <button 
               type="button"
               onClick={() => setFormData({...formData, memberRemarks: ""})}
               className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] font-black tracking-widest whitespace-nowrap shrink-0 transition-all border border-transparent shadow-sm uppercase cursor-pointer"
             >
               Marquer comme Traité / Résolu
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly planning view */}
      {!isSingleSession && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-zinc-500">
              <LayersIcon size={14} className="text-emerald-500" />
              SÉLECTION & ARCHITECTURE DES SÉANCES HEBDOMADAIRES
            </h2>
            <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {formData.days.length} Séance{formData.days.length > 1 ? 's' : ''} programmée{formData.days.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth">
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
                    relative p-5 rounded-[24px] border text-left min-w-[170px] max-w-[210px] shrink-0 transition-all cursor-pointer select-none group
                    ${isSelected 
                      ? 'bg-zinc-950 border-zinc-950 text-white shadow-xl shadow-zinc-950/25 scale-[1.02]' 
                      : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      SÉANCE 0{idx + 1}
                    </span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isSelected ? 'bg-white/10 text-emerald-400' : 'bg-zinc-100 text-zinc-500'}`}>
                      {day.exercises?.length || 0} MVTS
                    </span>
                  </div>
                  <div className="font-extrabold text-sm truncate uppercase italic tracking-tight mb-1 leading-none">
                    {day.name || `Séance ${idx + 1}`}
                  </div>
                  {day.duration && (
                    <div className={`text-[9px] font-bold flex items-center gap-1 mt-2 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Clock size={10} />
                      {day.duration} min environ
                    </div>
                  )}
                </button>
              );
            })}

            <button
              onClick={handleAddDay}
              type="button"
              className="flex flex-col items-center justify-center p-5 rounded-[24px] border-2 border-dashed border-zinc-200/80 bg-zinc-50/20 hover:bg-emerald-500/[0.02] hover:border-emerald-500/30 text-emerald-600 font-black text-[10px] uppercase tracking-widest min-w-[150px] shrink-0 transition-all cursor-pointer hover:scale-[1.01]"
            >
              <Plus size={16} className="mb-2 shrink-0" />
              Ajouter Séance
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area: Focus Day Details */}
      <div className="space-y-6">
        <Card className="border border-zinc-200 !p-6 sm:!p-8 bg-white rounded-[32px] shadow-sm relative overflow-hidden">
          
          {/* Day Workspace Subheader with Day name edits, estimated duration and actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100/80">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
              {!isSingleSession && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider ml-1">Définition de la Séance</label>
                  <Input 
                    className="!text-base font-bold !bg-zinc-50 border-zinc-200 !rounded-2xl !py-3 px-4"
                    value={activeDay?.name || ''} 
                    onChange={e => {
                      const newDays = [...formData.days];
                      if (newDays[selectedDayIdx]) {
                        newDays[selectedDayIdx].name = e.target.value;
                        setFormData({...formData, days: newDays});
                      }
                    }}
                    placeholder="Ex: Pecs & Épaules (Superset Focus)"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Durée Estimée</label>
                  <button
                    type="button"
                    onClick={() => handleApplyEstimate(selectedDayIdx)}
                    className="text-[9px] font-black uppercase text-emerald-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    title="Calculer automatiquement basé sur les séries et temps de repos"
                  >
                    <RefreshCw size={10} className="animate-spin-hover" />
                    Estimer Durée Automatiquement
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    type="number"
                    className="!text-base font-bold !bg-zinc-50 border-zinc-200 !rounded-2xl !py-3 pl-4 pr-14"
                    placeholder="Ex: 60"
                    value={activeDay?.duration || ''} 
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-black uppercase pointer-events-none">MIN</div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Duplicate day, Reorder day, Delete day) */}
            {!isSingleSession && (
              <div className="flex flex-wrap items-center gap-2 lg:self-end">
                <button 
                  type="button"
                  onClick={() => setShowPresets(!showPresets)}
                  className="px-4 py-3 bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-500/20 text-zinc-700 hover:text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-zinc-100"
                >
                  <LayersIcon size={12} className="shrink-0 text-emerald-500" />
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
                  className="p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Dupliquer ce jour"
                >
                  <Copy size={13} />
                </button>

                <button 
                  type="button"
                  onClick={() => handleRemoveDay(selectedDayIdx)}
                  disabled={formData.days.length <= 1}
                  className="p-3 bg-red-500/[0.02] hover:bg-red-50 hover:border-red-500/20 text-red-500 border border-zinc-200 hover:border-red-500/10 rounded-xl disabled:opacity-10 transition-all cursor-pointer shadow-sm"
                  title="Supprimer ce jour"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* List of Exercises / Movements */}
          <div className="pt-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Mouvements programmés pour cette séance ({activeDay?.exercises?.length || 0})
              </span>
            </div>
            
            <div className="space-y-10">
              {(() => {
                const exercisesList = activeDay?.exercises || [];
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

                if (groupedExercises.length === 0) {
                  return (
                    <div className="text-center py-16 px-4 bg-zinc-50 border border-zinc-200/50 border-dashed rounded-[28px] text-zinc-500">
                      <DumbbellIcon size={36} className="mx-auto text-zinc-300 mb-3 animate-pulse" />
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-800">SÉANCE VIDE POUR LE MOMENT</p>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                        Cliquez sur "Ajouter un mouvement" ci-dessous pour composer la programmation sportive de ce jour.
                      </p>
                    </div>
                  );
                }

                // Render groups and standalone exercises
                return groupedExercises.map((group, groupIndex) => {
                  const getGroupColorClasses = (type: string) => {
                    switch (type?.toLowerCase()) {
                      case 'superset': return { bg: 'bg-emerald-500', text: 'text-emerald-500', fromTo: 'from-emerald-500 to-teal-400', banner: 'bg-gradient-to-r from-emerald-500 to-teal-100/10 border-emerald-500/20 text-emerald-800' };
                      case 'biset': return { bg: 'bg-blue-500', text: 'text-blue-500', fromTo: 'from-blue-500 to-indigo-400', banner: 'bg-gradient-to-r from-blue-500 to-indigo-100/10 border-blue-500/20 text-blue-800' };
                      case 'triset': return { bg: 'bg-purple-500', text: 'text-purple-500', fromTo: 'from-purple-500 to-pink-400', banner: 'bg-gradient-to-r from-purple-500 to-pink-100/10 border-purple-500/20 text-purple-800' };
                      case 'giantset': return { bg: 'bg-amber-500', text: 'text-amber-500', fromTo: 'from-amber-400 to-orange-500', banner: 'bg-gradient-to-r from-amber-400 to-orange-100/10 border-amber-500/20 text-amber-800' };
                      default: return { bg: 'bg-zinc-650', text: 'text-zinc-650', fromTo: 'from-zinc-500 to-zinc-400', banner: 'bg-gradient-to-r from-zinc-500 to-zinc-100/10 border-zinc-500/20 text-zinc-800' };
                    }
                  };

                  const groupMeta = getGroupColorClasses(group.groupName || '');

                  return (
                    <div key={groupIndex} className={group.isGroup ? "relative pl-4 sm:pl-8 space-y-6" : "space-y-6"}>
                      
                      {group.isGroup && (
                        <>
                          {/* Continuous visual guideline sidebar for Supersets */}
                          <div className={`absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b ${groupMeta.fromTo} rounded-full opacity-80`} />
                          
                          <div className={`p-3 border rounded-xl ${groupMeta.banner} flex items-center justify-between gap-4 shadow-sm mb-4`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 text-zinc-950 bg-white rounded-md shadow-sm`}>
                                {group.groupName || 'SUPERSET'}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90 hidden sm:inline">
                                Groupe {group.exercises[0]?.entry.setGroup} • Enchaînez les mouvements sans repos
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Ungroup all exercises in this group
                                const firstExIdx = group.exercises[0]?.index;
                                if (firstExIdx !== undefined) {
                                  handleUpdateEx(selectedDayIdx, firstExIdx, 'setType', 'normal');
                                }
                              }}
                              className="text-[9px] font-black uppercase text-zinc-700 hover:text-black bg-white/50 hover:bg-white rounded px-2 py-0.5 shrink-0 transition-all border border-black/5"
                            >
                              Dissoudre le groupe
                            </button>
                          </div>
                        </>
                      )}

                      {group.exercises.map(({ entry: ex, index: exIdx }, i) => {
                        const baseEx = exercises.find(e => e.id === ex.exId);
                        const isLastInGroup = i === group.exercises.length - 1;
                        const isDropdownOpen = openActionIdx === exIdx;

                        return (
                          <div key={exIdx} className="relative group">
                            <div className={`p-5 sm:p-6 bg-white rounded-[24px] border border-zinc-200/80 hover:border-zinc-300 transition-all shadow-sm ${group.isGroup ? 'bg-zinc-50/20' : ''}`}>
                              
                              {/* Exercise Header Row */}
                              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4 pb-4 border-b border-zinc-150/40">
                                <div className="flex items-center gap-3.5 w-full md:max-w-2xl">
                                  
                                  {/* Mouvement badge icon */}
                                  <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner text-zinc-400">
                                    {baseEx?.photo ? (
                                      <img src={baseEx.photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <DumbbellIcon size={18} />
                                    )}
                                  </div>

                                  {/* Dropdown Select for Exercise Name */}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Mouvement {exIdx + 1}</span>
                                    <SearchableExerciseSelect
                                      exercises={exercises}
                                      value={ex.exId}
                                      onChange={id => handleUpdateEx(selectedDayIdx, exIdx, 'exId', id)}
                                    />
                                  </div>
                                </div>

                                {/* Clean Actions Bar right aligned */}
                                <div className="flex items-center gap-2 self-end md:self-center">
                                  {/* Link Previous superset toggler */}
                                  <button 
                                    type="button"
                                    onClick={() => handleToggleLink(selectedDayIdx, exIdx)}
                                    disabled={exIdx === 0}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 disabled:opacity-20 cursor-pointer ${
                                      ex.setGroup && ex.setGroup === activeDay.exercises[exIdx-1]?.setGroup 
                                        ? 'bg-emerald-400 border-emerald-400 text-zinc-950 shadow-sm' 
                                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-800'
                                    }`}
                                    title="Lier avec le mouvement précédent (Superset)"
                                  >
                                    <LinkIcon size={12} />
                                    <span>{ex.setGroup && ex.setGroup === activeDay.exercises[exIdx-1]?.setGroup ? 'Lié' : 'Lier'}</span>
                                  </button>

                                  {/* Settings menu dropdown for movement options */}
                                  <div className="relative">
                                    <button 
                                      type="button"
                                      onClick={() => setOpenActionIdx(isDropdownOpen ? null : exIdx)}
                                      className="p-2 sm:px-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider"
                                      title="Plus d'actions"
                                    >
                                      <Settings2 size={13} />
                                      <span className="hidden sm:inline">Options</span>
                                    </button>

                                    {isDropdownOpen && (
                                      <div className="absolute right-0 top-full mt-2 bg-white border border-zinc-200 rounded-[22px] shadow-xl p-2.5 z-40 w-48 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="flex justify-between items-center px-1.5 py-1 mb-1 border-b border-zinc-100">
                                          <span className="text-[9px] font-black uppercase text-zinc-400">Position & Modèle</span>
                                          <button type="button" onClick={() => setOpenActionIdx(null)} className="text-zinc-400 hover:text-zinc-750">
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
                                          disabled={exIdx === activeDay.exercises.length - 1}
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
                                          className="w-full text-left px-2.5 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-100 mt-1 pt-1.5"
                                        >
                                          <Copy size={12} /> Dupliquer le mouvement
                                        </button>

                                        {/* Copy to other days list */}
                                        {formData.days.length > 1 && (
                                          <div className="mt-2 pt-2 border-t border-zinc-100">
                                            <div className="text-[8px] font-black uppercase text-zinc-400 mb-1 px-1.5">Copier vers séance :</div>
                                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                              {formData.days.map((d: any, dIdx: number) => dIdx !== selectedDayIdx && (
                                                <button 
                                                  key={dIdx}
                                                  type="button"
                                                  onClick={() => {
                                                    handleCopyExToDay(selectedDayIdx, exIdx, dIdx);
                                                    setOpenActionIdx(null);
                                                  }}
                                                  className="w-full text-left px-2 py-1 text-[9px] font-bold text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-md transition-colors truncate"
                                                >
                                                  S0{dIdx + 1} - {d.name || `Séance ${dIdx+1}`}
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
                                    className="p-2 bg-red-50 hover:bg-red-100/85 text-red-400 hover:text-red-650 rounded-xl transition-all cursor-pointer border border-transparent"
                                    title="Supprimer ce mouvement"
                                  >
                                    <Trash2Icon size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Spec Dashboard Grid - Beautiful pill inputs and easy stepper controls */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 bg-zinc-50/50 p-5 rounded-[22px] border border-zinc-150/40">
                                
                                {/* 1. SERIES STEPPER */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center block">SÉRIES</label>
                                  <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-2xl p-1 shadow-sm h-11">
                                    <button
                                      type="button"
                                      className="w-9 h-9 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-bold rounded-xl transition-all cursor-pointer select-none"
                                      onClick={() => handleUpdateEx(selectedDayIdx, exIdx, 'sets', Math.max(1, (Number(ex.sets) || 1) - 1))}
                                    >
                                      -
                                    </button>
                                    <input 
                                      type="number" 
                                      className="w-12 text-center text-sm font-black text-zinc-900 border-none bg-transparent focus:ring-0 p-0"
                                      value={ex.sets || ''}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'sets', parseInt(e.target.value) || 0)}
                                    />
                                    <button
                                      type="button"
                                      className="w-9 h-9 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-bold rounded-xl transition-all cursor-pointer select-none"
                                      onClick={() => handleUpdateEx(selectedDayIdx, exIdx, 'sets', (Number(ex.sets) || 1) + 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* 2. REPS WITH POPULAR TAGS */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center block">
                                    {baseEx?.cat === 'Cardio' ? 'DURÉE/TEMPS' : 'RÉPÉTITIONS'}
                                  </label>
                                  <div className="relative">
                                    <Input 
                                      className="text-center !rounded-2xl !text-sm font-black !bg-white border-zinc-200 focus:!border-zinc-400 !py-2.5 h-11"
                                      value={baseEx?.cat === 'Cardio' ? (ex.duration || '') : ex.reps}
                                      placeholder={baseEx?.cat === 'Cardio' ? "Ex: 15 min" : "Ex: 10,12"}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, baseEx?.cat === 'Cardio' ? 'duration' : 'reps', e.target.value)}
                                    />
                                  </div>
                                  
                                  {/* Presets underlay */}
                                  {baseEx?.cat !== 'Cardio' && (
                                    <div className="flex flex-wrap gap-1 justify-center max-h-[44px] overflow-hidden pt-0.5">
                                      {REPS_PRESETS.slice(0, 4).map(pre => (
                                        <button
                                          key={pre}
                                          type="button"
                                          onClick={() => handleUpdateEx(selectedDayIdx, exIdx, 'reps', pre)}
                                          className={`px-1.5 py-0.5 bg-zinc-100 hover:bg-emerald-50 rounded text-[9px] font-bold text-zinc-500 hover:text-emerald-700 transition-colors uppercase`}
                                        >
                                          {pre}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* 3. REPOS SECONDS WITH ONE-TAP TAGS */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center block">REPOS</label>
                                  <div className="relative">
                                    <Input 
                                      className="text-center !rounded-2xl !text-sm font-black !bg-white border-zinc-200 focus:!border-zinc-400 !py-2.5 h-11"
                                      value={ex.rest}
                                      placeholder="Ex: 90"
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'rest', e.target.value)}
                                    />
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1 justify-center max-h-[44px] overflow-hidden pt-0.5">
                                    {REST_PRESETS.map(pre => (
                                      <button
                                        key={pre}
                                        type="button"
                                        onClick={() => handleUpdateEx(selectedDayIdx, exIdx, 'rest', pre.replace('s', ''))}
                                        className="px-1.5 py-0.5 bg-zinc-100 hover:bg-emerald-50 rounded text-[9px] font-bold text-zinc-500 hover:text-emerald-700 transition-colors"
                                      >
                                        {pre}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* 4. TEMPO WITH HINTS */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center block" title="Excentrique - Isométrique - Concentrique - Transition">
                                    {baseEx?.cat === 'Cardio' ? 'INTENSITÉ' : 'TEMPO'}
                                  </label>
                                  <div className="relative">
                                    <Input 
                                      className="text-center !rounded-2xl !text-sm font-black !bg-white border-zinc-200 focus:!border-zinc-400 !py-2.5 h-11"
                                      value={ex.tempo || ''}
                                      placeholder={baseEx?.cat === 'Cardio' ? "Ex: RPE 7" : "Ex: 2010"}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'tempo', e.target.value)}
                                    />
                                  </div>
                                  
                                  {baseEx?.cat !== 'Cardio' && (
                                    <div className="flex flex-wrap gap-1 justify-center max-h-[44px] overflow-hidden pt-0.5">
                                      {TEMPO_PRESETS.slice(0, 3).map(pre => (
                                        <button
                                          key={pre}
                                          type="button"
                                          onClick={() => handleUpdateEx(selectedDayIdx, exIdx, 'tempo', pre)}
                                          className="px-1.5 py-0.5 bg-zinc-100 hover:bg-emerald-50 rounded text-[9px] font-bold text-zinc-500 hover:text-emerald-700 transition-colors"
                                        >
                                          {pre}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* 5. EFFORT TYPE CUSTOM DROP-DOWN */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center block">SÉRIES INTENSIVES</label>
                                  <div className="relative">
                                    <select 
                                      className="w-full bg-white border border-zinc-200 rounded-2xl px-2 py-3 text-center text-xs font-black text-zinc-900 focus:outline-none focus:border-zinc-400 appearance-none cursor-pointer h-11"
                                      value={ex.setType || 'normal'}
                                      onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'setType', e.target.value)}
                                    >
                                      <option value="normal">Série Standard</option>
                                      <option value="superset">Superset</option>
                                      <option value="biset">Bi-set</option>
                                      <option value="triset">Tri-set</option>
                                      <option value="giantset">Giant-set</option>
                                      <option value="dropset">Drop-set</option>
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                      <ChevronDownIcon size={12} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Notes Input for particular coaching instructions */}
                              <div className="mt-4 flex gap-2.5 items-center">
                                <div className="p-2 bg-zinc-50 rounded-xl text-zinc-400 shrink-0">
                                  <MessageCircle size={14} />
                                </div>
                                <Input 
                                  className="!rounded-2xl !text-xs font-semibold !bg-zinc-50 border-transparent focus:!border-zinc-200 !py-2.5 pl-2"
                                  value={ex.notes || ''}
                                  placeholder="Consigne du coach (Ex: Accentuer le pic de contraction en fin de mouvement, rester gainer...)"
                                  onChange={e => handleUpdateEx(selectedDayIdx, exIdx, 'notes', e.target.value)}
                                />
                              </div>
                            </div>
                            
                            {/* Inter-exercises visual link dot representation for continuous flow list */}
                            {group.isGroup && !isLastInGroup && (
                              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center justify-center">
                                <div className={`w-7 h-7 rounded-full text-zinc-950 border-2 bg-zinc-900 border-white flex items-center justify-center shadow-lg`}>
                                  <LinkIcon size={11} className="text-emerald-400" />
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

            {/* Huge Touch-Friendly Add Movement Button */}
            <motion.button 
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleAddExercise(selectedDayIdx)}
              className="w-full py-5 border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-500/[0.01] rounded-[28px] text-zinc-700 hover:text-emerald-600 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-6 cursor-pointer bg-zinc-50/20"
            >
              <Plus size={18} />
              Ajouter un exercice à la séance
            </motion.button>
          </div>
        </Card>
      </div>
    </div>
  );
};
