import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Prospect, ProspectNote, User } from '../types';
import { db, doc, updateDoc, setDoc, deleteDoc, secondaryAuth, createUserWithEmailAndPassword } from '../firebase';
import { Plus, Search, Trash2, Mail, Phone, Clock, CheckCircle, XCircle, UserPlus, Users, X, Calendar, AlertCircle, MessageSquare } from 'lucide-react';
import { format, isToday, isPast, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, Button, Input } from '../components/UI';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COLUMNS = [
  { id: 'lead', title: 'Nouveau Lead', color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
  { id: 'contacted', title: 'Contacté', color: 'bg-yellow-50 text-yellow-600 border-yellow-200', dot: 'bg-yellow-500' },
  { id: 'call_pending', title: 'À relancer', color: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' },
  { id: 'trial', title: 'Séance d\'essai', color: 'bg-purple-50 text-purple-600 border-purple-200', dot: 'bg-purple-500' },
  { id: 'won', title: 'Abonné', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'lost', title: 'Perdu', color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' }
];

export const ProspectFlowPage: React.FC<Props> = ({ state, setState, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  const [newProspect, setNewProspect] = useState({ name: '', email: '', phone: '', status: 'lead', notes: '' });
  
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [newNote, setNewNote] = useState('');
  
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [convertData, setConvertData] = useState({ email: '', password: '' });
  
  const [schedulingReminderProspect, setSchedulingReminderProspect] = useState<Prospect | null>(null);
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' });

  const [schedulingTrialProspect, setSchedulingTrialProspect] = useState<Prospect | null>(null);
  const [trialForm, setTrialForm] = useState({ date: '', startTime: '', endTime: '' });

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // --- Helpers ---
  const handleDragStart = (e: React.DragEvent, prospectId: number) => {
    e.dataTransfer.setData('prospectId', prospectId.toString());
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const prospectId = parseInt(e.dataTransfer.getData('prospectId'));
    if (!isNaN(prospectId)) {
      handleStatusChange(prospectId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleStatusChange = async (prospectId: number, newStatus: string) => {
    const prospect = state.prospects.find(p => p.id === prospectId);
    if (!prospect || !prospect.firebaseUid) return;

    if (newStatus === 'won' && state.user?.clubId) {
      setConvertingProspect(prospect);
      setConvertData({ email: prospect.email || '', password: '' });
      return;
    } 

    if (newStatus === 'call_pending') {
      setSchedulingReminderProspect(prospect);
      setReminderForm({ date: format(new Date(), 'yyyy-MM-dd'), time: '10:00' });
      return;
    }

    if (newStatus === 'trial') {
      setSchedulingTrialProspect(prospect);
      setTrialForm({ date: format(new Date(), 'yyyy-MM-dd'), startTime: '10:00', endTime: '11:00' });
      return;
    }

    try {
      await updateDoc(doc(db, "prospects", prospect.firebaseUid), { status: newStatus as any });
      // Mettre à jour l'état local dans le cas du sélectionné
      if (selectedProspect && selectedProspect.id === prospectId) {
         setSelectedProspect({ ...selectedProspect, status: newStatus as any });
      }
    } catch (err) {
      console.error("Error updating prospect status", err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  // --- Add Prospect ---
  const handleAddProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.user?.clubId) return;

    const id = Date.now();
    const prospect: Prospect = {
      id,
      clubId: state.user.clubId,
      name: newProspect.name,
      email: newProspect.email,
      phone: newProspect.phone,
      date: new Date().toISOString(),
      status: newProspect.status as any,
      answers: {},
      notesHistory: newProspect.notes ? [{ id: Date.now().toString(), date: new Date().toISOString(), content: newProspect.notes }] : [],
    };

    try {
      await setDoc(doc(db, "prospects", id.toString()), prospect);
      setIsAdding(false);
      setNewProspect({ name: '', email: '', phone: '', status: 'lead', notes: '' });
      showToast("Prospect ajouté avec succès", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'ajout", "error");
    }
  };

  // --- Add Note / Update Reminder ---
  const handleAddNote = async (prospect: Prospect) => {
    if (!newNote.trim() || !prospect.firebaseUid) return;
    
    const note: ProspectNote = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: newNote.trim()
    };
    
    const updatedHistory = [note, ...(prospect.notesHistory || [])];
    
    try {
      await updateDoc(doc(db, "prospects", prospect.firebaseUid), {
        notesHistory: updatedHistory
      });
      setNewNote('');
    } catch(err) {
      console.error(err);
      showToast("Erreur lors de l'ajout de la note", "error");
    }
  };

  const handleUpdateReminder = async (prospect: Prospect, dateStr: string) => {
    if (!prospect.firebaseUid) return;
    try {
      await updateDoc(doc(db, "prospects", prospect.firebaseUid), {
        nextReminderDate: dateStr
      });
      showToast("Date de relance mise à jour", "success");
    } catch(err) {
      console.error(err);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  // --- Delete ---
  const confirmDelete = async () => {
    if (!isDeleting) return;
    const prospect = state.prospects.find(p => p.id === isDeleting);
    if (!prospect || !prospect.firebaseUid) return;

    try {
      await deleteDoc(doc(db, "prospects", prospect.firebaseUid));
      showToast("Prospect supprimé", "success");
      setSelectedProspect(null);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la suppression", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  // --- Conversion ---
  const confirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingProspect || !convertData.email || !convertData.password || !convertingProspect.firebaseUid) return;

    showToast("Création du membre...", "info");
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, convertData.email, convertData.password);
      const firebaseUid = userCredential.user.uid;

      const newUser: User = {
        id: Date.now(),
        clubId: state.user!.clubId,
        code: "",
        pwd: convertData.password, // purely for legacy display if needed
        name: convertingProspect.name || 'Sans nom',
        email: convertData.email,
        phone: convertingProspect.phone || '',
        role: 'member',
        avatar: convertingProspect.name ? convertingProspect.name.substring(0, 2).toUpperCase() : 'U',
        gender: 'M',
        age: 30,
        weight: 70,
        height: 175,
        objectifs: [],
        notes: "Converti depuis Prospect. " + (convertingProspect.notesHistory?.[0]?.content || ''),
        createdAt: new Date().toISOString(),
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: firebaseUid
      };
      
      await setDoc(doc(db, "users", firebaseUid), newUser);
      await updateDoc(doc(db, "prospects", convertingProspect.firebaseUid), { status: 'won' });
      
      setConvertingProspect(null);
      if (selectedProspect?.id === convertingProspect.id) setSelectedProspect(null);
      showToast(`Membre créé avec succès !`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur lors de la conversion", "error");
    }
  };

  const confirmReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingReminderProspect?.firebaseUid) return;
    try {
      const isoDate = new Date(`${reminderForm.date}T${reminderForm.time}:00`).toISOString();
      await updateDoc(doc(db, "prospects", schedulingReminderProspect.firebaseUid), { 
          status: 'call_pending',
          nextReminderDate: isoDate
      });
      setSchedulingReminderProspect(null);
      showToast("Prospect déplacé et relance planifiée", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la planification", "error");
    }
  };

  const confirmTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTrialProspect?.firebaseUid || !state.user?.clubId) return;
    try {
      const startTime = new Date(`${trialForm.date}T${trialForm.startTime}:00`).toISOString();
      const endTime = new Date(`${trialForm.date}T${trialForm.endTime}:00`).toISOString();
      const bookingId = Date.now().toString();
      
      const booking = {
          id: bookingId,
          clubId: state.user.clubId,
          coachId: state.user.firebaseUid,
          prospectId: schedulingTrialProspect.id,
          startTime,
          endTime,
          status: 'confirmed',
          type: 'trial'
      };
      
      await setDoc(doc(db, "bookings", bookingId), booking);
      await updateDoc(doc(db, "prospects", schedulingTrialProspect.firebaseUid), { 
          status: 'trial'
      });
      setSchedulingTrialProspect(null);
      showToast("Séance d'essai planifiée sur le planning !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la réservation de la séance d'essai", "error");
    }
  };

  // --- Data aggregation ---
  const today = new Date();
  const prospectsToRemindToday = state.prospects.filter(p => {
    if (p.status === 'won' || p.status === 'lost') return false;
    if (!p.nextReminderDate) return false;
    const reminderDate = parseISO(p.nextReminderDate);
    // show if reminder is today or in the past
    return isToday(reminderDate) || (!isToday(reminderDate) && isPast(reminderDate));
  });

  const totalClosed = state.prospects.filter(p => p.status === 'won' || p.status === 'lost').length;
  const totalWon = state.prospects.filter(p => p.status === 'won').length;
  const winRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0;

  const filteredProspects = state.prospects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Utiliser la donnée state persistente pour le tiroir ouvert
  const activeSelectedProspect = selectedProspect ? state.prospects.find(p => p.id === selectedProspect.id) : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 page-transition h-[calc(100vh-80px)] xl:h-screen w-full flex flex-col">
      {/* HEADER & DASHBOARD */}
      <div className="space-y-6 shrink-0 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900">Pipeline Commercial</h1>
            <p className="text-zinc-500 mt-1">Gérez votre pipeline et convertissez vos leads plus facilement.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                style={{ height: '40px' }}
              />
            </div>
            {/* Raccourci vers les Relances Programmées */}
            <Button 
              onClick={() => setState(s => ({ ...s, page: 'crm_tasks' }))} 
              className="bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200 whitespace-nowrap shadow-sm" 
              style={{ height: '40px' }}
              variant="secondary"
            >
              <Clock className="w-4 h-4 mr-2" />
              Mes Relances
            </Button>
            <Button onClick={() => setIsAdding(true)} className="whitespace-nowrap" style={{ height: '40px' }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Lead
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border border-blue-100 bg-blue-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Objectif du jour</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">{prospectsToRemindToday.length}</span>
                  <span className="text-sm font-medium text-zinc-500">relances à faire</span>
                </div>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border border-emerald-100 bg-emerald-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Taux de conversion</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">{winRate}%</span>
                  <span className="text-sm font-medium text-zinc-500">dossiers gagnés</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lead Total Actif</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">
                    {state.prospects.filter(p => !['won', 'lost'].includes(p.status)).length}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">en cours</span>
                </div>
              </div>
              <div className="p-2 bg-zinc-200 text-zinc-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 mt-0 overflow-hidden min-h-[500px] max-w-[1600px] w-full mx-auto w-full pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4 h-full">
          {COLUMNS.map(col => {
            const colProspects = filteredProspects.filter(p => p.status === col.id);
            return (
              <div 
                key={col.id} 
                className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-2xl h-full overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-zinc-200/50 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 sticky top-0`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="font-bold text-[13px] text-zinc-900 leading-none">{col.title}</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-white border border-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-full shadow-sm">
                    {colProspects.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                  {colProspects.map(prospect => (
                    <div
                      key={prospect.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, prospect.id)}
                      onClick={() => setSelectedProspect(prospect)}
                      className="bg-white border text-left border-zinc-200 p-2.5 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group active:cursor-grabbing"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-[13px] text-zinc-900 truncate pr-2 leading-tight">{prospect.name}</span>
                      </div>
                      
                      {prospect.email && (
                        <div className="flex items-center gap-1.5 max-w-full text-[10px] text-zinc-500 mb-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prospect.email}</span>
                        </div>
                      )}
                      
                      {prospect.phone && (
                        <div className="flex items-center gap-1.5 max-w-full text-[10px] text-zinc-500 mb-2">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prospect.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                        {prospect.nextReminderDate ? (
                          <div className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            isToday(parseISO(prospect.nextReminderDate)) ? 'bg-orange-100 text-orange-700' :
                            isPast(parseISO(prospect.nextReminderDate)) ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {format(parseISO(prospect.nextReminderDate), 'dd MMM', { locale: fr })}
                          </div>
                        ) : (
                          <div className="text-[9px] text-zinc-400">Pas de relance</div>
                        )}

                        {prospect.notesHistory && prospect.notesHistory.length > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded-md">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            {prospect.notesHistory.length}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {colProspects.length === 0 && (
                    <div className="p-3 border-2 border-dashed border-zinc-200 rounded-xl text-center text-[10px] text-zinc-400">
                      Glissez ici
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PROSPECT DETAILS DRAWER/MODAL */}
      {activeSelectedProspect && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-zinc-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{activeSelectedProspect.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    COLUMNS.find(c => c.id === activeSelectedProspect.status)?.color
                  }`}>
                    {COLUMNS.find(c => c.id === activeSelectedProspect.status)?.title || 'Lead'}
                  </span>
                  <span className="text-xs text-zinc-500">Ajouté le {format(parseISO(activeSelectedProspect.date), 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <button onClick={() => setSelectedProspect(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
              
              {/* Contact Info */}
              <section className="space-y-3">
                <h3 className="text-sm border-b border-zinc-100 pb-2 font-bold text-zinc-900 uppercase tracking-wider">Coordonnées</h3>
                <div className="space-y-2">
                  {activeSelectedProspect.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <a href={`mailto:${activeSelectedProspect.email}`} className="text-sm font-medium hover:text-emerald-600 transition-colors">
                        {activeSelectedProspect.email}
                      </a>
                    </div>
                  )}
                  {activeSelectedProspect.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <a href={`tel:${activeSelectedProspect.phone}`} className="text-sm font-medium hover:text-emerald-600 transition-colors">
                        {activeSelectedProspect.phone}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* CRM Actions */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Suivi CRM</h3>
                </div>
                
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Date de relance prévue</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date" 
                        value={activeSelectedProspect.nextReminderDate ? activeSelectedProspect.nextReminderDate.split('T')[0] : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateReminder(activeSelectedProspect, val ? new Date(val).toISOString() : '');
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200">
                    <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Ajouter une note</label>
                    <div className="flex gap-2">
                      <Input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Ex: Ne répond pas, rappel demain..."
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddNote(activeSelectedProspect)
                        }}
                      />
                      <Button onClick={() => handleAddNote(activeSelectedProspect)}>
                        Noter
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes History */}
                <div className="space-y-3 mt-4">
                  {activeSelectedProspect.notesHistory?.map(note => (
                    <div key={note.id} className="bg-white border border-zinc-200 p-3 rounded-xl relative">
                      <div className="text-[10px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(note.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                  {(!activeSelectedProspect.notesHistory || activeSelectedProspect.notesHistory.length === 0) && (
                    <p className="text-xs text-zinc-400 italic text-center py-4">Aucune note d'historique.</p>
                  )}
                </div>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-100 bg-white grid grid-cols-2 gap-2 shrink-0">
              {activeSelectedProspect.status !== 'won' ? (
                <Button 
                  variant="primary"
                  onClick={() => {
                    handleStatusChange(activeSelectedProspect.id, 'won');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-none"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Gagné !
                </Button>
              ) : (
                <div className="flex items-center justify-center text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl">
                  Client Abonné
                </div>
              )}
              <Button 
                variant="secondary"
                onClick={() => setIsDeleting(activeSelectedProspect.id)}
                className="w-full text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border-none shadow-none"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>

          </div>
        </div>
      , document.body)}

      {/* NEW PROSPECT MODAL */}
      {isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleAddProspect} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Ajouter un Prospect</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Nom complet *</label>
                <Input required value={newProspect.name} onChange={e => setNewProspect({...newProspect, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Email *</label>
                <Input required type="email" value={newProspect.email} onChange={e => setNewProspect({...newProspect, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Téléphone</label>
                <Input type="tel" value={newProspect.phone} onChange={e => setNewProspect({...newProspect, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Statut initial</label>
                <select 
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm font-medium h-[40px] focus:outline-none focus:border-emerald-500"
                  value={newProspect.status}
                  onChange={e => setNewProspect({...newProspect, status: e.target.value})}
                >
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Note initiale (optionnelle)</label>
                <textarea 
                  className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 min-h-[80px]"
                  value={newProspect.notes}
                  onChange={e => setNewProspect({...newProspect, notes: e.target.value})}
                  placeholder="Contexte du premier contact..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>Annuler</Button>
              <Button type="submit" variant="primary">Créer le prospect</Button>
            </div>
          </form>
        </div>
      , document.body)}

      {/* CONVERSION MODAL */}
      {convertingProspect && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <form onSubmit={confirmConversion} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Deal Gagné ! 🎉</h2>
            <p className="text-zinc-500 mb-6 text-sm">
              Convertissons <b>{convertingProspect.name}</b> en membre officiel. Définissez son mot de passe initial.
            </p>
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Adresse Email</label>
                <Input value={convertData.email} onChange={e => setConvertData({...convertData, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Mot de passe temporaire</label>
                <Input type="password" value={convertData.password} onChange={e => setConvertData({...convertData, password: e.target.value})} required minLength={6} placeholder="Ex: Velatra2026" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => {
                setConvertingProspect(null);
                if(selectedProspect?.id === convertingProspect.id) setSelectedProspect(null);
              }}>Plus tard</Button>
              <Button type="submit" variant="primary" className="bg-emerald-500 hover:bg-emerald-600">Créer le Membre</Button>
            </div>
          </form>
        </div>
      , document.body)}

      {/* REMINDER MODAL */}
      {schedulingReminderProspect && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <form onSubmit={confirmReminder} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Planifier la relance</h2>
              <button type="button" onClick={() => setSchedulingReminderProspect(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Rappeler <b>{schedulingReminderProspect.name}</b>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Date</label>
                <Input type="date" value={reminderForm.date} onChange={e => setReminderForm({...reminderForm, date: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Heure</label>
                <Input type="time" value={reminderForm.time} onChange={e => setReminderForm({...reminderForm, time: e.target.value})} required />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setSchedulingReminderProspect(null)}>Annuler</Button>
              <Button type="submit" variant="primary">Valider</Button>
            </div>
          </form>
        </div>
      , document.body)}

      {/* TRIAL MODAL */}
      {schedulingTrialProspect && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <form onSubmit={confirmTrial} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Réserver la Séance d'essai</h2>
              <button type="button" onClick={() => setSchedulingTrialProspect(null)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Planifier pour <b>{schedulingTrialProspect.name}</b> (Ajoute un créneau au planning)
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Date</label>
                <Input type="date" value={trialForm.date} onChange={e => setTrialForm({...trialForm, date: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Début</label>
                  <Input type="time" value={trialForm.startTime} onChange={e => setTrialForm({...trialForm, startTime: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Fin</label>
                  <Input type="time" value={trialForm.endTime} onChange={e => setTrialForm({...trialForm, endTime: e.target.value})} required />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setSchedulingTrialProspect(null)}>Annuler</Button>
              <Button type="submit" variant="primary" className="bg-orange-500 hover:bg-orange-600">Réserver</Button>
            </div>
          </form>
        </div>
      , document.body)}

    </div>
  );
};
