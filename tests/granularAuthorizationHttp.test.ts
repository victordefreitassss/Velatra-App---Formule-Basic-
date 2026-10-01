import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createStaffAccount } from '../server/teamManagement.ts';
let server: Server, base: string;
const clubId = `granular-${randomUUID()}`, other = `other-${randomUUID()}`, solo = `solo-${randomUUID()}`;
const password = 'Local-authorization-test-2026!';
const people: Record<string, { uid: string; token: string; id: number }> = {};
const db = () => getFirestore();
async function person(name: string, role: string, tenant = clubId, id = 8401) {
  const email = `${name}-${randomUUID()}@example.test`;
  const account = await getAuth().createUser({ email, password });
  await db().doc(`users/${account.uid}`).set({ id, role, clubId: tenant, firebaseUid: account.uid, name });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(response.status, 200);
  people[name] = { uid: account.uid, token: (await response.json()).idToken, id };
}
const api = (path: string, name: string, method = 'GET', body?: any) => fetch(base + path, { method, headers: { Authorization: `Bearer ${people[name].token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const staffInput = (extras = {}) => ({ name: 'Staff', email: `staff-${randomUUID()}@example.test`, password, clubId, ...extras });
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const { default: app } = await import('../server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const [name, role, tenant, id] of [['owner', 'owner', clubId, 8401], ['manager', 'manager', clubId, 8402], ['coach', 'coach', clubId, 8403], ['member', 'member', clubId, 8404], ['otherMember', 'member', other, 8410], ['soloManager', 'manager', solo, 8411]] as const) await person(name, role, tenant, id);
  await db().doc(`clubs/${clubId}`).set({ id: clubId, accountType: 'studio', ownerId: people.owner.uid });
  await db().doc(`clubs/${solo}`).set({ accountType: 'solo' });
  await db().doc(`clubs/${other}`).set({ accountType: 'studio' });
});
after(async () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
it('Owner and Manager create coaches only; payload roles and identity claims never grant privileges', async () => {
  for (const name of ['owner', 'manager']) {
    const response = await api('/api/create-staff', name, 'POST', staffInput({ role: 'owner', requestorUid: people.owner.uid, trustedSuperAdmin: true }));
    assert.equal(response.status, 200);
    const { uid } = await response.json();
    assert.equal((await db().doc(`users/${uid}`).get()).data()?.role, 'coach');
  }
  for (const name of ['coach', 'member', 'soloManager']) assert.equal((await api('/api/create-staff', name, 'POST', staffInput({ requestorUid: people.owner.uid, trustedSuperAdmin: true }))).status, 403);
  assert.equal((await api('/api/create-staff', 'manager', 'POST', staffInput({ clubId: other }))).status, 403);
});
it('Manager creates and reassigns Studio members without becoming owner or moving tenant/history', async () => {
  const response = await api('/api/create-member', 'manager', 'POST', { requestId: randomUUID(), coachUid: people.coach.uid, profile: { name: 'Created', email: `created-${randomUUID()}@example.test`, role: 'owner' } });
  assert.equal(response.status, 200);
  const created = await response.json();
  assert.equal(created.member.role, 'member');
  assert.equal(created.member.assignedCoachUid, people.coach.uid);
  await db().doc('programs/granular-preserved').set({ clubId, memberId: created.memberId, assignedCoachUid: people.coach.uid, history: 'preserved' });
  assert.equal((await api('/api/assign-member-coach', 'manager', 'POST', { memberUid: created.uid, coachUid: null })).status, 200);
  const record = (await db().doc('programs/granular-preserved').get()).data();
  assert.equal(record?.history, 'preserved'); assert.equal(record?.clubId, clubId); assert.equal(record?.assignedCoachUid, undefined);
  assert.equal((await api('/api/assign-member-coach', 'manager', 'POST', { memberUid: created.uid, coachUid: people.coach.uid })).status, 200);
  assert.ok((await db().doc(`users/${people.coach.uid}`).get()).data()?.assignedMemberIds.includes(created.memberId));
  for (const name of ['coach', 'member', 'soloManager']) assert.equal((await api('/api/assign-member-coach', name, 'POST', { memberUid: people.member.uid, coachUid: people.coach.uid })).status, 403);
  for (const uid of [people.owner.uid, people.otherMember.uid]) assert.equal((await api('/api/assign-member-coach', 'manager', 'POST', { memberUid: uid, coachUid: people.coach.uid })).status, 404);
});
it('Manager cannot inspect/migrate legacy Stripe secrets, connect, disconnect, configure webhooks or sensitive billing', async () => {
  await db().doc(`clubs/${clubId}`).update({ 'settings.payment.stripeSecretKey': 'legacy-mock-only' });
  for (const [method, path, body] of [['GET', '/api/stripe/status', undefined], ['POST', '/api/stripe/connect', { secretKey: 'sk_test_mockOnly' }], ['DELETE', '/api/stripe/connect', undefined], ['POST', '/api/stripe/webhook-config', { webhookSecret: 'whsec_mockOnly' }], ['POST', '/api/billing/plans', { name: 'Unauthorized', price: 10, billingCycle: 'monthly' }], ['POST', `/api/billing/members/${people.member.id}/credits`, { credits: 99 }]] as const) {
    const response = await api(path, 'manager', method, body); assert.equal(response.status, 403, path);
  }
  assert.equal((await db().doc(`clubs/${clubId}`).get()).data()?.settings.payment.stripeSecretKey, 'legacy-mock-only');
  assert.equal((await db().doc(`stripeSecrets/${clubId}`).get()).exists, false);
  await db().doc(`clubs/${clubId}`).update({ settings: {} });
  assert.equal((await api('/api/stripe/status', 'owner')).status, 200);
  assert.equal((await api('/api/stripe/connect', 'owner', 'POST', { secretKey: 'invalid' })).status, 400);
  assert.equal((await api('/api/stripe/webhook-config', 'owner', 'POST', { webhookSecret: 'whsec_mockOnly' })).status, 200);
  assert.equal((await api('/api/stripe/connect', 'owner', 'DELETE')).status, 200);
});
it('Manager cannot delete any identity; Owner retains deletion of ordinary same-club accounts only', async () => {
  for (const name of ['manager', 'coach', 'member']) {
    assert.equal((await api('/api/delete-user', name, 'POST', { uid: people.owner.uid })).status, 403);
    assert.equal((await api('/api/delete-user', name, 'POST', { uid: people.member.uid })).status, 403);
  }
  assert.ok(await getAuth().getUser(people.owner.uid));
  assert.equal((await api('/api/delete-user', 'owner', 'POST', { uid: people.otherMember.uid })).status, 403);
  const created = await (await api('/api/create-staff', 'owner', 'POST', staffInput())).json();
  assert.equal((await api('/api/delete-user', 'owner', 'POST', { uid: created.uid })).status, 200);
  assert.equal((await db().doc(`users/${created.uid}`).get()).exists, false);
});
it('Manager can use tenant follow-up, CRM conversion and global member planning, with fresh role checks', async () => {
  assert.equal((await api(`/api/followup/clients/${people.member.uid}`, 'manager')).status, 200);
  assert.equal((await api(`/api/followup/clients/${people.otherMember.uid}`, 'manager')).status, 403);
  assert.equal((await api('/api/followup/templates', 'manager', 'POST', { name: 'Manager check-in', questions: [{ id: 'energy', label: 'Energy', type: 'scale', min: 0, max: 10, required: true }] })).status, 200);
  const prospectUid = `granular-${randomUUID()}`;
  await db().doc(`prospects/${prospectUid}`).set({ clubId, name: 'Prospect', status: 'lead', phone: '' });
  const conversion = await api(`/api/prospects/${prospectUid}/convert`, 'manager', 'POST', { email: `converted-${randomUUID()}@example.test`, coachUid: people.coach.uid });
  assert.equal(conversion.status, 200);
  await db().doc('bookings/granular-cancel').set({ clubId, memberUid: people.member.uid, memberId: people.member.id, coachId: people.coach.uid, type: 'coaching', status: 'confirmed', creditDebited: false });
  assert.equal((await api('/api/bookings/cancel', 'manager', 'POST', { id: 'granular-cancel' })).status, 200);
  await db().doc(`users/${people.manager.uid}`).update({ role: 'member' });
  assert.equal((await api('/api/create-staff', 'manager', 'POST', staffInput())).status, 403);
  await db().doc(`users/${people.manager.uid}`).update({ role: 'manager' });
  await db().doc(`clubs/${clubId}`).update({ accountType: 'solo' });
  assert.equal((await api('/api/create-staff', 'manager', 'POST', staffInput())).status, 403);
  await db().doc(`clubs/${clubId}`).update({ accountType: 'studio' });
});
it('staff provisioning compensates Auth creation if manager authority is revoked before profile transaction', async () => {
  let createdUid = '';
  const fakeAuth = { createUser: async (input: any) => {
    const account = await getAuth().createUser(input); createdUid = account.uid;
    await db().doc(`users/${people.manager.uid}`).update({ role: 'member' });
    return account;
  }, deleteUser: (uid: string) => getAuth().deleteUser(uid) };
  await assert.rejects(createStaffAccount(fakeAuth as any, db(), people.manager.uid, staffInput()), (error: any) => error.status === 403);
  assert.equal((await db().doc(`users/${createdUid}`).get()).exists, false);
  await assert.rejects(getAuth().getUser(createdUid), (error: any) => error.code === 'auth/user-not-found');
  await db().doc(`users/${people.manager.uid}`).update({ role: 'manager' });
});

it('Manager plans and moves member sessions and CRM trials for real coaches, never for other clubs', async () => {
  const start = new Date(Date.now() + 7 * 86400000); start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start.getTime() + 3600000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(start);
  const hour = Number(parts.find(p => p.type === 'hour')!.value);
  await db().doc(`clubs/${clubId}`).update({ 'settings.booking': { enabled: true, sessionDuration: 60, schedule: [{ day: start.getUTCDay(), slots: [{ start: `${hour}:00`, end: `${hour + 4}:00`, coachId: people.coach.uid }] }] } });
  const bookingInput = { memberId: people.member.id, coachId: people.coach.uid, startTime: start.toISOString(), endTime: end.toISOString() };
  const response = await api('/api/bookings/reserve', 'manager', 'POST', bookingInput);
  assert.equal(response.status, 200); const reserved = await response.json();
  assert.equal((await api('/api/bookings/reschedule', 'manager', 'POST', { id: reserved.id, startTime: end.toISOString(), endTime: new Date(end.getTime() + 3600000).toISOString() })).status, 200);
  assert.equal((await api('/api/bookings/reserve', 'manager', 'POST', { ...bookingInput, memberId: people.otherMember.id })).status, 404);
  const prospectUid = `trial-${randomUUID()}`;
  await db().doc(`prospects/${prospectUid}`).set({ clubId, status: 'lead', id: 8460 });
  const trial = { prospectUid, coachUid: people.coach.uid, startTime: new Date(end.getTime() + 3600000).toISOString(), endTime: new Date(end.getTime() + 7200000).toISOString() };
  assert.equal((await api('/api/bookings/trial', 'manager', 'POST', { ...trial, coachUid: people.otherMember.uid })).status, 403);
  const created = await api('/api/bookings/trial', 'manager', 'POST', trial);
  assert.equal(created.status, 200);
  assert.equal((await db().doc(`bookings/${(await created.json()).id}`).get()).data()?.coachId, String(people.coach.id));
});
it('Owner provisions a real Studio Manager who logs in and operates the tenant; payload cannot elevate role', async () => {
  const input = staffInput({ role: 'superadmin', trustedSuperAdmin: true });
  const response = await api('/api/create-manager', 'owner', 'POST', input);
  assert.equal(response.status, 200);
  const { uid } = await response.json();
  const profile = (await db().doc(`users/${uid}`).get()).data()!;
  assert.equal(profile.role, 'manager'); assert.equal(profile.clubId, clubId);
  assert.equal(profile.isSuspended, false); assert.deepEqual(profile.assignedMemberIds, []);
  const login = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.email, password, returnSecureToken: true }) });
  assert.equal(login.status, 200);
  people.createdManager = { uid, id: profile.id, token: (await login.json()).idToken };
  assert.equal((await api(`/api/followup/clients/${people.member.uid}`, 'createdManager')).status, 200);
  assert.equal((await api('/api/create-staff', 'createdManager', 'POST', staffInput())).status, 200);
  assert.equal((await api('/api/stripe/status', 'createdManager')).status, 403);
  for (const name of ['manager', 'createdManager', 'coach', 'member', 'soloManager']) assert.equal((await api('/api/create-manager', name, 'POST', staffInput({ role: 'owner' }))).status, 403);
  assert.equal((await api('/api/create-manager', 'owner', 'POST', staffInput({ clubId: other }))).status, 403);
  for (const accountType of ['solo', undefined]) {
    await db().doc(`clubs/${clubId}`).set({ ownerId: people.owner.uid, ...(accountType ? { accountType } : {}) });
    assert.equal((await api('/api/create-manager', 'owner', 'POST', staffInput())).status, 403);
  }
  await db().doc(`clubs/${clubId}`).set({ ownerId: people.owner.uid, accountType: 'studio' });
});
it('Suspension revokes existing HTTP sessions and reactivation restores operations', async () => {
  for (const name of ['owner', 'manager', 'coach', 'member']) {
    await db().doc(`users/${people[name].uid}`).update({ isSuspended: true });
    assert.equal((await api(`/api/followup/clients/${people.member.uid}`, name)).status, 403);
    await db().doc(`users/${people[name].uid}`).update({ isSuspended: false });
  }
  assert.equal((await api(`/api/followup/clients/${people.member.uid}`, 'manager')).status, 200);
});
it('Manager provisioning compensates Auth if Studio Owner identity changes before transaction', async () => {
  let createdUid = '';
  const fakeAuth = { createUser: async (input: any) => {
    const account = await getAuth().createUser(input); createdUid = account.uid;
    await db().doc(`clubs/${clubId}`).update({ ownerId: 'changed-owner' });
    return account;
  }, deleteUser: (uid: string) => getAuth().deleteUser(uid) };
  await assert.rejects(createStaffAccount(fakeAuth as any, db(), people.owner.uid, staffInput(), false, 'manager'), (error: any) => error.status === 403);
  assert.equal((await db().doc(`users/${createdUid}`).get()).exists, false);
  await assert.rejects(getAuth().getUser(createdUid), (error: any) => error.code === 'auth/user-not-found');
  await db().doc(`clubs/${clubId}`).update({ ownerId: people.owner.uid });
});
