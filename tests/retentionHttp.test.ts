import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { loadRetention } from '../server/retention';
import { dayKey, shiftDay } from '../server/followupModel';
let server: Server, base: string;
const db = () => getFirestore();
const people: Record<string, { uid: string; token: string; id: number }> = {};
const club = `retain-${randomUUID()}`, otherClub = `retain-other-${randomUUID()}`;
const password = 'Local-retain-test-2026!';
async function person(name: string, role: string, clubId: string, id: number, extras: Record<string, unknown> = {}) {
  const email = `${name}-${randomUUID()}@example.test`, account = await getAuth().createUser({ email, password });
  await db().doc(`users/${account.uid}`).set({ id, role, clubId, firebaseUid: account.uid, name, status: 'active', createdAt: shiftDay(dayKey(), -60), ...extras });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(response.status, 200); people[name] = { uid: account.uid, token: (await response.json()).idToken, id };
}
async function api(path = '/api/retention', name?: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(name ? { Authorization: `Bearer ${people[name].token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
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
  batch.set(db().doc(`coachCheckInAssignments/${club}-assignment`), { clubId: club, memberUid: people.member.uid, active: true, templateName: 'Bilan', startDate: shiftDay(dayKey(), -8), frequency: { kind: 'manual' } });
  await batch.commit();
});
after(async () => { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
const detail = (name = 'owner', member = 'member') => api(`/api/retention/${people[member].uid}`, name);
const intervention = (name = 'coach', member = 'member', body: any = { requestId: randomUUID(), kind: 'called', note: 'Contact prévu' }) => api(`/api/retention/${people[member].uid}/interventions`, name, 'POST', body);
it('Retain verifies token; refuses Member, Superadmin and forged token', async () => {
  assert.equal((await api()).status, 401); for (const name of ['member', 'superadmin']) assert.equal((await api('/api/retention', name)).status, 403);
  const response = await fetch(`${base}/api/retention`, { headers: { Authorization: 'Bearer forged' } }); assert.equal(response.status, 401);
});
it('Owner/Manager full Studio, Coach assigned UID only; GET never writes', async () => {
  const before = (await db().doc(`users/${people.member.uid}`).get()).data();
  for (const name of ['owner', 'manager', 'coach']) { const result = await api('/api/retention', name); assert.equal(result.status, 200); assert.equal(result.body.total, name === 'coach' ? 1 : 3); assert.ok(result.body.assessments.every((row: any) => name !== 'coach' || row.memberUid === people.member.uid)); }
  assert.deepEqual((await db().doc(`users/${people.member.uid}`).get()).data(), before); assert.equal((await db().collection('retentionInterventions').where('clubId', '==', club).get()).size, 0);
  assert.equal((await detail('coach', 'memberB')).status, 404); assert.equal((await detail('other')).status, 404);
});
it('Manager/Coach loaders never query finance, personal messages are scoped to actor', async () => {
  const names: string[] = []; const database = new Proxy(db(), { get(target, key) { if (key === 'collection') return (name: string) => { names.push(name); assert.ok(!['subscriptions', 'payments', 'invoices'].includes(name)); return target.collection(name); }; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
  for (const name of ['manager', 'coach']) { const result = await loadRetention(database, people[name].uid); assert.ok(result.assessments.every(row => row.signals.every(signal => signal.family !== 'BILLING'))); }
  assert.ok(names.includes('messages')); assert.equal((await api('/api/retention?signal=PAYMENT_CONTEXT', 'manager')).status, 403);
  assert.ok((await detail()).body.assessment.signals.some((s: any) => s.type === 'PAYMENT_CONTEXT'));
});
it('Coach/Manager intervention authorized, cross club/other Coach/Member denied', async () => {
  assert.equal((await intervention()).status, 200); assert.equal((await intervention('manager', 'memberB')).status, 200);
  for (const [name, member, expected] of [['coach', 'memberB', 404], ['other', 'member', 404], ['member', 'member', 403], ['superadmin', 'member', 403]] as const) assert.equal((await intervention(name, member)).status, expected);
});
it('Intervention idempotence has immutable actor/time, payload mismatch rejected, no source mutation/resolution', async () => {
  const before = (await detail()).body.assessment; const body = { requestId: randomUUID(), kind: 'contacted', note: 'Appel consigné' };
  const [first, retry] = await Promise.all([intervention('coach', 'member', body), intervention('coach', 'member', body)]); assert.equal(first.status, 200); assert.equal(retry.status, 200); assert.deepEqual(first.body.intervention, retry.body.intervention); assert.ok(first.body.alreadyCreated || retry.body.alreadyCreated);
  assert.equal(first.body.intervention.actorUid, people.coach.uid); assert.equal((await intervention('coach', 'member', { ...body, kind: 'other' })).status, 409);
  const after = (await detail()).body.assessment; assert.equal(before.state, after.state); assert.deepEqual(before.signals, after.signals);
});
it('Reject forged authority fields, invalid requestId/note/kind', async () => {
  for (const patch of [{ actorUid: people.owner.uid }, { clubId: otherClub }, { requestId: '../unsafe' }, { note: 'x'.repeat(1001) }, { kind: '__proto__' }, { kind: ['called'] }, { role: 'owner' }]) assert.equal((await intervention('coach', 'member', { requestId: randomUUID(), kind: 'called', ...patch })).status, 400);
});
it('Portfolio filters and pagination bound to identity/source', async () => {
  const page = await api('/api/retention?limit=1', 'owner'); assert.ok(page.body.nextCursor);
  const next = await api(`/api/retention?limit=1&cursor=${page.body.nextCursor}`, 'owner'); assert.equal(next.status, 200); assert.notEqual(page.body.assessments[0].memberUid, next.body.assessments[0].memberUid);
  assert.equal((await api(`/api/retention?limit=1&cursor=${page.body.nextCursor}`, 'manager')).status, 409);
  assert.equal((await api(`/api/retention?coach=${people.coach.uid}`, 'owner')).body.total, 1);
  assert.equal((await api('/api/retention?search=memberB', 'manager')).body.total, 1);
  for (const query of ['limit=51', 'state=forged', 'cursor=bad', 'search[x]=1']) assert.equal((await api(`/api/retention?${query}`, 'owner')).status, 400);
  await db().doc(`users/${people.unassigned.uid}`).update({ name: 'Nom modifié' }); assert.equal((await api(`/api/retention?limit=1&cursor=${page.body.nextCursor}`, 'owner')).status, 409);
});
it('Pulse supplies one aggregated warning and Home summary, retains distinct operational tasks/payment', async () => {
  const result = await api('/api/pulse?limit=50', 'owner'); assert.equal(result.status, 200);
  const own = result.body.actions.filter((row: any) => row.memberUid === people.member.uid); assert.equal(own.filter((row: any) => row.type === 'RETENTION_ATTENTION').length, 1); assert.ok(!own.some((row: any) => ['CLIENT_INACTIVE', 'PROGRAM_MISSING', 'FOLLOWUP_LATE'].includes(row.type))); assert.ok(own.some((row: any) => row.type === 'PAYMENT_ATTENTION')); assert.ok(result.body.actions.some((row: any) => row.type === 'TASK_TODAY')); assert.equal(result.body.retentionSummary.critical, 1);
});
it('Authoritative reassignment and suspension/Manager plan revocation rechecked even on idempotent retry', async () => {
  const body = { requestId: randomUUID(), kind: 'called' }; assert.equal((await intervention('coach', 'member', body)).status, 200);
  await db().doc(`users/${people.member.uid}`).update({ assignedCoachUid: people.coachB.uid }); assert.equal((await intervention('coach', 'member', body)).status, 404);
  await db().doc(`users/${people.coach.uid}`).update({ isSuspended: true }); assert.equal((await api('/api/retention', 'coach')).status, 403);
  await db().doc(`clubs/${club}`).update({ saasPlanId: 'unknown' }); assert.equal((await api('/api/retention', 'manager')).status, 403);
  await db().doc(`clubs/${club}`).set({ id: club, accountType: 'studio', ownerId: people.owner.uid, isActive: true });
  await db().doc(`users/${people.coach.uid}`).update({ isSuspended: false }); await db().doc(`users/${people.member.uid}`).update({ assignedCoachUid: people.coach.uid });
});
it('Solo Owner portfolio and Owner cancellation exclusion, Manager finance stays opaque', async () => {
  await db().doc(`clubs/${club}`).update({ accountType: 'solo' }); assert.equal((await api('/api/retention', 'owner')).body.total, 3); assert.equal((await api('/api/retention', 'manager')).status, 403);
  await db().doc(`clubs/${club}`).update({ accountType: 'studio' }); await db().doc(`subscriptions/${club}-cancelled`).set({ isActive: true, clubId: club, memberId: people.memberB.id, status: 'cancelled' }); assert.equal((await api('/api/retention', 'owner')).body.total, 2); assert.equal((await api('/api/retention', 'manager')).body.total, 3);
});
it('500-client Retain uses 12 tenant queries Owner / 11 Manager, 2 authority docs, no member query loop', async () => {
  for (let offset = 0; offset < 500; offset += 250) { const batch = db().batch(); for (let i = offset; i < offset + 250; i++) batch.set(db().doc(`users/${club}-volume-${i}`), { clubId: club, role: 'member', id: 20000 + i, name: `Client ${i}`, createdAt: shiftDay(dayKey(), -60), status: 'active' }); await batch.commit(); }
  for (const [name, expected] of [['owner', 12], ['manager', 11]] as const) {
    let queries = 0; const wrap = (query: any): any => new Proxy(query, { get(target, key) { if (key === 'get') return async () => { queries++; return target.get(); }; if (['where', 'limit'].includes(String(key))) return (...args: any[]) => wrap(target[key](...args)); return Reflect.get(target, key, target); } });
    const database = new Proxy(db(), { get(target, key) { if (key === 'collection') return (collection: string) => wrap(target.collection(collection)); const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
    const result = await loadRetention(database, people[name].uid); assert.equal(queries, expected); assert.equal(result.assessments.length, name === 'owner' ? 502 : 503); assert.deepEqual(result.partialSources, []);
  }
});
it('A capped source marks partial and suppresses Stable even with fresh activity', async () => {
  const wrap = (query: any): any => new Proxy(query, { get(target, key) { if (key === 'get') return async () => { const snapshot = await target.get(); const fake = { id: 'partial-log', data: () => ({ clubId: club, memberId: people.member.id, date: new Date().toISOString() }) }; return { ...snapshot, size: 10001, docs: Array.from({ length: 10001 }, () => fake) }; }; if (['where', 'limit'].includes(String(key))) return (...args: any[]) => wrap(target[key](...args)); return Reflect.get(target, key, target); } });
  const database = new Proxy(db(), { get(target, key) { if (key === 'collection') return (name: string) => name === 'logs' ? wrap(target.collection(name)) : target.collection(name); const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
  const result = await loadRetention(database, people.owner.uid); assert.ok(result.partialSources.includes('logs')); assert.ok(result.assessments.every(item => item.state === 'insufficient_data' && item.partial));
});
it('Pulse response identity must match the assignment member, not merely another scoped member', async () => {
  const uid = `${club}-fresh`, assignmentId = `${club}-fresh-assignment`, due = shiftDay(dayKey(), -3);
  await db().doc(`users/${uid}`).set({ clubId: club, role: 'member', id: 99000, name: 'Fresh', status: 'active', createdAt: new Date().toISOString(), assignedCoachUid: people.coach.uid });
  await db().doc(`coachCheckInAssignments/${assignmentId}`).set({ clubId: club, memberUid: uid, active: true, startDate: due, frequency: { kind: 'manual' } });
  await db().doc(`coachCheckInResponses/${assignmentId}_${due}`).set({ clubId: club, memberUid: people.memberB.uid });
  const result = await api('/api/pulse?limit=50&category=followup', 'owner'); assert.ok(result.body.actions.some((item: any) => item.memberUid === uid && item.type === 'FOLLOWUP_LATE'));
});
