import React, { useState } from 'react';
import { AppState, Prospect } from '../types';
import { db, doc, updateDoc } from '../firebase';
import { Clock, Phone, CheckCircle, X, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/UI';
import { format, isToday, isTomorrow, isYesterday, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  state: AppState;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TasksPage: React.FC<Props> = ({ state, showToast }) => {
  const [filter, setFilter] = useState<'En cours' | 'Archivées'>('En cours');

  const pendingProspects = state.prospects
    .filter(p => filter === 'En cours' ? p.status === 'call_pending' : p.status === 'contacted' && p.nextReminderDate)
    .sort((a, b) => {
      if (!a.nextReminderDate) return 1;
      if (!b.nextReminderDate) return -1;
      return new Date(a.nextReminderDate).getTime() - new Date(b.nextReminderDate).getTime();
    });

  const handleQuickAction = async (prospect: Prospect, action: 'J-1' | 'Jour J' | 'Annuler') => {
    if (!prospect.firebaseUid) return;
    
    try {
      if (action === 'Annuler') {
        await updateDoc(doc(db, "prospects", prospect.firebaseUid), { 
          status: 'contacted',
          nextReminderDate: null
        });
        showToast?.("Relance annulée", "info");
      } else if (action === 'J-1') {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        await updateDoc(doc(db, "prospects", prospect.firebaseUid), { 
          nextReminderDate: nextDate.toISOString()
        });
        showToast?.("Reprogrammé à demain", "success");
      } else if (action === 'Jour J') {
        const nextDate = new Date();
        // Maybe later today
        nextDate.setHours(nextDate.getHours() + 2);
        await updateDoc(doc(db, "prospects", prospect.firebaseUid), { 
          nextReminderDate: nextDate.toISOString()
        });
        showToast?.("Reprogrammé à plus tard aujourd'hui", "success");
      }
    } catch (err) {
      console.error(err);
      showToast?.("Erreur lors de la mise à jour", "error");
    }
  };

  const getDayLabel = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isToday(d)) return "(Jour J)";
    if (isTomorrow(d)) return "(Jour J+1)";
    if (isYesterday(d)) return "(Jour J-1)";
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return `(J${diff})`;
    return `(J+${diff})`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-50 border border-zinc-100 p-6 rounded-3xl">
        <div>
          <h1 className="text-3xl font-display font-black text-zinc-900 tracking-tight">Relances Programmées</h1>
          <p className="text-zinc-500 mt-1 font-medium">Gérez vos appels de suivi pour les prospects en attente</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-2xl border border-zinc-100 flex items-center shadow-sm">
            <button 
              onClick={() => setFilter('En cours')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'En cours' ? 'bg-white shadow-sm border border-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              En cours
            </button>
            <button 
              onClick={() => setFilter('Archivées')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'Archivées' ? 'bg-white shadow-sm border border-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Archivées
            </button>
          </div>
          
          {/* Re-using the prompt UI's orange button */}
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/20">
            <span className="text-lg leading-none">+</span>
            <span>À rappeler avant</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {pendingProspects.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white border border-zinc-100 rounded-3xl"
            >
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-400">Aucune relance {filter.toLowerCase()}</h3>
              <p className="text-zinc-400 font-medium">Vos priorités s'afficheront ici</p>
            </motion.div>
          ) : (
            pendingProspects.map(prospect => (
              <motion.div
                key={prospect.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-red-500/20 rounded-3xl p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(239,68,68,0.08)] transition-all"
              >
                <div>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 tracking-tight leading-tight">
                        {prospect.name || 'Prospect inconnu'}
                        <span className="text-zinc-500 font-medium ml-2">{getDayLabel(prospect.nextReminderDate)}</span>
                      </h3>
                      {prospect.nextReminderDate && (
                        <div className="flex items-center gap-1.5 text-red-500 font-bold text-sm mt-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {format(parseISO(prospect.nextReminderDate), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>

                  {prospect.phone && (
                    <div className="flex items-center gap-2 text-zinc-600 font-medium mb-5">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      {prospect.phone}
                    </div>
                  )}

                  <div className="bg-zinc-50/80 rounded-2xl p-4 mb-6">
                    <p className="text-sm font-medium text-zinc-600 italic leading-relaxed">
                      "{prospect.notesHistory?.[0]?.content?.slice(0, 150) || "Aucune note."}{prospect.notesHistory?.[0]?.content && prospect.notesHistory[0].content.length > 150 ? '...' : ''}"
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleQuickAction(prospect, 'J-1')}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      J-1
                    </button>
                    <button 
                      onClick={() => handleQuickAction(prospect, 'Jour J')}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Jour J
                    </button>
                  </div>
                  <button 
                    onClick={() => handleQuickAction(prospect, 'Annuler')}
                    className="w-full bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

