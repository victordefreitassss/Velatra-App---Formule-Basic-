import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { authorizationActor, canManageTeam } from './authorization.ts';
import { MemberCreationError } from './createMember.ts';

/** Only coach accounts can be created here; requested roles/claims are never copied. */
export async function createStaffAccount(auth: Auth, db: Firestore, uid: string, input: any, trustedSuperAdmin = false) {
  const { email, password, name, clubId } = input || {};
  if (typeof clubId !== 'string' || !/^[^/]{1,180}$/.test(clubId) ||
      typeof email !== 'string' || !email || typeof password !== 'string' || !password || typeof name !== 'string' || !name)
    throw new MemberCreationError(400, 'Informations de création invalides.');
  const callerRef = db.doc(`users/${uid}`), clubRef = db.doc(`clubs/${clubId}`);
  const check = (profile: any, club: any) => {
    if (!club || !canManageTeam(authorizationActor(profile, club, trustedSuperAdmin), clubId))
      throw new MemberCreationError(403, 'Droits insuffisants pour créer un coach.');
  };
  const [caller, club] = await Promise.all([callerRef.get(), clubRef.get()]);
  check(caller.data(), club.data());
  const account = await auth.createUser({ email, password, displayName: name });
  try {
    await db.runTransaction(async tx => {
      const [currentCaller, currentClub] = await Promise.all([tx.get(callerRef), tx.get(clubRef)]);
      check(currentCaller.data(), currentClub.data());
      tx.create(db.doc(`users/${account.uid}`), {
        id: Date.now(), clubId, code: email.split('@')[0].substring(0, 8), pwd: '', name, email,
        role: 'coach', avatar: name.substring(0, 2).toUpperCase(), createdAt: new Date().toISOString(),
        firebaseUid: account.uid, assignedMemberIds: [], assignmentIndexVersion: 1,
        gender: 'M', age: 25, weight: 70, height: 175, xp: 0, streak: 0, pointsFidelite: 0, objectifs: [], notes: '',
      });
    });
  } catch (error) {
    if (!(await db.doc(`users/${account.uid}`).get()).exists) await auth.deleteUser(account.uid);
    throw error;
  }
  return { success: true, uid: account.uid };
}
