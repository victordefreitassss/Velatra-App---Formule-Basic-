import type { Booking } from '../types';

export type PlanningSlot = { start: Date; end: Date; coachId?: string; sessionTypeId?: string };

// A generic availability and its coach's reservation describe the same time slot.
// Keep each reservation on one card, while preserving parallel coach sessions.
export function attachBookingsToSlots(availability: PlanningSlot[], bookings: Booking[], coachFilter = 'all') {
  const slots = availability.map(slot => ({ ...slot, bookings: [] as Booking[] }));
  for (const booking of bookings) {
    if (booking.status !== 'confirmed' && booking.status !== 'completed') continue;
    const start = new Date(booking.startTime), end = new Date(booking.endTime);
    const matchesTime = (slot: PlanningSlot) => slot.start.getTime() === start.getTime()
      && slot.end.getTime() === end.getTime()
      && (slot.sessionTypeId || '') === (booking.sessionTypeId || '');
    const slot = slots.find(s => matchesTime(s) && s.coachId === booking.coachId)
      || slots.find(s => matchesTime(s) && !s.coachId);
    if (slot) slot.bookings.push(booking);
    else slots.push({ start, end, coachId: booking.coachId, sessionTypeId: booking.sessionTypeId, bookings: [booking] });
  }
  return slots
    .filter(slot => coachFilter === 'all' || !slot.coachId || slot.coachId === coachFilter)
    .map(slot => ({ ...slot, bookings: slot.bookings.filter(b => coachFilter === 'all' || b.coachId === coachFilter) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function shiftPlanningWeek(date: Date, delta: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta * 7);
  return next;
}
