import { legacyProspectNumericId } from '../server/prospectIdentity.ts';
import type { AttendanceStatus, Booking, Prospect, User } from '../types.ts';
export type SalesEventType = 'LEAD_CREATED' | 'CONTACTED' | 'TRIAL_BOOKED' | 'TRIAL_SHOWED_UP' | 'TRIAL_NO_SHOW' | 'TRIAL_CANCELLED' | 'CONVERTED' | 'LOST';
export interface SalesEvent { id?: string; clubId: string; prospectUid: string; eventType: SalesEventType; at: string; actorUid?: string; bookingId?: string; coachUid?: string; sourceSnapshot?: string; correction?: boolean; }
export interface SalesInput { clubId: string; studio: boolean; prospects: Prospect[]; bookings: Booking[]; events: SalesEvent[]; coaches: User[]; partialSources?: string[]; }
export type TrialGroup = 'upcoming' | 'missing' | 'showed' | 'noShow' | 'cancelled';
export const trialGroupLabels: Record<TrialGroup, string> = { upcoming: 'À venir', missing: 'Présence à renseigner', showed: 'Présents', noShow: 'No-show', cancelled: 'Annulés' };
export const attendanceLabels = { PENDING: 'Non renseignée', SHOWED_UP: 'Présent', NO_SHOW: 'No-show', CANCELLED: 'Annulé' };
export function attendance(booking: Booking): AttendanceStatus {
  // Cancellation is authoritative; a technical completion is never presence evidence.
  if (booking.status === 'cancelled') return 'CANCELLED' as AttendanceStatus;
  return (['SHOWED_UP', 'NO_SHOW', 'CANCELLED'].includes(booking.attendanceStatus || '') ? booking.attendanceStatus : 'PENDING') as AttendanceStatus;
}
export function trialGroup(booking: Booking, now: Date): TrialGroup {
  const state = attendance(booking);
  return state === 'CANCELLED' ? 'cancelled' : state === 'SHOWED_UP' ? 'showed' : state === 'NO_SHOW' ? 'noShow' : Date.parse(booking.startTime) > now.getTime() ? 'upcoming' : 'missing';
}
export const normalizeSource = (source?: string) => source?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || 'non renseignee';
export const stamp = (value?: string) => value ? Date.parse(value) : NaN;
export function uniqueIndex<T>(rows: T[], key: (row: T) => string): Map<string, T | null> {
  const result = new Map<string, T | null>();
  rows.forEach(row => { const id = key(row); if (id) result.set(id, result.has(id) ? null : row); });
  return result;
}
export function salesJoins(input: SalesInput) {
  const prospects = input.prospects.filter(p => p.clubId === input.clubId && p.firebaseUid);
  const byUid = uniqueIndex(prospects, p => p.firebaseUid!);
  const byId = uniqueIndex(prospects, p => String(Number.isSafeInteger(Number(p.id)) && Number(p.id) > 0 ? Number(p.id) : legacyProspectNumericId(p.firebaseUid!)));
  const coaches = input.coaches.filter(c => c.clubId === input.clubId && ['owner', 'coach'].includes(c.role) && c.firebaseUid);
  const coachUid = uniqueIndex(coaches, c => c.firebaseUid!);
  const coachId = uniqueIndex(coaches, c => String(c.id));
  return {
    prospect: (b: Booking) => b.clubId !== input.clubId ? null : b.prospectUid ? byUid.get(b.prospectUid) || null : !input.partialSources?.includes('prospects') ? byId.get(String(b.prospectId)) || null : null,
    coach: (b: Booking) => b.clubId !== input.clubId ? null : b.coachUid ? coachUid.get(b.coachUid) || null : coachUid.has(b.coachId) ? coachUid.get(b.coachId) || null : !input.partialSources?.includes('users') ? coachId.get(String(b.coachId)) || null : null,
    prospects: [...byUid.values()].filter((p): p is Prospect => !!p),
  };
}
export function lastShowedCoach(trials: Booking[], convertedAt: string | undefined, resolve: (b: Booking) => User | null): string | null {
  const end = stamp(convertedAt);
  if (!Number.isFinite(end)) return null;
  const eligible = trials.filter(b => attendance(b) === 'SHOWED_UP' && stamp(b.startTime) <= end && (!(b.attendanceUpdatedAt || b.attendanceMarkedAt) || stamp(b.attendanceUpdatedAt || b.attendanceMarkedAt) <= end));
  const latest = Math.max(...eligible.map(b => stamp(b.startTime)));
  const last = eligible.filter(b => stamp(b.startTime) === latest);
  // A tied appointment or an unresolved coach cannot support attribution.
  return last.length === 1 ? resolve(last[0])?.firebaseUid || null : null;
}
export function trialSignals(input: SalesInput, now: Date) {
  const joins = salesJoins(input), rows = input.bookings.filter(b => b.clubId === input.clubId && b.type === 'trial' && Number.isFinite(stamp(b.startTime)));
  const byProspect = new Map<string, Booking[]>();
  for (const b of rows) { const uid = joins.prospect(b)?.firebaseUid; if (uid) { const list = byProspect.get(uid) || []; list.push(b); byProspect.set(uid, list); } }
  const missing = rows.filter(b => trialGroup(b, now) === 'missing');
  const noShowFollowups: { booking: Booking; prospect: Prospect }[] = [];
  if (!input.partialSources?.some(s => ['bookings', 'prospects'].includes(s))) for (const p of joins.prospects) {
    if (p.convertedMemberUid || ['won', 'lost'].includes(p.status) || Number.isFinite(stamp(p.nextReminderDate))) continue;
    const trials = byProspect.get(p.firebaseUid!) || [];
    if (trials.some(b => b.status === 'confirmed' && stamp(b.startTime) > now.getTime())) continue;
    const past = trials.filter(b => stamp(b.startTime) <= now.getTime()).sort((a, b) => stamp(b.startTime) - stamp(a.startTime));
    if (past.length && (past.length === 1 || stamp(past[0].startTime) !== stamp(past[1].startTime)) && attendance(past[0]) === 'NO_SHOW') noShowFollowups.push({ booking: past[0], prospect: p });
  }
  return { missing, noShowFollowups, byProspect, joins };
}
