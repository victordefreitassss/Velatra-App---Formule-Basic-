import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { MemberCreationError as BookingError } from './createMember';

const fail = (status: number, message: string): never => { throw new BookingError(status, message); };
const dayParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  const key = `${get('year')}-${get('month')}-${get('day')}`;
  return { key, day: new Date(`${key}T12:00:00Z`).getUTCDay(), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

export async function reserveBooking(db: Firestore, uid: string, input: any) {
  const start = new Date(input?.startTime), end = new Date(input?.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start || end.getTime() - start.getTime() > 8 * 3600000) fail(400, 'Choisissez un créneau futur valide.');
  const profileRef = db.doc(`users/${uid}`);
  const initial = (await profileRef.get()).data();
  if (!initial?.clubId) fail(403, 'Votre espace est introuvable.');
  const memberId = initial!.role === 'member' ? initial!.id : Number(input?.memberId);
  const memberSnapshot = await db.collection('users').where('clubId', '==', initial!.clubId).where('id', '==', memberId).where('role', '==', 'member').limit(1).get();
  if (memberSnapshot.empty) fail(404, 'Choisissez un adhérent de votre espace.');
  const memberRef = memberSnapshot.docs[0].ref;
  const coachKey = String(input?.coachId || '');
  const roster = await db.collection('users').where('clubId', '==', initial!.clubId).get();
  const coach = roster.docs.find(d => (d.id === coachKey || String(d.data().id) === coachKey) && ['owner', 'coach'].includes(d.data().role));
  if (!coach) fail(400, 'Choisissez un coach de votre espace.');
  const local = dayParts(start);
  const lockRef = db.doc(`bookingLocks/${initial!.clubId}_${coach!.id}_${local.key}`);
  const id = createHash('sha256').update(`${initial!.clubId}:${memberRef.id}:${coach!.id}:${start.toISOString()}`).digest('hex');
  const bookingRef = db.doc(`bookings/${id}`);
  return db.runTransaction(async tx => {
    const [profileDoc, memberDoc, clubDoc, lock, previous, active] = await Promise.all([
      tx.get(profileRef), tx.get(memberRef), tx.get(db.doc(`clubs/${initial!.clubId}`)), tx.get(lockRef), tx.get(bookingRef),
      tx.get(db.collection('bookings').where('clubId', '==', initial!.clubId).where('status', '==', 'confirmed'))
    ]);
    const profile = profileDoc.data(), member = memberDoc.data(), settings = clubDoc.data()?.settings?.booking;
    if (profile?.clubId !== initial!.clubId || member?.clubId !== initial!.clubId || member?.role !== 'member') fail(403, 'Vos droits ont changé. Rechargez votre espace.');
    if (!(profile!.role === 'owner' || profile!.role === 'member' && memberRef.id === uid || profile!.role === 'coach' && member!.assignedCoachUid === uid)) fail(403, 'Cet adhérent ne vous est pas affecté.');
    if (settings?.enabled === false) fail(409, 'Les réservations sont désactivées pour cet espace.');
    if (previous.exists && previous.data()?.status === 'confirmed') return { success: true, id, alreadyBooked: true };
    const sessionType = settings?.sessionTypes?.find((t: any) => t.id === input.sessionTypeId);
    const creditKey = sessionType ? `sessionCredits.${sessionType.id}` : 'credits';
    const duration = sessionType?.duration || settings?.sessionDuration || 60;
    const minutes = (value: string) => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
    const slot = settings?.schedule?.find((s: any) => s.day === local.day)?.slots?.find((s: any) =>
      (!s.coachId || [coach!.id, String(coach!.data().id)].includes(String(s.coachId))) &&
      (s.sessionTypeId || '') === (input.sessionTypeId || '') &&
      local.minutes >= minutes(s.start) && local.minutes + duration <= minutes(s.end) && (local.minutes - minutes(s.start)) % duration === 0);
    if (!slot || end.getTime() - start.getTime() !== duration * 60000) fail(400, 'Ce créneau ne correspond plus aux disponibilités. Rechargez le planning.');
    const overlaps = active.docs.map(d => d.data()).filter(b => new Date(b.startTime) < end && new Date(b.endTime) > start);
    if (overlaps.some(b => b.memberId === memberId) || overlaps.filter(b => [coach!.id, String(coach!.data().id)].includes(String(b.coachId))).length >= (sessionType?.maxParticipants || 1)) fail(409, 'Ce créneau vient d’être réservé. Choisissez un autre horaire.');
    const debit = profile!.role === 'member';
    if (debit) {
      if ((start.getTime() - Date.now()) / 3600000 < (settings?.minAdvanceBookingHours || 0)) fail(409, 'Ce créneau est trop proche pour être réservé.');
      const credits = sessionType ? member!.sessionCredits?.[sessionType.id] : member!.credits;
      if (!(credits > 0)) fail(409, 'Vous n’avez pas assez de crédits pour cette séance.');
      const monday = new Date(`${local.key}T12:00:00Z`); monday.setUTCDate(monday.getUTCDate() - (local.day + 6) % 7);
      const weekEnd = new Date(monday); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const weekCount = active.docs.filter(d => { const b = d.data(); const key = dayParts(new Date(b.startTime)).key; return b.memberId === memberId && key >= monday.toISOString().slice(0, 10) && key < weekEnd.toISOString().slice(0, 10); }).length;
      if (settings?.maxBookingsPerWeek > 0 && weekCount >= settings.maxBookingsPerWeek) fail(409, 'Vous avez atteint la limite de réservations pour cette semaine.');
      tx.update(memberRef, { [creditKey]: credits - 1 });
    }
    tx.set(lockRef, { revision: (lock.data()?.revision || 0) + 1 });
    tx.set(bookingRef, { id, clubId: profile!.clubId, memberId, memberUid: memberRef.id, coachId: String(coach!.data().id), startTime: start.toISOString(), endTime: end.toISOString(), type: 'coaching', status: 'confirmed', creditDebited: debit, ...(sessionType ? { sessionTypeId: sessionType.id } : {}), ...(member!.assignedCoachUid ? { assignedCoachUid: member!.assignedCoachUid } : {}) });
    return { success: true, id };
  });
}

export async function cancelBooking(db: Firestore, uid: string, id: string) {
  if (!id || id.includes('/') || id.length > 200) fail(400, 'Réservation invalide.');
  return db.runTransaction(async tx => {
    const bookingRef = db.doc(`bookings/${id}`);
    const [profileDoc, bookingDoc] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(bookingRef)]);
    const profile = profileDoc.data(), booking = bookingDoc.data();
    if (!booking || !profile || booking.clubId !== profile.clubId || !(profile.role === 'owner' || profile.role === 'coach' && booking.assignedCoachUid === uid || profile.role === 'member' && booking.memberId === profile.id)) fail(403, 'Vous ne pouvez pas annuler cette réservation.');
    if (booking!.status === 'cancelled') return { success: true, refunded: false };
    if (booking!.status !== 'confirmed') fail(409, 'Cette séance ne peut plus être annulée.');
    const club = await tx.get(db.doc(`clubs/${profile!.clubId}`));
    if (profile!.role === 'member' && (new Date(booking!.startTime).getTime() - Date.now()) / 3600000 < (club.data()?.settings?.booking?.minCancellationHours || 0)) fail(409, 'Le délai d’annulation est dépassé. Contactez votre coach.');
    const refund = booking!.creditDebited === true && typeof booking!.memberUid === 'string';
    if (refund) {
      const memberRef = db.doc(`users/${booking!.memberUid}`);
      const member = await tx.get(memberRef);
      if (!member.exists || member.data()?.clubId !== booking!.clubId) fail(409, 'Le profil de cet adhérent doit être vérifié.');
      tx.update(memberRef, { [booking!.sessionTypeId ? `sessionCredits.${booking!.sessionTypeId}` : 'credits']: FieldValue.increment(1) });
    }
    tx.update(bookingRef, { status: 'cancelled', creditDebited: false });
    return { success: true, refunded: refund };
  });
}
