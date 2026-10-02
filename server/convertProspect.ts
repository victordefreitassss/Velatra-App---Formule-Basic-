import { isOrganizationActive } from '../organizationAccess.ts';
import { salesActivity, salesEvent } from './salesEvents.ts';
import { lastShowedCoach, salesJoins } from '../sales/salesModel.ts';
import { authorizationActor, canOperateStudio } from './authorization.ts';
import { createHash } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { createManagedMember, MemberCreationError } from './createMember.ts';

/** A server-only claim bridges Auth creation and the Firestore link. It survives a lost HTTP response. */
export async function convertProspect(auth: Auth, db: Firestore, requesterUid: string, prospectUid: string, input: any) {
  if (!/^[^/]{1,180}$/.test(prospectUid)) throw new MemberCreationError(400, 'Prospect invalide.');
  const requesterRef = db.collection('users').doc(requesterUid);
  const prospectRef = db.collection('prospects').doc(prospectUid);
  const claimRef = db.collection('crmConversionClaims').doc(prospectUid);
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new MemberCreationError(400, 'Une adresse e-mail valide est nécessaire.');
  }
  const requestedCoachUid = input?.coachUid == null ? null : input.coachUid;
  if (requestedCoachUid !== null && (typeof requestedCoachUid !== 'string' || requestedCoachUid.length > 128 || requestedCoachUid.includes('/'))) {
    throw new MemberCreationError(400, 'Coach référent invalide.');
  }
  const requestId = createHash('sha256').update(`prospect:${prospectUid}`).digest('hex');
  const initial = await db.runTransaction(async tx => {
    const [requesterSnap, prospectSnap, claimSnap] = await Promise.all([
      tx.get(requesterRef), tx.get(prospectRef), tx.get(claimRef)
    ]);
    const requester = requesterSnap.data(), prospect = prospectSnap.data(), claim = claimSnap.data();
    if (!requester?.clubId) throw new MemberCreationError(403, 'Accès refusé.');
    const club = (await tx.get(db.doc(`clubs/${requester.clubId}`))).data();
    if (!isOrganizationActive(club) || !canOperateStudio(authorizationActor(requester, club), requester.clubId)) throw new MemberCreationError(403, 'Accès refusé.');
    if (!prospect) throw new MemberCreationError(404, 'Prospect introuvable.');
    if (prospect.clubId !== requester.clubId) throw new MemberCreationError(403, 'Ce prospect ne fait pas partie de votre espace.');
    if (prospect.convertedMemberUid) return { converted: prospect.convertedMemberUid as string, prospect, requester };
    if (prospect.status === 'won' && !claim) throw new MemberCreationError(409, 'Ce dossier est déjà gagné sans lien adhérent. Vérifiez-le avant une nouvelle conversion.');
    if (claim && (claim.clubId !== requester.clubId || claim.requesterUid !== requesterUid)) {
      throw new MemberCreationError(409, 'Une conversion est déjà en cours pour ce prospect.');
    }
    if (claim && (claim.email !== email || claim.coachUid !== requestedCoachUid)) {
      throw new MemberCreationError(409, 'Une conversion a déjà commencé avec une autre adresse ou un autre référent. Réessayez avec les mêmes informations.');
    }
    if (!claim) tx.create(claimRef, { clubId: requester.clubId, requesterUid, email, coachUid: requestedCoachUid, requestId, createdAt: new Date().toISOString() });
    return { converted: null, prospect, requester };
  });
  if (initial.converted) {
    const member = (await db.collection('users').doc(initial.converted).get()).data();
    if (!member || member.clubId !== initial.requester.clubId || member.role !== 'member') throw new MemberCreationError(409, 'Le dossier adhérent lié doit être vérifié.');
    return { success: true, alreadyConverted: true, uid: initial.converted, memberId: member.id, member };
  }

  // createManagedMember owns Auth, the canonical user document, assignments and compensation.
  // Its stable requestId makes retry safe if the member exists but the CRM link failed.
  let created;
  try {
    created = await createManagedMember(auth, db, requesterUid, {
      requestId, ...(requestedCoachUid ? { coachUid: requestedCoachUid } : {}),
      profile: { name: initial.prospect.name, email, phone: initial.prospect.phone || '' }
    });
  } catch (error) {
    if (error instanceof MemberCreationError && [400, 409].includes(error.status)) {
      let canRelease = error.status === 400;
      if (error.status === 409) {
        try {
          const account = await auth.getUserByEmail(email);
          const existing = (await db.collection('users').doc(account.uid).get()).data();
          // An Auth account without its profile may belong to the concurrent
          // request still committing Firestore. Creation timestamps are not
          // proof of ownership: retain the claim until a safe retry resolves it.
          canRelease = !!existing && existing.creationRequestId !== requestId;
        } catch (lookupError: any) { canRelease = lookupError?.code === 'auth/user-not-found'; }
      }
      if (canRelease) await db.runTransaction(async tx => {
        const snapshot = await tx.get(claimRef);
        if (snapshot.data()?.requestId === requestId && snapshot.data()?.requesterUid === requesterUid) tx.delete(claimRef);
      });
    }
    throw error;
  }
  const now = new Date().toISOString();
  await db.runTransaction(async tx => {
    const [requesterSnap, prospectSnap, claimSnap, memberSnap] = await Promise.all([
      tx.get(requesterRef), tx.get(prospectRef), tx.get(claimRef), tx.get(db.collection('users').doc(created.uid))
    ]);
    const requester = requesterSnap.data(), prospect = prospectSnap.data(), claim = claimSnap.data(), member = memberSnap.data();
    const club = (await tx.get(db.doc(`clubs/${initial.requester.clubId}`))).data();
    if (requester?.clubId !== initial.requester.clubId || !isOrganizationActive(club) || !canOperateStudio(authorizationActor(requester, club), initial.requester.clubId) ||
      prospect?.clubId !== requester.clubId || claim?.requestId !== requestId || claim?.requesterUid !== requesterUid ||
      member?.clubId !== requester.clubId || member?.creationRequestId !== requestId) {
      throw new MemberCreationError(409, 'La conversion a été créée mais son lien CRM reste à confirmer. Réessayez.');
    }
    if (prospect.convertedMemberUid && prospect.convertedMemberUid !== created.uid) throw new MemberCreationError(409, 'Ce prospect est déjà lié à un autre adhérent.');
    const [trialDocs, coachDocs] = await Promise.all([
      tx.get(db.collection('bookings').where('clubId', '==', requester.clubId).where('type', '==', 'trial').limit(10001)),
      tx.get(db.collection('users').where('clubId', '==', requester.clubId).limit(2001))
    ]);
    const trials = trialDocs.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
    const coaches = coachDocs.docs.map(d => ({ ...d.data(), firebaseUid: d.id })) as any[];
    const joins = salesJoins({ clubId: requester.clubId, studio: club?.accountType === 'studio', prospects: [{ ...prospect, firebaseUid: prospectUid } as any], bookings: trials, coaches, events: [] });
    const numericMatches = Number.isSafeInteger(prospect.id) ? await tx.get(db.collection('prospects').where('clubId', '==', requester.clubId).where('id', '==', prospect.id).limit(2)) : null;
    const uniqueLegacy = numericMatches?.size === 1 && numericMatches.docs[0].id === prospectUid;
    const related = trials.filter(b => b.prospectUid ? b.prospectUid === prospectUid : uniqueLegacy && Number(b.prospectId) === Number(prospect.id));
    const trialCoachUid = trialDocs.size <= 10000 && coachDocs.size <= 2000 ? lastShowedCoach(related, prospect.convertedAt || now, joins.coach) : null;
    const event = salesEvent(db, `converted:${prospectUid}`, 'CONVERTED', prospectUid, prospect, prospect.convertedAt || now, requesterUid, trialCoachUid ? { coachUid: trialCoachUid } : {});
    const previousEvent = await tx.get(event.ref);
    if (!previousEvent.exists) tx.create(event.ref, event.data);
    tx.update(prospectRef, { status: 'won', convertedMemberUid: created.uid, convertedMemberId: created.memberId, convertedAt: prospect.convertedAt || now, nextReminderDate: null,
      activityHistory: salesActivity(prospect, 'Converti en adhérent', requesterUid, now, event.ref.id) });
    tx.update(db.collection('users').doc(created.uid), { sourceProspectUid: prospectUid, profileMeasurementsPending: true });
    tx.delete(claimRef);
  });
  return { ...created, alreadyConverted: false };
}
