import { useNavigate } from 'react-router-dom';
import { createOnboardingLocationState, createClient360LocationState } from '../components/dashboardNavigation';
import { SalesSurface, ProspectSalesDetail, salesRequest } from '../components/SalesSurface';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Prospect, ProspectNote } from '../types';
import { db, doc, deleteDoc, auth, sendPasswordResetEmail, apiFetch } from '../firebase';
import { getMemberCreationCoachOptions } from '../components/memberAccess';
import { normalizeProspectEmail, probableProspectDuplicate, prospectActivity, prospectPriority, prospectStage } from '../components/prospectCrm';
import { runTransaction } from 'firebase/firestore';
import { parisLocalInstant } from '../components/planningSlots';
import { Plus, Search, Mail, Phone, Clock, CheckCircle, Users, X, AlertCircle, MessageSquare } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, Button, Input } from '../components/UI';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COLUMNS = [
  { id: 'lead', title: 'Nouveau', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-zinc-500' },
  { id: 'contacted', title: 'Contacté', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-slate-600' },
  { id: 'call_pending', title: 'À relancer', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-amber-700' },
  { id: 'trial', title: 'Essai', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-emerald-700' },
  { id: 'won', title: 'Gagné', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-green-800' },
  { id: 'lost', title: 'Perdu', color: 'bg-zinc-100 text-zinc-800 border-zinc-200', dot: 'bg-red-700' }
];

export const ProspectFlowPage: React.FC<Props> = ({ state, setState, showToast }) => {
  const [salesTab, setSalesTab] = useState<'pipeline' | 'trials' | 'performance'>('pipeline');
  const [createRequestId, setCreateRequestId] = useState(() => crypto.randomUUID());
  const saveStage = async (prospect: Prospect, body: unknown) => {
    const result = await salesRequest(`/api/sales/prospects/${encodeURIComponent(prospect.firebaseUid!)}/stage`, body);
    setState(prev => ({ ...prev, prospects: prev.prospects.map(p => p.firebaseUid === prospect.firebaseUid ? result.prospect : p) }));
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileStage, setMobileStage] = useState<string>('all');
  
  // Modals state
  const [isAdding, setIsAdding] = useState(false);
  React.useEffect(() => {
    if (state.pendingUiAction !== 'add-prospect') return;
    setIsAdding(true);
    setState((previous: AppState) => ({ ...previous, pendingUiAction: undefined }));
  }, [state.pendingUiAction]);
  useEffect(() => {
    if (!state.pendingProspectUid) return;
    const prospect = state.prospects.find(item => item.firebaseUid === state.pendingProspectUid);
    if (prospect) { setSalesTab('pipeline'); setSelectedProspect(prospect); }
    setState(previous => ({ ...previous, pendingProspectUid: undefined }));
  }, [state.pendingProspectUid, state.prospects]);
  const [newProspect, setNewProspect] = useState({ name: '', email: '', phone: '', source: '', notes: '' });
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [newNote, setNewNote] = useState('');
  
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [convertData, setConvertData] = useState({ email: '', coachUid: '' });
  const [isConverting, setIsConverting] = useState(false);
  const [accessEmailFailed, setAccessEmailFailed] = useState(false);
  
  const [schedulingReminderProspect, setSchedulingReminderProspect] = useState<Prospect | null>(null);
  const [reminderForm, setReminderForm] = useState({ date: '', time: '' });

  const [schedulingTrialProspect, setSchedulingTrialProspect] = useState<Prospect | null>(null);
  const [trialForm, setTrialForm] = useState({ date: '', startTime: '', endTime: '' });
  const [trialCoachUid, setTrialCoachUid] = useState('');

  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [lostProspect, setLostProspect] = useState<Prospect | null>(null);
  const [lostReason, setLostReason] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedProspect) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[data-crm-modal="true"]') || (event.target as HTMLElement)?.closest('[role="alertdialog"]')) return;
      if (event.key === 'Escape') setSelectedProspect(null);
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); requestAnimationFrame(() => previousFocus?.focus()); };
  }, [selectedProspect?.id]);
  const modalOpen = isAdding || !!convertingProspect || !!schedulingReminderProspect || !!schedulingTrialProspect || !!lostProspect || isDeleting !== null;
  useEffect(() => {
    if (!modalOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const modal = [...document.querySelectorAll<HTMLElement>('[data-crm-modal="true"]')].at(-1);
    requestAnimationFrame(() => modal?.querySelector<HTMLElement>('input, textarea, select, button')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (!modal) return;
      if (event.key === 'Escape') {
        if (isDeleting !== null) setIsDeleting(null);
        else if (lostProspect) setLostProspect(null);
        else if (convertingProspect && !isConverting) setConvertingProspect(null);
        else if (schedulingReminderProspect) setSchedulingReminderProspect(null);
        else if (schedulingTrialProspect) setSchedulingTrialProspect(null);
        else setIsAdding(false);
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])'));
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); requestAnimationFrame(() => previousFocus?.focus()); };
  }, [modalOpen, isAdding, convertingProspect, schedulingReminderProspect, schedulingTrialProspect, lostProspect, isDeleting, isConverting]);
  const duplicate = probableProspectDuplicate(state.prospects, newProspect.email, newProspect.phone);
  const coachOptions = getMemberCreationCoachOptions(state.currentClub, state.user, state.users);

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
    if (prospect.convertedMemberUid || prospect.status === 'won') { showToast('Ce dossier gagné est à consulter dans les adhérents.', 'info'); return; }

    if (newStatus === 'won' && state.user?.clubId) {
      setConvertingProspect(prospect);
      setConvertData({ email: prospect.email || '', coachUid: '' });
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

    if (newStatus === 'lost') { setLostProspect(prospect); setLostReason(''); return; }

    try {
      await saveStage(prospect, { status: newStatus });
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
    if (duplicate && !allowDuplicate) return;

    try {
      const result = await salesRequest('/api/sales/prospects', { ...newProspect, requestId: createRequestId });
      setState(prev => ({ ...prev, prospects: prev.prospects.some(p => p.firebaseUid === result.prospect.firebaseUid) ? prev.prospects : [...prev.prospects, result.prospect] }));
      setCreateRequestId(crypto.randomUUID());
      setIsAdding(false);
      setNewProspect({ name: '', email: '', phone: '', source: '', notes: '' });
      setAllowDuplicate(false);
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
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      content: newNote.trim().slice(0, 2000),
      ...(auth.currentUser?.uid ? { authorUid: auth.currentUser.uid } : {}),
      ...(state.user?.name ? { authorName: state.user.name } : {})
    };
    
    try {
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'prospects', prospect.firebaseUid!);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error('Prospect introuvable.');
        transaction.update(reference, {
          notesHistory: [note, ...(snapshot.data().notesHistory || [])].slice(0, 100),
          activityHistory: prospectActivity(snapshot.data().activityHistory, 'Note ajoutée', auth.currentUser?.uid)
        });
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
      await saveStage(prospect, { status: dateStr ? 'call_pending' : 'contacted', nextReminderDate: dateStr || null });
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
    if (prospect.convertedMemberUid || prospect.status === 'trial' || prospect.status === 'won' || prospect.status === 'lost' || prospect.notesHistory?.length || prospect.activityHistory?.length) {
      showToast('Ce prospect possède un historique à conserver. Passez-le en Perdu si nécessaire.', 'info');
      setIsDeleting(null);
      return;
    }

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

  const confirmLost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lostProspect?.firebaseUid) return;
    try {
      await saveStage(lostProspect, { status: 'lost', lostReason: lostReason.trim().slice(0, 300) });
      setLostProspect(null);
      showToast('Prospect classé perdu.', 'success');
    } catch { showToast('Impossible de classer ce prospect.', 'error'); }
  };

  const navigate = useNavigate();
  const [convertedClient, setConvertedClient] = useState<{ uid: string; memberId: number } | null>(null);
  const openConverted = (onboarding: boolean) => { if (!convertedClient) return; setState((prev: AppState) => ({ ...prev, page: onboarding ? 'onboarding' : 'users', selectedMember: null })); navigate('/dashboard', { state: onboarding ? createOnboardingLocationState(convertedClient.memberId) : createClient360LocationState(convertedClient.memberId) }); };
  // --- Conversion ---
  const confirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingProspect || !convertData.email || !convertingProspect.firebaseUid || isConverting) return;
    setIsConverting(true);
    try {
      const response = await apiFetch(`/api/prospects/${encodeURIComponent(convertingProspect.firebaseUid)}/convert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: convertData.email, ...(convertData.coachUid ? { coachUid: convertData.coachUid } : {}) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'La conversion a échoué.');
      setConvertingProspect(null);
      setConvertedClient({ uid: result.uid, memberId: result.memberId });
      try {
        if (!result.alreadyConverted) await sendPasswordResetEmail(auth, normalizeProspectEmail(convertData.email));
        setAccessEmailFailed(false);
        showToast(result.alreadyConverted ? 'Adhérent déjà créé : ouvrez son dossier.' : 'Adhérent créé et accès envoyé.', 'success');
      } catch {
        setAccessEmailFailed(true);
        showToast("Adhérent créé. L'email d'accès n'a pas pu être envoyé.", 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Erreur lors de la conversion", "error");
    } finally {
      setIsConverting(false);
    }
  };

  const confirmReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingReminderProspect?.firebaseUid) return;
    try {
      const instant = parisLocalInstant(reminderForm.date, reminderForm.time);
      if (!instant) throw new Error('Date de relance invalide.');
      const isoDate = instant.toISOString();
      await saveStage(schedulingReminderProspect, { status: 'call_pending', nextReminderDate: isoDate });
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
      const start = parisLocalInstant(trialForm.date, trialForm.startTime);
      const end = parisLocalInstant(trialForm.date, trialForm.endTime);
      if (!start || !end) throw new Error('Horaire invalide en heure de Paris.');
      const response = await apiFetch('/api/bookings/trial', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectUid: schedulingTrialProspect.firebaseUid, ...(trialCoachUid ? { coachUid: trialCoachUid } : {}), startTime: start.toISOString(), endTime: end.toISOString() }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Impossible de planifier cette séance.');
      setSchedulingTrialProspect(null);
      showToast("Séance d'essai planifiée sur le planning !", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "Erreur lors de la réservation de la séance d'essai", "error");
    }
  };

  const resendAccess = async (prospect: Prospect) => {
    const member = state.users.find(user => user.firebaseUid === prospect.convertedMemberUid);
    if (!member?.email) { showToast('Adresse du membre indisponible. Ouvrez son dossier.', 'info'); return; }
    try { await sendPasswordResetEmail(auth, member.email); setAccessEmailFailed(false); showToast('Accès renvoyé.', 'success'); }
    catch { showToast("L'email d'accès n'a pas pu être envoyé.", 'error'); }
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


  const search = searchTerm.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filteredProspects = state.prospects.filter(p =>
    [p.name, p.email, p.phone, p.source].some(value => value?.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(search))
  );
  const mobileProspects = filteredProspects.filter(prospect => mobileStage === 'all' || prospectStage(prospect) === mobileStage)
    .sort((a, b) => prospectPriority(a) - prospectPriority(b));
  const trialForProspect = (prospect: Prospect) => state.bookings.filter(booking => booking.type === 'trial' && (booking.prospectUid ? booking.prospectUid === prospect.firebaseUid : Number(booking.prospectId) === Number(prospect.id)) && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= Date.now())
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const openLinkedMember = (prospect: Prospect) => {
    const member = state.users.find(user => user.firebaseUid === prospect.convertedMemberUid || user.id === prospect.convertedMemberId);
    if (!member) { showToast('Adhérent créé. Rechargez la liste pour ouvrir son dossier.', 'info'); return; }
    setSelectedProspect(null);
    setState(previous => ({ ...previous, page: 'users', selectedMember: member }));
  };
  
  // Utiliser la donnée state persistente pour le tiroir ouvert
  const activeSelectedProspect = selectedProspect ? state.prospects.find(p => p.firebaseUid === selectedProspect.firebaseUid) : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 page-transition xl:min-h-screen w-full flex flex-col">
      {convertedClient && <div role="status" data-sales-onboarding className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2"><p>Client créé · son onboarding est disponible.</p><div className="flex flex-wrap gap-2"><Button onClick={() => openConverted(true)}>Voir l’onboarding</Button><Button variant="secondary" onClick={() => openConverted(false)}>Voir le client</Button></div></div>}
      <nav aria-label="Vues CRM" className="flex flex-wrap gap-2">{([['pipeline', 'Pipeline'], ['trials', 'Essais'], ['performance', 'Performance']] as const).map(([tab, label]) => <button key={tab} type="button" aria-pressed={salesTab === tab} className="min-h-[44px] rounded-xl border border-zinc-300 px-4 py-2 font-semibold" onClick={() => setSalesTab(tab)}>{label}</button>)}</nav>
      {salesTab !== 'pipeline' && <SalesSurface tab={salesTab} state={state} setState={setState} onProspect={uid => { setSalesTab('pipeline'); const p = state.prospects.find(p => p.firebaseUid === uid); if (p) setSelectedProspect(p); }} />}
      <div hidden={salesTab !== 'pipeline'}>
      {/* HEADER & DASHBOARD */}
      <div className="space-y-6 shrink-0 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-zinc-900">Pipeline Commercial</h1>
            <p className="text-zinc-500 mt-1">Gérez votre pipeline et convertissez vos leads plus facilement.</p>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full lg:w-64 lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Nom, email ou téléphone…"
                aria-label="Rechercher un prospect"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-700 transition-colors"
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
              Ajouter un prospect
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border border-zinc-200 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Objectif du jour</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-black text-zinc-900">{prospectsToRemindToday.length}</span>
                  <span className="text-sm font-medium text-zinc-500">relances à faire</span>
                </div>
              </div>
              <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4 border border-zinc-200 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Conversions observées à ce jour</p>
                <button type="button" aria-label="Consulter les conversions dans Performance" onClick={() => setSalesTab('performance')} className="mt-2 min-h-[44px] text-sm font-semibold text-emerald-900 underline underline-offset-4">Voir Performance</button>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-900 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-zinc-200 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Prospects actifs</p>
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

      {/* MOBILE PIPELINE: compact list, never a miniature Kanban */}
      <section className="min-[1440px]:hidden max-w-[1600px] w-full mx-auto space-y-3" aria-label="Prospects par étape">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer les prospects par étape">
          {[{ id: 'all', title: 'Tous' }, ...COLUMNS.map(({ id, title }) => ({ id, title }))].map(stage => {
            const count = stage.id === 'all' ? filteredProspects.length : filteredProspects.filter(prospect => prospectStage(prospect) === stage.id).length;
            return <button key={stage.id} type="button" aria-pressed={mobileStage === stage.id} onClick={() => setMobileStage(stage.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${mobileStage === stage.id ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}>{stage.title}<span className={`ml-2 ${mobileStage === stage.id ? 'text-emerald-100' : 'text-zinc-500'}`}>{count}</span></button>;
          })}
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {mobileProspects.length === 0 ? <div className="p-8 text-center text-sm text-zinc-600">Aucun prospect dans cette étape.</div> : mobileProspects.map(prospect => {
            const stage = COLUMNS.find(column => column.id === prospectStage(prospect));
            const reminderDate = prospect.nextReminderDate ? parseISO(prospect.nextReminderDate) : null;
            return <button key={prospect.id} type="button" onClick={() => setSelectedProspect(prospect)} className="flex min-h-[76px] w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">{prospect.name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-zinc-900">{prospect.name}</span>
                <span className="mt-0.5 block truncate text-sm text-zinc-600">{prospect.email || prospect.phone || 'Coordonnées manquantes'}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"><span className={`h-1.5 w-1.5 rounded-full ${stage?.dot || 'bg-zinc-500'}`} />{stage?.title || 'Sans étape'}</span>
                {reminderDate && <span className={`text-xs font-medium ${isPast(reminderDate) && !isToday(reminderDate) ? 'text-red-700' : isToday(reminderDate) ? 'text-amber-800' : 'text-zinc-600'}`}>{isToday(reminderDate) ? 'À relancer aujourd’hui' : format(reminderDate, 'd MMM', { locale: fr })}</span>}
              </span>
            </button>;
          })}
        </div>
      </section>

      {/* DESKTOP KANBAN */}
      <div className="hidden min-[1440px]:flex flex-1 mt-0 overflow-hidden min-h-[500px] max-w-[1920px] w-full mx-auto pb-4">
        <div className="grid w-full grid-cols-6 gap-3 lg:gap-4 xl:h-full">
          {COLUMNS.map(col => {
            const colProspects = filteredProspects.filter(p => prospectStage(p) === col.id);
            return (
              <div 
                key={col.id} 
                className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-2xl min-h-[180px] xl:h-full overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className={`p-3 border-b border-zinc-200/50 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10 sticky top-0`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h3 className="font-bold text-[13px] text-zinc-900 leading-none">{col.title}</h3>
                  </div>
                  <span className="text-[12px] font-bold bg-white border border-zinc-200 text-zinc-500 px-1.5 py-0.5 rounded-full shadow-sm">
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
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProspect(prospect); } }}
                      role="button" tabIndex={0} aria-label={`Ouvrir ${prospect.name}`}
                      className="bg-white border text-left border-zinc-200 p-2.5 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-[13px] text-zinc-900 truncate pr-2 leading-tight">{prospect.name}</span>
                      </div>
                      
                      {prospect.email && (
                        <div className="flex items-center gap-1.5 max-w-full text-[12px] text-zinc-500 mb-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prospect.email}</span>
                        </div>
                      )}
                      
                      {prospect.phone && (
                        <div className="flex items-center gap-1.5 max-w-full text-[12px] text-zinc-500 mb-2">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span className="truncate">{prospect.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                        {prospect.nextReminderDate ? (
                          <div className={`flex items-center gap-1 text-[12px] font-bold px-1.5 py-0.5 rounded-md ${
                            isToday(parseISO(prospect.nextReminderDate)) ? 'bg-orange-100 text-orange-700' :
                            isPast(parseISO(prospect.nextReminderDate)) ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {format(parseISO(prospect.nextReminderDate), 'dd MMM', { locale: fr })}
                          </div>
                        ) : (
                          <div className="text-[12px] text-zinc-600">Pas de relance</div>
                        )}

                        {prospect.notesHistory && prospect.notesHistory.length > 0 && (
                          <div className="flex items-center gap-1 text-[12px] font-bold text-zinc-600 bg-zinc-50 px-1.5 py-0.5 rounded-md">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            {prospect.notesHistory.length}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {colProspects.length === 0 && (
                    <div className="p-3 border-2 border-dashed border-zinc-200 rounded-xl text-center text-[12px] text-zinc-600">
                      Glissez ici
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </div>
      {/* PROSPECT DETAILS DRAWER/MODAL */}
      {activeSelectedProspect && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-zinc-900/40 backdrop-blur-sm">
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={`Prospect ${activeSelectedProspect.name}`} className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{activeSelectedProspect.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[12px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    COLUMNS.find(c => c.id === prospectStage(activeSelectedProspect))?.color
                  }`}>
                    {COLUMNS.find(c => c.id === prospectStage(activeSelectedProspect))?.title || 'Nouveau'}
                  </span>
                  <span className="text-xs text-zinc-500">Ajouté le {format(parseISO(activeSelectedProspect.date), 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <button aria-label="Fermer le dossier prospect" onClick={() => setSelectedProspect(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
              
              <ProspectSalesDetail prospect={activeSelectedProspect} state={state} setState={setState} onAction={status => handleStatusChange(activeSelectedProspect.id, status)} />
              {/* Contact Info */}
              <section className="space-y-3">
                <h3 className="text-sm border-b border-zinc-100 pb-2 font-bold text-zinc-900 uppercase tracking-wider">Coordonnées</h3>
                {activeSelectedProspect.source && <p className="text-sm text-zinc-700">Source : {activeSelectedProspect.source}</p>}
                <div className="space-y-2">
                  {activeSelectedProspect.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <a href={`mailto:${activeSelectedProspect.email}`} className="text-sm font-medium hover:text-emerald-700 transition-colors">
                        {activeSelectedProspect.email}
                      </a>
                    </div>
                  )}
                  {activeSelectedProspect.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <a href={`tel:${activeSelectedProspect.phone}`} className="text-sm font-medium hover:text-emerald-700 transition-colors">
                        {activeSelectedProspect.phone}
                      </a>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {activeSelectedProspect.phone && <a href={`tel:${activeSelectedProspect.phone}`} className="min-h-11 rounded-xl bg-emerald-900 px-3 py-3 text-center text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-emerald-600">Appeler</a>}
                  {activeSelectedProspect.email && <a href={`mailto:${activeSelectedProspect.email}`} className="min-h-11 rounded-xl border border-zinc-300 px-3 py-3 text-center text-sm font-semibold text-zinc-900 focus-visible:ring-2 focus-visible:ring-emerald-600">Email</a>}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm border-b border-zinc-100 pb-2 font-bold text-zinc-900 uppercase tracking-wider">État et prochaine action</h3>
                <label htmlFor="crm-stage" className="block text-sm font-semibold text-zinc-800">Changer d’étape</label>
                <select id="crm-stage" value={prospectStage(activeSelectedProspect)} onChange={event => handleStatusChange(activeSelectedProspect.id, event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900" disabled={!!activeSelectedProspect.convertedMemberUid}>
                  {COLUMNS.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
                </select>
                <p className="text-sm text-zinc-700">Créé le {format(parseISO(activeSelectedProspect.date), 'd MMMM yyyy', { locale: fr })}</p>
                {activeSelectedProspect.nextReminderDate && <p className="text-sm text-zinc-800">Relance : {format(parseISO(activeSelectedProspect.nextReminderDate), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>}
                {activeSelectedProspect.lostReason && <p className="text-sm text-zinc-700">Raison : {activeSelectedProspect.lostReason}</p>}
                <div className="flex flex-wrap gap-2">
                  {!activeSelectedProspect.convertedMemberUid && <Button type="button" variant="secondary" onClick={() => handleStatusChange(activeSelectedProspect.id, 'call_pending')}>Programmer une relance</Button>}
                  {!activeSelectedProspect.convertedMemberUid && <Button type="button" variant="secondary" onClick={() => handleStatusChange(activeSelectedProspect.id, 'trial')}>Planifier un essai</Button>}
                  {activeSelectedProspect.status === 'lost' && <Button type="button" variant="secondary" onClick={() => handleStatusChange(activeSelectedProspect.id, 'contacted')}>Réouvrir · Contacté</Button>}
                </div>
              </section>

              {trialForProspect(activeSelectedProspect) && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                <h3 className="font-bold">Prochain essai</h3>
                <p>{format(parseISO(trialForProspect(activeSelectedProspect)!.startTime), "d MMM yyyy 'à' HH:mm", { locale: fr })} · coach {state.users.find(user => String(user.id) === trialForProspect(activeSelectedProspect)?.coachId || user.firebaseUid === trialForProspect(activeSelectedProspect)?.coachId)?.name || 'à vérifier'}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => { setSelectedProspect(null); setState(previous => ({ ...previous, page: 'calendar' })); }}>Voir dans le planning</button>
              </section>}
              {activeSelectedProspect.convertedMemberUid && <button type="button" onClick={() => resendAccess(activeSelectedProspect)} className="min-h-11 rounded-xl border border-amber-400 bg-amber-50 px-4 text-sm font-semibold text-amber-950">{accessEmailFailed ? 'Email non envoyé · renvoyer l’accès' : 'Renvoyer l’accès'}</button>}

              {/* Questionnaire Formulaire */}
              {activeSelectedProspect.answers && Object.keys(activeSelectedProspect.answers).length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm border-b border-zinc-100 pb-2 font-bold text-zinc-900 uppercase tracking-wider">Questionnaire Découverte</h3>
                  <div className="grid grid-cols-1 gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                    {Object.entries(activeSelectedProspect.answers).map(([key, val]) => {
                      if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) return null;
                      
                      let displayVal = val;
                      if (Array.isArray(val)) displayVal = val.join(', ');
                      else if (typeof val === 'object') displayVal = Object.entries(val).filter(([k,v]) => v).map(([k]) => k.replace('-', ' ')).join(', ');
                      
                      const keyNames: Record<string, string> = {
                        age: "Âge", gender: "Sexe", profession: "Profession", condition: "Condition physique", weight: "Poids", height: "Taille", ailments: "Antécédents", medicalTreatments: "Traitements", goals: "Objectifs", obj1: "Objectif n°1", obj2: "Objectif n°2", whenResults: "Résultats attendus", trigger: "Déclic", vision6Months: "Vision dans 6 mois", determination: "Détermination (/10)", supporter: "Soutien", sleep: "Sommeil", stress: "Stress (/10)", water: "Eau (L/J)", habits: "Habitudes (Tabac, Alcool..)", currentSport: "Sport actuel", diet: "Alimentation", dietConstraints: "Contraintes alimentaires", frequency: "Fréquence souhaitée (s/sem)", whenStart: "Date de commencement", availability: "Disponibilités", source: "A connu le club via"
                      };
                      
                      const niceKey = keyNames[key] || key;
                      if (['name', 'email', 'phone', 'address'].includes(key)) return null;
                      
                      return (
                        <div key={key} className="flex flex-col border-b border-zinc-200 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                          <span className="text-[12px] text-zinc-500 uppercase font-bold">{niceKey}</span>
                          <span className="text-sm font-medium text-zinc-900">{typeof displayVal === 'string' || typeof displayVal === 'number' ? displayVal : JSON.stringify(displayVal)}</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

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
                        disabled={!!activeSelectedProspect.convertedMemberUid || activeSelectedProspect.status === 'won'}
                        value={activeSelectedProspect.nextReminderDate ? activeSelectedProspect.nextReminderDate.split('T')[0] : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateReminder(activeSelectedProspect, val ? parisLocalInstant(val, '10:00')?.toISOString() || '' : '');
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
                        maxLength={2000}
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
                      <div className="text-[12px] font-bold text-zinc-600 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(note.date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </div>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                  {(!activeSelectedProspect.notesHistory || activeSelectedProspect.notesHistory.length === 0) && (
                    <p className="text-xs text-zinc-600 italic text-center py-4">Aucune note d'historique.</p>
                  )}
                </div>
                {activeSelectedProspect.activityHistory?.length ? <div className="space-y-2 border-t border-zinc-200 pt-4" aria-label="Historique commercial">
                  <h3 className="text-sm font-bold text-zinc-900">Activité</h3>
                  {activeSelectedProspect.activityHistory.map(item => <p key={item.id} className="text-sm text-zinc-700">{format(parseISO(item.date), 'd MMM HH:mm', { locale: fr })} · {item.label}</p>)}
                </div> : null}
              </section>

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-100 bg-white grid grid-cols-2 gap-2 shrink-0">
              {activeSelectedProspect.convertedMemberUid && <Button type="button" variant="secondary" onClick={() => { const member = state.users.find(u => u.firebaseUid === activeSelectedProspect.convertedMemberUid); if (member) { setState((prev: AppState) => ({ ...prev, page: 'onboarding' })); navigate('/dashboard', { state: createOnboardingLocationState(member.id) }); } }}>Voir l’onboarding</Button>}
              {activeSelectedProspect.convertedMemberUid ? <Button type="button" onClick={() => openLinkedMember(activeSelectedProspect)} className="w-full">Ouvrir le dossier adhérent</Button> : activeSelectedProspect.status !== 'won' ? (
                <Button 
                  variant="primary"
                  onClick={() => {
                    handleStatusChange(activeSelectedProspect.id, 'won');
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-none"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Convertir
                </Button>
              ) : (
                <div className="flex items-center justify-center text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl">
                  Gagné · dossier à vérifier
                </div>
              )}
              {!activeSelectedProspect.convertedMemberUid && activeSelectedProspect.status !== 'lost' && <Button variant="secondary" onClick={() => handleStatusChange(activeSelectedProspect.id, 'lost')} className="w-full text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border-none shadow-none">Classer perdu…</Button>}
              {['lead', 'contacted'].includes(activeSelectedProspect.status) && !activeSelectedProspect.notesHistory?.length && !activeSelectedProspect.activityHistory?.length && <button type="button" onClick={() => setIsDeleting(activeSelectedProspect.id)} className="col-span-2 text-xs text-zinc-600 underline focus-visible:ring-2 focus-visible:ring-emerald-700">Supprimer ce prospect sans historique…</button>}
            </div>

          </div>
        </div>
      , document.body)}

      {lostProspect && createPortal(<div data-crm-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/55 p-4"><form onSubmit={confirmLost} role="dialog" aria-modal="true" aria-label="Classer le prospect perdu" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-zinc-950">Classer {lostProspect.name} comme perdu ?</h2><label className="block text-sm font-semibold text-zinc-800">Raison facultative<textarea value={lostReason} onChange={event => setLostReason(event.target.value)} maxLength={300} className="mt-2 min-h-24 w-full rounded-xl border border-zinc-300 p-3 text-zinc-900" /></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setLostProspect(null)}>Annuler</Button><Button type="submit">Confirmer</Button></div></form></div>, document.body)}

      {isDeleting !== null && createPortal(<div data-crm-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/55 p-4"><div role="dialog" aria-modal="true" aria-label="Confirmer la suppression" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-zinc-950">Supprimer ce prospect ?</h2><p className="text-sm text-zinc-700">Réservé aux prospects sans historique. Cette action est définitive.</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsDeleting(null)}>Annuler</Button><Button type="button" onClick={confirmDelete}>Supprimer</Button></div></div></div>, document.body)}

      {/* NEW PROSPECT MODAL */}
      {isAdding && createPortal(
        <div data-crm-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
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
                <label className="block text-xs font-bold text-zinc-600 mb-1">Source (facultatif)</label>
                <Input value={newProspect.source} onChange={e => setNewProspect({...newProspect, source: e.target.value})} placeholder="Site web, Instagram, parrainage…" maxLength={80} />
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
              {duplicate && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                Un prospect avec cet email ou ce téléphone existe déjà : <strong>{duplicate.name}</strong>.
                <div className="mt-2 flex flex-wrap gap-3"><button type="button" className="font-semibold underline" onClick={() => { setIsAdding(false); setSelectedProspect(duplicate); }}>Ouvrir</button><label className="flex items-center gap-2"><input type="checkbox" checked={allowDuplicate} onChange={event => setAllowDuplicate(event.target.checked)} />Créer quand même</label></div>
              </div>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>Annuler</Button>
              <Button type="submit" variant="primary" disabled={!!duplicate && !allowDuplicate}>Créer le prospect</Button>
            </div>
          </form>
        </div>
      , document.body)}

      {/* CONVERSION MODAL */}
      {convertingProspect && createPortal(
        <div data-crm-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
          <form onSubmit={confirmConversion} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-700" />
            </div>
            <h2 className="text-xl font-bold mb-2">Deal Gagné ! 🎉</h2>
            <p className="text-zinc-500 mb-6 text-sm">
              Convertissons <b>{convertingProspect.name}</b> en membre officiel. L'utilisateur recevra un mail pour définir son mot de passe.
            </p>
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Adresse Email</label>
                <Input value={convertData.email} onChange={e => setConvertData({...convertData, email: e.target.value})} required />
              </div>
              {coachOptions && <div><label htmlFor="crm-convert-coach" className="block text-xs font-bold text-zinc-600 mb-1">Coach référent</label><select id="crm-convert-coach" value={convertData.coachUid} onChange={event => setConvertData({...convertData, coachUid: event.target.value})} className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3"><option value="">À attribuer plus tard</option>{coachOptions.map(coach => <option key={coach.firebaseUid} value={coach.firebaseUid}>{coach.name}</option>)}</select></div>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => {
                setConvertingProspect(null);
                if(selectedProspect?.id === convertingProspect.id) setSelectedProspect(null);
              }}>Plus tard</Button>
              <Button type="submit" variant="primary" disabled={isConverting} className="bg-emerald-700 hover:bg-emerald-800">{isConverting ? 'Création…' : 'Créer l’adhérent'}</Button>
            </div>
          </form>
        </div>
      , document.body)}

      {/* REMINDER MODAL */}
      {schedulingReminderProspect && createPortal(
        <div data-crm-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
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
        <div data-crm-modal="true" className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
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
                {state.currentClub?.accountType === 'studio' && <label className="block">Coach de la séance<select aria-label="Coach de la séance d'essai" value={trialCoachUid} onChange={event => setTrialCoachUid(event.target.value)} required={state.user?.role === 'manager'} className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white p-3"><option value="">{state.user?.role === 'owner' ? 'Owner (moi)' : 'Choisir un Coach'}</option>{(coachOptions || []).map(coach => <option key={coach.firebaseUid} value={coach.firebaseUid}>{coach.name}</option>)}</select></label>}
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
