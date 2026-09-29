import type { Firestore } from 'firebase-admin/firestore';
import { resolveAccountType } from '../productCapabilities.ts';

export type CoachingContact = {
  id: number;
  clubId: string;
  firebaseUid: string;
  role: 'coach' | 'owner';
  name: string;
  avatar: string;
};

/** Resolve a member's contact from canonical club ownership or an explicit staff assignment. */
export async function resolveMemberCoachingContact(db: Firestore, member: Record<string, any>): Promise<CoachingContact | null> {
  if (member?.role !== 'member' || typeof member.clubId !== 'string' || !member.clubId) return null;
  const club = (await db.collection('clubs').doc(member.clubId).get()).data();
  if (!club) return null;

  const soloOwnerUid = resolveAccountType(club) === 'solo' && typeof club.ownerId === 'string' ? club.ownerId : '';
  const assignedCoachUid = typeof member.assignedCoachUid === 'string' ? member.assignedCoachUid : '';
  for (const [uid, role] of [[soloOwnerUid, 'owner'], [assignedCoachUid, 'coach']] as const) {
    if (!uid) continue;
    const profile = (await db.collection('users').doc(uid).get()).data();
    const id = Number(profile?.id);
    if (profile?.role !== role || profile.clubId !== member.clubId || !Number.isSafeInteger(id) || id <= 0) continue;
    return {
      id, clubId: member.clubId, firebaseUid: uid, role,
      name: String(profile.name || (role === 'owner' ? 'Votre coach' : 'Coach')),
      avatar: String(profile.avatar || ''),
    };
  }
  return null;
}
