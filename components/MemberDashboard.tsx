
import React, { useState, useEffect } from 'react';
import { AppState, Message, FeedItem } from '../types';
import { Card, StatBox, Button, Badge, Input } from './UI';
import { getLevel, formatDate } from '../utils';
import { CalendarIcon, RefreshCwIcon, TargetIcon, BarChartIcon, TrophyIcon, FlameIcon, SparklesIcon, MessageCircleIcon, ShoppingCartIcon, GiftIcon, MegaphoneIcon, BotIcon, SendIcon } from './Icons';
import { GoogleGenAI } from "@google/genai";
import { db, doc, updateDoc, setDoc } from '../firebase';
import Markdown from 'react-markdown';

interface MemberDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
  onToggleTimer: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ state, setState, showToast, onToggleTimer }) => {
  const user = state.user!;
  const myLogs = state.logs.filter(l => Number(l.memberId) === Number(user.id));
  const level = getLevel(user.xp); 
  const program = state.programs.find(p => Number(p.memberId) === Number(user.id));
  const lastArchive = state.archivedPrograms
    .filter(p => Number(p.memberId) === Number(user.id))
    .sort((a, b) => new Date((b as any).endDate || 0).getTime() - new Date((a as any).endDate || 0).getTime())[0];
  
  const [remark, setRemark] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  useEffect(() => {
    if (program?.memberRemarks) {
      setRemark(program.memberRemarks);
    }
  }, [program?.id, program?.memberRemarks]);

  const getAiAdvice = async () => {
    setAiLoading(true);
    try {
      const rawApiKey = process.env.GEMINI_API_KEY as string;
      const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
      const ai = new GoogleGenAI({ apiKey });
      const recentPerfs = state.performances
        .filter(p => Number(p.memberId) === Number(user.id))
        .slice(-5)
        .map(p => `${p.exId}: ${p.weight}kg x ${p.reps}`)
        .join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `En tant que coach expert VELATRA, donne un conseil ultra-court et motivant (max 15 mots) pour cet athlète dont les dernières perfs sont : ${recentPerfs}. Son objectif est : ${(user.objectifs || []).join(', ')}.`,
      });
      
      setState(prev => ({ ...prev, aiSuggestion: response.text }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const saveRemark = async () => {
    if (!program) {
      showToast("Aucun programme actif pour envoyer une remarque.", "error");
      return;
    }
    setIsSavingRemark(true);
    try {
      // 1. Mise à jour du champ dans le programme pour l'éditeur coach
      await updateDoc(doc(db, "programs", program.id.toString()), { 
        memberRemarks: remark 
      });

      // 2. Envoi d'un message privé automatique au coach (ID 1 par défaut pour le coach principal)
      const messageId = Date.now().toString();
      const newMessage: Message = {
        id: Date.now(),
        clubId: user.clubId,
        from: user.id,
        to: 1, // Coach principal
        text: `[REMARQUE PROGRAMME] : ${remark}`,
        date: new Date().toISOString(),
        read: false,
        file: null
      };
      await setDoc(doc(db, "messages", messageId), newMessage);

      // 3. Création d'une alerte dans le flux d'activité (Feed)
      const feedId = (Date.now() + 1).toString();
      const newFeedItem: FeedItem = {
        id: Date.now() + 1,
        clubId: user.clubId,
        userId: user.id,
        userName: user.name,
        type: 'session',
        title: `Alerte Feedback : ${user.name} a laissé une remarque sur son plan.`,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "feed", feedId), newFeedItem);

      showToast("Remarque transmise au coach !");
    } catch (err) {
      console.error("Error saving remark:", err);
      showToast("Erreur d'envoi. Réessayez.", "error");
    } finally {
      setIsSavingRemark(false);
    }
  };

  const requestPlan = async () => {
    try {
      const userRef = doc(db, "users", (user as any).firebaseUid);
      await updateDoc(userRef, { planRequested: true });
      
      // Alerte Coach
      const feedId = Date.now().toString();
      const newFeedItem: FeedItem = {
        id: Date.now(),
        clubId: user.clubId,
        userId: user.id,
        userName: user.name,
        type: 'session',
        title: `Demande de Plan : ${user.name} attend son nouveau cycle !`,
        date: new Date().toISOString()
      };
      await setDoc(doc(db, "feed", feedId), newFeedItem);

      showToast("Demande envoyée au coach ! 🔥");
    } catch (err) {
      showToast("Erreur", "error");
    }
  };

  useEffect(() => {
    if (!state.aiSuggestion) getAiAdvice();
  }, []);

  const myOrders = state.supplementOrders.filter(o => Number(o.adherentId) === Number(user.id));
  const totalSpent = myOrders.filter(o => o.status === 'completed').reduce((acc, curr) => acc + curr.total, 0);
  const latestNewsletter = state.newsletters?.[0];

  return (
    <div className="space-y-6 page-transition pb-24">
      {/* Header Section */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Salut, {user.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[2px] font-bold">
            <span className="text-zinc-900">{formatDate(new Date().toISOString())}</span>
            <div className="flex items-center gap-1 text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
               <FlameIcon size={10} fill="currentColor" /> {user.streak || 0} JOURS
            </div>
          </div>
        </div>
        <div className="relative" onClick={() => setState(s => ({ ...s, page: 'profile' }))}>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.3)] text-zinc-900 ring-2 ring-zinc-200 cursor-pointer">
            {user.avatar}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-[#050505] shadow-lg">
            LVL {Math.floor(user.xp / 1000) + 1}
          </div>
        </div>
      </div>

      {/* Main Action: Today's Session */}
      <section className="px-2">
        {program ? (
          <div 
            onClick={() => setState(prev => ({ ...prev, page: 'calendar' }))}
            className="bg-gradient-to-br from-velatra-accent to-velatra-accentDark rounded-3xl p-6 relative overflow-hidden shadow-[0_10px_40px_rgba(99,102,241,0.3)] cursor-pointer active:scale-[0.98] transition-all"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-100 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <Badge variant="dark" className="!bg-zinc-50 !text-zinc-900 border-zinc-200 mb-2 backdrop-blur-md">
                    S{Math.floor(program.currentDayIndex / program.nbDays) + 1} • J{(program.currentDayIndex % program.nbDays) + 1}
                  </Badge>
                  <h2 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase italic leading-none">
                    {program.days[program.currentDayIndex % program.nbDays]?.name || 'Séance du jour'}
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-full bg-zinc-50 backdrop-blur-md flex items-center justify-center text-zinc-900 shadow-inner">
                  <TargetIcon size={24} />
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-zinc-50 backdrop-blur-md rounded-2xl p-4 border border-zinc-200">
                <span className="font-black text-zinc-900 tracking-widest text-sm">DÉMARRER</span>
                <div className="w-8 h-8 rounded-full bg-white text-velatra-accent flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {lastArchive && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Cycle Terminé</div>
                  <div className="text-xs font-bold text-zinc-900">Bravo pour "{lastArchive.name}" !</div>
                </div>
              </div>
            )}
            <div 
              onClick={!user.planRequested ? requestPlan : undefined}
              className={`rounded-3xl p-6 text-center border-2 border-dashed transition-all ${user.planRequested ? 'bg-zinc-50 border-zinc-200 cursor-default' : 'bg-velatra-accent/5 border-velatra-accent/30 cursor-pointer active:scale-[0.98]'}`}
            >
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${user.planRequested ? 'bg-zinc-100 text-zinc-500' : 'bg-velatra-accent/20 text-velatra-accent'}`}>
                <CalendarIcon size={24} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 italic mb-1">Nouveau Cycle</h3>
              <p className="text-xs text-zinc-900 font-bold mb-4">Prêt pour la suite de ton évolution ?</p>
              <Button variant={user.planRequested ? "glass" : "primary"} disabled={user.planRequested} className="w-full !py-4 !rounded-xl">
                {user.planRequested ? "DEMANDE EN COURS..." : "DEMANDER MON PROGRAMME"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* AI Coach Quick Access */}
      <section className="px-2">
        <div 
          onClick={() => setState(s => ({ ...s, page: 'ai_coach' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 text-velatra-accent/5">
            <BotIcon size={100} />
          </div>
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-velatra-accent/20 flex items-center justify-center text-velatra-accent shrink-0 border border-velatra-accent/20">
              <SparklesIcon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Coach IA</h3>
                <Badge variant="accent" className="!text-[8px] !px-1.5 !py-0.5">NOUVEAU</Badge>
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed italic line-clamp-2">
                {aiLoading ? "Analyse de tes performances..." : (state.aiSuggestion || "Pose-moi une question sur ton entraînement ou ta nutrition.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="px-2 grid grid-cols-2 gap-3">
        <div 
          onClick={() => setState(s => ({ ...s, page: 'history' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-2"
        >
          <div className="text-velatra-accent"><CalendarIcon size={24} /></div>
          <div>
            <div className="text-2xl font-black text-zinc-900 leading-none">{myLogs.length}</div>
            <div className="text-[9px] font-bold text-zinc-900 uppercase tracking-widest mt-1">Sessions</div>
          </div>
        </div>
        <div 
          onClick={() => setState(s => ({ ...s, page: 'performances' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-2"
        >
          <div className="text-orange-400"><TrophyIcon size={24} /></div>
          <div>
            <div className="text-2xl font-black text-zinc-900 leading-none">{state.performances.filter(p => Number(p.memberId) === Number(user.id)).length}</div>
            <div className="text-[9px] font-bold text-zinc-900 uppercase tracking-widest mt-1">Records</div>
          </div>
        </div>
      </section>

      {/* Newsletter / Announcements (Swipeable or compact) */}
      {latestNewsletter && (
        <section className="px-2">
          <div className="bg-gradient-to-r from-velatra-accent/10 to-transparent border border-velatra-accent/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon size={16} className="text-velatra-accent" />
              <span className="text-[10px] font-black text-velatra-accent uppercase tracking-widest">Annonce du Club</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{latestNewsletter.title}</h3>
            <p className="text-xs text-zinc-500 line-clamp-2">{latestNewsletter.content.replace(/[*_#]/g, '')}</p>
          </div>
        </section>
      )}

      {/* Coach Feedback */}
      {program && (
        <section className="px-2">
          <div className="bg-white border border-zinc-200 rounded-3xl p-5">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-3">
              <MessageCircleIcon size={14} className="text-zinc-900" /> Mot au coach
            </h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Une douleur ? Trop facile ?" 
                className="!py-3 !text-xs flex-1 !bg-zinc-50 !border-none"
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
              <button 
                disabled={isSavingRemark || !remark || remark === (program?.memberRemarks || "")}
                onClick={saveRemark}
                className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
              >
                {isSavingRemark ? <RefreshCwIcon size={16} className="animate-spin" /> : <SendIcon size={16} />}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
