
import React, { useState, useEffect } from 'react';
import { AppState, Message, FeedItem } from '../types';
import { Card, StatBox, Button, Badge, Input } from './UI';
import { getLevel, formatDate } from '../utils';
import { CalendarIcon, RefreshCwIcon, TargetIcon, BarChartIcon, TrophyIcon, FlameIcon, SparklesIcon, MessageCircleIcon, ShoppingCartIcon, GiftIcon, MegaphoneIcon, BotIcon, SendIcon } from './Icons';
import { BodyHeatmap } from './BodyHeatmap';
import { GoogleGenAI } from "@google/genai";
import { db, doc, updateDoc, setDoc } from '../firebase';
import Markdown from 'react-markdown';
import { motion } from 'framer-motion';

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

interface MemberDashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (m: string, t?: any) => void;
  onToggleTimer: () => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ state, setState, showToast, onToggleTimer }) => {
  const user = state.user!;
  const myLogs = state.logs.filter(l => Number(l.memberId) === Number(user.id));
  const level = getLevel(user.xp); 
  const program = state.programs.find(p => Number(p.memberId) === Number(user.id) && !p.isPlannedSession);
  const lastArchive = state.archivedPrograms
    .filter(p => Number(p.memberId) === Number(user.id))
    .sort((a, b) => new Date((b as any).endDate || 0).getTime() - new Date((a as any).endDate || 0).getTime())[0];
  
  // Compute muscle fatigue based on recent logs (last 7 days)
  const muscleData: Record<string, 'fatigued' | 'recovering' | 'fresh'> = {};
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentLogs = myLogs.filter(l => new Date(l.date) >= sevenDaysAgo);
  recentLogs.forEach(log => {
    log.exercises?.forEach(logEx => {
      const ex = state.exercises.find(e => e.id === logEx.exId);
      if (ex) {
        const daysAgo = (new Date().getTime() - new Date(log.date).getTime()) / (1000 * 3600 * 24);
        let status: 'fatigued' | 'recovering' | 'fresh' = 'fresh';
        if (daysAgo <= 2) status = 'fatigued';
        else if (daysAgo <= 4) status = 'recovering';
        
        let muscle = '';
        if (ex.cat === 'Poitrine') muscle = 'chest';
        else if (ex.cat === 'Dos') muscle = 'back'; // Will map to shoulders/arms in SVG if needed
        else if (ex.cat === 'Jambes') muscle = 'legs';
        else if (ex.cat === 'Épaules') muscle = 'shoulders';
        else if (ex.cat === 'Bras') muscle = 'arms';
        else if (ex.cat === 'Abdos') muscle = 'core';
        
        if (muscle) {
          // Only override if more fatigued
          if (!muscleData[muscle] || status === 'fatigued' || (status === 'recovering' && muscleData[muscle] === 'fresh')) {
            muscleData[muscle] = status;
          }
        }
      }
    });
  });

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
      const rawApiKey = getApiKey();
      const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
      const ai = new GoogleGenAI({ apiKey });
      const recentPerfs = state.performances
        .filter(p => Number(p.memberId) === Number(user.id))
        .slice(-5)
        .map(p => `${p.exId}: ${p.weight}kg x ${p.reps}`)
        .join(', ');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `En tant que coach expert VELATRA, donne un conseil ultra-court et motivant (max 15 mots) pour cet athlète dont les dernières perfs sont : ${recentPerfs}. Son objectif est : ${(user.objectifs || []).join(', ')}.`
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 page-transition pb-24"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex items-center justify-between px-2 pt-2">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight leading-none mb-1 text-zinc-900">Salut, {user.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[2px] font-bold">
            <span className="text-zinc-500">{formatDate(new Date().toISOString())}</span>
            <div className="flex items-center gap-1 text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
               <FlameIcon size={10} fill="currentColor" /> {user.streak || 0} JOURS
            </div>
          </div>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative" 
          onClick={() => setState(s => ({ ...s, page: 'profile' }))}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] text-zinc-900 ring-2 ring-zinc-200 cursor-pointer overflow-hidden">
            {user.avatar?.startsWith('http') ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.avatar || user.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-zinc-900 text-[8px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-[#050505] shadow-lg">
            LVL {Math.floor(user.xp / 1000) + 1}
          </div>
        </motion.div>
      </motion.div>

      {/* Main Action: Today's Session */}
      <motion.section variants={itemVariants} className="px-2">
        {program ? (
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setState(prev => ({ ...prev, page: 'calendar' }))}
            className="bg-zinc-50 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl cursor-pointer transition-all border border-zinc-200 group"
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Glowing Orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/30 rounded-full blur-[60px] group-hover:bg-emerald-500/40 transition-colors duration-500" />

            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <Badge className="bg-zinc-100 text-zinc-900 border-zinc-300 backdrop-blur-md mb-4 font-bold tracking-widest text-[10px]">
                    S{Math.floor(program.currentDayIndex / program.nbDays) + 1} • J{(program.currentDayIndex % program.nbDays) + 1}
                  </Badge>
                  <h2 className="text-4xl font-display font-bold text-zinc-900 leading-tight mb-2">
                    {program.days[program.currentDayIndex % program.nbDays]?.name || 'Séance du jour'}
                  </h2>
                  <p className="text-zinc-500 text-sm font-medium">
                    {program.name} • Objectif: {user.objectifs?.[0] || 'Général'}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-zinc-900 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-500">
                  <TargetIcon size={24} />
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-white backdrop-blur-md rounded-2xl p-4 border border-zinc-200 group-hover:bg-zinc-100 transition-colors">
                <span className="font-black text-zinc-900 tracking-widest text-sm uppercase">Démarrer l'entraînement</span>
                <motion.div 
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-10 h-10 rounded-full bg-emerald-500 text-zinc-900 flex items-center justify-center shadow-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {lastArchive && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <TrophyIcon size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Cycle Terminé</div>
                  <div className="text-xs font-bold text-zinc-900">Bravo pour "{lastArchive.name}" !</div>
                </div>
              </motion.div>
            )}
            <motion.div 
              whileHover={!user.planRequested ? { scale: 1.02 } : {}}
              whileTap={!user.planRequested ? { scale: 0.98 } : {}}
              onClick={!user.planRequested ? requestPlan : undefined}
              className={`rounded-3xl p-6 text-center border-2 border-dashed transition-all ${user.planRequested ? 'bg-zinc-50 border-zinc-200 cursor-default' : 'bg-emerald-500/5 border-emerald-500/30 cursor-pointer'}`}
            >
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${user.planRequested ? 'bg-white text-zinc-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                <CalendarIcon size={24} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 italic mb-1">Nouveau Cycle</h3>
              <p className="text-xs text-zinc-500 font-bold mb-4">Prêt pour la suite de ton évolution ?</p>
              <Button variant={user.planRequested ? "glass" : "primary"} disabled={user.planRequested} className="w-full !py-4 !rounded-xl">
                {user.planRequested ? "DEMANDE EN COURS..." : "DEMANDER MON PROGRAMME"}
              </Button>
            </motion.div>
          </div>
        )}
      </motion.section>

      {/* AI Coach Quick Access */}
      <motion.section variants={itemVariants} className="px-2">
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setState(s => ({ ...s, page: 'ai_coach' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all relative overflow-hidden shadow-sm hover:shadow-md group"
        >
          <div className="absolute -right-4 -top-4 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors duration-500">
            <MessageCircleIcon size={120} />
          </div>
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <MessageCircleIcon size={28} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Discussions</h3>
              </div>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                Échange avec ton coach ou le Coach IA.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Quick Stats Grid */}
      <motion.section variants={itemVariants} className="px-2 grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setState(s => ({ ...s, page: 'history' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md group"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500"><CalendarIcon size={24} /></div>
          <div>
            <div className="text-3xl font-display font-bold text-zinc-900 leading-none mb-1">{myLogs.length}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sessions</div>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setState(s => ({ ...s, page: 'performances' }))}
          className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:shadow-md group"
        >
          <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-500"><TrophyIcon size={24} /></div>
          <div>
            <div className="text-3xl font-display font-bold text-zinc-900 leading-none mb-1">{state.performances.filter(p => Number(p.memberId) === Number(user.id)).length}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Records</div>
          </div>
        </motion.div>
      </motion.section>

      {/* Newsletter / Announcements (Swipeable or compact) */}
      {latestNewsletter && (
        <motion.section variants={itemVariants} className="px-2">
          <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Annonce du Club</span>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{latestNewsletter.title}</h3>
            <p className="text-xs text-zinc-500 line-clamp-2">{latestNewsletter.content.replace(/[*_#]/g, '')}</p>
          </div>
        </motion.section>
      )}

      {/* Body Heatmap Section */}
      <motion.section variants={itemVariants} className="px-2">
        <div className="bg-zinc-50 border border-zinc-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <FlameIcon size={16} className="text-orange-500" /> État Musculaire
            </h3>
            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div>Fatigué</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div>En récup</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Frais</div>
            </div>
          </div>
          <BodyHeatmap muscleData={muscleData} />
        </div>
      </motion.section>

      {/* Coach Feedback */}
      {program && (
        <motion.section variants={itemVariants} className="px-2">
          <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-3">
              <MessageCircleIcon size={14} className="text-zinc-500" /> Mot au coach
            </h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Une douleur ? Trop facile ?" 
                className="!py-3 !text-xs flex-1 !bg-white !border-none !text-zinc-900 placeholder:text-zinc-500"
                value={remark}
                onChange={e => setRemark(e.target.value)}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isSavingRemark || !remark || remark === (program?.memberRemarks || "")}
                onClick={saveRemark}
                className="w-12 h-12 rounded-xl bg-emerald-500 text-zinc-900 flex items-center justify-center disabled:opacity-30 transition-all"
              >
                {isSavingRemark ? <RefreshCwIcon size={16} className="animate-spin" /> : <SendIcon size={16} />}
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};
