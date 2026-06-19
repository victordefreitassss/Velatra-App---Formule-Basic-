import React, { useState, useEffect } from 'react';
import { Program, Preset, Exercise, User } from '../types';
import { Card, Button, Input, Badge, Textarea } from './UI';
import { Save, X, Plus, Trash2, Dumbbell, Sparkles } from 'lucide-react';

interface ProgramEditorProps {
  program: any | null;
  preset: any | null;
  exercises: any[];
  clubId: string;
  allPresets?: any[];
  member?: User;
  readOnly?: boolean;
  onSave: (data: any, action?: 'create' | 'update' | 'delete' | 'start' | string) => void;
  onCancel: () => void;
}

export const ProgramEditor: React.FC<ProgramEditorProps> = ({
  program,
  preset,
  exercises,
  clubId,
  allPresets = [],
  member,
  readOnly = false,
  onSave,
  onCancel
}) => {
  const isEditingProgram = !!program;
  
  // Set up states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [rounds, setRounds] = useState<any[]>([]);
  const [duration, setDuration] = useState(45);
  const [difficulty, setDifficulty] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Débutant');

  // Load initial data
  useEffect(() => {
    if (program) {
      setTitle(program.nom || "");
      setDescription(program.description || "");
      setSelectedDay(program.jour || 1);
      setDuration(program.dureeMinutes || 45);
      setDifficulty(program.difficulte || 'Débutant');
      setRounds(program.rounds || []);
    } else if (preset) {
      setTitle(preset.nom || "");
      setDescription(preset.description || "");
      setDuration(preset.dureeMinutes || 45);
      setDifficulty(preset.difficulte || 'Débutant');
      setRounds(preset.rounds || []);
    }
  }, [program, preset]);

  // Apply a Preset to fill workout rounds/details
  const handleApplyPreset = (pId: string) => {
    if (readOnly) return;
    const current = allPresets.find(p => p.id.toString() === pId);
    if (current) {
      setTitle(current.nom);
      setDescription(current.description);
      setDuration(current.dureeMinutes);
      setDifficulty(current.difficulte);
      setRounds(current.rounds || []);
    }
  };

  const handleAddRound = () => {
    if (readOnly) return;
    const newRound = {
      nom: `Bloc ${rounds.length + 1}`,
      type: 'normal', // superset, circuit, normal
      repetitions: 1, // Number of times round is repeated
      exercises: []
    };
    setRounds([...rounds, newRound]);
  };

  const handleRemoveRound = (roundIndex: number) => {
    if (readOnly) return;
    setRounds(rounds.filter((_, i) => i !== roundIndex));
  };

  const handleUpdateRound = (roundIndex: number, field: string, value: any) => {
    if (readOnly) return;
    const updated = [...rounds];
    updated[roundIndex] = { ...updated[roundIndex], [field]: value };
    setRounds(updated);
  };

  const handleAddExerciseToRound = (roundIndex: number, exerciseId: string) => {
    if (readOnly) return;
    const exercise = exercises.find(e => e.id.toString() === exerciseId);
    if (!exercise) return;

    const roundEx = {
      exerciseId: exercise.id,
      nom: exercise.nom || exercise.name,
      series: 3,
      repetitionsText: "10-12",
      recupText: "1m30",
      notes: ""
    };

    const updated = [...rounds];
    updated[roundIndex].exercises = [...updated[roundIndex].exercises, roundEx];
    setRounds(updated);
  };

  const handleUpdateExerciseInRound = (roundIndex: number, exIndex: number, field: string, value: any) => {
    if (readOnly) return;
    const updated = [...rounds];
    const targetEx = { ...updated[roundIndex].exercises[exIndex], [field]: value };
    updated[roundIndex].exercises[exIndex] = targetEx;
    setRounds(updated);
  };

  const handleRemoveExerciseFromRound = (roundIndex: number, exIndex: number) => {
    if (readOnly) return;
    const updated = [...rounds];
    updated[roundIndex].exercises = updated[roundIndex].exercises.filter((_: any, i: number) => i !== exIndex);
    setRounds(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const payload = isEditingProgram 
      ? {
          ...program,
          nom: title,
          description,
          jour: selectedDay,
          dureeMinutes: duration,
          difficulte: difficulty,
          rounds
        }
      : {
          ...preset,
          nom: title,
          description,
          dureeMinutes: duration,
          difficulte: difficulty,
          rounds,
          id: preset?.id || Date.now()
        };

    onSave(payload, isEditingProgram ? 'update' : 'create');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2.5">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
            {readOnly ? "Visualiser l'entraînement" : isEditingProgram ? "Éditer l'entraînement" : "Nouveau modèle d'entraînement"}
          </h1>
          {member && (
            <p className="text-xs text-zinc-400 mt-1">
              Pour l'adhérent : <strong className="text-zinc-200">{member.name}</strong> • Objectif : {member.objectifs?.join(', ')}
            </p>
          )}
        </div>
        <Button variant="outline" className="h-10" onClick={onCancel}>
          <X className="w-4 h-4 mr-1.5" />
          Fermer
        </Button>
      </div>

      <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left config column */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-zinc-350">Informations Clés</h3>
            
            {/* Template Selector if isEditingProgram and presets exist */}
            {!readOnly && isEditingProgram && allPresets.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Appliquer un modèle modèle</label>
                <select
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="w-full h-11 px-4 text-xs rounded-xl border border-zinc-805 bg-zinc-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  defaultValue=""
                >
                  <option value="" disabled>-- Sélectionner un modèle --</option>
                  {allPresets.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} ({p.difficulte})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Nom de la Séance</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex. Séance Pecs & Bras"
                required
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Description / Objectif</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. Focus hypertrophy, volume modéré"
                rows={3}
                disabled={readOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Durée Estimée (Min)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Difficulté</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-850 bg-zinc-950 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  disabled={readOnly}
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            </div>

            {isEditingProgram && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Jour du programme</label>
                <Input
                  type="number"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  min={1}
                  disabled={readOnly}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Right workout planner column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">Configuration de l'entraînement</h3>
                <p className="text-xs text-zinc-400 mt-1">Structurez l'entraînement par blocs, supersets ou circuits.</p>
              </div>
              {!readOnly && (
                <Button variant="secondary" className="h-9" onClick={handleAddRound}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter un bloc
                </Button>
              )}
            </div>

            {rounds.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-850 rounded-2xl p-6">
                <Sparkles className="w-8 h-8 text-zinc-550 mx-auto animate-pulse" />
                <h4 className="text-sm font-semibold text-zinc-300 mt-3">Aucun bloc configuré</h4>
                <p className="text-xs text-zinc-450 mt-1 max-w-xs mx-auto">Ajoutez des blocs d'exercices puis configurez les séries, répétitions et temps de repos.</p>
                {!readOnly && (
                  <Button variant="secondary" className="h-9 mt-4" onClick={handleAddRound}>
                    Créer le premier bloc
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {rounds.map((round, rIndex) => (
                  <div key={rIndex} className="p-4 border border-zinc-900 rounded-xl bg-zinc-950/65 space-y-4 shadow-sm relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="indigo">Bloc {rIndex + 1}</Badge>
                        <input
                          type="text"
                          value={round.nom}
                          onChange={(e) => handleUpdateRound(rIndex, 'nom', e.target.value)}
                          className="bg-transparent text-sm font-bold focus:outline-none focus:border-b border-zinc-700 text-white max-w-[120px]"
                          disabled={readOnly}
                        />
                        <select
                          value={round.type}
                          onChange={(e) => handleUpdateRound(rIndex, 'type', e.target.value)}
                          className="bg-transparent text-xs text-zinc-400 focus:outline-none border-b border-zinc-800"
                          disabled={readOnly}
                        >
                          <option value="normal">Normal</option>
                          <option value="superset">Superset</option>
                          <option value="circuit">Circuit</option>
                        </select>
                      </div>
                      
                      {!readOnly && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveRound(rIndex)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Exercises list in this block */}
                    <div className="space-y-3">
                      {round.exercises?.map((ex: any, exIndex: number) => (
                        <div key={exIndex} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-850 items-center">
                          <div className="md:col-span-4">
                            <span className="text-xs font-semibold text-zinc-200 block truncate">{ex.nom}</span>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[9px] text-zinc-500 block uppercase font-bold mb-1">Séries</label>
                            <input
                              type="number"
                              value={ex.series}
                              onChange={(e) => handleUpdateExerciseInRound(rIndex, exIndex, 'series', Number(e.target.value))}
                              className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-xs text-white"
                              disabled={readOnly}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[9px] text-zinc-500 block uppercase font-bold mb-1">Répétitions</label>
                            <input
                              type="text"
                              value={ex.repetitionsText}
                              onChange={(e) => handleUpdateExerciseInRound(rIndex, exIndex, 'repetitionsText', e.target.value)}
                              className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-xs text-white"
                              disabled={readOnly}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[9px] text-zinc-500 block uppercase font-bold mb-1">Récup</label>
                            <input
                              type="text"
                              value={ex.recupText}
                              onChange={(e) => handleUpdateExerciseInRound(rIndex, exIndex, 'recupText', e.target.value)}
                              className="w-full h-8 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-xs text-white"
                              disabled={readOnly}
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseFromRound(rIndex, exIndex)}
                                className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add exercise drop selector to round */}
                    {!readOnly && (
                      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-3">
                        <select
                          className="flex-1 h-9 px-3 rounded-lg border border-zinc-850 bg-zinc-950 text-xs text-zinc-400"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddExerciseToRound(rIndex, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="" disabled>-- Ajouter un exercice --</option>
                          {exercises.map((e) => (
                            <option key={e.id} value={e.id}>{e.nom || e.name} ({e.categorie || e.cat})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Action buttons footer */}
          {!readOnly && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-1.5" />
                Sauvegarder l'entraînement
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
