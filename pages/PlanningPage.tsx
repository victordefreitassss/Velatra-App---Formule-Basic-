import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AppState, Booking, User, Program } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { CalendarIcon, PlusIcon, ClockIcon, UserIcon, CheckIcon, XIcon, TargetIcon, PlayIcon, Trash2Icon } from '../components/Icons';
import { apiFetch, db, collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { trackProductEventOnce } from '../components/productEvents';
import { attachBookingsToSlots, shiftPlanningWeek } from '../components/planningSlots';
import { getProductCapabilities } from '../productCapabilities';

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
  const navigate = useNavigate();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date, sessionTypeId?: string, coachId?: string } | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [bookingMemberId, setBookingMemberId] = useState(state.selectedMember ? String(state.selectedMember.id) : '');
  const [isBooking, setIsBooking] = useState(false);
  const [filterCoachId, setFilterCoachId] = useState<string>('all');

  const isCoach = state.user?.role === 'coach' || state.user?.role === 'owner' || state.user?.role === 'superadmin';
  const sharedPlanningAvailable = getProductCapabilities(state.currentClub, {
    role: state.user?.role, clubId: state.user?.clubId,
  }).sharedPlanning.usable;

  // Get available coaches
  const clubCoaches = useMemo(() => {
    return [state.user!, ...state.users.filter(u => u.id !== state.user?.id)].filter(u => u.clubId === state.currentClub?.id && ['coach', 'owner', 'superadmin'].includes(u.role));
  }, [state.users, state.currentClub?.id]);

  useEffect(() => {
    if (!selectedCoachId && clubCoaches.length > 0) {
      setSelectedCoachId(String(clubCoaches[0].id));
    }
  }, [clubCoaches, selectedCoachId]);

  // Get booking settings
  const bookingSettings = { sessionDuration: 60, ...state.currentClub?.settings?.booking, schedule: state.currentClub?.settings?.booking?.schedule || [] };

  // Generate week dates
  const weekDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1 + (currentWeekOffset * 7)); // Start on Monday

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekOffset]);

  // Generate available slots for a specific date
  const getAvailableSlots = (date: Date) => {
    const dayOfWeek = date.getDay();
    const daySchedule = bookingSettings.schedule.find(s => s.day === dayOfWeek);
    const slots: { start: Date, end: Date, sessionTypeId?: string, coachId?: string }[] = [];

    if (daySchedule) {
      daySchedule.slots.forEach(timeSlot => {
        const [startHour, startMin] = timeSlot.start.split(':').map(Number);
        const [endHour, endMin] = timeSlot.end.split(':').map(Number);
        
        const sessionType = bookingSettings.sessionTypes?.find(t => t.id === timeSlot.sessionTypeId);
        const durationMs = (sessionType ? sessionType.duration : (bookingSettings.sessionDuration || 60)) * 60000;
        
        if (!Number.isFinite(durationMs) || durationMs <= 0) return;
        let currentStart = new Date(date);
        currentStart.setHours(startHour, startMin, 0, 0);
        
        const periodEnd = new Date(date);
        periodEnd.setHours(endHour, endMin, 0, 0);

        while (currentStart.getTime() + durationMs <= periodEnd.getTime()) {
          const currentEnd = new Date(currentStart.getTime() + durationMs);
          slots.push({ start: new Date(currentStart), end: new Date(currentEnd), sessionTypeId: timeSlot.sessionTypeId, coachId: timeSlot.coachId });
          currentStart = new Date(currentStart.getTime() + durationMs);
        }
      });
    }

    return attachBookingsToSlots(slots, getBookingsForDate(date), filterCoachId);
  };

  const changeWeek = (delta: number) => {
    setCurrentWeekOffset(previous => previous + delta);
    setSelectedDate(previous => shiftPlanningWeek(previous, delta));
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !state.user || isBooking) return;
    if (isCoach && !bookingMemberId) { showToast('Choisissez un adhérent pour cette séance.', 'error'); return; }
    setIsBooking(true);
    try {
      const response = await apiFetch('/api/bookings/reserve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: isCoach ? Number(bookingMemberId) : state.user.id,
          coachId: selectedSlot.coachId || selectedCoachId || state.currentClub?.ownerId,
          startTime: selectedSlot.start.toISOString(), endTime: selectedSlot.end.toISOString(), sessionTypeId: selectedSlot.sessionTypeId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible de réserver cette séance.');
      if (isCoach) trackProductEventOnce('first_session_planned', state.user.firebaseUid || state.user.id);
      showToast('Réservation confirmée !');
      setIsBookingModalOpen(false); setSelectedSlot(null);
    } catch (error: any) { showToast(error.message || 'Impossible de réserver cette séance.', 'error'); }
    finally { setIsBooking(false); }
  };

  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<string | null>(null);

  const confirmCancelBooking = async () => {
    if (!confirmCancelBookingId) return;
    const booking = state.bookings.find(b => b.id === confirmCancelBookingId);
    if (!booking) return;

    try {
      const response = await apiFetch('/api/bookings/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’annuler cette séance.');
      showToast(result.refunded ? 'Réservation annulée et crédit remboursé.' : 'Réservation annulée.');
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showToast("Erreur lors de l'annulation", "error");
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
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getBookingsForDate = (date: Date) => {
    return state.bookings.filter(b => {
      const bDate = new Date(b.startTime);
      return bDate.getDate() === date.getDate() && 
             bDate.getMonth() === date.getMonth() && 
             bDate.getFullYear() === date.getFullYear() &&
             (b.status === 'confirmed' || b.status === 'completed');
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };


  return (
    <motion.div 
      className="space-y-5 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Planning</h1>
          <p className="text-sm text-zinc-600 mt-1.5">Consultez les séances et les réservations.</p>
        </div>
        <div className="flex items-center gap-3">
          {sharedPlanningAvailable && clubCoaches.length > 1 && (
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
          {!isCoach && (
            <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
              <TargetIcon size={20} className="text-emerald-500" />
              <div>
              <div className="text-xs font-medium text-emerald-900">Crédits restants</div>
                <div className="text-xl font-black text-zinc-900 leading-none">{state.user?.credits || 0}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {isCoach && state.selectedMember && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
        <span>Réservation pour <strong>{state.selectedMember.name}</strong> · choisissez un créneau disponible.</span>
        <button type="button" onClick={() => { setState((previous: AppState) => ({ ...previous, page: 'users' })); navigate(`${location.pathname}${location.search}`, { state: { velatraPage: 'users', client360MemberId: Number(state.selectedMember!.id) } }); }} className="min-h-11 rounded-lg px-3 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800">Retour au dossier</button>
      </div>}

      <motion.div variants={itemVariants} className="flex items-center justify-between gap-2 bg-white p-3 sm:p-4 rounded-2xl border border-zinc-200">
        <Button variant="secondary" aria-label="Semaine précédente" className="!h-10 !w-10 !shrink-0 !p-0 hover:bg-zinc-50" onClick={() => changeWeek(-1)}>&larr;</Button>
        <div className="min-w-0 text-center">
          <div className="font-semibold text-zinc-900 text-sm sm:text-base">
            {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          <button type="button" onClick={() => { setCurrentWeekOffset(0); setSelectedDate(new Date()); }} className="mt-0.5 text-sm font-medium text-emerald-800 hover:text-emerald-900">Aujourd’hui</button>
        </div>
        <Button variant="secondary" aria-label="Semaine suivante" className="!h-10 !w-10 !shrink-0 !p-0 hover:bg-zinc-50" onClick={() => changeWeek(1)}>&rarr;</Button>
      </motion.div>

      {/* Mobile-first Date Strip */}
      <motion.div variants={itemVariants} className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x hide-scrollbar">
        {weekDates.map((date, idx) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              aria-pressed={isSelected}
              aria-label={date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              className={`flex-shrink-0 w-[64px] sm:w-[72px] h-[76px] sm:h-[84px] rounded-2xl flex flex-col items-center justify-center transition-colors snap-center border ${
                isSelected 
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-md'
                  : isToday 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-white text-zinc-700  hover:border-emerald-700/40 hover:bg-zinc-50'
              }`}
            >
              <span className={`text-xs capitalize font-medium mb-1 ${isSelected ? 'text-white/90' : 'text-zinc-600'}`}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className={`text-xl font-semibold ${isSelected ? 'text-white' : isToday ? 'text-emerald-800' : 'text-zinc-900'}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Selected Date Slots */}
      <motion.div variants={itemVariants} className="mt-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-3 capitalize flex items-center gap-2">
          <CalendarIcon size={20} className="text-emerald-800" />
          {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4"
        >
          {(() => {
            const slots = getAvailableSlots(selectedDate);
            const hasAvailability = bookingSettings.schedule.some(day => day.slots.length > 0);

            if (slots.length === 0) {
              return (
                <motion.div variants={itemVariants} className="col-span-full rounded-3xl border border-dashed border-zinc-200 bg-white px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 shadow-sm">
                    <ClockIcon size={24} />
                  </div>
                  <p className="font-semibold text-zinc-900">{isCoach && state.currentClub?.settings?.booking?.enabled === false ? 'Le planning est désactivé' : 'Aucun créneau disponible ce jour'}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-600">
                    {isCoach && state.currentClub?.settings?.booking?.enabled === false
                      ? 'Activez le planning dans les paramètres pour proposer des créneaux à vos adhérents.'
                      : isCoach
                        ? hasAvailability
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
              const isFull = bookingsForSlot.length >= maxParticipants;
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
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800">{bookingsForSlot.length}/{maxParticipants} confirmé{bookingsForSlot.length === 1 ? '' : 's'}</span>
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
                            {b.status === 'completed' ? <span className="shrink-0 text-xs font-medium text-emerald-900">Terminée</span> : <button type="button" aria-label={`Annuler la séance de ${b.type === 'trial' ? (p?.name || 'ce prospect') : (m?.name || 'ce membre')}`} onClick={() => setConfirmCancelBookingId(b.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"><Trash2Icon size={15}/></button>}
                          </div>
                        );
                      })}
                    </div>
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
                  onClick={() => {
                    setSelectedSlot(slot);
                    if (filterCoachId !== 'all') setSelectedCoachId(filterCoachId);
                    setIsBookingModalOpen(true);
                  }}
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
                      {bookingsForSlot.length}/{maxParticipants} places
                    </div>
                  )}
                  <div className="text-sm font-semibold text-zinc-700 group-hover:text-emerald-900">{isCoach ? "Planifier une séance" : "Réserver"}</div>
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
          >
            <Card className="w-full p-8 bg-white  shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Confirmer la réservation</h2>
                <button onClick={() => setIsBookingModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-50 p-2 rounded-full hover:bg-zinc-100">
                  <XIcon size={24} />
                </button>
              </div>
              
              <div className="space-y-6">
                {isCoach && <label className="block text-sm font-semibold text-zinc-800">Adhérent
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

                <Button 
                  variant="primary" 
                  className="w-full !py-4 shadow-lg shadow-emerald-500/20" 
                  aria-busy={isBooking} onClick={handleBookSlot}
                  disabled={isBooking || (isCoach ? !bookingMemberId : (selectedSlot.sessionTypeId ? (state.user?.sessionCredits?.[selectedSlot.sessionTypeId] || 0) <= 0 : (state.user?.credits || 0) <= 0))}
                >
                  <CheckIcon size={18} className="mr-2" />
                  CONFIRMER LA RÉSERVATION
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

      {confirmCancelBookingId && createPortal(
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
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
