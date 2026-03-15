import React, { useState } from 'react';
import { Program, Preset, Exercise, Day, ExerciseEntry, AppState } from '../types';
import { Button, Input, Card, Badge } from './UI';
import { 
  PlusIcon, Trash2Icon, ChevronLeftIcon, SaveIcon, 
  DumbbellIcon, LayersIcon, InfoIcon, MessageCircleIcon, RefreshCwIcon 
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
    newDays[dayIdx].exercises[exIdx] = {
      ...newDays[dayIdx].exercises[exIdx],
      [field]: value
    };
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
                            newDays[selectedDayIdx].duration = e.target.value ? parseInt(e.target.value) : undefined;
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
                
                {(formData.days[selectedDayIdx]?.exercises || []).map((ex: ExerciseEntry, exIdx: number) => {
                  if (!ex) return null;
                  const baseEx = exercises.find(e => e.id === ex.exId);
                  
                  return (
                    <div key={exIdx} className="bg-white p-6 rounded-3xl border border-zinc-200 relative group hover:border-velatra-accent/40 transition-all shadow-inner">
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
                );
              })}

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
