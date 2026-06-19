import React from 'react';
import { AppState, User, SessionLog } from '../types';
import { Card, Button, Badge } from './UI';
import { 
  Users, Activity, DollarSign, Target, Gift, Bell, ArrowUpRight, 
  Dumbbell, TrendingUp, Calendar, AlertCircle
} from 'lucide-react';

interface CoachDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onExport: () => void;
  onToggleTimer: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  state,
  setState,
  onExport,
  onToggleTimer,
  showToast
}) => {
  const activeMembers = state.users?.filter(u => u.role === 'member') || [];
  const activeProspects = (state.prospects || []) as any[];
  const totalInvoices = state.payments || [];
  
  // Calculate payments metrics
  const totalRevenue = totalInvoices
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPlanRequests = activeMembers.filter(u => u.planRequested);

  // Recent workout logs
  const recentLogs = [...(state.logs || [])] as any[];
  recentLogs.sort((a, b) => {
    const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
    const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
    return dateB - dateA;
  });
  const limitedRecentLogs = recentLogs.slice(0, 5);

  const handleCreatePlanForMember = (member: User) => {
    setState(s => ({
      ...s,
      page: 'coaching',
      selectedMember: member
    }));
    showToast(`Création d'un entrainement pour ${member.name}`);
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
          Bonjour, <span className="text-emerald-400">Coach {(state.user?.name || 'Velatra').split(' ')[0]}</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-normal">
          Voici le récapitulatif opérationnel et financier de votre club d'entraînement <strong className="text-zinc-200">{state.currentClub?.name || "Velatra Club"}</strong> pour aujourd'hui.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-5 border-zinc-90 w-full relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Membres Actifs</span>
            <span className="text-3xl font-extrabold tracking-tight text-white block">{activeMembers.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-1">+12% ce mois</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border-zinc-90 w-full relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Chiffre d'Affaires</span>
            <span className="text-3xl font-extrabold tracking-tight text-white block">{totalRevenue.toFixed(0)}€</span>
            <span className="text-[10px] text-zinc-450 font-bold block mt-1">Cumulé club</span>
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border-zinc-90 w-full relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Pipeline Prospects</span>
            <span className="text-3xl font-extrabold tracking-tight text-white block">{activeProspects.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-1">{activeProspects.filter(p => p.status !== 'won').length} en cours</span>
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-5 border-zinc-90 w-full relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Demandes Entraînement</span>
            <span className="text-3xl font-extrabold tracking-tight text-white block">{pendingPlanRequests.length}</span>
            {pendingPlanRequests.length > 0 ? (
              <span className="text-[10px] text-amber-400 font-bold block mt-1 animate-pulse">Action requise</span>
            ) : (
              <span className="text-[10px] text-zinc-500 font-bold block mt-1">À jour !</span>
            )}
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Plan requests check */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Créations de plans requises</h3>
              {pendingPlanRequests.length > 0 && (
                <Badge variant="amber">{pendingPlanRequests.length}</Badge>
              )}
            </div>

            {pendingPlanRequests.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-6 h-6 text-zinc-650 mx-auto" />
                <p className="text-xs text-zinc-400 mt-2">Aucune demande de plan d'entraînement en attente.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingPlanRequests.map((member) => (
                  <div key={member.id} className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <span className="font-bold text-xs text-zinc-150 block truncate">{member.name}</span>
                      <span className="text-[10px] text-zinc-500 block truncate mt-0.5">Demande d'entraînement personnalisée</span>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="!h-8 !px-3 !text-[10px] !rounded-lg"
                      onClick={() => handleCreatePlanForMember(member)}
                    >
                      Planifier
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Recent completed workouts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-zinc-900 pb-3">Activités Récentes des Membres</h3>

            {limitedRecentLogs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-900 rounded-xl">
                <Dumbbell className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-400 mt-3">Aucun entraînement récent enregistré par les membres.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {limitedRecentLogs.map((log: any) => {
                  const m = activeMembers.find(u => Number(u.id) === log.memberId);
                  return (
                    <div key={log.id} className="p-3.5 border border-zinc-900 rounded-xl bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-zinc-150">{m?.name || "Athlète"}</span>
                          <Badge variant="success" className="text-[9px] uppercase tracking-wider">Séance finie</Badge>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-200 mt-1">{log.nomSession || log.dayName || "Séance"}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                          Date : {log.date} • Durée : {log.dureeMinutes || 45} min • XP : +{log.xpGagnee || 15}
                        </p>
                      </div>

                      <div className="flex justify-end pt-1 sm:pt-0">
                        {log.notes || log.isCoaching ? (
                          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-semibold">
                            Accompagné
                          </div>
                        ) : (
                          <div className="text-[10px] text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-lg font-semibold">
                            Autonome
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
};
