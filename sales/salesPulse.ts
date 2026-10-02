import { createHash } from 'node:crypto';
import type { User } from '../types.ts';
import type { PulseAction, PulseInput } from '../pulse/pulseModel.ts';
import { trialSignals } from './salesModel.ts';
export function withSalesActions(actions: PulseAction[], input: PulseInput, now: Date, partialSources: string[] = [], coaches: User[] = input.users): PulseAction[] {
  const actor = input.user, club = input.currentClub;
  if (!actor || !club || !['owner', 'manager', 'coach'].includes(actor.role)) return actions;
  const signals = trialSignals({ clubId: club.id, studio: club.accountType === 'studio', prospects: input.prospects, bookings: input.bookings, coaches, events: [], partialSources }, now);
  const own = (b: typeof input.bookings[number]) => actor.role !== 'coach' || signals.joins.coach(b)?.firebaseUid === actor.firebaseUid;
  const result = [...actions];
  const add = (booking: typeof input.bookings[number], followup: boolean, name?: string, prospectUid?: string, reminder?: string) => {
    if (!own(booking)) return;
    const destination = followup && actor.role !== 'coach' && prospectUid ? { page: 'crm_pipeline', prospectUid } as const : { page: 'calendar', bookingId: booking.id } as const;
    result.push({ key: `${followup ? 'trialNoShow' : 'trialAttendance'}:${booking.id}`, type: followup ? 'TRIAL_NO_SHOW_FOLLOWUP' : 'TRIAL_ATTENDANCE_MISSING', category: 'planning', priority: 'high',
      title: name || 'Essai', reason: followup ? 'Dernier essai : no-show · prévoir une relance ou un nouvel essai' : 'Essai passé · présence à renseigner',
      bookingId: booking.id, dueAt: booking.startTime, createdFrom: `bookings/${booking.id}`, destination,
      quickActions: [{ label: followup && actor.role !== 'coach' ? 'Planifier une relance / reprogrammer' : 'Ouvrir l’essai', destination }], group: 'overdue',
      sourceFingerprint: createHash('sha256').update(JSON.stringify([booking.id, booking.attendanceStatus || 'PENDING', booking.attendanceRevision || 0, booking.startTime, booking.status, reminder || null])).digest('hex') });
  };
  signals.missing.forEach(b => add(b, false, signals.joins.prospect(b)?.name));
  signals.noShowFollowups.forEach(({ booking, prospect }) => add(booking, true, prospect.name, prospect.firebaseUid, prospect.nextReminderDate));
  return result.sort((a, b) => a.group.localeCompare(b.group) || (a.dueAt || '').localeCompare(b.dueAt || '') || a.key.localeCompare(b.key));
}
