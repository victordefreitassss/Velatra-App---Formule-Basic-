import { crmDate } from '../components/crm/crmModel';
import { ProspectWorkspace, type CrmView } from '../components/crm/ProspectWorkspace';
import { ProspectRecord } from '../components/crm/ProspectRecord';
import { useNavigate } from 'react-router-dom';
import { createOnboardingLocationState, createClient360LocationState } from '../components/dashboardNavigation';
import { SalesSurface, salesRequest } from '../components/SalesSurface';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Prospect } from '../types';
import { db, doc, deleteDoc, auth, sendPasswordResetEmail, apiFetch } from '../firebase';
import { getMemberCreationCoachOptions } from '../components/memberAccess';
import { normalizeProspectEmail, probableProspectDuplicate, prospectStage } from '../components/prospectCrm';
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
  const [salesTab, setSalesTab] = useState<CrmView>('pipeline');
  const [createRequestId, setCreateRequestId] = useState(() => crypto.randomUUID());
  const saveStage = async (prospect: Prospect, body: unknown) => {
    const result = await salesRequest(`/api/sales/prospects/${encodeURIComponent(prospect.firebaseUid!)}/stage`, body);
    setState(prev => ({ ...prev, prospects: prev.prospects.map(p => p.firebaseUid === prospect.firebaseUid ? result.prospect : p) }));
  };
  
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
  const duplicate = probableProspectDuplicate(state.prospects.filter(p => p.clubId === state.user?.clubId), newProspect.email, newProspect.phone);
  const coachOptions = getMemberCreationCoachOptions(state.currentClub, state.user, state.users);

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

  const openLinkedMember = (prospect: Prospect) => {
    const member = state.users.find(user => user.firebaseUid === prospect.convertedMemberUid || user.id === prospect.convertedMemberId);
    if (!member) { showToast('Adhérent créé. Rechargez la liste pour ouvrir son dossier.', 'info'); return; }
    setSelectedProspect(null);
    setState(previous => ({ ...previous, page: 'users', selectedMember: member }));
  };
  
  // Utiliser la donnée state persistente pour le tiroir ouvert
  const activeSelectedProspect = selectedProspect ? state.prospects.find(p => p.firebaseUid === selectedProspect.firebaseUid && p.clubId === state.user?.clubId) : null;

  return (
    <div className="vi-page page-transition w-full">
      {convertedClient && <div role="status" data-sales-onboarding className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2"><p>Client créé · son onboarding est disponible.</p><div className="flex flex-wrap gap-2"><Button onClick={() => openConverted(true)}>Voir l’onboarding</Button><Button variant="secondary" onClick={() => openConverted(false)}>Voir le client</Button></div></div>}
      <ProspectWorkspace state={state} view={salesTab} onView={setSalesTab} onOpen={setSelectedProspect} onAdd={() => setIsAdding(true)} onStage={handleStatusChange} onComplete={p => handleUpdateReminder(p, '')} onTasks={() => setState(prev => ({ ...prev, page: 'crm_tasks' }))}>
        {(salesTab === 'trials' || salesTab === 'performance') && <SalesSurface tab={salesTab} state={state} setState={setState} onProspect={uid => { const p = state.prospects.find(p => p.firebaseUid === uid && p.clubId === state.user?.clubId); if (p) setSelectedProspect(p); }} />}
      </ProspectWorkspace>
      {/* PROSPECT DETAILS DRAWER/MODAL */}
      {activeSelectedProspect && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-zinc-900/40 backdrop-blur-sm">
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={`Prospect ${activeSelectedProspect.name}`} className="vi-dialog w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
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
                  <span className="text-xs text-zinc-500">Ajouté le {crmDate(activeSelectedProspect.date)}</span>
                </div>
              </div>
              <button aria-label="Fermer le dossier prospect" onClick={() => setSelectedProspect(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
              
              <ProspectRecord key={activeSelectedProspect.firebaseUid} prospect={activeSelectedProspect} state={state} setState={setState} onStage={status => handleStatusChange(activeSelectedProspect.id, status)} onReminder={() => handleStatusChange(activeSelectedProspect.id, 'call_pending')} onPlanning={() => { setSelectedProspect(null); setState(prev => ({ ...prev, page: 'calendar' })); }} />
              {activeSelectedProspect.convertedMemberUid && <button type="button" onClick={() => resendAccess(activeSelectedProspect)} className="vi-button">{accessEmailFailed ? 'Email non envoyé · renvoyer l’accès' : 'Renvoyer l’accès'}</button>}
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-none"
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
              {['lead', 'contacted'].includes(activeSelectedProspect.status) && !activeSelectedProspect.notesHistory?.length && !activeSelectedProspect.activityHistory?.length && <button type="button" onClick={() => setIsDeleting(activeSelectedProspect.id)} className="col-span-2 text-xs text-zinc-600 underline focus-visible:ring-2 focus-visible:ring-indigo-600">Supprimer ce prospect sans historique…</button>}
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
                  className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 min-h-[80px]"
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
            <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950"><strong>{convertingProspect.name}</strong><p>{convertingProspect.phone || 'Téléphone non renseigné'} · {convertingProspect.source || 'Source non renseignée'}</p><p>Offre envisagée : {convertingProspect.proposedOffer || 'À définir'}</p>{(convertingProspect.notesHistory?.[0]?.content || convertingProspect.notes) && <p className="mt-2 whitespace-pre-wrap">{convertingProspect.notesHistory?.[0]?.content || convertingProspect.notes}</p>}<p className="mt-2 text-xs">Le dossier CRM et ses notes restent liés au membre. Aucun abonnement n’est activé par cette conversion.</p></div>
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
              <Button type="submit" variant="primary" disabled={isConverting} className="bg-indigo-600 hover:bg-indigo-700">{isConverting ? 'Création…' : 'Créer l’adhérent'}</Button>
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
