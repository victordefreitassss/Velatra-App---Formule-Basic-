import { isOrganizationActive } from '../organizationAccess.ts';
import { authorizationActor, canOperateStudio, canAssignMembers } from './authorization.ts';
import { randomBytes, randomInt } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { validateMemberRegistration } from './memberRegistration.ts';
import { resolveAccountType } from '../productCapabilities.ts';

export class MemberCreationError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function createManagedMember(auth: Auth, db: Firestore, requesterUid: string, body: any) {
  const requesterRef = db.collection('users').doc(requesterUid);
  const requester = (await requesterRef.get()).data();
  if (!requester?.clubId) {
    throw new MemberCreationError(403, 'Seuls les coachs et propriétaires peuvent ajouter un adhérent.');
  }
  const clubRef = db.collection('clubs').doc(requester.clubId);
  const club = (await clubRef.get()).data();
  if (!club) throw new MemberCreationError(404, 'Votre club est introuvable.');
  if (!isOrganizationActive(club)) throw new MemberCreationError(403, 'Organisation indisponible.');
  const accountType = resolveAccountType(club);
  if (!canOperateStudio(authorizationActor(requester, club), requester.clubId)) throw new MemberCreationError(403, 'Accès refusé.');
  if (requester.role === 'owner' && accountType !== 'legacy' && club.ownerId !== requesterUid) {
    throw new MemberCreationError(403, 'Le propriétaire du club ne correspond pas à ce compte.');
  }
  const requestedCoachUid = body?.coachUid;
  if (requestedCoachUid != null && requestedCoachUid !== '' &&
    (!canAssignMembers(authorizationActor(requester, club), requester.clubId) || accountType !== 'studio' || typeof requestedCoachUid !== 'string' ||
      requestedCoachUid.length > 128 || requestedCoachUid.includes('/'))) {
    throw new MemberCreationError(400, 'Le coach référent demandé est invalide.');
  }
  const coachUid = requester.role === 'coach' ? requesterUid : accountType === 'studio' && requestedCoachUid ? requestedCoachUid : null;
  const coachRef = coachUid ? db.collection('users').doc(coachUid) : null;
  if (coachRef && coachRef.path !== requesterRef.path) {
    const coach = (await coachRef.get()).data();
    if (coach?.role !== 'coach' || coach.clubId !== requester.clubId) {
      throw new MemberCreationError(400, 'Choisissez un coach de votre club ou attribuez-le plus tard.');
    }
  }
  const source = body?.profile;
  const email = typeof source?.email === 'string' ? source.email.trim().toLowerCase() : '';
  // Old clients may still send a provisional password during a rolling deployment.
  // New clients leave it out; the generated secret is never returned or stored in Firestore.
  const password = body?.password == null ? `${randomBytes(36).toString('base64url')}aA1!` : body.password;
  const requestId = body?.requestId;
  const input = validateMemberRegistration({
    age: 30, gender: 'M', weight: 70, height: 175, objectifs: [], notes: '',
    experienceLevel: 'Débutant', trainingDays: 3, sessionDuration: 60,
    equipment: 'Salle complète', injuries: '', ...source, clubId: '000000' // The manager's existing club may use a legacy, nonnumeric ID.
  });
  if (!input || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    typeof password !== 'string' || password.length < 8 || password.length > 128 ||
    typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
    throw new MemberCreationError(400, 'Vérifiez le profil, l’adresse e-mail et les informations d’accès.');
  }

  let account;
  try { account = await auth.createUser({ email, password, displayName: input.name }); }
  catch (error: any) {
    if (error.code !== 'auth/email-already-exists') throw error;
    const existing = await auth.getUserByEmail(email);
    const profile = (await db.collection('users').doc(existing.uid).get()).data();
    // Retry of the same request is safe, but never attach an unrelated Auth account.
    if (profile?.creationRequestId === requestId && profile?.createdByUid === requesterUid && profile?.clubId === requester.clubId) {
      return { success: true, uid: existing.uid, memberId: profile.id, member: profile };
    }
    throw new MemberCreationError(409, 'Cette adresse e-mail possède déjà un compte. Recherchez cet adhérent ou utilisez une autre adresse.');
  }

  const memberRef = db.collection('users').doc(account.uid);
  let member: Record<string, any> = {};
  try {
    await db.runTransaction(async transaction => {
      const latestRequester = (await transaction.get(requesterRef)).data();
      const latestClub = (await transaction.get(clubRef)).data();
      if (latestRequester?.role !== requester.role || latestRequester?.clubId !== requester.clubId) {
        throw new MemberCreationError(403, 'Vos droits ont changé. Rechargez votre espace.');
      }
      if (!isOrganizationActive(latestClub) || !canOperateStudio(authorizationActor(latestRequester, latestClub), requester.clubId) || resolveAccountType(latestClub) !== accountType ||
        (requester.role === 'owner' && accountType !== 'legacy' && latestClub.ownerId !== requesterUid)) {
        throw new MemberCreationError(409, 'La configuration du club a changé. Réessayez.');
      }
      const latestCoach = coachRef?.path === requesterRef.path ? latestRequester : coachRef ? (await transaction.get(coachRef)).data() : null;
      if (coachRef && (latestCoach?.role !== 'coach' || latestCoach.clubId !== requester.clubId)) {
        throw new MemberCreationError(409, 'Le coach référent a changé. Réessayez.');
      }
      let id = 0;
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = randomInt(1_000_000_000_000, 2_000_000_000_000);
        if ((await transaction.get(db.collection('users').where('id', '==', candidate).limit(1))).empty) { id = candidate; break; }
      }
      if (!id) throw new Error('MEMBER_ID_ALLOCATION_FAILED');
      member = {
        ...input, clubId: requester.clubId, id, email, firebaseUid: account.uid, role: 'member', pwd: '', code: '',
        avatar: '', createdAt: new Date().toISOString(), xp: 0, streak: 0, pointsFidelite: 0,
        phone: typeof source.phone === 'string' ? source.phone.slice(0, 40) : '',
        address: typeof source.address === 'string' ? source.address.slice(0, 300) : '',
        birthDate: typeof source.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.birthDate) ? source.birthDate : '',
        createdByUid: requesterUid, creationRequestId: requestId,
        ...(coachUid ? { assignedCoachUid: coachUid } : {})
      };
      transaction.create(memberRef, member);
      if (coachRef && latestCoach) transaction.update(coachRef, {
        assignedMemberIds: [...new Set([...(Array.isArray(latestCoach.assignedMemberIds) ? latestCoach.assignedMemberIds.map(Number) : []), id])], assignmentIndexVersion: 1
      });
    });
  } catch (error) {
    // Auth and Firestore are separate services. Compensate only an uncommitted profile.
    if (!(await memberRef.get()).exists) await auth.deleteUser(account.uid);
    throw error;
  }
  return { success: true, uid: account.uid, memberId: member.id, member };
}
