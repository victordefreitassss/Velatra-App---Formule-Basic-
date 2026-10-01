import type { Firestore, Query, Transaction, DocumentReference } from 'firebase-admin/firestore';
import type { Club, User } from '../types.ts';
import { authorizationActor, canManageBilling, canOperateStudio } from './authorization.ts';
import { MemberCreationError } from './createMember.ts';
import { safeId } from './followupModel.ts';
import { resolveAccountType } from '../productCapabilities.ts';
import { resolveExperienceCapabilities } from '../productExperience.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const SOURCE_CAP = 10000;
export async function staffReader(db: Firestore, uid: string, tx?: Transaction) {
  if (!safeId(uid)) fail(401, 'Authentification requise.');
  const readDoc = (ref: DocumentReference) => tx ? tx.get(ref) : ref.get();
  const readQuery = (query: Query) => tx ? tx.get(query) : query.get();
  const actorDoc = await readDoc(db.doc(`users/${uid}`));
  const profile = actorDoc.data();
  if (!profile || !safeId(profile.clubId)) fail(403, 'Accès réservé au staff.');
  const clubDoc = await readDoc(db.doc(`clubs/${profile.clubId}`));
  const clubData = clubDoc.data();
  const club = clubData && { ...clubData, id: clubDoc.id } as Club;
  const actor = { ...profile, firebaseUid: uid } as User;
  const policy = authorizationActor(actor, club);
  if (!club || club.isActive === false || !canOperateStudio(policy, actor.clubId) ||
    actor.role === 'owner' && resolveAccountType(club) !== 'legacy' && club.ownerId !== uid ||
    !resolveExperienceCapabilities(club, actor).clients.runtimeUsable) fail(403, 'Accès réservé au staff autorisé.');
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0) fail(403, 'Profil staff invalide.');
  const partialSources: string[] = [];
  const sourceVersions: Record<string, string> = {};
  async function source(name: string, extra?: [string, unknown][], cap = SOURCE_CAP) {
    let query: Query = db.collection(name).where('clubId', '==', actor.clubId);
    for (const [field, value] of extra || []) query = query.where(field, '==', value);
    const snap = await readQuery(query.limit(cap + 1));
    if (snap.size > cap) partialSources.push(name);
    snap.docs.slice(0, cap).forEach(doc => { if (doc.updateTime) sourceVersions[`${name}/${['programs', 'logs', 'messages'].includes(name) ? doc.data().id ?? doc.id : doc.id}`] = `${doc.updateTime.seconds}:${doc.updateTime.nanoseconds}`; });
    return snap.docs.slice(0, cap).map(doc => ({ ...doc.data(), id: ['users', 'prospects', 'programs', 'logs', 'messages'].includes(name) ? doc.data().id ?? doc.id : doc.id,
      ...(['users', 'prospects'].includes(name) ? { firebaseUid: doc.id } : {}) })) as any[];
  }
  return { actor, club, policy, billing: canManageBilling(policy, actor.clubId), partialSources, sourceVersions, source, readDoc };
}
