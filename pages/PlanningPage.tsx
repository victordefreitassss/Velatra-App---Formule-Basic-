import React, { useState, useMemo } from 'react';
import { AppState, Booking, User } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { CalendarIcon, PlusIcon, ClockIcon, UserIcon, CheckIcon, XIcon, TargetIcon } from '../components/Icons';
import { db, collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from '../firebase';

export const PlanningPage: React.FC<{ state: AppState, setState: any, showToast: any }> = ({ state, setState, showToast }) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | null>(null);

  const isCoach = state.user?.role === 'coach' || state.user?.role === 'owner' || state.user?.role === 'superadmin';

  // Get booking settings
  const bookingSettings = state.currentClub?.settings?.booking || {
    sessionDuration: 60,
    schedule: []
  };

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
    const slots: { start: Date, end: Date }[] = [];
    const durationMs = bookingSettings.sessionDuration * 60000;

    if (daySchedule) {
      daySchedule.slots.forEach(timeSlot => {
        const [startHour, startMin] = timeSlot.start.split(':').map(Number);
        const [endHour, endMin] = timeSlot.end.split(':').map(Number);
        
        let currentStart = new Date(date);
        currentStart.setHours(startHour, startMin, 0, 0);
        
        const periodEnd = new Date(date);
        periodEnd.setHours(endHour, endMin, 0, 0);

        while (currentStart.getTime() + durationMs <= periodEnd.getTime()) {
          const currentEnd = new Date(currentStart.getTime() + durationMs);
          slots.push({ start: new Date(currentStart), end: new Date(currentEnd) });
          currentStart = new Date(currentStart.getTime() + durationMs);
        }
      });
    }

    // Add any bookings that are not in the generated slots
    const dayBookings = getBookingsForDate(date);
    dayBookings.forEach(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const exists = slots.some(s => s.start.getTime() === bStart.getTime());
      if (!exists) {
        slots.push({ start: bStart, end: bEnd });
      }
    });

    // Sort slots by start time
    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !state.user || !state.user.clubId) return;

    if (!isCoach) {
      if ((state.user.credits || 0) <= 0) {
        showToast("Vous n'avez pas assez de crédits pour réserver.", "error");
        return;
      }

      const now = new Date();
      const hoursUntilSlot = (selectedSlot.start.getTime() - now.getTime()) / (1000 * 60 * 60);
      const minAdvance = bookingSettings.minAdvanceBookingHours || 0;
      
      if (hoursUntilSlot < minAdvance) {
        showToast(`Vous devez réserver au moins ${minAdvance}h à l'avance.`, "error");
        return;
      }

      const maxBookings = bookingSettings.maxBookingsPerWeek || 0;
      if (maxBookings > 0) {
        // Calculate start and end of current week
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const bookingsThisWeek = state.bookings.filter(b => 
          b.memberId === Number(state.user?.id) && 
          b.status === 'confirmed' &&
          new Date(b.startTime) >= startOfWeek &&
          new Date(b.startTime) <= endOfWeek
        ).length;

        if (bookingsThisWeek >= maxBookings) {
          showToast(`Vous avez atteint la limite de ${maxBookings} réservations cette semaine.`, "error");
          return;
        }
      }
    }

    try {
      const newBooking: Omit<Booking, 'id'> = {
        clubId: state.user.clubId,
        memberId: Number(state.user.id),
        coachId: state.currentClub?.ownerId || '', // Assuming owner is the coach for now
        startTime: selectedSlot.start.toISOString(),
        endTime: selectedSlot.end.toISOString(),
        status: 'confirmed',
        type: 'coaching'
      };

      await addDoc(collection(db, "bookings"), newBooking);

      if (!isCoach && state.user.firebaseUid) {
        await updateDoc(doc(db, "users", state.user.firebaseUid), {
          credits: (state.user.credits || 0) - 1
        });
      }

      showToast("Réservation confirmée !");
      setIsBookingModalOpen(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error("Error booking slot:", error);
      showToast("Erreur lors de la réservation", "error");
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

    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;

    try {
      if (booking.id) {
        await updateDoc(doc(db, "bookings", booking.id), { status: 'cancelled' });

        // Refund credit
        const member = state.users.find(u => Number(u.id) === booking.memberId);
        if (member && member.firebaseUid) {
          await updateDoc(doc(db, "users", member.firebaseUid), {
            credits: (member.credits || 0) + 1
          });
        }

        showToast("Réservation annulée et crédit remboursé.");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      showToast("Erreur lors de l'annulation", "error");
    }
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
             b.status === 'confirmed';
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  return (
    <div className="space-y-8 page-transition pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-zinc-900 leading-none">Planning</h1>
          <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-[3px] mt-2">Réservation de Séances</p>
        </div>
        {!isCoach && (
          <div className="bg-velatra-accent/10 px-4 py-2 rounded-2xl flex items-center gap-3">
            <TargetIcon size={20} className="text-velatra-accent" />
            <div>
              <div className="text-[10px] uppercase font-bold text-velatra-accent tracking-widest">Crédits restants</div>
              <div className="text-xl font-black text-zinc-900 leading-none">{state.user?.credits || 0}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-zinc-200 shadow-sm">
        <Button variant="secondary" className="!px-3" onClick={() => setCurrentWeekOffset(prev => prev - 1)}>&larr;</Button>
        <div className="font-bold text-zinc-900 text-sm md:text-base text-center">
          Semaine du {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </div>
        <Button variant="secondary" className="!px-3" onClick={() => setCurrentWeekOffset(prev => prev + 1)}>&rarr;</Button>
      </div>

      {/* Mobile-first Date Strip */}
      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x hide-scrollbar">
        {weekDates.map((date, idx) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 w-[72px] h-[88px] rounded-2xl flex flex-col items-center justify-center transition-all snap-center border ${
                isSelected 
                  ? 'bg-velatra-accent text-white border-velatra-accent shadow-lg shadow-velatra-accent/30 scale-105' 
                  : isToday 
                    ? 'bg-velatra-accent/10 text-velatra-accent border-velatra-accent/20' 
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-velatra-accent/30'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isSelected ? 'text-white/80' : ''}`}>
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className={`text-2xl font-black ${isSelected ? 'text-white' : isToday ? 'text-velatra-accent' : 'text-zinc-900'}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Date Slots */}
      <div className="mt-4">
        <h2 className="text-lg font-black text-zinc-900 mb-4 capitalize flex items-center gap-2">
          <CalendarIcon size={20} className="text-velatra-accent" />
          {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            const slots = getAvailableSlots(selectedDate);
            const dayBookings = getBookingsForDate(selectedDate);

            if (slots.length === 0) {
              return (
                <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-zinc-200 border-dashed">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <ClockIcon size={24} />
                  </div>
                  <p className="text-zinc-500 font-medium">Aucun créneau disponible ce jour</p>
                </div>
              );
            }

            return slots.map((slot, sIdx) => {
              const bookingForSlot = dayBookings.find(b => new Date(b.startTime).getTime() === slot.start.getTime());
              const isPast = slot.start.getTime() < new Date().getTime();

              if (bookingForSlot) {
                const isMyBooking = bookingForSlot.memberId === Number(state.user?.id);
                const member = state.users.find(u => Number(u.id) === bookingForSlot.memberId);
                
                const bgColor = isCoach ? 'bg-zinc-900 text-white' : (isMyBooking ? 'bg-velatra-accent text-white shadow-lg shadow-velatra-accent/20' : 'bg-zinc-50 text-zinc-500 border border-zinc-200');
                
                return (
                  <div key={sIdx} className={`${bgColor} p-4 rounded-2xl flex flex-col justify-between min-h-[100px] ${isPast ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-black text-lg">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                      {isMyBooking && !isCoach && (
                        <Badge variant="dark" className="!bg-white/20 !text-white !border-none">Ma séance</Badge>
                      )}
                    </div>
                    
                    {isCoach ? (
                      <div className="flex items-center gap-2 text-zinc-300 text-sm mb-3 bg-white/10 p-2 rounded-xl">
                        <UserIcon size={14} /> <span className="font-bold">{member?.name || 'Inconnu'}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-3 font-bold">
                        {isMyBooking ? 'Réservé' : 'Indisponible'}
                      </div>
                    )}
                    
                    {(isCoach || isMyBooking) && !isPast && (
                      <Button variant="secondary" className={`w-full !py-2 !text-xs ${isCoach ? 'border-zinc-700 hover:bg-zinc-800 text-white' : 'border-white/30 hover:bg-white/20 text-white'}`} onClick={() => handleCancelBooking(bookingForSlot)}>
                        Annuler la réservation
                      </Button>
                    )}
                  </div>
                );
              }

              if (isPast) {
                return (
                  <div key={sIdx} className="p-4 rounded-2xl border border-dashed border-zinc-200 text-zinc-400 bg-zinc-50/50 flex flex-col justify-center min-h-[100px]">
                    <div className="font-black text-lg mb-1">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold">Créneau passé</div>
                  </div>
                );
              }

              if (isCoach) {
                return (
                  <div key={sIdx} className="p-4 rounded-2xl border border-dashed border-zinc-200 text-zinc-500 bg-white flex flex-col justify-center min-h-[100px]">
                    <div className="font-black text-lg mb-1">{formatTime(slot.start)} - {formatTime(slot.end)}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold">Créneau libre</div>
                  </div>
                );
              }

              return (
                <button
                  key={sIdx}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setIsBookingModalOpen(true);
                  }}
                  className="p-4 rounded-2xl border border-zinc-200 hover:border-velatra-accent hover:bg-velatra-accent/5 transition-all text-zinc-900 bg-white flex flex-col justify-center items-center group min-h-[100px] shadow-sm hover:shadow-md"
                >
                  <div className="font-black text-xl mb-1 group-hover:text-velatra-accent transition-colors">{formatTime(slot.start)}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 group-hover:text-velatra-accent/70">Réserver</div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {isBookingModalOpen && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 bg-white border-zinc-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Confirmer la réservation</h2>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-zinc-500 hover:text-zinc-900">
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-velatra-accent/10 rounded-xl flex items-center justify-center text-velatra-accent">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Date & Heure</div>
                  <div className="font-bold text-zinc-900 capitalize">{formatDate(selectedSlot.start)}</div>
                  <div className="text-sm text-zinc-600">{formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</div>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Coût</div>
                  <div className="font-bold text-zinc-900">1 Crédit Coaching</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Solde actuel</div>
                  <div className={`font-bold ${((state.user?.credits || 0) > 0) ? 'text-emerald-500' : 'text-red-500'}`}>
                    {state.user?.credits || 0} Crédits
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full !py-4" 
                onClick={handleBookSlot}
                disabled={(state.user?.credits || 0) <= 0}
              >
                <CheckIcon size={18} className="mr-2" />
                CONFIRMER LA RÉSERVATION
              </Button>
              
              {(state.user?.credits || 0) <= 0 && (
                <p className="text-xs text-center text-red-500 font-bold">
                  Vous n'avez pas assez de crédits pour réserver cette séance.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
