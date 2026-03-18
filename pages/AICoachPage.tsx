import React, { useState, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Card, Input } from '../components/UI';
import { SendIcon, BotIcon, UserIcon, MessageCircleIcon } from '../components/Icons';
import { GoogleGenAI } from "@google/genai";
import { CLUB_INFO, COACHES, INIT_SUPPLEMENTS } from '../constants';
import Markdown from 'react-markdown';
import { MessagesPage } from './MessagesPage';

export const AICoachPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'human'>('human');
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
      const rawApiKey = process.env.GEMINI_API_KEY as string;
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
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
          temperature: 0.7,
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

  return (
    <div className="space-y-4 page-transition pb-24 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between px-1 shrink-0">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight leading-none mb-2 text-zinc-900">Discussions</h1>
          <p className="text-zinc-900 text-[10px] uppercase tracking-[3px] font-bold">Échange avec ton coach</p>
        </div>
        <div className="p-4 bg-velatra-accent/10 rounded-2xl text-velatra-accent shadow-inner">
          <MessageCircleIcon size={32} />
        </div>
      </div>

      <div className="flex bg-zinc-50 rounded-xl p-1 shrink-0">
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'human' ? 'bg-velatra-accent text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`} 
          onClick={() => setActiveTab('human')}
        >
          <MessageCircleIcon size={16} /> {coachName}
        </button>
        <button 
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'ai' ? 'bg-velatra-accent text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`} 
          onClick={() => setActiveTab('ai')}
        >
          <BotIcon size={16} /> Coach IA
        </button>
      </div>

      {activeTab === 'ai' ? (
        <Card className="flex-1 flex flex-col items-center justify-center bg-white border-zinc-200 p-8 text-center">
          <div className="w-20 h-20 bg-velatra-accent/10 rounded-full flex items-center justify-center text-velatra-accent mb-6">
            <BotIcon size={40} />
          </div>
          <h2 className="text-2xl font-display font-bold text-zinc-900 mb-2">Coach IA en préparation</h2>
          <p className="text-zinc-500 max-w-md">
            Ton assistant personnel virtuel est en cours d'entraînement. Il sera disponible dans la prochaine mise à jour (MAJ) de l'application !
          </p>
        </Card>
      ) : (
        <div className="flex-1 overflow-hidden bg-white rounded-3xl border border-zinc-200 p-4">
          <MessagesPage state={state} setState={setState} showToast={showToast} embedded={true} />
        </div>
      )}
    </div>
  );
};
