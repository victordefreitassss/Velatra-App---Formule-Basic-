import { randomInt } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { AccountType } from '../types.ts';
import { isAccountType } from '../productCapabilities.ts';

export class ClubRegistrationError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// Accept old, explicitly selected signup values during rolling deployments only.
// This is not a migration heuristic for stored club records.
export function parseRegistrationAccountType(value: unknown): AccountType | null {
  if (isAccountType(value)) return value;
  if (value === 'coach') return 'solo';
  if (value === 'club') return 'studio';
  return null;
}

export async function registerClub(db: Firestore, identity: { uid: string; email?: string }, input: unknown, configuredInviteCode: string | undefined) {
  const data = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const clubName = typeof data.clubName === 'string' ? data.clubName.trim() : '';
  const ownerName = typeof data.ownerName === 'string' ? data.ownerName.trim() : '';
  const accountType = parseRegistrationAccountType(data.accountType);
  if (!clubName || clubName.length > 200 || !ownerName || ownerName.length > 200 || !accountType) {
    throw new ClubRegistrationError(400, 'Les informations du club sont incomplètes ou invalides.');
  }
  if (!configuredInviteCode?.trim()) throw new ClubRegistrationError(503, "L'inscription est temporairement indisponible.");
  if (typeof data.inviteCode !== 'string' || data.inviteCode.trim() !== configuredInviteCode.trim()) {
    throw new ClubRegistrationError(403, "Code d'invitation invalide.");
  }

  const userRef = db.collection('users').doc(identity.uid);
  const now = new Date().toISOString();
  const clubId = await db.runTransaction(async transaction => {
    if ((await transaction.get(userRef)).exists) throw new ClubRegistrationError(409, 'Un profil existe déjà pour ce compte.');
    for (let attempt = 0; attempt < 10; attempt++) {
      const id = String(randomInt(100000, 1000000));
      const clubRef = db.collection('clubs').doc(id);
      if ((await transaction.get(clubRef)).exists) continue;
      transaction.create(clubRef, {
        id, accountType, name: clubName, ownerId: identity.uid, email: identity.email || '',
        plan: 'basic', isActive: true, canAddStaff: false,
        phone: '', address: '', horaires: '', createdAt: now,
        description: accountType === 'solo' ? `Espace de coaching de ${clubName}` : `Bienvenue chez ${clubName}`,
      });
      transaction.create(userRef, {
        id: Date.now(), clubId: id, code: '', pwd: '', name: ownerName, email: identity.email || '',
        role: 'owner', avatar: ownerName.substring(0, 2).toUpperCase(), gender: 'M', age: 30,
        weight: 80, height: 180, objectifs: ['Performance sportive'],
        notes: accountType === 'solo' ? 'Coach Indépendant' : 'Propriétaire du club',
        createdAt: now, xp: 0, streak: 0, pointsFidelite: 0, firebaseUid: identity.uid,
      });
      return id;
    }
    throw new ClubRegistrationError(503, 'Impossible de réserver un code de club, réessayez.');
  });
  return { success: true, clubId, accountType };
}
