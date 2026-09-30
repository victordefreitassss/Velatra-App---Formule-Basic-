import type { Booking } from '../types';

export type PlanningSlot = { start: Date; end: Date; coachId?: string; sessionTypeId?: string };
export type BookingSchedule = { day: number; slots: { start: string; end: string; sessionTypeId?: string; coachId?: string }[] }[];
export type SessionTypeSchedule = { id: string; duration: number }[];
const parisFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export function parisDateKey(date: Date) {
  const parts = parisFormatter.formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addParisDays(key: string, count: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

export function parisWeekKeys(key: string) {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  const monday = addParisDays(key, -(day + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => addParisDays(monday, index));
}

// Resolve a Paris wall time without depending on the viewer's local timezone.
// An ambiguous autumn hour uses its first occurrence; a missing spring hour is rejected.
export function parisLocalInstant(dayKey: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const base = Date.parse(`${dayKey}T${time}:00Z`);
  if (!Number.isFinite(base)) return null;
  const matches = [2, 1, 0].map(offset => new Date(base - offset * 3600000)).filter(date =>
    parisDateKey(date) === dayKey && parisFormatter.formatToParts(date).find(part => part.type === 'hour')?.value === time.slice(0, 2) &&
    parisFormatter.formatToParts(date).find(part => part.type === 'minute')?.value === time.slice(3));
  return matches.sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

export function generatePlanningSlots(dayKey: string, schedule: BookingSchedule, sessionTypes: SessionTypeSchedule, defaultDuration: number): PlanningSlot[] {
  const day = new Date(`${dayKey}T12:00:00Z`).getUTCDay();
  const result: PlanningSlot[] = [];
  for (const entry of schedule.find(item => item.day === day)?.slots || []) {
    const type = sessionTypes.find(item => item.id === entry.sessionTypeId);
    if (entry.sessionTypeId && !type) continue;
    const duration = type?.duration || defaultDuration;
    const startMinute = Number(entry.start.slice(0, 2)) * 60 + Number(entry.start.slice(3));
    const endMinute = Number(entry.end.slice(0, 2)) * 60 + Number(entry.end.slice(3));
    if (!Number.isInteger(duration) || duration <= 0 || duration > 480 || !Number.isFinite(startMinute) || !Number.isFinite(endMinute)) continue;
    for (let minute = startMinute; minute + duration <= endMinute; minute += duration) {
      const start = parisLocalInstant(dayKey, `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
      const endMinuteOfDay = minute + duration;
      const end = endMinuteOfDay < 1440 ? parisLocalInstant(dayKey, `${String(Math.floor(endMinuteOfDay / 60)).padStart(2, '0')}:${String(endMinuteOfDay % 60).padStart(2, '0')}`) : null;
      if (start && end && end.getTime() - start.getTime() === duration * 60000) result.push({ start, end, coachId: entry.coachId, sessionTypeId: entry.sessionTypeId });
    }
  }
  return result;
}

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
