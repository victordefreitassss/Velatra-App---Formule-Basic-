import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { loadPulse, pulseStateId } from '../server/pulse';
import { dayKey, shiftDay } from '../server/followupModel';
let server: Server, base: string;
const db = () => getFirestore();
const people: Record<string, { uid: string; token: string; id: number }> = {};
const club = `pulse-${randomUUID()}`, otherClub = `pulse-other-${randomUUID()}`;
const password = 'Local-pulse-test-2026!';
async function person(name: string, role: string, clubId: string, id: number, extras: Record<string, unknown> = {}) {
  const email = `${name}-${randomUUID()}@example.test`, account = await getAuth().createUser({ email, password });
  await db().doc(`users/${account.uid}`).set({ id, role, clubId, firebaseUid: account.uid, name, status: 'active', createdAt: new Date().toISOString(), ...extras });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(response.status, 200); people[name] = { uid: account.uid, token: (await response.json()).idToken, id };
}
async function api(path = '/api/pulse', name?: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(name ? { Authorization: `Bearer ${people[name].token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
const actions = async (name = 'owner', query = '') => (await api(`/api/pulse?limit=50${query}`, name)).body.actions as any[];
const mutate = (action: any, name = 'coach', operation = 'handled', patch: any = {}) => api(`/api/pulse/${encodeURIComponent(action.key)}/${operation}`, name, 'POST', { sourceFingerprint: action.sourceFingerprint, ...patch });
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Firebase emulators required');
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const { default: app } = await import('../server.ts'); server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  await person('owner', 'owner', club, 9301); await person('manager', 'manager', club, 9302); await person('coach', 'coach', club, 9303); await person('coachB', 'coach', club, 9304);
  await person('member', 'member', club, 9305, { assignedCoachUid: people.coach.uid }); await person('memberB', 'member', club, 9306, { assignedCoachUid: people.coachB.uid });
  await person('unassigned', 'member', club, 9307); await person('other', 'owner', otherClub, 9310); await person('superadmin', 'superadmin', club, 9311);
  await db().doc(`clubs/${club}`).set({ id: club, accountType: 'studio', isActive: true, ownerId: people.owner.uid });
  await db().doc(`clubs/${otherClub}`).set({ id: otherClub, accountType: 'solo', isActive: true, ownerId: people.other.uid });
  const batch = db().batch();
  batch.set(db().doc(`tasks/${club}-task`), { clubId: club, title: 'Tâche personnelle', status: 'todo', assignedTo: String(people.coach.id), relatedMemberId: people.member.id, dueDate: dayKey() });
  batch.set(db().doc(`tasks/${club}-other-task`), { clubId: club, title: 'AUTRE COACH', status: 'todo', assignedTo: String(people.coachB.id), relatedMemberId: people.memberB.id, dueDate: dayKey() });
  batch.set(db().doc(`subscriptions/${club}-past`), { clubId: club, memberId: people.member.id, status: 'past_due', price: 100 });
  batch.set(db().doc(`coachCheckInAssignments/${club}-assignment`), { clubId: club, memberUid: people.member.uid, active: true, templateName: 'Bilan', startDate: shiftDay(dayKey(), -3), frequency: { kind: 'manual' } });
  await batch.commit();
});
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
it('Pulse API verifies Firebase token and refuses Member/Superadmin', async () => {
  assert.equal((await api()).status, 401);
  assert.equal((await api('/api/pulse', 'member')).status, 403);
  assert.equal((await api('/api/pulse', 'superadmin')).status, 403);
  const response = await fetch(`${base}/api/pulse`, { headers: { Authorization: 'Bearer forged' } }); assert.equal(response.status, 401);
});
it('GET is read-only, Coach portfolio/personal task only, Manager no sensitive finance', async () => {
  const beforeUsers = (await db().collection('users').where('clubId', '==', club).get()).docs.map(doc => doc.data());
  const beforeTasks = (await db().collection('tasks').where('clubId', '==', club).get()).docs.map(doc => doc.data());
  const coach = await actions('coach'), manager = await actions('manager'), owner = await actions();
  assert.ok(coach.some(item => item.type === 'FOLLOWUP_LATE'));
  assert.ok(coach.every(item => !item.memberId || item.memberId === people.member.id));
  assert.ok(coach.every(item => item.category !== 'business' && item.category !== 'crm'));
  assert.equal(coach.filter(item => item.category === 'tasks').length, 1);
  assert.ok(manager.some(item => item.type === 'CLIENT_UNASSIGNED')); assert.ok(manager.every(item => item.category !== 'business'));
  assert.ok(owner.some(item => item.type === 'PAYMENT_ATTENTION'));
  assert.equal((await db().collection('pulseActionStates').where('clubId', '==', club).get()).size, 0);
  assert.deepEqual((await db().collection('users').where('clubId', '==', club).get()).docs.map(doc => doc.data()), beforeUsers);
  assert.deepEqual((await db().collection('tasks').where('clubId', '==', club).get()).docs.map(doc => doc.data()), beforeTasks);
});
it('Coach/Manager loader never queries sensitive collections', async () => {
  const database = new Proxy(db(), { get(target, property) {
    if (property === 'collection') return (name: string) => { assert.ok(!['subscriptions', 'payments'].includes(name), `Forbidden ${name} query`); return target.collection(name); };
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  for (const name of ['coach', 'manager']) assert.ok((await loadPulse(database, people[name].uid, new Date())).actions.every(item => item.category !== 'business'));
});
it('Handled writes state only, isolates two actors and rejects forged authority/body', async () => {
  const action = (await actions('coach')).find(item => item.type === 'PROGRAM_MISSING');
  const before = (await db().doc(`users/${people.member.uid}`).get()).data();
  for (const patch of [{ actorUid: people.owner.uid }, { clubId: otherClub }, { role: 'owner' }]) assert.equal((await mutate(action, 'coach', 'handled', patch)).status, 400);
  assert.equal((await mutate(action)).status, 200);
  assert.ok(!(await actions('coach')).some(item => item.key === action.key));
  assert.ok((await actions('owner')).some(item => item.key === action.key));
  assert.ok((await actions('coach', '&status=handled')).some(item => item.key === action.key));
  assert.deepEqual((await db().doc(`users/${people.member.uid}`).get()).data(), before);
  const saved = (await db().doc(`pulseActionStates/${pulseStateId(people.coach.uid, club, action.key)}`).get()).data()!;
  assert.deepEqual(Object.keys(saved).sort(), ['actorUid', 'clubId', 'createdAt', 'key', 'sourceFingerprint', 'status', 'updatedAt'].sort());
});
it('Unassigned client reopens after assignment/removal even with identical business fields', async () => {
  const action = (await actions('manager')).find(item => item.type === 'CLIENT_UNASSIGNED');
  assert.equal((await mutate(action, 'manager')).status, 200);
  const ref = db().doc(`users/${people.unassigned.uid}`), original = (await ref.get()).data()!;
  await ref.update({ assignedCoachUid: people.coach.uid }); assert.ok(!(await actions('manager')).some(item => item.key === action.key));
  await ref.set(original); const fresh = (await actions('manager')).find(item => item.key === action.key);
  assert.ok(fresh); assert.notEqual(fresh.sourceFingerprint, action.sourceFingerprint);
});
it('Cross-club/other Coach cannot guess an action or reuse another tenant cursor', async () => {
  const action = (await actions()).find(item => item.memberId === people.memberB.id);
  assert.equal((await mutate(action, 'coach')).status, 404);
  assert.equal((await mutate(action, 'other')).status, 404);
  const page = await api('/api/pulse?limit=1', 'owner'); assert.ok(page.body.nextCursor);
  assert.equal((await api(`/api/pulse?limit=1&cursor=${page.body.nextCursor}`, 'other')).status, 400);
  assert.equal((await api('/api/pulse?category=business', 'coach')).status, 403);
  for (const query of ['limit=0', 'limit=51', 'limit=abc', 'status=forged', 'cursor=invalid']) assert.equal((await api(`/api/pulse?${query}`, 'owner')).status, 400);
});
it('Pagination has no duplicates and stale source/state invalidates a cursor', async () => {
  let response = await api('/api/pulse?limit=1', 'owner'); const cursor = response.body.nextCursor; const keys = [response.body.actions[0].key];
  while (response.body.nextCursor) { response = await api(`/api/pulse?limit=1&cursor=${response.body.nextCursor}`, 'owner'); assert.equal(response.status, 200); keys.push(response.body.actions[0].key); }
  assert.equal(new Set(keys).size, keys.length); assert.equal(keys.length, response.body.total);
  const action = (await actions()).find(item => item.type === 'PAYMENT_ATTENTION'); assert.equal((await mutate(action, 'owner')).status, 200);
  assert.equal((await api(`/api/pulse?limit=1&cursor=${cursor}`, 'owner')).status, 409);
});
it('Snooze persists until server deadline; expired state returns without writes', async () => {
  const action = (await actions('coach')).find(item => item.category === 'tasks');
  assert.equal((await mutate(action, 'coach', 'snooze', { preset: 'tomorrow' })).status, 200);
  assert.ok(!(await actions('coach')).some(item => item.key === action.key));
  assert.ok((await actions('coach', '&status=snoozed')).some(item => item.key === action.key));
  const ref = db().doc(`pulseActionStates/${pulseStateId(people.coach.uid, club, action.key)}`);
  await ref.update({ snoozedUntil: new Date(Date.now() - 1).toISOString() }); const before = (await ref.get()).data();
  assert.ok((await actions('coach')).some(item => item.key === action.key)); assert.deepEqual((await ref.get()).data(), before);
  assert.equal((await mutate(action, 'coach', 'snooze', { preset: 'forever' })).status, 400);
});
it('Source mutation rejects stale fingerprint and business completion auto-resolves', async () => {
  const action = (await actions('coach')).find(item => item.category === 'tasks');
  const ref = db().doc(`tasks/${club}-task`); await ref.update({ dueDate: shiftDay(dayKey(), 1) });
  assert.equal((await mutate(action)).status, 409);
  await ref.update({ status: 'done' }); assert.ok(!(await actions('coach')).some(item => item.key === action.key));
  const followup = (await actions('coach')).find(item => item.type === 'FOLLOWUP_LATE');
  await db().doc(`coachCheckInResponses/${club}-assignment_${followup.dueAt}`).set({ clubId: club, memberUid: people.member.uid });
  assert.ok(!(await actions('coach')).some(item => item.category === 'followup'));
});
it('Authority is reread after token acquisition: reassignment, suspension, owner and Manager revocation', async () => {
  const own = (await actions()).find(item => item.type === 'PROGRAM_MISSING' && item.memberId === people.member.id);
  await db().doc(`users/${people.member.uid}`).update({ assignedCoachUid: people.coachB.uid }); assert.equal((await mutate(own)).status, 404);
  await db().doc(`users/${people.coach.uid}`).update({ isSuspended: true }); assert.equal((await api('/api/pulse', 'coach')).status, 403);
  await db().doc(`clubs/${club}`).update({ ownerId: people.other.uid }); assert.equal((await api('/api/pulse', 'owner')).status, 403);
  await db().doc(`clubs/${club}`).update({ ownerId: people.owner.uid, saasPlanId: 'unknown' }); assert.equal((await api('/api/pulse', 'manager')).status, 403);
  await db().doc(`clubs/${club}`).update({ saasPlanId: 'studio' }); assert.equal((await api('/api/pulse', 'manager')).status, 200);
  await db().doc(`clubs/${club}`).update({ accountType: 'solo' }); assert.equal((await api('/api/pulse', 'manager')).status, 403);
  await db().doc(`clubs/${club}`).set({ id: club, accountType: 'studio', isActive: true, ownerId: people.owner.uid });
});
it('500-client server aggregation uses a fixed number of tenant queries, no per-client queries', async () => {
  for (let offset = 0; offset < 500; offset += 250) {
    const batch = db().batch(); for (let i = offset; i < offset + 250; i++) batch.set(db().doc(`users/${club}-volume-${i}`), { clubId: club, firebaseUid: `${club}-volume-${i}`, role: 'member', id: 10000 + i, name: `Client ${i}`, createdAt: new Date().toISOString(), status: 'active' }); await batch.commit();
  }
  let queries = 0;
  const wrap = (query: any): any => new Proxy(query, { get(target, property) { if (property === 'get') return async () => { queries++; return target.get(); }; if (['where', 'limit'].includes(String(property))) return (...args: any[]) => wrap(target[property](...args)); return Reflect.get(target, property, target); } });
  const database = new Proxy(db(), { get(target, property) { if (property === 'collection') return (name: string) => wrap(target.collection(name)); const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value; } });
  const result = await loadPulse(database, people.owner.uid, new Date());
  assert.equal(queries, 11); assert.ok(result.actions.length >= 500); assert.deepEqual(result.partialSources, []);
  const page = await api('/api/pulse?limit=5', 'owner'); assert.equal(page.body.actions.length, 5); assert.ok(page.body.total >= 500); assert.ok(page.body.nextCursor);
});
