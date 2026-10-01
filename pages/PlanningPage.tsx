import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppState, Booking } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { CalendarIcon, ClockIcon, UserIcon, CheckIcon, XIcon, TargetIcon, Trash2Icon } from '../components/Icons';
import { apiFetch } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { trackProductEventOnce } from '../components/productEvents';
import { addParisDays, attachBookingsToSlots, generatePlanningSlots, parisDateKey, parisWeekKeys, shiftPlanningWeek } from '../components/planningSlots';
import { getProductCapabilities } from '../productCapabilities';
import { createClient360LocationState, getPlanningBookingId, resolvePlanningMember } from '../components/dashboardNavigation';

import { useProductFormat } from '../components/useProductFormat';
import { selectHomeBookings } from '../components/experienceHomeSelectors';

const containerVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const PlanningPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const location = useLocation();
  const productFormat = useProductFormat();
  const consumedBookingContext = useRef<string | null>(null);
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date, sessionTypeId?: string, coachId?: string } | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [bookingMemberId, setBookingMemberId] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [filterCoachId, setFilterCoachId] = useState<string>('all');
  const [filterTypeId, setFilterTypeId] = useState<string>('all');
  const [view, setView] = useState<'agenda' | 'day' | 'week'>('agenda');
  const [selectedDetail, setSelectedDetail] = useState<Booking | null>(null);
  const [movingBooking, setMovingBooking] = useState<Booking | null>(null);
  const [availabilityCounts, setAvailabilityCounts] = useState<{ startTime: string; endTime: string; coachId: string; sessionTypeId?: string; count: number }[]>([]);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [liveResult, setLiveResult] = useState('');
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<string | null>(null);

  const isCoach = state.user?.role === 'coach' || state.user?.role === 'owner' || state.user?.role === 'manager';
  const contextualMember = isCoach ? resolvePlanningMember(state.users, state.user, location.state) : null;

  useEffect(() => {
    setBookingMemberId(contextualMember ? String(contextualMember.id) : '');
  }, [location.key, contextualMember?.id]);
  const sharedPlanningAvailable = getProductCapabilities(state.currentClub, {
    role: state.user?.role, clubId: state.user?.clubId,
  }).sharedPlanning.usable;
  useEffect(() => {
    if (productFormat === 'desktop' || productFormat === 'largeDesktop') setView('week');
  }, []);
  useEffect(() => {
    if (!isCoach || consumedBookingContext.current === location.key) return;
    const id = getPlanningBookingId(location.state);
    if (!id) return;
    const booking = selectHomeBookings(state).find(item => item.id === id);
    if (!booking) return;
    consumedBookingContext.current = location.key;
    setSelectedDate(new Date(booking.startTime));
    setSelectedDetail(booking);
  }, [location.key, state.bookings, state.users, state.user]);
  useEffect(() => {
    if (!isBookingModalOpen && !selectedDetail && !confirmCancelBookingId) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('[data-planning-dialog="active"]');
    const buttons = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled])') || [])];
    buttons()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsBookingModalOpen(false); setSelectedDetail(null); setConfirmCancelBookingId(null); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = buttons();
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previousFocus?.focus(); };
  }, [isBookingModalOpen, selectedDetail, confirmCancelBookingId]);

  // Get available coaches
  const clubCoaches = useMemo(() => {
    return [state.user!, ...state.users.filter(u => u.id !== state.user?.id)].filter(u => u.clubId === state.currentClub?.id && ['coach', 'owner', 'superadmin'].includes(u.role));
  }, [state.users, state.currentClub?.id, state.user]);

  useEffect(() => {
    if (!selectedCoachId && clubCoaches.length > 0) {
      setSelectedCoachId(String(clubCoaches[0].id));
    }
  }, [clubCoaches, selectedCoachId]);

  // Get booking settings
  const bookingSettings = { sessionDuration: 60, ...state.currentClub?.settings?.booking, schedule: state.currentClub?.settings?.booking?.schedule || [] };

  // Generate week dates
  const selectedDayKey = parisDateKey(selectedDate);
  const weekKeys = useMemo(() => parisWeekKeys(selectedDayKey), [selectedDayKey]);
  const weekDates = useMemo(() => weekKeys.map(key => new Date(`${key}T12:00:00Z`)), [weekKeys]);
  useEffect(() => {
    if (!state.user || !state.currentClub) return;
    let active = true;
    setAvailabilityReady(false);
    apiFetch(`/api/bookings/availability?date=${selectedDayKey}`)
      .then(async response => { if (!response.ok) throw new Error('Disponibilité indisponible.'); return response.json(); })
      .then(data => { if (active) { setAvailabilityCounts(Array.isArray(data.slots) ? data.slots : []); setAvailabilityReady(true); } })
      .catch(() => { if (active) { setAvailabilityCounts([]); setAvailabilityReady(false); } });
    return () => { active = false; };
  }, [selectedDayKey, state.bookings, state.user?.firebaseUid, state.currentClub?.id]);

  // Generate available slots for a specific date
  const getAvailableSlots = (date: Date) => {
    const slots = bookingSettings.enabled === false ? [] : generatePlanningSlots(parisDateKey(date), bookingSettings.schedule, bookingSettings.sessionTypes || [], bookingSettings.sessionDuration || 60);
    return attachBookingsToSlots(slots, getBookingsForDate(date), filterCoachId)
      .filter(slot => (filterTypeId === 'all' || (slot.sessionTypeId || '') === filterTypeId) && (!movingBooking || (slot.sessionTypeId || '') === (movingBooking.sessionTypeId || '')) &&
        (isCoach || slot.end.getTime() > Date.now() || slot.bookings.some(booking => Number(booking.memberId) === Number(state.user?.id))));
  };

  const changeWeek = (delta: number) => {
    setSelectedDate(previous => shiftPlanningWeek(previous, delta));
  };

  const changeDay = (delta: number) => setSelectedDate(new Date(`${addParisDays(selectedDayKey, delta)}T12:00:00Z`));
  const openMember = (memberId?: number) => {
    if (!memberId || !isCoach) return;
    setState((previous: AppState) => ({ ...previous, page: 'users', selectedMember: null }));
    navigate(`${location.pathname}${location.search}`, { state: createClient360LocationState(memberId) });
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !state.user || isBooking) return;
    if (isCoach && !bookingMemberId) { showToast('Choisissez un adhérent pour cette séance.', 'error'); return; }
    setIsBooking(true);
    try {
      const response = await apiFetch(movingBooking ? '/api/bookings/reschedule' : '/api/bookings/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(movingBooking ? { id: movingBooking.id } : { memberId: isCoach ? Number(bookingMemberId) : state.user.id }),
          coachId: selectedSlot.coachId || selectedCoachId || state.user?.assignedCoachUid || state.currentClub?.ownerId,
          startTime: selectedSlot.start.toISOString(), endTime: selectedSlot.end.toISOString(), sessionTypeId: selectedSlot.sessionTypeId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de réserver cette séance.');
      if (isCoach) trackProductEventOnce('first_session_planned', state.user.firebaseUid || state.user.id);
      showToast(movingBooking ? 'Séance déplacée.' : 'Réservation confirmée !');
      setLiveResult(movingBooking ? 'Séance déplacée.' : 'Réservation confirmée.');
      setIsBookingModalOpen(false); setSelectedSlot(null); setMovingBooking(null);
    } catch (error: any) { setLiveResult(error.message || 'Impossible de réserver cette séance.'); showToast(error.message || 'Impossible de réserver cette séance.', 'error'); }
    finally { setIsBooking(false); }
  };

  const confirmCancelBooking = async () => {
    if (!confirmCancelBookingId) return;
    const booking = state.bookings.find(b => b.id === confirmCancelBookingId);
    if (!booking) return;

    try {
      const response = await apiFetch('/api/bookings/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’annuler cette séance.');
      showToast(result.refunded ? 'Réservation annulée et crédit remboursé.' : 'Réservation annulée.');
      setLiveResult(result.refunded ? 'Réservation annulée et crédit remboursé.' : 'Réservation annulée.');
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      showToast(error?.message || "Erreur lors de l'annulation", "error");
      setLiveResult(error?.message || "Erreur lors de l'annulation");
    } finally {
      setConfirmCancelBookingId(null);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!isCoach) {
      const now = new Date();
      const bookingTime = new Date(booking.startTime);
      const hoursUntilSlot = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const minCancellation = bookingSettings.minCancellationHours || 0;

      if (hoursUntilSlot < minCancellation) {
        showToast(`L'annulation n'est plus possible à moins de ${minCancellation}h de la séance.`, "error");
        return;
      }
    }

    setConfirmCancelBookingId(booking.id || null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getBookingsForDate = (date: Date) => {
    return state.bookings.filter(b => {
      return parisDateKey(new Date(b.startTime)) === parisDateKey(date) &&
             (b.status === 'confirmed' || b.status === 'completed');
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const countForSlot = (slot: { start: Date; end: Date; coachId?: string; sessionTypeId?: string; bookings: Booking[] }) => {
    const coachId = slot.coachId || selectedCoachId || state.user?.assignedCoachUid || state.currentClub?.ownerId;
    const aggregate = availabilityCounts.find(item => item.startTime === slot.start.toISOString() && item.endTime === slot.end.toISOString() &&
      (!isCoach && !slot.coachId || item.coachId === String(coachId)) && (item.sessionTypeId || '') === (slot.sessionTypeId || ''));
    return Math.max(slot.bookings.filter(booking => booking.status === 'confirmed').length, aggregate?.count || 0);
  };
  const startMove = (booking: Booking) => {
    if (booking.type !== 'coaching' || booking.status !== 'confirmed') return;
    setMovingBooking(booking);
    setSelectedCoachId(booking.coachId);
    setSelectedDetail(null);
    setSelectedDate(new Date(booking.startTime));
    setView('day');
    showToast('Choisissez le nouveau créneau pour déplacer la séance.');
  };
  const bookingMemberName = (booking: Booking) => booking.type === 'trial'
    ? state.prospects.find(prospect => prospect.id === booking.prospectId)?.name || 'Prospect'
    : state.users.find(user => Number(user.id) === Number(booking.memberId))?.name || 'Adhérent';
  const preparedProgram = selectedDetail && state.programs.find(program => program.bookingId === selectedDetail.id && program.isPlannedSession);
  const weekSlots = weekDates.map(date => getAvailableSlots(date));
  const slotHour = (date: Date) => Number(formatTime(date).slice(0, 2));
  const hours = weekSlots.flat().map(slot => slotHour(slot.start));
  const firstHour = hours.length ? Math.max(0, Math.min(...hours)) : 8;
  const lastHour = hours.length ? Math.min(23, Math.max(...hours)) : 19;
  const openSlot = (slot: { start: Date; end: Date; coachId?: string; sessionTypeId?: string }) => {
    if (!isCoach && !availabilityReady) { showToast('Vérification des places en cours. Réessayez dans un instant.', 'error'); return; }
    if (movingBooking && (slot.sessionTypeId || '') !== (movingBooking.sessionTypeId || '')) {
      showToast('Choisissez un créneau du même type de séance.', 'error');
      return;
    }
    setSelectedSlot(slot);
    if (filterCoachId !== 'all') setSelectedCoachId(filterCoachId);
    setIsBookingModalOpen(true);
  };


  return (
    <motion.div 
      className={`space-y-5 pb-20 ${selectedDetail ? '2xl:pr-[380px]' : ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <span className="sr-only" aria-live="polite">{liveResult}</span>
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Planning</h1>
          <p className="text-sm text-zinc-600 mt-1.5">{isCoach ? 'Vos rendez-vous et disponibilités, en un seul endroit.' : 'Choisissez une séance et réservez votre place.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isCoach && sharedPlanningAvailable && clubCoaches.length > 1 && (
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm px-3 py-2 flex items-center gap-2">
              <UserIcon size={16} className="text-zinc-500" />
              <select aria-label="Filtrer par coach"
                value={filterCoachId}
                onChange={e => setFilterCoachId(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-zinc-700 outline-none cursor-pointer"
              >
                <option value="all">Tous les coachs</option>
                {clubCoaches.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {isCoach && <button type="button" onClick={() => { setView('day'); setSelectedDate(new Date()); document.getElementById('planning-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">+ Rendez-vous</button>}
          {!isCoach && (
            <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
              <TargetIcon size={20} className="text-emerald-500" />
              <div>
              <div className="text-xs font-medium text-emerald-900">{filterTypeId === 'all' ? 'Crédits standard' : 'Crédits pour ce type'}</div>
                <div className="text-xl font-black text-zinc-900 leading-none">{filterTypeId === 'all' ? state.user?.credits || 0 : state.user?.sessionCredits?.[filterTypeId] || 0}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isCoach && contextualMember && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
        <span>Réservation pour <strong>{contextualMember.name}</strong> · choisissez un créneau disponible.</span>
        <button type="button" onClick={() => { setState((previous: AppState) => ({ ...previous, page: 'users', selectedMember: null })); navigate(`${location.pathname}${location.search}`, { state: createClient360LocationState(Number(contextualMember.id)) }); }} className="min-h-11 rounded-lg px-3 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800">Retour au dossier</button>
      </div>}

      {movingBooking && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <span>Déplacement de la séance de <strong>{bookingMemberName(movingBooking)}</strong> · choisissez un nouveau créneau du même type.</span>
        <button type="button" onClick={() => setMovingBooking(null)} className="min-h-11 rounded-lg px-3 font-semibold underline">Arrêter le déplacement</button>
      </div>}
      {bookingSettings.enabled === false && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">Les nouvelles réservations sont temporairement désactivées pour cet espace. Les séances déjà planifiées restent visibles.</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
        {isCoach && <div className="flex items-center rounded-xl bg-zinc-100 p-1" aria-label="Vue du planning">
          {(['agenda', 'day', 'week'] as const).map(option => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${view === option ? 'bg-emerald-800 text-white shadow-sm' : 'text-zinc-700 hover:bg-white'}`}>{option === 'agenda' ? 'Agenda' : option === 'day' ? 'Jour' : 'Semaine'}</button>)}
        </div>}
        {bookingSettings.sessionTypes && bookingSettings.sessionTypes.length > 1 && <label className="min-w-0 text-xs font-semibold text-zinc-800">
          Type de séance
          <select aria-label="Filtrer les types de séance" value={filterTypeId} onChange={event => setFilterTypeId(event.target.value)} className="ml-2 min-h-10 max-w-[190px] rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900">
            <option value="all">Tous les types</option>
            {bookingSettings.sessionTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>}
        {!isCoach && <span className="ml-auto text-xs font-medium text-zinc-700">Heures de Paris · 1 crédit par réservation</span>}
      </div>

      <motion.div variants={itemVariants} className="flex items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200">
        <Button variant="secondary" aria-label={view === 'week' ? 'Semaine précédente' : 'Jour précédent'} className="!h-10 !w-10 !shrink-0 !p-0 hover:bg-zinc-50" onClick={() => view === 'week' ? changeWeek(-1) : changeDay(-1)}>&larr;</Button>
        <div className="min-w-0 text-center">
          <div className="font-semibold text-zinc-900 text-sm sm:text-base">
            {view === 'week' && isCoach ? `${weekDates[0].toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' })}` : formatDate(selectedDate)}
          </div>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="mt-0.5 text-sm font-medium text-emerald-800 hover:text-emerald-900">Aujourd’hui</button>
        </div>
        <Button variant="secondary" aria-label={view === 'week' ? 'Semaine suivante' : 'Jour suivant'} className="!h-10 !w-10 !shrink-0 !p-0 hover:bg-zinc-50" onClick={() => view === 'week' ? changeWeek(1) : changeDay(1)}>&rarr;</Button>
      </motion.div>

      {/* Mobile-first Date Strip */}
      <motion.div variants={itemVariants} className="flex max-w-full overflow-x-auto pb-4 gap-3 snap-x hide-scrollbar">
        {weekDates.map((date, idx) => {
          const isSelected = parisDateKey(date) === selectedDayKey;
          const isToday = parisDateKey(date) === parisDateKey(new Date());
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              aria-pressed={isSelected}
              aria-label={formatDate(date)}
              className={`flex-shrink-0 w-[64px] sm:w-[72px] h-[76px] sm:h-[84px] rounded-2xl flex flex-col items-center justify-center transition-colors snap-center border ${
                isSelected 
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-md'
                  : isToday 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-white text-zinc-700  hover:border-emerald-700/40 hover:bg-zinc-50'
              }`}
            >
              <span className={`text-xs capitalize font-medium mb-1 ${isSelected ? 'text-white/90' : 'text-zinc-600'}`}>
                {date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' })}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-white' : isToday ? 'text-emerald-800' : 'text-zinc-900'}`}>
                {date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' })}
              </span>
            </button>
          );
        })}
      </motion.div>

      {isCoach && view === 'week' && <div className="space-y-3">
        <div className="hidden lg:block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-[54px_repeat(7,minmax(0,1fr))] border-b border-zinc-200 bg-zinc-50">
            <div className="p-2 text-xs font-semibold text-zinc-700">Paris</div>
            {weekDates.map(date => <button key={parisDateKey(date)} type="button" onClick={() => { setSelectedDate(date); setView('day'); }} className={`min-h-14 border-l border-zinc-200 p-2 text-sm font-semibold capitalize ${parisDateKey(date) === selectedDayKey ? 'bg-emerald-50 text-emerald-950' : 'text-zinc-800 hover:bg-zinc-100'}`}>{date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric' })}</button>)}
          </div>
          {Array.from({ length: lastHour - firstHour + 1 }, (_, index) => firstHour + index).map(hour => <div key={hour} className="grid grid-cols-[54px_repeat(7,minmax(0,1fr))] border-b border-zinc-100 last:border-b-0">
            <div className="p-2 text-xs font-medium text-zinc-600">{String(hour).padStart(2, '0')}:00</div>
            {weekSlots.map((slots, dayIndex) => <div key={`${weekKeys[dayIndex]}-${hour}`} className="min-h-[74px] min-w-0 space-y-1 border-l border-zinc-100 p-1">
              {slots.filter(slot => slotHour(slot.start) === hour).map((slot, index) => {
                const active = slot.bookings.filter(booking => booking.status === 'confirmed');
                const first = active[0] || slot.bookings[0];
                const isPast = slot.end.getTime() < Date.now();
                const capacity = bookingSettings.sessionTypes?.find(type => type.id === slot.sessionTypeId)?.maxParticipants || 1;
                const full = countForSlot(slot) >= capacity;
                const label = bookingSettings.sessionTypes?.find(type => type.id === slot.sessionTypeId)?.name || (first?.type === 'trial' ? 'Séance d’essai' : 'Coaching');
                return <button key={`${slot.start.toISOString()}-${slot.coachId || ''}-${index}`} type="button" disabled={!first && (isPast || full)} onClick={() => first ? setSelectedDetail(first) : openSlot(slot)} className={`w-full min-w-0 rounded-lg border px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${first ? 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100' : isPast || full ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-dashed border-zinc-300 bg-white text-zinc-800 hover:border-emerald-600'}`}>
                  <span className="block font-bold">{formatTime(slot.start)} · {label}</span>
                  <span className="block truncate">{first ? capacity > 1 ? `${countForSlot(slot)}/${capacity} inscrits` : bookingMemberName(first) : full ? 'Complet' : movingBooking ? 'Déplacer ici' : 'Disponible'}</span>
                </button>;
              })}
            </div>)}
          </div>)}
        </div>
        <div className="hidden md:grid lg:hidden grid-cols-2 gap-3">
          {weekDates.map((date, index) => <button key={weekKeys[index]} type="button" onClick={() => { setSelectedDate(date); setView('day'); }} className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-left hover:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <span className="block font-semibold capitalize text-zinc-900">{formatDate(date)}</span>
            <span className="text-sm text-zinc-700">{weekSlots[index].filter(slot => slot.bookings.length > 0).length} séance(s) · ouvrir la journée</span>
          </button>)}
        </div>
      </div>}

      {/* Selected Date Slots */}
      <motion.div id="planning-day" variants={itemVariants} className={`mt-4 ${isCoach && view === 'week' ? 'md:hidden' : ''}`}>
        <h2 className="text-lg font-semibold text-zinc-900 mb-3 capitalize flex items-center gap-2">
          <CalendarIcon size={20} className="text-emerald-800" />
          {formatDate(selectedDate)}
        </h2>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4"
        >
          {(() => {
            const slots = getAvailableSlots(selectedDate).filter(slot => !isCoach || view !== 'agenda' || slot.bookings.length > 0);
            const hasAvailability = bookingSettings.schedule.some(day => day.slots.length > 0);

            if (slots.length === 0) {
              return (
                <motion.div variants={itemVariants} className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-white px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 shadow-sm">
                    <ClockIcon size={24} />
                  </div>
                  <p className="font-semibold text-zinc-900">{isCoach && state.currentClub?.settings?.booking?.enabled === false ? 'Le planning est désactivé' : isCoach && view === 'agenda' ? 'Aucune séance prévue ce jour' : 'Aucun créneau disponible ce jour'}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-600">
                    {isCoach && state.currentClub?.settings?.booking?.enabled === false
                      ? 'Activez le planning dans les paramètres pour proposer des créneaux à vos adhérents.'
                      : isCoach
                        ? view === 'agenda' ? 'Vos rendez-vous confirmés apparaîtront ici. Utilisez + Rendez-vous pour planifier.' : hasAvailability
                          ? 'Aucun créneau à cette date. Choisissez un autre jour ou ajustez vos disponibilités.'
                          : 'Configurez vos disponibilités pour permettre aux adhérents de réserver une séance.'
                        : 'Aucun créneau n’est proposé pour cette date. Essayez un autre jour ou contactez votre coach.'}
                  </p>
                  {isCoach && (
                    <button type="button" onClick={() => setState((previous: AppState) => ({ ...previous, page: 'settings', pendingUiAction: 'booking-settings' }))} className="mt-4 min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
                      {state.currentClub?.settings?.booking?.enabled === false ? 'Activer mon planning' : hasAvailability ? 'Modifier mes disponibilités' : 'Configurer mes disponibilités'}
                    </button>
                  )}
                </motion.div>
              );
            }

            return slots.map((slot, sIdx) => {
              const bookingsForSlot = slot.bookings;
              const isPast = slot.start.getTime() < new Date().getTime();
              const sessionType = bookingSettings.sessionTypes?.find(t => t.id === slot.sessionTypeId);
              const maxParticipants = sessionType?.maxParticipants || 1;
              const isFull = countForSlot(slot) >= maxParticipants;
              const myBooking = bookingsForSlot.find(b => b.memberId === Number(state.user?.id));

              if (bookingsForSlot.length > 0 && isCoach) {
                // Coach View (Shows all participants)
                return (
                  <motion.div key={sIdx} variants={itemVariants} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-16 shrink-0 border-r border-zinc-200 pr-3">
                        <time dateTime={slot.start.toISOString()} className="block text-lg font-semibold leading-tight text-zinc-900">{formatTime(slot.start)}</time>
                        <span className="mt-1 block text-xs text-zinc-700">{Math.max(0, Math.round((slot.end.getTime() - slot.start.getTime()) / 60000))} min</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-zinc-800">{sessionType?.name || 'Coaching individuel'}</p>
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800">{countForSlot(slot)}/{maxParticipants} inscrit{countForSlot(slot) === 1 ? '' : 's'}</span>
                        </div>
                        {slot.coachId && <p className="mt-1 text-xs text-zinc-700">Coach · {state.users.find(u => String(u.id) === slot.coachId)?.name || 'Coach'}</p>}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-2">
                      {bookingsForSlot.map(b => {
                        const m = state.users.find(u => Number(u.id) === b.memberId);
                        const p = b.type === 'trial' ? state.prospects?.find(pros => pros.id === b.prospectId) : null;
                        return (
                          <div key={b.id} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2">
                            <span className="min-w-0 truncate text-sm font-semibold text-zinc-900">{b.type === 'trial' ? (p?.name || 'Prospect') : (m?.name || 'Inconnu')}</span>
                            <div className="flex shrink-0 items-center gap-1">
                              <button type="button" onClick={() => setSelectedDetail(b)} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">Détails</button>
                              {b.type === 'coaching' && m && <button type="button" onClick={() => openMember(Number(m.id))} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100">Client</button>}
                              {b.status === 'completed' ? <span className="shrink-0 text-xs font-medium text-emerald-900">Terminée</span> : b.type === 'coaching' && !isPast ? <button type="button" onClick={() => startMove(b)} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100">Déplacer</button> : null}
                              {b.status === 'confirmed' && !isPast && <button type="button" aria-label={`Annuler la séance de ${b.type === 'trial' ? (p?.name || 'ce prospect') : (m?.name || 'ce membre')}`} onClick={() => setConfirmCancelBookingId(b.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"><Trash2Icon size={15}/></button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!isPast && !isFull && <button type="button" onClick={() => openSlot(slot)} className="mt-2 min-h-11 w-full rounded-lg border border-dashed border-emerald-400 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">+ Ajouter un participant</button>}
                  </motion.div>
                );
              }

              if (myBooking && !isCoach) {
                // Member View - Already Booked
                return (
                  <motion.div key={sIdx} variants={itemVariants} className="bg-emerald-50 text-zinc-900 p-4 rounded-2xl flex flex-col justify-between min-h-[100px] transition-all border-emerald-500 shadow-lg shadow-emerald-500/20 relative">
                     <div className="flex justify-between items-start mb-2">
                       <div>
                         <div className="font-black text-lg text-zinc-900">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                         <div className="text-xs font-medium text-zinc-700">{sessionType ? sessionType.name : "Coaching"}</div>
                         {slot.coachId && (
                           <div className="text-xs text-emerald-950 flex items-center gap-1 mt-1 font-medium">
                             <UserIcon size={12} />
                             {state.users.find(u => String(u.id) === slot.coachId)?.name || 'Coach'}
                           </div>
                         )}
                       </div>
                       {myBooking.status === 'completed' ? (
                         <Badge variant="success" className="!bg-emerald-100 !text-emerald-700 !border-none shadow-sm">Terminé</Badge>
                       ) : (
                         <Badge variant="dark" className="!bg-zinc-100 !text-zinc-900 !border-none shadow-sm">Ma séance</Badge>
                       )}
                     </div>
                     
                     <div className="text-xs text-zinc-800 mb-3 font-medium">
                       {myBooking.status === 'completed' ? 'Terminé' : 'Réservé'}
                     </div>

                     {!isPast && myBooking.status !== 'completed' && (
                       <Button variant="secondary" className="w-full !py-2 !text-xs border-emerald-500/30 text-emerald-900 hover:bg-emerald-100 transition-colors" onClick={() => handleCancelBooking(myBooking)}>
                         Annuler ma réservation
                       </Button>
                     )}
                  </motion.div>
                )
              }

              if (isPast) {
                return (
                  <motion.div key={sIdx} variants={itemVariants} className="p-4 rounded-xl border border-dashed border-zinc-300 text-zinc-700 bg-white flex flex-col justify-center min-h-[100px]">
                    <div className="font-semibold text-lg mb-1 text-zinc-800">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                    {sessionType && <div className="text-xs text-zinc-700 font-medium mb-1">{sessionType.name}</div>}
                    <div className="text-xs font-medium">Créneau passé</div>
                  </motion.div>
                );
              }

              if (isFull) {
                return (
                  <motion.div key={sIdx} variants={itemVariants} className="p-4 rounded-xl border border-dashed border-zinc-300 text-zinc-700 bg-zinc-50 flex flex-col justify-center min-h-[100px] shadow-sm">
                    <div className="font-semibold text-lg mb-1 text-zinc-700">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                    {sessionType && <div className="text-xs text-zinc-700 font-medium mb-1">{sessionType.name}</div>}
                    <div className="text-xs font-semibold text-red-800">Complet</div>
                  </motion.div>
                );
              }

              return (
                <motion.button
                  key={sIdx}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => openSlot(slot)}
                  disabled={!isCoach && !availabilityReady}
                  className="p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:bg-zinc-50 transition-all text-zinc-900 bg-white flex flex-col justify-center items-center group min-h-[100px] shadow-sm hover:shadow-md relative"
                >
                  <div className="font-semibold text-xl mb-1 group-hover:text-emerald-800 transition-colors">{formatTime(slot.start)}</div>
                  {sessionType && <div className="text-xs text-zinc-700 font-medium mb-1 group-hover:text-emerald-900">{sessionType.name}</div>}
                  {slot.coachId && (
                    <div className="text-xs text-zinc-700 flex items-center justify-center gap-1 mb-2">
                      <UserIcon size={12} />
                      {state.users.find(u => String(u.id) === slot.coachId)?.name || 'Coach'}
                    </div>
                  )}
                  {maxParticipants > 1 && (
                    <div className="absolute top-2 right-2 text-xs px-2 py-1 bg-zinc-100 text-zinc-800 rounded-lg font-medium">
                      {isCoach ? `${countForSlot(slot)}/${maxParticipants} inscrits` : `${maxParticipants - countForSlot(slot)} place${maxParticipants - countForSlot(slot) > 1 ? 's' : ''} restante${maxParticipants - countForSlot(slot) > 1 ? 's' : ''}`}
                    </div>
                  )}
                  <div className="text-sm font-semibold text-zinc-700 group-hover:text-emerald-900">{movingBooking ? 'Déplacer ici' : isCoach ? 'Planifier une séance' : availabilityReady ? 'Réserver' : 'Vérification des places…'}</div>
                </motion.button>
              );
            });
          })()}
        </motion.div>
      </motion.div>

      {createPortal(
      <AnimatePresence>
      {isBookingModalOpen && selectedSlot && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
            role="dialog" aria-modal="true" aria-label={movingBooking ? 'Déplacer la séance' : 'Confirmer la réservation'} data-planning-dialog="active"
          >
            <Card className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto bg-white p-5 shadow-2xl sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{movingBooking ? 'Déplacer la séance' : 'Confirmer la réservation'}</h2>
                <button onClick={() => setIsBookingModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-50 p-2 rounded-full hover:bg-zinc-100">
                  <XIcon size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                {isCoach && !movingBooking && <label className="block text-sm font-semibold text-zinc-800">Adhérent
                  <select value={bookingMemberId} onChange={event => setBookingMemberId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-zinc-300 bg-white p-3">
                    <option value="">Choisir un adhérent</option>
                    {state.users.filter(user => user.role === 'member').map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </label>}
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-700 mb-1">Date et heure</div>
                    <div className="font-bold text-zinc-900 capitalize">{formatDate(selectedSlot.start)}</div>
                    <div className="text-sm text-zinc-500">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</div>
                  </div>
                </div>

                {!selectedSlot.coachId && sharedPlanningAvailable && clubCoaches.length > 1 && (
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="text-xs font-medium text-zinc-700 mb-2">Choisir le coach</div>
                    <select
                      value={selectedCoachId}
                      onChange={(e) => setSelectedCoachId(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="" disabled>Sélectionner un coach</option>
                      {clubCoaches.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {movingBooking && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Le crédit initial reste associé à cette réservation. Aucun nouveau débit ni remboursement n’est effectué.</p>}
                {!isCoach && <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs font-medium text-zinc-700 mb-1">Coût</div>
                    <div className="font-bold text-zinc-900">1 Crédit {selectedSlot.sessionTypeId ? (bookingSettings.sessionTypes?.find(t => t.id === selectedSlot.sessionTypeId)?.name || 'Coaching') : 'Standard'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-zinc-700 mb-1">Solde actuel</div>
                    <div className={`font-bold ${(selectedSlot.sessionTypeId ? (state.user?.sessionCredits?.[selectedSlot.sessionTypeId] || 0) : (state.user?.credits || 0)) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {selectedSlot.sessionTypeId ? (state.user?.sessionCredits?.[selectedSlot.sessionTypeId] || 0) : (state.user?.credits || 0)} Crédits
                    </div>
                  </div>
                </div>}
                {!isCoach && bookingSettings.minCancellationHours && bookingSettings.minCancellationHours > 0 && <p className="text-sm text-zinc-700">Annulation possible jusqu’à {bookingSettings.minCancellationHours} h avant la séance. Un crédit débité est alors remboursé.</p>}

                <Button 
                  variant="primary" 
                  className="w-full !py-4 shadow-lg shadow-emerald-500/20" 
                  aria-busy={isBooking} onClick={handleBookSlot}
                  disabled={isBooking || (isCoach ? !movingBooking && !bookingMemberId : (selectedSlot.sessionTypeId ? (state.user?.sessionCredits?.[selectedSlot.sessionTypeId] || 0) <= 0 : (state.user?.credits || 0) <= 0))}
                >
                  <CheckIcon size={18} className="mr-2" />
                  {movingBooking ? 'CONFIRMER LE DÉPLACEMENT' : 'CONFIRMER LA RÉSERVATION'}
                </Button>
                
                {!isCoach && (selectedSlot.sessionTypeId ? (state.user?.sessionCredits?.[selectedSlot.sessionTypeId] || 0) <= 0 : (state.user?.credits || 0) <= 0) && (
                  <p className="text-xs text-center text-red-500 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    Vous n'avez pas assez de crédits pour réserver cette séance.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>,
      document.body
      )}

      {selectedDetail && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4 2xl:pointer-events-none 2xl:inset-auto 2xl:bottom-6 2xl:right-6 2xl:top-28 2xl:w-[360px] 2xl:bg-transparent 2xl:p-0" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedDetail(null); }}>
          <section role="dialog" aria-modal="true" aria-label="Détails de la réservation" data-planning-dialog="active" className="pointer-events-auto max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl 2xl:max-h-full 2xl:max-w-none">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Réservation</p><h2 className="mt-1 text-xl font-bold text-zinc-900">{bookingMemberName(selectedDetail)}</h2></div>
              <button type="button" aria-label="Fermer les détails" onClick={() => setSelectedDetail(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 hover:bg-zinc-200"><XIcon size={18}/></button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div><dt className="font-semibold text-zinc-600">Séance</dt><dd className="font-bold text-zinc-900">{bookingSettings.sessionTypes?.find(type => type.id === selectedDetail.sessionTypeId)?.name || (selectedDetail.type === 'trial' ? 'Séance d’essai' : 'Coaching')}</dd></div>
              <div><dt className="font-semibold text-zinc-600">Date et horaire · Paris</dt><dd className="font-bold capitalize text-zinc-900">{formatDate(new Date(selectedDetail.startTime))} · {formatTime(new Date(selectedDetail.startTime))}–{formatTime(new Date(selectedDetail.endTime))}</dd></div>
              <div><dt className="font-semibold text-zinc-600">Durée</dt><dd className="font-bold text-zinc-900">{Math.round((new Date(selectedDetail.endTime).getTime() - new Date(selectedDetail.startTime).getTime()) / 60000)} min</dd></div>
              <div><dt className="font-semibold text-zinc-600">Coach</dt><dd className="font-bold text-zinc-900">{state.users.find(user => String(user.id) === selectedDetail.coachId)?.name || 'Coach du club'}</dd></div>
              <div><dt className="font-semibold text-zinc-600">Statut</dt><dd className="font-bold text-zinc-900">{selectedDetail.status === 'confirmed' ? 'Confirmée' : selectedDetail.status === 'completed' ? 'Terminée' : selectedDetail.status}</dd></div>
              {(bookingSettings.sessionTypes?.find(type => type.id === selectedDetail.sessionTypeId)?.maxParticipants || 1) > 1 && <div><dt className="font-semibold text-zinc-600">Groupe</dt><dd className="font-bold text-zinc-900">{state.bookings.filter(booking => booking.status === 'confirmed' && booking.startTime === selectedDetail.startTime && booking.endTime === selectedDetail.endTime && booking.coachId === selectedDetail.coachId && (booking.sessionTypeId || '') === (selectedDetail.sessionTypeId || '')).length} / {bookingSettings.sessionTypes?.find(type => type.id === selectedDetail.sessionTypeId)?.maxParticipants} inscrits visibles</dd></div>}
              {(bookingSettings.sessionTypes?.find(type => type.id === selectedDetail.sessionTypeId)?.maxParticipants || 1) > 1 && <div><dt className="font-semibold text-zinc-600">Participants accessibles</dt><dd className="space-y-1 font-medium text-zinc-900">{state.bookings.filter(booking => booking.status === 'confirmed' && booking.startTime === selectedDetail.startTime && booking.endTime === selectedDetail.endTime && booking.coachId === selectedDetail.coachId && (booking.sessionTypeId || '') === (selectedDetail.sessionTypeId || '')).map(booking => <span key={booking.id} className="block">{bookingMemberName(booking)}</span>)}</dd></div>}
              {preparedProgram && <div><dt className="font-semibold text-zinc-600">Programme</dt><dd className="font-bold text-emerald-900">{preparedProgram.name} · préparé</dd></div>}
              {selectedDetail.creditDebited && <div><dt className="font-semibold text-zinc-600">Crédit</dt><dd className="font-bold text-zinc-900">1 crédit utilisé lors de la réservation</dd></div>}
            </dl>
            {isCoach && <div className="mt-6 grid grid-cols-2 gap-2">
              {selectedDetail.type === 'coaching' && <button type="button" onClick={() => { openMember(selectedDetail.memberId); setSelectedDetail(null); }} className="min-h-11 rounded-xl border border-zinc-300 px-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50">Ouvrir le client</button>}
              {selectedDetail.status === 'confirmed' && selectedDetail.type === 'coaching' && new Date(selectedDetail.startTime).getTime() > Date.now() && <button type="button" onClick={() => startMove(selectedDetail)} className="min-h-11 rounded-xl bg-emerald-800 px-3 text-sm font-semibold text-white hover:bg-emerald-900">Déplacer</button>}
              {selectedDetail.status === 'confirmed' && new Date(selectedDetail.startTime).getTime() > Date.now() && <button type="button" onClick={() => { setConfirmCancelBookingId(selectedDetail.id); setSelectedDetail(null); }} className="min-h-11 rounded-xl border border-red-300 px-3 text-sm font-semibold text-red-900 hover:bg-red-50">Annuler</button>}
            </div>}
          </section>
        </div>, document.body
      )}

      {confirmCancelBookingId && createPortal(
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div role="dialog" aria-modal="true" aria-label="Annuler la réservation" data-planning-dialog="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border "
          >
            <h3 className="text-xl font-black text-zinc-900 mb-2">Annuler la réservation ?</h3>
            <p className="text-zinc-500 mb-6">Voulez-vous vraiment annuler cette réservation ?</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirmCancelBookingId(null)}>Non, garder</Button>
              <Button variant="danger" fullWidth onClick={confirmCancelBooking}>Oui, annuler</Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
};
