import type { Club, User } from '../types';
import { resolveAccountType } from '../productCapabilities';

export function getMemberCreationCoachOptions(club: Club | null, actor: User | null, users: User[]): User[] | null {
  if (!club || !actor || actor.role !== 'owner' || actor.clubId !== club.id || resolveAccountType(club) !== 'studio') return null;
  return users.filter(user => user.role === 'coach' && user.clubId === club.id && !!user.firebaseUid);
}

export async function createMemberAndSendAccess<T extends { member: { email?: string } }>(
  create: () => Promise<T>, sendAccess: (email: string) => Promise<void>
): Promise<{ created: T; emailStatus: 'sent' | 'failed' }> {
  const created = await create();
  if (!created.member.email) return { created, emailStatus: 'failed' };
  try {
    await sendAccess(created.member.email);
    return { created, emailStatus: 'sent' };
  } catch {
    // The member exists. A delivery failure must never trigger a second creation.
    return { created, emailStatus: 'failed' };
  }
}
