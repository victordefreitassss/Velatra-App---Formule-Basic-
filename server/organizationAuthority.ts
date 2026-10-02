import type { Firestore } from 'firebase-admin/firestore';
import type { Express } from 'express';
import { MemberCreationError } from './createMember.ts';

type Identity = { uid: string; email?: string; email_verified?: boolean };
/** The existing platform console is the authority for historical SaaS grants.
 * This is deliberately not a second member-billing/Stripe subscription flow. */
export async function updateOrganizationAuthority(db: Firestore, identity: Identity, clubId: string, input: unknown) {
  if (identity.email !== 'victor.defreitas.pro@gmail.com' || identity.email_verified !== true)
    throw new MemberCreationError(403, 'Administration plateforme requise.');
  if (typeof clubId !== 'string' || !/^[^/]{1,180}$/.test(clubId))
    throw new MemberCreationError(400, 'Organisation invalide.');
  const command = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const keys = Object.keys(command);
  const allowed = ['plan', 'isActive', 'canAddStaff', 'initializeLegacy'];
  if (!keys.length || keys.some(key => !allowed.includes(key)) ||
      ('plan' in command && !['basic', 'classic', 'premium'].includes(command.plan as string)) ||
      ['isActive', 'canAddStaff'].some(key => key in command && typeof command[key] !== 'boolean') ||
      ('initializeLegacy' in command && (command.initializeLegacy !== true || keys.length !== 1)))
    throw new MemberCreationError(400, 'Commande SaaS invalide.');
  const callerRef = db.doc(`users/${identity.uid}`), clubRef = db.doc(`clubs/${clubId}`);
  return db.runTransaction(async tx => {
    const [caller, club] = await tx.getAll(callerRef, clubRef);
    const profile = caller.data(), current = club.data();
    if (profile?.role !== 'superadmin' || profile.isSuspended === true)
      throw new MemberCreationError(403, 'Administration plateforme requise.');
    if (!current) throw new MemberCreationError(404, 'Organisation introuvable.');
    const updates: Record<string, unknown> = command.initializeLegacy ? {
      ...(!['basic', 'classic', 'premium'].includes(current.plan) ? { plan: 'basic' } : {}),
      ...(typeof current.isActive !== 'boolean' ? { isActive: false } : {}),
    } : Object.fromEntries(keys.map(key => [key, command[key]]));
    if (Object.keys(updates).length) {
      tx.update(clubRef, updates);
      tx.create(db.collection('admin_audit_logs').doc(), {
        actorUid: identity.uid, actionType: 'CLUB_SAAS_UPDATE', clubId,
        updates, details: JSON.stringify(updates), actorEmail: identity.email, timestamp: Date.now(),
      });
    }
    return { success: true, updates };
  });
}

export function registerOrganizationAuthority(app: Express, db: Firestore) {
  app.post('/api/admin/clubs/:clubId/saas', async (req, res) => {
    try { return res.json(await updateOrganizationAuthority(db, req.auth, String(req.params.clubId), req.body)); }
    catch (error: any) {
      if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
      return res.status(500).json({ error: 'La commande SaaS a échoué.' });
    }
  });
}
