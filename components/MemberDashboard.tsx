import React from 'react';
import { AppState, User, Program, SessionLog } from '../types';
import { Card, Button, Badge } from './UI';
import { doc, updateDoc, db } from '../firebase';
import { 
  Trophy, Flame, Award, Dumbbell, Calendar, Heart, 
  ChevronRight, Sparkles, AlertCircle, ShoppingBag, Send
} from 'lucide-react';

interface MemberDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onToggleTimer: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  state,
  setState,
  showToast,
  onToggleTimer
}) => {
  const user = state.user!;
  
  // Find current day programs
  const myPrograms = ((state.programs || []) as any[]).filter(p => !p.complete && p.memberId === Number(user.id)) || [];
  const currentWorkout = myPrograms[0] || null;

  // Finished sessions count
  const myLogs = ((state.logs || []) as any[]).filter(l => l.memberId === Number(user.id)) || [];

  // Handle request plan from coach
  const handleRequestPlan = async () => {
    try {
      const userRef = doc(db, "users", (user as any).firebaseUid || user.id.toString());
      await updateDoc(userRef, { planRequested: true });
      
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user!,
          planRequested: true
        }
      }));
      showToast("Votre demande a bien été envoyée au coach !", "success");
    } catch (e) {
      console.error(e);
      showToast("Impossible d'envoyer la demande", "error");
    }
  };

  const handleStartWorkout = (prog: any) => {
    setState(s => ({
      ...s,
      workout: prog,
      workoutMember: user
    }));
    showToast(`Démarrage de l'entraînement : ${prog.nom || prog.name}`);
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white leading-none">
            Salut, <span className="text-emerald-400">{(user.name || 'Champion').split(' ')[0]}</span> !
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-normal">
            Heureux de te revoir. Prêt à tout casser aujourd'hui dans ton club <strong className="text-zinc-200">{state.currentClub?.name || "Velatra"}</strong> ?
          </p>
        </div>

        {/* Streak & XP Badge Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 px-4 flex items-center gap-2.5 shadow-sm shrink-0">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse fill-amber-500/10" />
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block leading-none">STREAK</span>
              <span className="text-sm font-extrabold text-white mt-1 block leading-none">{user.streak || 0} Jours</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 px-4 flex items-center gap-2.5 shadow-sm shrink-0">
            <Trophy className="w-5 h-5 text-emerald-400 fill-emerald-500/5" />
            <div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block leading-none">XP POINT</span>
              <span className="text-sm font-extrabold text-white mt-1 block leading-none">{user.xp || 0} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active workout center box */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-zinc-90 w-full relative overflow-hidden bg-[#0c0c0f]/80 shadow-emerald-500/[0.01]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2.5">
                <Dumbbell className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Ton entraînement du jour</h3>
              </div>
              <Badge variant="emerald" className="uppercase text-[9px] tracking-widest">Aujourd'hui</Badge>
            </div>

            {currentWorkout ? (
              <div className="pt-4 space-y-5">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-zinc-150 leading-tight">{currentWorkout.nom || currentWorkout.name}</h4>
                  <p className="text-xs text-zinc-400 leading-normal">{currentWorkout.description || "Aucune description fournie par le coach."}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Jour {currentWorkout.jour || currentWorkout.currentDayIndex || 1}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    {currentWorkout.difficulte || "Intermédiaire"}
                  </span>
                </div>

                <Button 
                  fullWidth 
                  className="mt-2 text-neutral-950 font-bold"
                  onClick={() => handleStartWorkout(currentWorkout)}
                >
                  DÉMARRER LA SÉANCE
                </Button>
              </div>
            ) : (
              <div className="pt-8 pb-4 text-center space-y-4">
                <AlertCircle className="w-8 h-8 text-zinc-650 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-200">Aucun entraînement planifié pour aujourd'hui</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">Ton coach n'a pas encore lié d'entraînement actif pour aujourd'hui ou tu as fini ta programmation !</p>
                </div>
                
                {user.planRequested ? (
                  <Badge variant="amber" className="px-4 py-2 text-xs">
                    Demande de programme en attente de traitement par le coach
                  </Badge>
                ) : (
                  <Button variant="secondary" onClick={handleRequestPlan} className="mx-auto block text-xs">
                    <Send className="w-3.5 h-3.5 mr-1.5 inline" />
                    Demander un programme au coach
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Loyalty & history panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Fidelity / Reward points card */}
          <Card className="p-5 border-zinc-90 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Fidélité Club</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-widest leading-none">POINTS ACTUELS</span>
                <span className="text-3xl font-black text-white mt-1.5 block leading-none">{user.pointsFidelite || 0} PTS</span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl p-2.5 font-bold text-xs">
                Active Tier
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
              Cumule 10 points à chaque séance validée pour débloquer des compléments à la boutique du club !
            </p>
          </Card>

          {/* Member activity logs */}
          <Card className="p-5 border-zinc-90 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-zinc-900 pb-3">Historique des séances</h3>
            
            {myLogs.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-500">
                Aucune séance enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                {myLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <span className="font-semibold text-xs text-zinc-200 block truncate">{log.nomSession || log.dayName || "Séance d'entraînement"}</span>
                      <span className="text-[10px] text-zinc-500 block truncate mt-0.5">{log.date} • {log.dureeMinutes || 45} min</span>
                    </div>
                    <Badge variant="success" className="text-[8px] uppercase tracking-wider">OK</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};
