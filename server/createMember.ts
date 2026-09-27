import { randomInt } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { validateMemberRegistration } from './memberRegistration';

export class MemberCreationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function createManagedMember(auth: Auth, db: Firestore, requesterUid: string, body: any) {
  const requesterRef = db.collection('users').doc(requesterUid);
  const requester = (await requesterRef.get()).data();
  if (!requester || !['owner', 'coach'].includes(requester.role) || !requester.clubId) {
    throw new MemberCreationError(403, 'Seuls les coachs et propriétaires peuvent ajouter un adhérent.');
  }
  const source = body?.profile;
  const email = typeof source?.email === 'string' ? source.email.trim().toLowerCase() : '';
  const password = body?.password;
  const requestId = body?.requestId;
  const input = validateMemberRegistration({
    age: 30, gender: 'M', weight: 70, height: 175, objectifs: [], notes: '',
    experienceLevel: 'Débutant', trainingDays: 3, sessionDuration: 60,
    equipment: 'Salle complète', injuries: '', ...source, clubId: '000000' // The manager's existing club may use a legacy, nonnumeric ID.
  });
  if (!input || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    typeof password !== 'string' || password.length < 8 || password.length > 128 ||
    typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
    throw new MemberCreationError(400, 'Vérifiez le profil, l’adresse e-mail et le mot de passe (8 caractères minimum).');
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
      if (latestRequester?.role !== requester.role || latestRequester?.clubId !== requester.clubId) {
        throw new MemberCreationError(403, 'Vos droits ont changé. Rechargez votre espace.');
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
        ...(requester.role === 'coach' ? { assignedCoachUid: requesterUid } : {})
      };
      transaction.create(memberRef, member);
      if (requester.role === 'coach') transaction.update(requesterRef, {
        assignedMemberIds: [...new Set([...(latestRequester!.assignedMemberIds || []), id])], assignmentIndexVersion: 1
      });
    });
  } catch (error) {
    // Auth and Firestore are separate services. Compensate only an uncommitted profile.
    if (!(await memberRef.get()).exists) await auth.deleteUser(account.uid);
    throw error;
  }
  return { success: true, uid: account.uid, memberId: member.id, member };
}
