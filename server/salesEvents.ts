import { legacyProspectNumericId } from './prospectIdentity.ts';
import { createHash, randomUUID } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import type { SalesEvent, SalesEventType } from '../sales/salesModel.ts';
import { MemberCreationError } from './createMember.ts';
export const salesEventId = (key: string) => createHash('sha256').update(key).digest('hex');
export function salesEvent(db: Firestore, key: string, eventType: SalesEventType, prospectUid: string, prospect: any, at: string, actorUid?: string, extra: Partial<SalesEvent> = {}) {
  return { ref: db.doc(`salesEvents/${salesEventId(key)}`), data: { clubId: prospect.clubId, prospectUid, eventType, at,
    ...(actorUid ? { actorUid } : {}), ...(typeof prospect.source === 'string' ? { sourceSnapshot: prospect.source.slice(0, 80) } : {}), ...extra } };
}
export const salesActivity = (prospect: any, label: string, uid: string, at: string, id: string = randomUUID()) => [{ id, date: at, label, authorUid: uid }, ...(Array.isArray(prospect.activityHistory) ? prospect.activityHistory : [])].slice(0, 80);
export async function trialReferences(db: Firestore, tx: Transaction, booking: any) {
  const fail = (): never => { throw new MemberCreationError(409, 'Les liens de cet essai doivent être vérifiés.'); };
  const find = async (collection: string, uid: unknown, numericId: unknown) => {
    if (uid !== undefined) {
      if (typeof uid !== 'string' || !/^[^/]{1,180}$/.test(uid)) fail();
      return tx.get(db.doc(`${collection}/${uid}`));
    }
    if (!Number.isSafeInteger(Number(numericId)) || Number(numericId) <= 0) fail();
    if (collection === 'prospects') {
      const candidates = await tx.get(db.collection(collection).where('clubId', '==', booking.clubId).limit(5001));
      if (candidates.size > 5000) fail();
      const matches = candidates.docs.filter(doc => (Number.isSafeInteger(Number(doc.data().id)) && Number(doc.data().id) > 0 ? Number(doc.data().id) : legacyProspectNumericId(doc.id)) === Number(numericId));
      if (matches.length !== 1) fail();
      return matches[0];
    }
    const docs = await tx.get(db.collection(collection).where('clubId', '==', booking.clubId).where('id', '==', Number(numericId)).limit(2));
    if (docs.size !== 1) fail();
    return docs.docs[0];
  };
  // Historical coachId can itself be a Firebase UID. Numeric fallback must be unique.
  const explicitCoach = booking.coachUid ?? (typeof booking.coachId === 'string' && !/^\d+$/.test(booking.coachId) ? booking.coachId : undefined);
  const [prospectDoc, coachDoc] = await Promise.all([find('prospects', booking.prospectUid, booking.prospectId), find('users', explicitCoach, booking.coachId)]);
  const rawProspect = prospectDoc.data(), coach = coachDoc.data();
  const prospect: FirebaseFirestore.DocumentData | undefined = rawProspect && { ...rawProspect, id: Number.isSafeInteger(Number(rawProspect.id)) && Number(rawProspect.id) > 0 ? Number(rawProspect.id) : legacyProspectNumericId(prospectDoc.id) };
  if (!prospect || !coach || prospect.clubId !== booking.clubId || coach.clubId !== booking.clubId || !['owner', 'coach'].includes(coach.role) || coach.isSuspended === true ||
    booking.prospectId != null && Number(prospect.id) !== Number(booking.prospectId) || ![coachDoc.id, String(coach.id)].includes(String(booking.coachId))) fail();
  return { prospectDoc, prospect, coachDoc, coach };
}
