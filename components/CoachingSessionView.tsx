import React, { useState, useEffect } from 'react';
import { User, SessionLog, Performance, AppState } from '../types';
import { Card, Button, Input, Badge, Textarea } from './UI';
import { Timer, ToggleLeft, Save, Dumbbell, Clock, Landmark, X, Play, Pause, RotateCcw, Award } from 'lucide-react';

interface CoachingSessionViewProps {
  program: any | null;
  member: User | null;
  state: AppState;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isProgramSession?: boolean;
  onClose: () => void;
  onComplete: (log: SessionLog, perfs: Performance[]) => Promise<void>;
}

export const CoachingSessionView: React.FC<CoachingSessionViewProps> = ({
  program,
  member,
  state,
  showToast,
  isProgramSession = false,
  onClose,
  onComplete
}) => {
  if (!program) return null;

  // Running timer states
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [exPerformance, setExPerformance] = useState<Record<string, { weight: number, reps: number, notes: string }>>({});
  const [coachNotes, setCoachNotes] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setSeconds(0);
    setIsActive(false);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pre-fill sets values from program
  useEffect(() => {
    const freshPerfs: typeof exPerformance = {};
    program.rounds?.forEach((round, rIdx) => {
      round.exercises?.forEach((ex: any, exIdx: number) => {
        const key = `${rIdx}-${exIdx}`;
        // Extract default numbers from program
        const matches = ex.repetitionsText?.match(/\d+/);
        const reps = matches ? Number(matches[0]) : 10;
        freshPerfs[key] = {
          weight: 0,
          reps,
          notes: ex.notes || ""
        };
      });
    });
    setExPerformance(freshPerfs);
  }, [program]);

  const handleToggleSet = (key: string) => {
    setCompletedSets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleUpdateExPerformance = (key: string, field: 'weight' | 'reps' | 'notes', value: any) => {
    setExPerformance(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleFinishWorkout = async () => {
    setIsFinishing(true);
    try {
      // Create session Log
      const logId = Date.now();
      const sessionLog: any = {
        id: logId,
        memberId: member ? Number(member.id) : 1,
        nomSession: program.nom,
        description: program.description || "",
        dureeMinutes: Math.max(1, Math.round(seconds / 60)),
        difficulte: program.difficulte,
        xpGagnee: 25, // higher reward for coach led sessions
        pointsFideliteGagnes: 15,
        date: new Date().toLocaleDateString('fr-FR'),
        notes: "Séance sous l'accompagnement du Coach.",
        coachNotes: coachNotes,
        roundsRef: program.rounds || []
      };

      // Create exercises performance records
      const performancesList: any[] = [];
      program.rounds?.forEach((round, rIdx) => {
        round.exercises?.forEach((ex: any, exIdx: number) => {
          const key = `${rIdx}-${exIdx}`;
          const perfData = exPerformance[key];
          if (perfData) {
            performancesList.push({
              id: Date.now() + Math.random(),
              sessionId: logId,
              memberId: member ? Number(member.id) : 1,
              exerciseId: ex.exerciseId,
              exerciseNom: ex.nom,
              poids: Number(perfData.weight) || 0,
              repetitionsText: perfData.reps.toString(),
              notes: perfData.notes,
              date: new Date().toLocaleDateString('fr-FR')
            });
          }
        });
      });

      await onComplete(sessionLog, performancesList);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] bg-gradient-to-br from-[#09090c] to-[#040405] text-white overflow-y-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full">SÉANCE COACHÉE DE Thomas</span>
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight leading-none text-white mt-2">
                Suivi Coaching : <span className="text-zinc-300">{member?.name || "Athlète"}</span>
              </h1>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-xl border border-zinc-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stopwatch Card */}
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0a0a0c]/85 border-zinc-90 w-full">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block leading-none">DURÉE DE LA SÉANCE</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-wide text-white mt-1 block">
                {formatTime(seconds)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTimer}
              className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold select-none ${
                isActive 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isActive ? 'Pause' : 'Reprendre'}</span>
            </button>
            <button 
              onClick={resetTimer}
              className="p-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white pointer-events-auto"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </Card>

        {/* Rounds / Exercises Checklist */}
        <div className="space-y-6">
          {program.rounds?.map((round, rIndex) => (
            <div key={rIndex} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="blue">Bloc {rIndex + 1}</Badge>
                  <h3 className="text-sm font-bold tracking-wide text-zinc-200">{round.nom}</h3>
                  <Badge variant="dark" className="text-[9px] uppercase tracking-widest">{round.type}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {round.exercises?.map((ex: any, exIndex: number) => {
                  const key = `${rIndex}-${exIndex}`;
                  const isDone = !!completedSets[key];
                  const perf = exPerformance[key] || { weight: 0, reps: 10, notes: "" };

                  return (
                    <Card 
                      key={exIndex} 
                      className={`p-4 border transition-all ${
                        isDone 
                          ? 'border-emerald-500/30 bg-emerald-500/[0.01]' 
                          : 'border-zinc-900 bg-zinc-950/40'
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Title & default info */}
                        <div className="md:col-span-5 space-y-1">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-100">{ex.nom}</h4>
                          <p className="text-[11px] text-zinc-400 leading-normal font-medium">
                            Séries : {ex.series} séries • {ex.repetitionsText} reps • Récup {ex.recupText}
                          </p>
                          {ex.notes && (
                            <p className="text-[10px] text-zinc-550 border-l border-zinc-800 pl-2 mt-1 italic">{ex.notes}</p>
                          )}
                        </div>

                        {/* Log input fields */}
                        <div className="md:col-span-2">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Poids (kg)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={perf.weight || ""}
                            onChange={(e) => handleUpdateExPerformance(key, 'weight', Number(e.target.value))}
                            className="w-full h-9 px-3 bg-zinc-950/60 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Répétitions</label>
                          <input 
                            type="number" 
                            placeholder="10"
                            value={perf.reps || ""}
                            onChange={(e) => handleUpdateExPerformance(key, 'reps', Number(e.target.value))}
                            className="w-full h-9 px-3 bg-zinc-950/60 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Checkbox button */}
                        <div className="md:col-span-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleSet(key)}
                            className={`w-full md:w-auto h-9 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 select-none active:scale-98 ${
                              isDone 
                                ? 'bg-emerald-500 text-neutral-950 border-emerald-450 shadow-md shadow-emerald-500/10 font-bold' 
                                : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                            }`}
                          >
                            <span>{isDone ? "Validé" : "Marquer Fait"}</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Coach notes input */}
        <Card className="space-y-3">
          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Notes & Conseils du Coach (Visible par l'adhérent)</label>
          <Textarea 
            placeholder="Ex. Excellente technique sur le squat aujourd'hui. Attention à bien garder le buste droit en fin de mouvement. Augmenter le poids de 2.5kg la semaine prochaine !"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            rows={4}
          />
        </Card>

        {/* Submit Save bar */}
        <div className="flex items-center justify-between border-t border-zinc-900 pt-5 gap-4">
          <Button variant="outline" onClick={onClose} disabled={isFinishing}>
            Annuler la séance
          </Button>

          <Button 
            disabled={isFinishing}
            onClick={handleFinishWorkout}
            className="px-6 font-bold"
          >
            <Save className="w-4 h-4 mr-1.5 shrink-0 text-zinc-950" />
            <span>{isFinishing ? "Enregistrement..." : "Valider la séance coachée"}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
