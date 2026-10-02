import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { isOrganizationActive } from '../organizationAccess.ts';
let server: Server, base: string;
const tenant = `saas-http-${randomUUID()}`, password = 'Local-saas-authority-test!';
const people: Record<string, { uid: string; token: string }> = {};
const db = () => getFirestore();
async function person(role: string, email: string, verified = false) {
  let account;
  try { account = await getAuth().getUserByEmail(email); await getAuth().updateUser(account.uid, { password, emailVerified: verified }); }
  catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; account = await getAuth().createUser({ email, password, emailVerified: verified }); }
  await db().doc(`users/${account.uid}`).set({ id: 9970 + Object.keys(people).length, role, clubId: tenant, firebaseUid: account.uid });
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  assert.equal(r.status, 200); people[role] = { uid: account.uid, token: (await r.json()).idToken };
}
const api = (role: string, command: any, club = tenant) => fetch(`${base}/api/admin/clubs/${club}/saas`, {
  method: 'POST', headers: { Authorization: `Bearer ${people[role].token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command),
});
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const { default: app } = await import('../server.ts');
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const role of ['owner', 'manager', 'coach', 'member']) await person(role, `${role}-${randomUUID()}@example.test`, true);
  await person('superadmin', 'victor.defreitas.pro@gmail.com', true);
  await db().doc(`clubs/${tenant}`).set({ id: tenant, ownerId: people.owner.uid, accountType: 'studio', plan: 'basic', isActive: true, canAddStaff: false });
});
after(async () => new Promise<void>((r, j) => server.close(e => e ? j(e) : r())));
for (const role of ['owner', 'manager', 'coach', 'member']) it(`${role} cannot forge the server SaaS command`, async () => {
  for (const command of [{ plan: 'premium' }, { isActive: true }, { canAddStaff: true }, { initializeLegacy: true }, { entitlements: ['premium'], role: 'superadmin', trustedSuperAdmin: true, requestorUid: people.superadmin.uid }])
    assert.equal((await api(role, command)).status, 403);
  const state = (await db().doc(`clubs/${tenant}`).get()).data()!;
  assert.equal(state.plan, 'basic'); assert.equal(state.canAddStaff, false);
});
it('verified live Super Admin changes the historical grant, never arbitrary billing data', async () => {
  for (const command of [{ plan: 'unlimited' }, { isActive: 'true' }, { saasPlanId: 'studio_pro' }, { billingStatus: 'paid' }, { initializeLegacy: true, isActive: true }, { ownerId: people.owner.uid }])
    assert.equal((await api('superadmin', command)).status, 400);
  assert.equal((await api('superadmin', { plan: 'classic', canAddStaff: true })).status, 200);
  const state = (await db().doc(`clubs/${tenant}`).get()).data()!;
  assert.equal(state.plan, 'classic'); assert.equal(state.canAddStaff, true);
  const logs = await db().collection('admin_audit_logs').where('clubId', '==', tenant).get();
  assert.ok(logs.docs.some(d => d.data().actorUid === people.superadmin.uid && d.data().updates.plan === 'classic'));
});
it('authorized suspension blocks existing APIs and stale sessions; only authorized server reactivation restores access', async () => {
  assert.equal((await api('superadmin', { isActive: false })).status, 200);
  for (const role of ['owner', 'manager', 'coach', 'member']) {
    assert.equal((await api(role, { isActive: true })).status, 403);
    const r = await fetch(`${base}/api/stripe/status`, { headers: { Authorization: `Bearer ${people[role].token}` } });
    assert.equal(r.status, 403);
  }
  assert.equal(isOrganizationActive((await db().doc(`clubs/${tenant}`).get()).data()), false);
  assert.equal((await api('superadmin', { initializeLegacy: true })).status, 200);
  assert.equal(isOrganizationActive((await db().doc(`clubs/${tenant}`).get()).data()), false);
  assert.equal((await api('superadmin', { isActive: true })).status, 200);
  assert.equal((await fetch(`${base}/api/stripe/status`, { headers: { Authorization: `Bearer ${people.owner.token}` } })).status, 200);
});
it('legacy initialization fails closed and preserves explicit suspensions and existing plans', async () => {
  const legacy = `${tenant}-legacy`;
  await db().doc(`clubs/${legacy}`).set({ ownerId: people.owner.uid });
  assert.equal((await api('superadmin', { initializeLegacy: true }, legacy)).status, 200);
  assert.deepEqual((await db().doc(`clubs/${legacy}`).get()).data(), { ownerId: people.owner.uid, isActive: false, plan: 'basic' });
  await db().doc(`clubs/${legacy}`).update({ isActive: false, plan: 'premium' });
  assert.equal((await api('superadmin', { initializeLegacy: true }, legacy)).status, 200);
  assert.equal((await db().doc(`clubs/${legacy}`).get()).data()?.plan, 'premium');
  for (const state of [null, 'true', 1]) {
    await db().doc(`clubs/${tenant}`).update({ isActive: state });
    assert.equal((await api('owner', { isActive: true })).status, 403);
  }
  await db().doc(`clubs/${tenant}`).update({ isActive: true });
});
it('a stale admin token loses authority when its live profile is suspended/demoted', async () => {
  const ref = db().doc(`users/${people.superadmin.uid}`);
  await ref.update({ isSuspended: true });
  assert.equal((await api('superadmin', { plan: 'premium' })).status, 403);
  await ref.update({ isSuspended: false, role: 'owner' });
  assert.equal((await api('superadmin', { plan: 'premium' })).status, 403);
  await ref.update({ role: 'superadmin' });
});

it('a forged local plan/type/staff flag cannot provision paid legacy staff without the server grant', async () => {
  const ref = db().doc(`clubs/${tenant}`);
  await ref.update({ accountType: FieldValue.delete(), canAddStaff: false });
  const request = () => fetch(`${base}/api/create-staff`, { method: 'POST', headers: {
    Authorization: `Bearer ${people.owner.token}`, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ clubId: tenant, name: 'Authorized staff', email: `staff-${randomUUID()}@example.test`, password,
    accountType: 'studio', canAddStaff: true, plan: 'premium', entitlements: ['teamManagement'] }) });
  assert.equal((await request()).status, 403);
  assert.equal((await api('superadmin', { canAddStaff: true })).status, 200);
  assert.equal((await request()).status, 200);
  await ref.update({ accountType: 'studio', canAddStaff: false });
});
