
import React, { useState, useEffect } from 'react';
import { AppState, Message, FeedItem } from '../types';
import { Card, StatBox, Button, Badge, Input } from './UI';
import { getLevel, formatDate } from '../utils';
import { CalendarIcon, RefreshCwIcon, TargetIcon, BarChartIcon, TrophyIcon, FlameIcon, SparklesIcon, MessageCircleIcon, ShoppingCartIcon, GiftIcon, MegaphoneIcon } from './Icons';
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const recentPerfs = state.performances
        .filter(p => Number(p.memberId) === Number(user.id))
        .slice(-5)
        .map(p => `${p.exId}: ${p.weight}kg x ${p.reps}`)
        .join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `En tant que coach expert VELATRA, donne un conseil ultra-court et motivant (max 15 mots) pour cet athlète dont les dernières perfs sont : ${recentPerfs}. Son objectif est : ${user.objectifs.join(', ')}.`,
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
    <div className="space-y-8 page-transition pb-24">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2">Salut, {user.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-3 text-velatra-textDark text-[10px] uppercase tracking-[3px] font-bold">
            {formatDate(new Date().toISOString())}
            <span className="text-velatra-accent/50">•</span>
            <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20 shadow-inner">
               <FlameIcon size={12} fill="currentColor" /> {user.streak || 0} JOURS DE FEU
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-velatra-accent to-velatra-accentDark flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white ring-2 ring-white/10">
            {user.avatar}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full ring-2 ring-[#050505] shadow-lg">
            Lvl {Math.floor(user.xp / 1000) + 1}
          </div>
        </div>
      </div>

      {latestNewsletter && (
        <Card className="bg-gradient-to-br from-velatra-accent/20 to-black border-velatra-accent/30 !p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MegaphoneIcon size={64} className="text-velatra-accent" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="accent" className="!text-[8px] !px-2 !py-0.5">NEWSLETTER</Badge>
              <span className="text-[9px] text-velatra-textDark font-black uppercase tracking-widest">{new Date(latestNewsletter.date).toLocaleDateString()}</span>
            </div>
            <h2 className="text-xl font-black text-white italic tracking-tight">{latestNewsletter.title}</h2>
            <div className="text-sm text-velatra-textMuted prose prose-invert prose-p:leading-relaxed prose-a:text-velatra-accent max-w-none line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
              <Markdown>{latestNewsletter.content}</Markdown>
            </div>
            <p className="text-[9px] text-velatra-textDark font-black uppercase tracking-widest pt-2 border-t border-white/5">
              Par {latestNewsletter.author}
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-black flex items-center gap-3 px-1 text-white uppercase tracking-tight">
              Session du Jour
            </h2>
            
            {program ? (
              <Card className="bg-white/[0.03] border-white/5 hover:bg-white/[0.05] p-6 relative group transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={program.days[program.currentDayIndex % program.nbDays].isCoaching ? 'accent' : 'blue'}>
                         {program.days[program.currentDayIndex % program.nbDays].isCoaching ? 'SESSION AVEC COACH' : 'SÉANCE AUTONOME'}
                      </Badge>
                      <Badge variant="dark" className="!bg-white/5 border-white/10 italic">
                        SEMAINE {Math.floor(program.currentDayIndex / program.nbDays) + 1} {program.durationWeeks ? `/ ${program.durationWeeks}` : ''} • JOUR {(program.currentDayIndex % program.nbDays) + 1}
                      </Badge>
                    </div>
                    <div className="text-2xl font-black tracking-tighter text-white uppercase italic">
                      {program.days[program.currentDayIndex % program.nbDays].name}
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-velatra-accent group-hover:bg-velatra-accent group-hover:text-white transition-all shadow-lg">
                     <TargetIcon size={24} />
                  </div>
                </div>
                <Button onClick={() => setState(prev => ({ ...prev, page: 'calendar' }))} variant="primary" fullWidth className="!py-5 font-black text-base shadow-xl shadow-velatra-accent/30">
                  DÉMARRER LA SÉANCE
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {lastArchive && (
                  <Card className="bg-emerald-500/5 border-emerald-500/20 p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <TrophyIcon size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-500 uppercase tracking-widest">Cycle Terminé !</div>
                      <div className="text-sm font-bold text-white">Bravo pour ton cycle "{lastArchive.name}"</div>
                    </div>
                  </Card>
                )}
                <Card className="text-center py-12 border-dashed border-white/10 bg-transparent">
                  <p className="text-velatra-textDark font-bold mb-4 italic text-sm">Prêt pour un nouveau cycle de performance ?</p>
                  <Button 
                    variant={user.planRequested ? "glass" : "secondary"} 
                    disabled={user.planRequested}
                    onClick={requestPlan}
                  >
                    {user.planRequested ? "DEMANDE EN COURS..." : "DEMANDER MON PROGRAMME"}
                  </Button>
                </Card>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-black flex items-center gap-3 px-1 text-white uppercase tracking-tight italic">
              <MessageCircleIcon className="text-velatra-accent" size={20} /> Remarques Programme
            </h2>
            <Card className="!p-6 space-y-4 bg-white/[0.02] border-white/5">
              <p className="text-[10px] font-black uppercase text-velatra-textDark tracking-widest leading-relaxed">
                Une douleur ? L'exercice est trop dur ? Trop facile ? Laisse un mot à ton coach ici. Il recevra une alerte immédiate.
              </p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Tapez votre remarque ici..." 
                  className="!py-3 !text-sm flex-1 !bg-black"
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                />
                <Button 
                  variant="primary" 
                  disabled={!program || isSavingRemark || !remark || remark === (program?.memberRemarks || "")}
                  onClick={saveRemark}
                  className="!rounded-xl min-w-[60px]"
                >
                  {isSavingRemark ? <RefreshCwIcon size={18} className="animate-spin" /> : "ENVOYER"}
                </Button>
              </div>
            </Card>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card 
             className="bg-black border-white/5 ring-1 ring-white/10 !p-8 relative overflow-hidden group transition-all"
           >
             <div className="absolute top-0 right-0 w-32 h-32 bg-velatra-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
             <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                   <div className="text-[10px] font-black uppercase tracking-[3px] text-velatra-accent">Progression Grade</div>
                   <div className="text-3xl animate-bounce-slow">{level.icon}</div>
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-velatra-accent transition-colors">{level.curr}</h3>
                <div className="space-y-3">
                   <div className="flex justify-between text-[9px] font-black text-velatra-textDark uppercase tracking-[2px]">
                      <span className="flex items-center gap-1"><SparklesIcon size={10} className="text-velatra-accent" /> {user.xp} XP TOTAL</span>
                      <span>Next : {level.next}</span>
                   </div>
                   <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                     <div className="h-full bg-gradient-to-r from-velatra-accent to-velatra-accentDark rounded-full shadow-[0_0_15px_rgba(196,30,58,0.4)] transition-all duration-1000 relative" style={{ width: `${level.progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                     </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                   <div className="text-[9px] font-black text-velatra-textDark uppercase tracking-widest italic">Récompense au prochain palier</div>
                   <Badge variant="accent" className="!text-[8px] animate-pulse">CADEAU MYSTÈRE 🎁</Badge>
                </div>
             </div>
           </Card>

           <section className="space-y-4">
              <h2 className="text-lg font-black flex items-center gap-3 px-1 text-white uppercase tracking-tight italic">
                <TrophyIcon className="text-velatra-accent" size={20} /> Quêtes Actives
              </h2>
              <div 
                className="space-y-3 cursor-pointer"
                onClick={() => setState(s => ({ ...s, page: 'performances' }))}
              >
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 group hover:bg-white/[0.05] hover:border-velatra-accent/30 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <FlameIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-white uppercase italic">Série de Feu</div>
                    <div className="text-[9px] text-velatra-textDark font-bold uppercase mt-0.5">Atteindre 7 jours de suite</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-velatra-accent">+500 XP</div>
                  </div>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 group hover:bg-white/[0.05] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <TargetIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-white uppercase italic">Maître du Volume</div>
                    <div className="text-[9px] text-velatra-textDark font-bold uppercase mt-0.5">10 tonnes soulevées ce mois</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-velatra-accent">+1000 XP</div>
                  </div>
                </div>
              </div>
           </section>

           <div className="grid grid-cols-2 gap-4">
              <StatBox 
                label="Sessions" 
                value={myLogs.length} 
                icon={<CalendarIcon size={14}/>} 
                onClick={() => setState(s => ({ ...s, page: 'history' }))}
              />
              <StatBox 
                label="Records" 
                value={state.performances.filter(p => Number(p.memberId) === Number(user.id)).length} 
                icon={<TrophyIcon size={14}/>} 
                onClick={() => setState(s => ({ ...s, page: 'performances' }))}
              />
           </div>

           <Card 
             onClick={() => setState(s => ({ ...s, page: 'messages' }))}
             className="bg-gradient-to-br from-blue-600/10 to-purple-600/5 border-blue-500/10 !p-6 cursor-pointer hover:border-blue-500/30 transition-all"
           >
              <div className="flex items-center gap-3 mb-3">
                 <SparklesIcon size={18} className="text-blue-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Coach IA VELATRA</span>
              </div>
              <p className="text-xs font-bold leading-relaxed italic text-white/90">
                 {aiLoading ? "Génération du conseil..." : (state.aiSuggestion || "Prêt pour ton entraînement aujourd'hui athlète ?")}
              </p>
           </Card>

           {/* Évolution Poids */}
           <Card 
             onClick={() => setState(s => ({ ...s, page: 'performances' }))}
             className="bg-black border-white/5 !p-6 space-y-4 cursor-pointer hover:border-velatra-accent/30 transition-all"
           >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChartIcon size={16} className="text-velatra-accent" />
                  <h3 className="text-[10px] font-black uppercase tracking-[3px] text-white">Évolution Poids</h3>
                </div>
                {state.bodyData.filter(b => Number(b.memberId) === Number(user.id)).length > 0 && (
                  <span className="text-[10px] font-black text-velatra-accent">
                    {state.bodyData.filter(b => Number(b.memberId) === Number(user.id)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].weight}kg
                  </span>
                )}
              </div>
              
              <div className="h-32 w-full relative">
                {(() => {
                  const myBody = state.bodyData
                    .filter(b => Number(b.memberId) === Number(user.id))
                    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  
                  if (myBody.length < 1) {
                    return <div className="h-full flex items-center justify-center text-[8px] text-velatra-textDark uppercase font-black tracking-widest">Aucun scan enregistré</div>;
                  }

                  const weights = myBody.map(b => b.weight);
                  const maxW = Math.max(...weights) + 1;
                  const minW = Math.min(...weights) - 1;
                  const range = maxW - minW || 1;

                  const points = myBody.map((b, i) => {
                    const x = myBody.length > 1 ? (i / (myBody.length - 1)) * 100 : 50;
                    const y = 100 - ((b.weight - minW) / range) * 100;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {myBody.length > 1 && (
                        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      {myBody.map((b, i) => {
                        const x = myBody.length > 1 ? (i / (myBody.length - 1)) * 100 : 50;
                        const y = 100 - ((b.weight - minW) / range) * 100;
                        return <circle key={i} cx={x} cy={y} r="2" fill="white" />;
                      })}
                    </svg>
                  );
                })()}
              </div>
           </Card>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
};
