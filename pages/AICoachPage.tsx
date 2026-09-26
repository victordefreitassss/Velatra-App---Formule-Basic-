import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Textarea } from '../components/UI';
import { VelatraMascot } from '../components/VelatraMascot';
import { SendIcon, BotIcon, MessageCircleIcon } from '../components/Icons';
import Markdown from 'react-markdown';
import { MessagesPage } from './MessagesPage';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from '../services/aiService';
import { apiFetch } from '../firebase';

type AIMessage = { role: 'user' | 'model'; text: string; transient?: boolean };
const MAX_SAVED_MESSAGES = 20;

const sessionContext = (program: any, state: AppState) => {
  if (!program) return 'Aucun programme sportif actif n’est disponible pour le moment.';
  const day = program.days?.[program.currentDayIndex] || program.days?.[0];
  const exerciseList = (day?.exercises || []).slice(0, 12).map((entry: any) => {
    const exercise = state.exercises.find(item => item.id === Number(entry.exId));
    return `${exercise?.name || `Exercice ${entry.exId}`}${entry.sets ? ` — ${entry.sets} séries` : ''}${entry.reps ? `, ${entry.reps} répétitions` : ''}`;
  });
  return `Programme actif : ${program.name}. Séance actuelle : ${day?.name || 'non précisée'}${exerciseList.length ? `; exercices : ${exerciseList.join('; ')}` : ''}.`;
};

export const AICoachPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>('ai');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationReady, setConversationReady] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const coach = state.users.find(u => u.role === 'coach' || u.role === 'owner');
  const coachName = coach ? coach.name : state.user?.role === 'member' ? 'Mon coach' : 'Coach Humain';
  const isMember = state.user?.role === 'member';
  const canSelectMember = state.user?.role === 'coach' || state.user?.role === 'owner';
  const availableMembers = state.users.filter(member => member.role === 'member' && member.clubId === state.user?.clubId && (
    state.user?.role !== 'coach' || member.assignedCoachUid === state.user.firebaseUid
  ));
  const selectedMember = availableMembers.find(member => String(member.id) === selectedMemberId);
  const contextMember = isMember ? state.user : selectedMember;
  const activeProgram = contextMember
    ? state.programs.find(program => Number(program.memberId) === Number(contextMember.id) && !program.isPlannedSession)
    : undefined;
  const nutritionPlan = contextMember
    ? state.nutritionPlans.find(plan => Number(plan.memberId) === Number(contextMember.id))
    : undefined;
  const welcomeMessage = isMember
    ? `Salut ${(state.user?.name || 'Membre').split(' ')[0]} ! Je peux t'aider à comprendre ton programme et à garder le cap sur tes objectifs. Que veux-tu éclaircir ?`
    : `Bonjour ${(state.user?.name || 'Coach').split(' ')[0]} ! Je peux t'aider à préparer des idées de séances et des ajustements à vérifier avant de les proposer. Que souhaites-tu préparer ?`;
  const assistantHasError = messages[messages.length - 1]?.transient === true;
  const mascotState = loading ? 'thinking' : assistantHasError ? 'error' : 'idle';

  useEffect(() => {
    if (selectedMemberId && !selectedMember) setSelectedMemberId('');
  }, [selectedMemberId, selectedMember]);

  useEffect(() => {
    let current = true;
    const memberQuery = canSelectMember && selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';
    setConversationReady(false);
    setMessages([{ role: 'model', text: welcomeMessage }]);
    apiFetch(`/api/ai/conversation${memberQuery}`)
      .then(async response => {
        if (!response.ok) throw new Error('Historique indisponible');
        const result = await response.json();
        if (!current || !Array.isArray(result.messages)) return;
        const restored = result.messages.filter((message: any) =>
          (message?.role === 'user' || message?.role === 'model') && typeof message.text === 'string'
        ).map((message: any) => ({ role: message.role, text: message.text } as AIMessage));
        if (restored.length) setMessages([{ role: 'model', text: welcomeMessage }, ...restored]);
      })
      .catch(error => {
        console.warn('AI conversation history could not be loaded:', error);
        if (current) showToast("L'historique ne peut pas être chargé pour le moment.", 'error');
      })
      .finally(() => { if (current) setConversationReady(true); });
    return () => { current = false; };
  }, [state.user?.firebaseUid, selectedMemberId, canSelectMember, welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !conversationReady) return;

    const userMsg = input.trim();
    setInput("");
    const outgoingMessage: AIMessage = { role: 'user', text: userMsg };
    const priorHistory = messages.slice(1).filter(message => !message.transient).slice(-MAX_SAVED_MESSAGES);
    const userHistory = [...priorHistory, outgoingMessage].slice(-MAX_SAVED_MESSAGES);
    setMessages(prev => [...prev, outgoingMessage]);
    setLoading(true);

    try {
      const memberQuery = canSelectMember && selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';
      const saveHistory = async (history: AIMessage[]) => {
        const saveResponse = await apiFetch('/api/ai/conversation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(canSelectMember && selectedMemberId ? { memberId: Number(selectedMemberId) } : {}),
            messages: history.slice(-MAX_SAVED_MESSAGES).map(({ role, text }) => ({ role, text }))
          })
        });
        if (!saveResponse.ok) throw new Error('Historique non enregistré');
      };
      await saveHistory(userHistory);

      const clubName = state.currentClub?.name || 'VELATRA';
      const memberName = contextMember?.name || '';
      const planContext = contextMember ? sessionContext(activeProgram, state) : 'Aucun dossier adhérent n’est sélectionné.';
      const nutritionContext = nutritionPlan
        ? `Programme alimentaire : ${nutritionPlan.targetCalories} kcal par jour; protéines ${nutritionPlan.protein} g, glucides ${nutritionPlan.carbs} g, lipides ${nutritionPlan.fat} g; repas : ${(nutritionPlan.meals || []).slice(0, 6).map(meal => meal.name).join(', ') || 'non précisés'}.`
        : 'Aucun programme alimentaire actif disponible.';
      const systemInstruction = isMember
        ? `Tu es l'assistant de coaching de VELATRA. Tu aides ${state.user?.name || 'un adhérent'} à comprendre son entraînement et à suivre ses objectifs. Club : ${clubName}. Objectifs déclarés : ${(state.user?.objectifs || []).join(', ') || 'non renseignés'}. ${planContext} ${nutritionContext}
Base tes réponses sur les données ci-dessus, explique clairement les séances et les objectifs nutritionnels, et dis-le quand une information manque. Les changements de programme doivent être discutés et validés par le coach, tu ne peux rien modifier. Limite tes réponses à environ 150 mots. Réponds en français, brièvement et de façon motivante. Ne pose jamais de diagnostic ni ne remplace un professionnel de santé; pour douleur, blessure, maladie, grossesse ou trouble alimentaire, recommande un professionnel de santé et le coach.`
        : `Tu es l'assistant IA de VELATRA pour le coach ${state.user?.name || ''}. Club : ${clubName}. ${selectedMember ? `Contexte explicitement sélectionné par le coach pour ${memberName}. Objectifs : ${(selectedMember.objectifs || []).join(', ') || 'non renseignés'}. ${planContext} ${nutritionContext}` : 'Aucun dossier adhérent n’est sélectionné; ne prétends pas connaître les données des clients.'}
Aide à analyser uniquement le dossier sélectionné, proposer des idées d'entraînement et des ajustements à valider. N'enregistre ni ne modifie un programme; le coach décide et valide toute modification. Réponds en français, de façon concise et structurée. Ne pose pas de diagnostic et recommande un professionnel de santé pour les questions cliniques.`;

      const ai = new GoogleGenAI({ apiKey: 'PROXY' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction, temperature: 0.7 },
        contents: userHistory.map(message => ({ role: message.role, parts: [{ text: message.text }] }))
      });
      const answer: AIMessage = { role: 'model', text: response.text || "Désolé, je n'ai pas pu générer de réponse." };
      const completeHistory = [...userHistory, answer].slice(-MAX_SAVED_MESSAGES);
      setMessages(prev => [...prev, answer]);
      try {
        await saveHistory(completeHistory);
      } catch (saveError) {
        console.warn('AI reply generated but not saved to history:', saveError);
        showToast("Réponse reçue, mais l'historique n'a pas pu être enregistré.", 'error');
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', transient: true, text: `❌ ${error.message || "Erreur de connexion à l'assistant IA."}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = async () => {
    if (!window.confirm("Effacer l'historique de cette conversation ?")) return;
    try {
      const memberQuery = canSelectMember && selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';
      const response = await apiFetch(`/api/ai/conversation${memberQuery}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("L'historique n'a pas pu être effacé.");
      setMessages([{ role: 'model', text: welcomeMessage }]);
      showToast("Historique effacé.", 'success');
    } catch (error: any) {
      showToast(error?.message || "Impossible d'effacer l'historique.", 'error');
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 h-[calc(100dvh-144px)] md:h-[calc(100dvh-96px)] flex flex-col"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">Discussions</h1>
          <p className="text-zinc-900 text-xs font-medium uppercase text-zinc-500 tracking-wider">Échange avec ton coach</p>
        </div>
        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 shadow-inner backdrop-blur-md">
          <MessageCircleIcon size={32} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex bg-white backdrop-blur-md rounded-xl p-1 shrink-0 border border-zinc-200/50 shadow-sm">
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'human' ? 'bg-emerald-500 text-zinc-900 shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'}`} 
          onClick={() => setActiveTab('human')}
        >
          <MessageCircleIcon size={16} /> {coachName}
        </button>
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'ai' ? 'bg-emerald-500 text-zinc-900 shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'}`} 
          onClick={() => setActiveTab('ai')}
        >
          <BotIcon size={16} /> Coach IA
        </button>
      </motion.div>

      {canSelectMember && activeTab === 'ai' && (
        <motion.div variants={itemVariants} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 items-center gap-3 text-sm font-medium text-zinc-700">
            <span className="shrink-0">Contexte adhérent</span>
            <select
              value={selectedMemberId}
              onChange={event => setSelectedMemberId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Choisir un adhérent pour contextualiser l'assistant IA"
            >
              <option value="">Aucun — assistant général</option>
              {availableMembers.map(member => <option key={member.id} value={String(member.id)}>{member.name}</option>)}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-zinc-500">Les suggestions restent à vérifier et à valider par le coach.</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'ai' ? (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden bg-zinc-50 backdrop-blur-xl rounded-3xl border border-zinc-200/50 shadow-sm"
          >
            {messages.length <= 1 && (
              <div className="flex items-center gap-3 border-b border-zinc-200/60 bg-white/70 px-4 py-3 sm:px-5">
                <VelatraMascot state={mascotState} size={74} interactive={false} autoWave={!loading} className="shrink-0" />
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-zinc-900">Velatra AI</p>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-600">
                    {canSelectMember && !selectedMember
                      ? 'Assistant général. Sélectionnez un adhérent pour contextualiser les suggestions.'
                      : 'Je vous aide à préparer, comprendre et vérifier vos prochaines actions.'}
                  </p>
                </div>
              </div>
            )}
            {messages.length > 1 && (
              <div className="flex justify-end border-b border-zinc-200/50 px-4 py-2">
                <button onClick={clearConversation} disabled={loading} className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:opacity-50">Effacer cet historique</button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 shrink-0 overflow-hidden shadow-sm mt-auto mb-1">
                      {coach?.avatar?.startsWith('http') ? (
                        <img src={coach.avatar} alt={coach.name} className="w-full h-full object-cover" />
                      ) : coach?.avatar ? (
                        <span className="text-xs font-bold text-emerald-500">{coach.avatar}</span>
                      ) : (
                        <BotIcon size={16} className="text-emerald-500" />
                      )}
                    </div>
                  )}
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-500 text-zinc-900 rounded-br-sm shadow-md shadow-emerald-500/20' : 'bg-white text-zinc-700 rounded-bl-sm border border-zinc-200/50 shadow-sm'}`}>
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-display prose-a:text-emerald-500">
                        <Markdown urlTransform={(value: string | undefined | null) => typeof value === 'string' ? value : ''}>{String(msg.text || '')}</Markdown>
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center justify-start gap-2 mb-4">
                  <VelatraMascot state="thinking" size={54} interactive={false} className="shrink-0" />
                  <div className="rounded-2xl rounded-bl-sm border border-zinc-200/60 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
                    Je prépare une réponse…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-zinc-100 backdrop-blur-md border-t border-zinc-200/50">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pose ta question au coach IA..."
                  className="flex-1 bg-white border-zinc-200/50 focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm rounded-xl min-h-[56px] max-h-[120px]"
                  disabled={loading || !conversationReady}
                  maxLength={3500}
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !conversationReady || !input.trim()}
                  className="bg-emerald-500 text-zinc-900 p-4 rounded-xl hover:bg-emerald-500/90 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0 h-[56px] w-[56px]"
                >
                  <SendIcon size={20} />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                {isMember
                  ? "Tes échanges sont enregistrés dans ton compte et peuvent être effacés. L'assistant s'appuie sur ton programme disponible; il ne remplace pas ton coach ni un professionnel de santé."
                  : "Les échanges sont enregistrés dans ton compte et peuvent être effacés. Les changements demandent toujours ta validation."}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="human"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden bg-zinc-50 backdrop-blur-xl rounded-3xl border border-zinc-200/50 p-4 shadow-sm"
          >
            <MessagesPage state={state} setState={setState} showToast={showToast} embedded={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};