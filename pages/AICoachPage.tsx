import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Card, Input, Textarea } from '../components/UI';
import { SendIcon, BotIcon, UserIcon, MessageCircleIcon } from '../components/Icons';
import { GoogleGenAI } from "@google/genai";
import { CLUB_INFO, COACHES, INIT_SUPPLEMENTS } from '../constants';
import Markdown from 'react-markdown';
import { MessagesPage } from './MessagesPage';
import { motion, AnimatePresence } from 'framer-motion';

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || '';
};

export const AICoachPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>('ai');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Salut ${(state.user?.name || 'Membre').split(' ')[0]} ! Je suis l'IA de VELATRA. Je connais tout sur le club, tes entraînements et nos compléments. Comment puis-je t'aider aujourd'hui ?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const [initError, setInitError] = useState<string | null>(null);

  const coach = state.users.find(u => u.role === 'coach' || u.role === 'owner');
  const coachName = coach ? coach.name : 'Coach Humain';

  useEffect(() => {
    try {
      const rawApiKey = getApiKey();
      // Remove any hidden characters, newlines, or spaces that could cause header errors
      const apiKey = rawApiKey ? rawApiKey.replace(/[^\x20-\x7E]/g, '').trim() : '';
      
      if (!apiKey) {
        setInitError("La clé API Gemini (GEMINI_API_KEY) est manquante ou invalide sur Vercel.");
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Tu es l'assistant IA virtuel de l'application numéro 1 "VELATRA".
Tu t'adresses à l'adhérent nommé ${state.user?.name}.
Son profil : Âge ${state.user?.age}, Poids ${state.user?.weight}kg, Objectifs : ${(state.user?.objectifs || []).join(', ')}.
Informations sur le club : ${JSON.stringify(CLUB_INFO)}.
Coachs du club : ${JSON.stringify(COACHES)}.
Boutique de compléments : ${JSON.stringify(INIT_SUPPLEMENTS.map(s => s.nom))}.
Ton rôle est de conseiller l'adhérent sur ses entraînements, la nutrition, les compléments de la boutique, et de répondre à ses questions sur le club.
Sois motivant, professionnel, empathique et utilise un ton "Application numéro 1" (tutoiement autorisé et encouragé).
Fais des réponses concises et structurées en Markdown.

RÈGLES DE REDIRECTION IMPORTANTES :
1. Si l'adhérent pose une question commerciale complexe (tarifs spécifiques, résiliation, facturation, abonnement complexe), tu dois lui répondre poliment que tu ne peux pas traiter cette demande et le rediriger vers Victor (Conseiller Sportif) au numéro de téléphone : 07 43 10 37 90.
2. Si l'adhérent pose une question sportive trop complexe, médicale, ou nécessitant une analyse approfondie (blessure, douleur, programme très spécifique), tu dois le rediriger vers les coachs sportifs (Thomas, Tristan ou Evan) lors de sa prochaine séance ou via la messagerie de l'application.`;

      chatRef.current = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    } catch (error: any) {
      console.error("Erreur initialisation IA:", error);
      setInitError(error.message || "Erreur inconnue lors de l'initialisation");
    }
  }, [state.user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      if (initError) {
        throw new Error(`Problème d'initialisation : ${initError}`);
      }
      if (!chatRef.current) {
        throw new Error("Le chat n'a pas pu s'initialiser. Vérifiez que la clé API est valide.");
      }

      const response = await chatRef.current.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Désolé, je n'ai pas pu générer de réponse." }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `❌ Erreur technique : ${error.message || "Erreur de connexion"}. Si vous êtes sur Vercel, assurez-vous d'avoir bien redéployé l'application après avoir ajouté la clé.` }]);
    } finally {
      setLoading(false);
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
          <p className="text-zinc-900 text-[10px] uppercase tracking-[3px] font-bold">Échange avec ton coach</p>
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
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 shrink-0 overflow-hidden shadow-sm mt-auto mb-1">
                    {coach?.avatar?.startsWith('http') ? (
                      <img src={coach.avatar} alt={coach.name} className="w-full h-full object-cover" />
                    ) : coach?.avatar ? (
                      <span className="text-xs font-bold text-emerald-500">{coach.avatar}</span>
                    ) : (
                      <BotIcon size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-bl-sm border border-zinc-200/50 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Pose ta question au coach IA..."
                  className="flex-1 bg-white border-zinc-200/50 focus:border-emerald-500 focus:ring-emerald-500/20 shadow-sm rounded-xl min-h-[56px] max-h-[120px]"
                  disabled={loading}
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-emerald-500 text-zinc-900 p-4 rounded-xl hover:bg-emerald-500/90 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0 h-[56px] w-[56px]"
                >
                  <SendIcon size={20} />
                </button>
              </div>
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
