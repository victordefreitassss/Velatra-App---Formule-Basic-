import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Card, Input } from '../components/UI';
import { SendIcon, BotIcon, UserIcon, MessageCircleIcon } from '../components/Icons';
import { GoogleGenAI } from "@google/genai";
import { CLUB_INFO, COACHES, INIT_SUPPLEMENTS } from '../constants';
import Markdown from 'react-markdown';
import { MessagesPage } from './MessagesPage';

export const AICoachPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>('ai');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Salut ${(state.user?.name || 'Membre').split(' ')[0]} ! Je suis l'IA de VELATRA. Je connais tout sur le club, tes entraînements et nos compléments. Comment puis-je t'aider aujourd'hui ?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const coach = state.users.find(u => u.role === 'coach' || u.role === 'owner');
  const coachName = coach ? coach.name : 'Coach Humain';

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
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

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      // Send previous messages to establish context if needed, but for simplicity we just send the current one
      // If we want full history, we'd need to initialize the chat with history, but `ai.chats.create` doesn't take history directly in this SDK version.
      // We will just send the current message. The model will lose context of previous turns unless we pass them all as a single string or use a different method.
      // Let's format the entire conversation history into the prompt for simplicity and robustness.
      
      const conversationHistory = messages.map(m => `${m.role === 'user' ? 'Adhérent' : 'Assistant'}: ${m.text}`).join('\n\n');
      const prompt = `${conversationHistory}\n\nAdhérent: ${userMsg}\nAssistant:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || "Désolé, je n'ai pas pu générer de réponse." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Oups, une erreur de connexion m'empêche de te répondre pour le moment. Réessaie plus tard !" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 page-transition pb-24 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">Coach <span className="text-velatra-accent">IA</span></h1>
          <p className="text-zinc-900 text-[10px] uppercase tracking-[3px] font-bold">Ton assistant personnel 24/7</p>
        </div>
        <div className="p-4 bg-velatra-accent/10 rounded-2xl text-velatra-accent shadow-inner">
          <BotIcon size={32} />
        </div>
      </div>

      <div className="flex bg-zinc-50 rounded-xl p-1 shrink-0">
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'ai' ? 'bg-velatra-accent text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`} 
          onClick={() => setActiveTab('ai')}
        >
          <BotIcon size={16} /> Bot IA
        </button>
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'human' ? 'bg-velatra-accent text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`} 
          onClick={() => setActiveTab('human')}
        >
          <MessageCircleIcon size={16} /> {coachName}
        </button>
      </div>

      {activeTab === 'ai' ? (
        <Card className="flex-1 flex flex-col bg-white border-zinc-200 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-100 text-zinc-900' : 'bg-velatra-accent text-white shadow-lg shadow-velatra-accent/20'}`}>
                  {msg.role === 'user' ? <UserIcon size={20} /> : <BotIcon size={20} />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-zinc-50 text-zinc-900 rounded-tr-sm' : 'bg-velatra-accent/10 border border-velatra-accent/20 text-zinc-900 rounded-tl-sm'}`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.text}</p>
                  ) : (
                    <div className="text-sm prose prose-p:leading-relaxed prose-pre:bg-zinc-100 prose-a:text-velatra-accent max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-velatra-accent text-white flex items-center justify-center shrink-0 shadow-lg shadow-velatra-accent/20">
                  <BotIcon size={20} />
                </div>
                <div className="bg-velatra-accent/10 border border-velatra-accent/20 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-velatra-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-velatra-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-velatra-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-200 shrink-0">
            <div className="relative flex items-center">
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Pose ta question au Coach IA..."
                className="!bg-white !py-4 pr-16"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 p-2 bg-velatra-accent text-white rounded-xl hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition-all"
              >
                <SendIcon size={18} />
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-zinc-200 p-4">
          <MessagesPage state={state} setState={setState} showToast={showToast} embedded={true} />
        </div>
      )}
    </div>
  );
};
