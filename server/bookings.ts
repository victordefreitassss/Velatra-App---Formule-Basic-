import { enqueueNotification } from './notifications.ts';
import { salesActivity, salesEvent, trialReferences } from './salesEvents.ts';
import { staffReader } from './staffFacts.ts';
import { authorizationActor, canOperateStudio, canAssignMembers } from './authorization.ts';
import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { MemberCreationError as BookingError } from './createMember.ts';
import { legacyProspectNumericId } from './prospectIdentity.ts';

const fail = (status: number, message: string): never => { throw new BookingError(status, message); };
const PARIS = 'Europe/Paris';
const isoDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
const interval = (input: any) => {
  if (!isoDate(input?.startTime) || !isoDate(input?.endTime)) fail(400, 'Choisissez un créneau futur valide.');
  const start = new Date(input.startTime), end = new Date(input.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start <= new Date() || end <= start || end.getTime() - start.getTime() > 8 * 3600000) fail(400, 'Choisissez un créneau futur valide.');
  return { start, end };
};

export const parisDayParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  const key = `${get('year')}-${get('month')}-${get('day')}`;
  return { key, day: new Date(`${key}T12:00:00Z`).getUTCDay(), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

const minutes = (value: unknown) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
};
const coachMatches = (coach: FirebaseFirestore.DocumentSnapshot, coachId: unknown) =>
  [coach.id, String(coach.data()?.id)].includes(String(coachId));

function validateSlot(settings: any, coach: FirebaseFirestore.DocumentSnapshot, input: any, start: Date, end: Date) {
  if (settings?.enabled === false) fail(409, 'Les réservations sont désactivées pour cet espace.');
  const requestedType = typeof input.sessionTypeId === 'string' && input.sessionTypeId ? input.sessionTypeId : undefined;
  const sessionType = requestedType ? settings?.sessionTypes?.find((type: any) => type.id === requestedType) : undefined;
  if (requestedType && !sessionType) fail(400, 'Ce type de séance n’est plus disponible.');
  const duration = Number(sessionType?.duration || settings?.sessionDuration || 60);
  const capacity = Number(sessionType?.maxParticipants || 1);
  if (!Number.isInteger(duration) || duration < 1 || duration > 480 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) fail(409, 'Les paramètres de réservation doivent être vérifiés.');
  const local = parisDayParts(start), localEnd = parisDayParts(end);
  // A slot is expressed in Paris wall time. Reject intervals crossing a date or a DST
  // discontinuity rather than offering a misleading local duration.
  if (local.key !== localEnd.key || localEnd.minutes - local.minutes !== duration || end.getTime() - start.getTime() !== duration * 60000) fail(400, 'Ce créneau ne correspond plus aux disponibilités.');
  const slot = settings?.schedule?.find((day: any) => day.day === local.day)?.slots?.find((entry: any) =>
    (!entry.coachId || coachMatches(coach, entry.coachId)) &&
    (entry.sessionTypeId || '') === (requestedType || '') &&
    local.minutes >= minutes(entry.start) && local.minutes + duration <= minutes(entry.end) &&
    (local.minutes - minutes(entry.start)) % duration === 0);
  if (!slot) fail(400, 'Ce créneau ne correspond plus aux disponibilités. Rechargez le planning.');
  return { local, sessionType, capacity };
}

function assertAccess(profile: any, member: any, memberUid: string, coachUid: string, club: any) {
  if (profile?.isSuspended === true || member?.isSuspended === true || club?.isActive === false) fail(403, 'Compte indisponible.');
  if (!profile || !member || profile.clubId !== member.clubId || member.role !== 'member') fail(403, 'Vos droits ont changé. Rechargez votre espace.');
  if (canAssignMembers(authorizationActor(profile, club), member.clubId)) return;
  if (profile.role === 'coach' && member.assignedCoachUid === profile.firebaseUid && coachUid === profile.firebaseUid) return;
  if (profile.role === 'member' && memberUid === profile.firebaseUid &&
    (member.assignedCoachUid ? coachUid === member.assignedCoachUid : club?.accountType !== 'studio' && coachUid === club?.ownerId)) return;
  fail(403, 'Cet adhérent ou ce coach ne vous est pas affecté.');
}

function assertNoConflict(active: FirebaseFirestore.QuerySnapshot, candidate: { start: Date; end: Date; memberId: number; coachId: string; coachUid: string; sessionTypeId?: string; capacity: number }, excludeId?: string) {
  let groupCount = 0;
  for (const doc of active.docs) {
    if (doc.id === excludeId) continue;
    const booking = doc.data();
    if (new Date(booking.startTime) >= candidate.end || new Date(booking.endTime) <= candidate.start) continue;
    if (Number(booking.memberId) === candidate.memberId) fail(409, 'Cet adhérent a déjà une séance sur cet horaire.');
    if (![candidate.coachId, candidate.coachUid].includes(String(booking.coachId))) continue;
    const sameGroup = candidate.capacity > 1 && new Date(booking.startTime).getTime() === candidate.start.getTime() &&
      new Date(booking.endTime).getTime() === candidate.end.getTime() &&
      (booking.sessionTypeId || '') === (candidate.sessionTypeId || '') && booking.type === 'coaching';
    if (!sameGroup) fail(409, 'Ce coach est déjà occupé sur cet horaire.');
    groupCount++;
  }
  if (groupCount >= candidate.capacity) fail(409, 'Ce créneau est complet. Choisissez un autre horaire.');
}

function weekBounds(local: ReturnType<typeof parisDayParts>) {
  const monday = new Date(`${local.key}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (local.day + 6) % 7);
  const weekEnd = new Date(monday); weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return [monday.toISOString().slice(0, 10), weekEnd.toISOString().slice(0, 10)];
}
function assertMemberLimits(active: FirebaseFirestore.QuerySnapshot, memberId: number, local: ReturnType<typeof parisDayParts>, start: Date, settings: any, excludeId?: string) {
  if ((start.getTime() - Date.now()) / 3600000 < (settings?.minAdvanceBookingHours || 0)) fail(409, 'Ce créneau est trop proche pour être réservé.');
  const [first, last] = weekBounds(local);
  const count = active.docs.filter(doc => {
    if (doc.id === excludeId) return false;
    const booking = doc.data(), key = parisDayParts(new Date(booking.startTime)).key;
    return Number(booking.memberId) === memberId && key >= first && key < last;
  }).length;
  if (settings?.maxBookingsPerWeek > 0 && count >= settings.maxBookingsPerWeek) fail(409, 'Vous avez atteint la limite de réservations pour cette semaine.');
}

const coachDayLock = (db: Firestore, clubId: string, coachUid: string, day: string) => db.doc(`bookingLocks/${clubId}_coach_${coachUid}_${day}`);
const memberDayLock = (db: Firestore, clubId: string, memberUid: string, day: string) => db.doc(`bookingLocks/${clubId}_member_${memberUid}_${day}`);
function bumpLocks(tx: Transaction, snapshots: FirebaseFirestore.DocumentSnapshot[]) {
  for (const snapshot of snapshots) tx.set(snapshot.ref, { revision: (snapshot.data()?.revision || 0) + 1 });
}

export async function reserveBooking(db: Firestore, uid: string, input: any) {
  const { start, end } = interval(input);
  const profileRef = db.doc(`users/${uid}`), initial = (await profileRef.get()).data();
  if (!initial?.clubId) fail(403, 'Votre espace est introuvable.');
  const memberId = initial.role === 'member' ? Number(initial.id) : Number(input?.memberId);
  if (!Number.isSafeInteger(memberId)) fail(400, 'Choisissez un adhérent.');
  const roster = await db.collection('users').where('clubId', '==', initial.clubId).get();
  const member = roster.docs.find(doc => Number(doc.data().id) === memberId && doc.data().role === 'member');
  const coach = roster.docs.find(doc => coachMatches(doc, input?.coachId) && ['owner', 'coach'].includes(doc.data().role));
  if (!member) fail(404, 'Choisissez un adhérent de votre espace.');
  if (!coach) fail(400, 'Choisissez un coach de votre espace.');
  const local = parisDayParts(start);
  const locks = [coachDayLock(db, initial.clubId, coach.id, local.key), memberDayLock(db, initial.clubId, member.id, local.key)];
  const id = createHash('sha256').update(`${initial.clubId}:${member.id}:${coach.id}:${start.toISOString()}`).digest('hex');
  const bookingRef = db.doc(`bookings/${id}`);
  return db.runTransaction(async tx => {
    const [profileDoc, memberDoc, coachDoc, clubDoc, previous, active, ...lockDocs] = await Promise.all([
      tx.get(profileRef), tx.get(member.ref), tx.get(coach.ref), tx.get(db.doc(`clubs/${initial.clubId}`)), tx.get(bookingRef),
      tx.get(db.collection('bookings').where('clubId', '==', initial.clubId).where('status', '==', 'confirmed')),
      ...locks.map(ref => tx.get(ref))
    ]);
    const profile = profileDoc.data(), memberData = memberDoc.data(), coachData = coachDoc.data(), club = clubDoc.data();
    if (profile?.clubId !== initial.clubId || coachData?.clubId !== initial.clubId || coachData?.isSuspended === true || !['owner', 'coach'].includes(coachData?.role)) fail(403, 'Vos droits ont changé. Rechargez votre espace.');
    assertAccess({ ...profile, firebaseUid: uid }, memberData, member.id, coach.id, club);
    if (previous.exists) {
      const old = previous.data()!;
      if (old.clubId !== initial.clubId || old.memberUid !== member.id || Number(old.memberId) !== memberId ||
        ![coach.id, String(coachData.id)].includes(String(old.coachId)) || old.startTime !== start.toISOString() || old.endTime !== end.toISOString() || old.type !== 'coaching') fail(409, 'Cette réservation doit être vérifiée.');
      if (old.status === 'confirmed') return { success: true, id, alreadyBooked: true };
    }
    const settings = club?.settings?.booking;
    const { local: slotLocal, sessionType, capacity } = validateSlot(settings, coachDoc, input, start, end);
    assertNoConflict(active, { start, end, memberId, coachId: String(coachData.id), coachUid: coach.id, sessionTypeId: sessionType?.id, capacity });
    const debit = profile!.role === 'member';
    if (debit) {
      assertMemberLimits(active, memberId, slotLocal, start, settings);
      const credits = sessionType ? memberData?.sessionCredits?.[sessionType.id] : memberData?.credits;
      if (!(credits > 0)) fail(409, 'Vous n’avez pas assez de crédits pour cette séance.');
      tx.update(member.ref, { [sessionType ? `sessionCredits.${sessionType.id}` : 'credits']: credits - 1 });
    }
    bumpLocks(tx, lockDocs);
    tx.set(bookingRef, { id, clubId: initial.clubId, memberId, memberUid: member.id, coachId: String(coachData.id),
      coachUid: coach.id, notificationRevision: (previous.data()?.notificationRevision || 0) + 1,
      startTime: start.toISOString(), endTime: end.toISOString(), type: 'coaching', status: 'confirmed', creditDebited: debit,
      ...(sessionType ? { sessionTypeId: sessionType.id } : {}), ...(memberData?.assignedCoachUid ? { assignedCoachUid: memberData.assignedCoachUid } : {}) });
    for (const recipientUid of [member.id, coach.id]) enqueueNotification(tx, db, { clubId: initial.clubId, recipientUid, actorUid: uid, type: 'BOOKING_CREATED', eventKey: `booking-created:${id}:${(previous.data()?.notificationRevision || 0) + 1}`, destination: { velatraPage: 'calendar', planningBookingId: id }, sourceId: id, sourceType: 'booking' });
    return { success: true, id };
  });
}

export async function cancelBooking(db: Firestore, uid: string, id: string) {
  if (!id || id.includes('/') || id.length > 200) fail(400, 'Réservation invalide.');
  return db.runTransaction(async tx => {
    const bookingRef = db.doc(`bookings/${id}`);
    const [profileDoc, bookingDoc] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(bookingRef)]);
    const profile = profileDoc.data(), booking = bookingDoc.data();
    if (!booking || !profile || booking.clubId !== profile.clubId) fail(403, 'Vous ne pouvez pas annuler cette réservation.');
    if (booking.type === 'trial') {
      const reader = await staffReader(db, uid, tx);
      const { prospectDoc, prospect, coachDoc } = await trialReferences(db, tx, booking);
      if (reader.actor.role === 'coach' && coachDoc.id !== uid) fail(403, 'Cet essai ne vous est pas affecté.');
      if (booking.status === 'cancelled') return { success: true, refunded: false };
      if (booking.status !== 'confirmed' || booking.attendanceStatus && booking.attendanceStatus !== 'PENDING') fail(409, 'Une présence finalisée ne peut pas être annulée.');
      const at = new Date().toISOString();
      const event = salesEvent(db, `trial:${id}:cancelled`, 'TRIAL_CANCELLED', prospectDoc.id, prospect, at, uid, { bookingId: id, coachUid: coachDoc.id });
      tx.update(bookingRef, { status: 'cancelled', attendanceStatus: 'CANCELLED', attendanceUpdatedAt: at, attendanceUpdatedByUid: uid, prospectUid: prospectDoc.id, coachUid: coachDoc.id, creditDebited: false });
      enqueueNotification(tx, db, { clubId: booking.clubId, recipientUid: coachDoc.id, actorUid: uid, type: 'BOOKING_CANCELLED', eventKey: `trial-cancelled:${id}`, destination: { velatraPage: 'calendar', planningBookingId: id }, sourceId: id, sourceType: 'booking' });
      tx.create(event.ref, event.data);
      tx.update(prospectDoc.ref, { activityHistory: salesActivity(prospect, 'Essai annulé', uid, at, event.ref.id) });
      return { success: true, refunded: false };
    }
    const memberRef = booking.memberUid ? db.doc(`users/${booking.memberUid}`) : null;
    const memberDoc = memberRef ? await tx.get(memberRef) : null;
    const member = memberDoc?.data();
    const club = await tx.get(db.doc(`clubs/${profile.clubId}`));
    if (!(canAssignMembers(authorizationActor(profile, club.data()), booking.clubId) || profile.role === 'coach' && (member?.assignedCoachUid === uid || !booking.memberUid && booking.assignedCoachUid === uid || booking.type === 'trial' && [uid, String(profile.id)].includes(String(booking.coachId))) || profile.role === 'member' && (booking.memberUid === uid || !booking.memberUid && Number(booking.memberId) === Number(profile.id)))) fail(403, 'Vous ne pouvez pas annuler cette réservation.');
    if (booking.status === 'cancelled') return { success: true, refunded: false };
    if (booking.status !== 'confirmed') fail(409, 'Cette séance ne peut plus être annulée.');
    if (profile.role === 'member' && (new Date(booking.startTime).getTime() - Date.now()) / 3600000 < (club.data()?.settings?.booking?.minCancellationHours || 0)) fail(409, 'Le délai d’annulation est dépassé. Contactez votre coach.');
    const refund = booking.creditDebited === true && Boolean(memberRef);
    if (refund) {
      if (member?.clubId !== booking.clubId || Number(member.id) !== Number(booking.memberId)) fail(409, 'Le profil de cet adhérent doit être vérifié.');
      tx.update(memberRef!, { [booking.sessionTypeId ? `sessionCredits.${booking.sessionTypeId}` : 'credits']: FieldValue.increment(1) });
    }
    const revision = (booking.notificationRevision || 0) + 1;
    tx.update(bookingRef, { status: 'cancelled', creditDebited: false, notificationRevision: revision });
    for (const recipientUid of [booking.memberUid, booking.coachUid || booking.assignedCoachUid].filter(Boolean)) enqueueNotification(tx, db, { clubId: booking.clubId, recipientUid, actorUid: uid, type: 'BOOKING_CANCELLED', eventKey: `booking-cancelled:${id}:${revision}`, destination: { velatraPage: 'calendar', planningBookingId: id }, sourceId: id, sourceType: 'booking' });
    return { success: true, refunded: refund };
  });
}

// Rescheduling preserves the booking identity (and any linked prepared programme)
// as well as its original credit debit. Only staff may move a session for now.
export async function rescheduleBooking(db: Firestore, uid: string, input: any) {
  const id = input?.id;
  if (typeof id !== 'string' || !id || id.includes('/') || id.length > 200) fail(400, 'Réservation invalide.');
  const { start, end } = interval(input);
  const profileRef = db.doc(`users/${uid}`), bookingRef = db.doc(`bookings/${id}`);
  const [initialProfile, initialBooking] = await Promise.all([profileRef.get(), bookingRef.get()]);
  const profile = initialProfile.data(), booking = initialBooking.data();
  if (!profile?.clubId || !booking || booking.clubId !== profile.clubId || booking.type !== 'coaching') fail(403, 'Cette séance ne peut pas être déplacée.');
  const initialClub = (await db.doc(`clubs/${profile.clubId}`).get()).data();
  if (!canOperateStudio(authorizationActor(profile, initialClub), booking.clubId)) fail(403, 'Droits insuffisants pour déplacer cette séance.');
  const roster = await db.collection('users').where('clubId', '==', profile.clubId).get();
  const member = booking.memberUid ? roster.docs.find(doc => doc.id === booking.memberUid) : roster.docs.find(doc => doc.data().role === 'member' && Number(doc.data().id) === Number(booking.memberId));
  if (!member || member.data().role !== 'member') fail(409, 'Le profil de cet adhérent doit être vérifié.');
  const memberRef = member.ref;
  const coach = roster.docs.find(doc => coachMatches(doc, input?.coachId || booking.coachId) && ['owner', 'coach'].includes(doc.data().role));
  if (!coach) fail(400, 'Choisissez un coach de votre espace.');
  if (input?.sessionTypeId !== undefined && (input.sessionTypeId || '') !== (booking.sessionTypeId || '')) fail(400, 'Le type de séance ne peut pas être changé pendant un déplacement.');
  const oldDay = parisDayParts(new Date(booking.startTime)).key, newDay = parisDayParts(start).key;
  const oldCoach = roster.docs.find(doc => coachMatches(doc, booking.coachId) && ['owner', 'coach'].includes(doc.data().role));
  if (!oldCoach) fail(409, 'Le coach initial doit être vérifié.');
  const locks = [
    coachDayLock(db, profile.clubId, oldCoach.id, oldDay), memberDayLock(db, profile.clubId, memberRef.id, oldDay),
    coachDayLock(db, profile.clubId, coach.id, newDay), memberDayLock(db, profile.clubId, memberRef.id, newDay)
  ];
  const distinctLocks = [...new Map(locks.map(ref => [ref.path, ref])).values()];
  return db.runTransaction(async tx => {
    const [profileDoc, bookingDoc, memberDoc, coachDoc, clubDoc, active, ...lockDocs] = await Promise.all([
      tx.get(profileRef), tx.get(bookingRef), tx.get(memberRef), tx.get(coach.ref), tx.get(db.doc(`clubs/${profile.clubId}`)),
      tx.get(db.collection('bookings').where('clubId', '==', profile.clubId).where('status', '==', 'confirmed')),
      ...distinctLocks.map(ref => tx.get(ref))
    ]);
    const current = bookingDoc.data(), staff = profileDoc.data(), member = memberDoc.data(), coachData = coachDoc.data(), club = clubDoc.data();
    if (!current || current.clubId !== profile.clubId || current.type !== 'coaching' || (current.memberUid && current.memberUid !== memberRef.id) || Number(current.memberId) !== Number(member?.id) || current.status !== 'confirmed') fail(409, 'Cette séance a changé. Rechargez le planning.');
    if (new Date(current.startTime).getTime() <= Date.now()) fail(409, 'Une séance passée ne peut pas être déplacée.');
    if (current.startTime !== booking.startTime || current.endTime !== booking.endTime || current.coachId !== booking.coachId || (current.sessionTypeId || '') !== (booking.sessionTypeId || '')) fail(409, 'Cette séance a changé. Rechargez le planning.');
    if (staff?.clubId !== profile.clubId || member?.clubId !== profile.clubId || coachData?.clubId !== profile.clubId || coachData?.isSuspended === true || !['owner', 'coach'].includes(coachData?.role)) fail(403, 'Vos droits ont changé.');
    assertAccess({ ...staff, firebaseUid: uid }, member, memberRef.id, coach.id, club);
    if (current.startTime === start.toISOString() && current.endTime === end.toISOString() && current.coachId === String(coachData.id)) return { success: true, id, unchanged: true };
    const settings = club?.settings?.booking;
    const { local, capacity } = validateSlot(settings, coachDoc, { sessionTypeId: current.sessionTypeId }, start, end);
    assertNoConflict(active, { start, end, memberId: Number(current.memberId), coachId: String(coachData.id), coachUid: coach.id, sessionTypeId: current.sessionTypeId, capacity }, id);
    if (current.creditDebited) assertMemberLimits(active, Number(current.memberId), local, start, settings, id);
    bumpLocks(tx, lockDocs);
    const revision = (current.notificationRevision || 0) + 1;
    tx.update(bookingRef, { startTime: start.toISOString(), endTime: end.toISOString(), coachId: String(coachData.id), coachUid: coach.id, notificationRevision: revision });
    for (const recipientUid of [memberRef.id, ...(oldCoach.id !== coach.id ? [coach.id] : [])]) enqueueNotification(tx, db, { clubId: profile.clubId, recipientUid, actorUid: uid, type: 'BOOKING_RESCHEDULED', eventKey: `booking-moved:${id}:${revision}`, destination: { velatraPage: 'calendar', planningBookingId: id }, sourceId: id, sourceType: 'booking' });
    return { success: true, id };
  });
}

// Only aggregate counts leave the server. Member names and identifiers are never
// exposed through this endpoint, including in a shared Studio slot.
export async function bookingAvailability(db: Firestore, uid: string, dayKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !Number.isFinite(Date.parse(`${dayKey}T12:00:00Z`))) fail(400, 'Date invalide.');
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (!profile?.clubId) fail(403, 'Votre espace est introuvable.');
  const club = (await db.doc(`clubs/${profile.clubId}`).get()).data();
  const allowedCoachUid = profile.role === 'member' ? profile.assignedCoachUid || (club?.accountType !== 'studio' ? club?.ownerId : null) : profile.role === 'coach' ? uid : null;
  const allowedCoach = allowedCoachUid ? (await db.doc(`users/${allowedCoachUid}`).get()).data() : null;
  if (profile.role === 'member' && (!allowedCoach || allowedCoach.clubId !== profile.clubId)) return { slots: [] };
  const week = weekBounds(parisDayParts(new Date(`${dayKey}T12:00:00Z`)));
  const snapshots = await db.collection('bookings').where('clubId', '==', profile.clubId).where('status', '==', 'confirmed').get();
  const counts = new Map<string, { startTime: string; endTime: string; coachId: string; sessionTypeId?: string; count: number }>();
  for (const doc of snapshots.docs) {
    const booking = doc.data();
    const key = parisDayParts(new Date(booking.startTime)).key;
    if (key < week[0] || key >= week[1] || booking.type !== 'coaching') continue;
    if (allowedCoach && ![String(allowedCoach.id), String(allowedCoachUid)].includes(String(booking.coachId))) continue;
    const identity = `${booking.startTime}|${booking.endTime}|${booking.coachId}|${booking.sessionTypeId || ''}`;
    const existing = counts.get(identity);
    if (existing) existing.count++;
    else counts.set(identity, { startTime: booking.startTime, endTime: booking.endTime, coachId: String(booking.coachId), ...(booking.sessionTypeId ? { sessionTypeId: booking.sessionTypeId } : {}), count: 1 });
  }
  return { slots: [...counts.values()] };
}

// Preserve the CRM trial flow while making the booking and prospect transition
// server-owned. Trials do not consume member credits and do not require a weekly slot.
export async function createTrialBooking(db: Firestore, uid: string, input: any) {
  const { start, end } = interval(input);
  const prospectUid = input?.prospectUid;
  if (typeof prospectUid !== 'string' || !/^[^/]{1,180}$/.test(prospectUid)) fail(400, 'Prospect invalide.');
  const profileRef = db.doc(`users/${uid}`), prospectRef = db.doc(`prospects/${prospectUid}`);
  const initial = (await profileRef.get()).data();
  if (!initial?.clubId) fail(403, 'Vous ne pouvez pas planifier cette séance.');
  const initialClub = (await db.doc(`clubs/${initial.clubId}`).get()).data();
  if (!canOperateStudio(authorizationActor(initial, initialClub), initial.clubId)) fail(403, 'Vous ne pouvez pas planifier cette séance.');
  // Managers schedule a real coach; they never become the coaching provider themselves.
  const coachUid = initial.role === 'manager' || initial.role === 'owner' && initialClub?.accountType === 'studio' && input?.coachUid ? input?.coachUid : uid;
  if (typeof coachUid !== 'string' || !/^[^/]{1,128}$/.test(coachUid)) fail(400, 'Choisissez un coach.');
  const coachRef = db.doc(`users/${coachUid}`);
  const local = parisDayParts(start);
  const locks = [coachDayLock(db, initial.clubId, coachUid, local.key), db.doc(`bookingLocks/${initial.clubId}_prospect_${prospectUid}_${local.key}`)];
  const id = createHash('sha256').update(`trial:${initial.clubId}:${prospectUid}:${coachUid}:${start.toISOString()}`).digest('hex');
  const bookingRef = db.doc(`bookings/${id}`);
  return db.runTransaction(async tx => {
    const reader = await staffReader(db, uid, tx);
    if (reader.actor.clubId !== initial.clubId) fail(403, 'Vos droits ont changé.');
    const [profileDoc, prospectDoc, coachDoc, clubDoc, previous, active, ...lockDocs] = await Promise.all([
      tx.get(profileRef), tx.get(prospectRef), tx.get(coachRef), tx.get(db.doc(`clubs/${initial.clubId}`)), tx.get(bookingRef),
      tx.get(db.collection('bookings').where('clubId', '==', initial.clubId).where('status', '==', 'confirmed')),
      ...locks.map(ref => tx.get(ref))
    ]);
    const profile = profileDoc.data(), prospect = prospectDoc.data(), coach = coachDoc.data();
    if (profile?.clubId !== initial.clubId || profile.role !== initial.role || !canOperateStudio(authorizationActor(profile, clubDoc.data()), initial.clubId) || prospect?.clubId !== initial.clubId)
      fail(403, 'Ce prospect ne fait pas partie de votre espace.');
    if (!coach || coach.clubId !== initial.clubId || !['owner', 'coach'].includes(coach.role) || !Number.isSafeInteger(coach.id) || coach.id <= 0 || coach.isSuspended === true || clubDoc.data()?.isActive === false) fail(403, 'Coach indisponible dans votre espace.');
    const prospectId = Number.isSafeInteger(Number(prospect.id)) && Number(prospect.id) > 0 ? Number(prospect.id) : legacyProspectNumericId(prospectUid);
    if (prospect.convertedMemberUid || prospect.status === 'won') fail(409, 'Ce prospect est déjà devenu adhérent.');
    if (previous.exists) {
      const old = previous.data()!;
      if (old.clubId !== initial.clubId || Number(old.prospectId) !== prospectId || ![coachUid, String(coach.id)].includes(String(old.coachId)) || old.startTime !== start.toISOString() || old.endTime !== end.toISOString() || old.type !== 'trial') fail(409, 'Cette réservation doit être vérifiée.');
      if (old.status === 'confirmed') return { success: true, id, alreadyBooked: true };
      fail(409, 'Cet essai possède un historique. Choisissez un nouveau créneau.');
    }
    const conflicts = active.docs.map(doc => doc.data()).filter(booking => new Date(booking.startTime) < end && new Date(booking.endTime) > start);
    if (conflicts.some(booking => Number(booking.prospectId) === prospectId || [coachUid, String(coach.id)].includes(String(booking.coachId)))) fail(409, 'Ce créneau est déjà occupé.');
    bumpLocks(tx, lockDocs);
    const at = new Date().toISOString();
    const event = salesEvent(db, `trial:${id}:booked`, 'TRIAL_BOOKED', prospectUid, prospect, at, uid, { bookingId: id, coachUid });
    tx.set(bookingRef, { id, clubId: initial.clubId, coachId: String(coach.id), coachUid, assignedCoachUid: coachUid, prospectId, prospectUid,
      startTime: start.toISOString(), endTime: end.toISOString(), status: 'confirmed', type: 'trial', attendanceStatus: 'PENDING' });
    enqueueNotification(tx, db, { clubId: initial.clubId, recipientUid: coachUid, actorUid: uid, type: 'TRIAL_BOOKED', eventKey: `trial-booked:${id}`, destination: { velatraPage: 'calendar', planningBookingId: id }, sourceId: id, sourceType: 'booking' });
    tx.create(event.ref, event.data);
    tx.update(prospectRef, { id: prospectId, status: 'trial', lostAt: null, lostReason: null, activityHistory: salesActivity(prospect, 'Essai programmé', uid, at, event.ref.id) });
    return { success: true, id };
  });
}
