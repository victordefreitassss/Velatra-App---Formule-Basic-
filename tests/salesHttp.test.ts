import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { loadSales } from '../server/sales';
import { salesEventId } from '../server/salesEvents';
import { dayKey, shiftDay } from '../server/followupModel';
const club = `sales-${randomUUID()}`, otherClub = `sales-other-${randomUUID()}`, soloClub = `sales-solo-${randomUUID()}`;
const people: Record<string, { uid: string; token: string; id: number }> = {};
let server: Server, base: string;
const db = () => getFirestore();
async function person(name: string, role: string, clubId: string, id: number, extra = {}) {
  const email = `${name}-${randomUUID()}@example.test`, password = 'Local-sales-2026!';
  const user = await getAuth().createUser({ email, password });
  await db().doc(`users/${user.uid}`).set({ id, role, clubId, name, ...extra });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(response.status, 200); people[name] = { uid: user.uid, id, token: (await response.json()).idToken };
}
async function api(path: string, name?: string, body?: unknown) {
  const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(name ? { Authorization: `Bearer ${people[name].token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json() };
}
const trial = async (name: string, patch = {}, targetClub = club, coachName = 'coach') => {
  const uid = `${club}-p-${name}`, id = `${club}-b-${name}`;
  await db().doc(`prospects/${uid}`).set({ id: 500, clubId: targetClub, date: new Date().toISOString(), name: 'Lead', email: '', phone: '', status: 'trial', source: ' Instagram ', answers: {} });
  await db().doc(`bookings/${id}`).set({ id, clubId: targetClub, type: 'trial', status: 'confirmed', prospectId: 500, prospectUid: uid, coachId: String(people[coachName].id), coachUid: people[coachName].uid,
    startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date(Date.now() - 1000).toISOString(), ...patch });
  return { id, uid };
};
const mark = (id: string, name = 'owner', attendanceStatus = 'SHOWED_UP', extra = {}) => api(`/api/bookings/${id}/attendance`, name, { attendanceStatus, ...extra });
const overviewPath = () => `/api/sales/overview?from=${shiftDay(dayKey(), -30)}&to=${dayKey()}`;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw Error('Emulators required');
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1'; const { default: app } = await import('../server.ts'); server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const [name, role, id] of [['owner', 'owner', 9511], ['manager', 'manager', 9512], ['coach', 'coach', 9513], ['coachB', 'coach', 9514], ['member', 'member', 9515], ['superadmin', 'superadmin', 9516], ['suspended', 'coach', 9517]] as const) await person(name, role, club, id, name === 'suspended' ? { isSuspended: true } : {});
  await person('other', 'owner', otherClub, 9520); await person('solo', 'owner', soloClub, 9530);
  for (const [id, owner, accountType] of [[club, 'owner', 'studio'], [otherClub, 'other', 'studio'], [soloClub, 'solo', 'solo']]) await db().doc(`clubs/${id}`).set({ id, accountType, isActive: true, ownerId: people[owner].uid });
});
after(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
it('Sales requires verified token and refuses global Coach/Member/Superadmin', async () => {
  assert.equal((await api(overviewPath())).status, 401);
  for (const role of ['coach', 'member', 'superadmin', 'suspended']) assert.equal((await api(overviewPath(), role)).status, 403);
  const forged = await fetch(base + overviewPath(), { headers: { Authorization: 'Bearer forged' } }); assert.equal(forged.status, 401);
});
it('Owner/Manager/Solo overview is allowed; Solo has no team analytics', async () => {
  for (const role of ['owner', 'manager', 'solo']) assert.equal((await api(overviewPath(), role)).status, 200);
  assert.deepEqual((await api(overviewPath(), 'solo')).body.coaches, []);
  for (const query of ['from=bad&to=2026-10-01', 'from=2026-10-02&to=2026-10-01', 'from=2026-02-30&to=2026-10-01']) assert.equal((await api(`/api/sales/overview?${query}`, 'owner')).status, 400);
});
for (const role of ['owner', 'manager', 'coach']) it(`${role} records explicit presence without changing prospect stage`, async () => {
  const { id, uid } = await trial(`show-${role}`), result = await mark(id, role); assert.equal(result.status, 200); assert.equal(result.body.booking.attendanceStatus, 'SHOWED_UP');
  assert.equal((await db().doc(`prospects/${uid}`).get()).data()?.status, 'trial');
  const events = await db().collection('salesEvents').where('prospectUid', '==', uid).get(); assert.equal(events.size, 1); assert.equal(events.docs[0].data().actorUid, people[role].uid);
});
it('Solo Owner records own trial presence', async () => { const { id } = await trial('solo', {}, soloClub, 'solo'); assert.equal((await mark(id, 'solo')).status, 200); });
it('explicit no-show is not lost, repeat request creates one event', async () => {
  const { id, uid } = await trial('no-show'); assert.equal((await mark(id, 'coach', 'NO_SHOW')).status, 200); assert.equal((await mark(id, 'coach', 'NO_SHOW')).body.unchanged, true);
  const prospect = (await db().doc(`prospects/${uid}`).get()).data(); assert.equal(prospect?.status, 'trial'); assert.equal(prospect?.lostAt, undefined);
  assert.equal((await db().collection('salesEvents').where('prospectUid', '==', uid).get()).size, 1);
});
for (const role of ['coachB', 'member', 'superadmin', 'other', 'suspended']) it(`attendance refuses ${role}`, async () => {
  const { id } = await trial(`deny-${role}`); assert.equal((await mark(id, role)).status, 403); assert.equal((await db().doc(`bookings/${id}`).get()).data()?.attendanceStatus, undefined);
});
it('future, cancellation, non-trial and forged authority are rejected', async () => {
  const future = await trial('future', { startTime: new Date(Date.now() + 86400000).toISOString() }); assert.equal((await mark(future.id)).status, 409);
  const cancelled = await trial('cancelled', { status: 'cancelled' }); assert.equal((await mark(cancelled.id)).status, 409);
  const coaching = await trial('coaching', { type: 'coaching' }); assert.equal((await mark(coaching.id)).status, 403);
  assert.equal((await mark(future.id, 'owner', 'CANCELLED')).status, 400); assert.equal((await mark(future.id, 'owner', 'NO_SHOW', { clubId: club, role: 'owner' })).status, 400);
});
it('correction preserves first mark, records new actor/date, and human activity', async () => {
  const { id, uid } = await trial('correction'); const first = await mark(id, 'coach', 'NO_SHOW'); const corrected = await mark(id, 'manager'); assert.equal(corrected.status, 200);
  assert.equal(corrected.body.booking.attendanceMarkedAt, first.body.booking.attendanceMarkedAt); assert.equal(corrected.body.booking.attendanceMarkedByUid, people.coach.uid); assert.equal(corrected.body.booking.attendanceUpdatedByUid, people.manager.uid); assert.equal(corrected.body.booking.attendanceRevision, 2);
  const events = (await db().collection('salesEvents').where('prospectUid', '==', uid).get()).docs.map(d => d.data()); assert.equal(events.filter(e => e.correction).length, 1);
  const activity = (await db().doc(`prospects/${uid}`).get()).data()?.activityHistory; assert.equal(activity.length, 2); assert.match(activity[0].label, /corrigée/);
});
it('historical numeric linkage is allowed only when unique; UID mismatch never falls back', async () => {
  const { id, uid } = await trial('legacy'); await db().doc(`prospects/${uid}`).update({ id: 59999 }); await db().doc(`bookings/${id}`).update({ prospectUid: (await import('firebase-admin/firestore')).FieldValue.delete(), prospectId: 59999 });
  assert.equal((await mark(id)).status, 200);
  const ambiguous = await trial('ambiguous'); await db().doc(`bookings/${ambiguous.id}`).update({ prospectUid: (await import('firebase-admin/firestore')).FieldValue.delete() }); assert.equal((await mark(ambiguous.id)).status, 409);
  const bad = await trial('bad-link', { prospectUid: 'not-existing' }); assert.equal((await mark(bad.id)).status, 409);
});
it('cancel flow writes CANCELLED exactly once and does not count as no-show', async () => {
  const { id, uid } = await trial('cancel-flow'); assert.equal((await api('/api/bookings/cancel', 'manager', { id })).status, 200); assert.equal((await api('/api/bookings/cancel', 'manager', { id })).status, 200);
  assert.equal((await db().doc(`bookings/${id}`).get()).data()?.attendanceStatus, 'CANCELLED'); assert.equal((await db().collection('salesEvents').where('prospectUid', '==', uid).get()).size, 1);
  const finalized = await trial('finalized'); await mark(finalized.id); assert.equal((await api('/api/bookings/cancel', 'owner', { id: finalized.id })).status, 409);
});
it('trial list is bounded and Coach returns only actual own trials with minimal prospect data', async () => {
  const other = await trial('coachB', {}, club, 'coachB'); const response = await api('/api/sales/trials?limit=2', 'coach'); assert.equal(response.status, 200); assert.ok(response.body.trials.length <= 2);
  assert.ok(response.body.trials.every((r: any) => r.booking.coachUid === people.coach.uid)); assert.ok(!JSON.stringify(response.body).includes(other.id)); assert.ok(!JSON.stringify(response.body).includes('answers'));
  for (const role of ['member', 'superadmin']) assert.equal((await api('/api/sales/trials', role)).status, 403);
  assert.equal((await api('/api/sales/trials?limit=51', 'manager')).status, 400);
});
it('lead creation and contact/loss/reminder are server stamped with structured events', async () => {
  const requestId = randomUUID(), body = { requestId, name: 'Manual Lead', source: ' INSTAGRAM ', email: 'manual@example.test' };
  const result = await api('/api/sales/prospects', 'manager', body); assert.equal(result.status, 200); const uid = result.body.prospect.firebaseUid;
  assert.equal((await api('/api/sales/prospects', 'manager', body)).body.prospect.firebaseUid, uid);
  const stage = (payload: any) => api(`/api/sales/prospects/${uid}/stage`, 'manager', payload);
  assert.equal((await stage({ status: 'contacted' })).status, 200); assert.equal((await stage({ status: 'contacted' })).body.unchanged, true);
  assert.equal((await stage({ status: 'call_pending', nextReminderDate: new Date().toISOString() })).status, 200);
  const lost = await stage({ status: 'lost', lostReason: 'A choisi plus tard' }); assert.equal(lost.status, 200); assert.ok(lost.body.prospect.lostAt); assert.equal(lost.body.prospect.nextReminderDate, null);
  assert.equal((await stage({ status: 'won' })).status, 400); assert.equal((await stage({ status: 'trial' })).status, 400);
  const events = (await db().collection('salesEvents').where('prospectUid', '==', uid).get()).docs.map(d => d.data()); assert.deepEqual(events.map(e => e.eventType).sort(), ['CONTACTED', 'LEAD_CREATED', 'LOST']); assert.ok(events.every(e => e.actorUid === people.manager.uid));
  assert.equal((await stage({ status: 'lead', role: 'owner' })).status, 400);
});
it('assignment validates actual same Studio Coach, suspension and actor policy', async () => {
  const { uid } = await trial('assignment'), path = `/api/sales/prospects/${uid}/assignment`;
  assert.equal((await api(path, 'manager', { coachUid: people.coach.uid })).status, 200);
  for (const target of ['manager', 'owner', 'other', 'suspended']) assert.equal((await api(path, 'manager', { coachUid: people[target].uid })).status, 403);
  for (const role of ['coach', 'member', 'superadmin', 'other']) assert.equal((await api(path, role, { coachUid: people.coach.uid })).status, 403);
  assert.equal((await api(path, 'owner', { coachUid: null })).status, 200);
  const solo = await trial('assignment-solo', {}, soloClub, 'solo'); assert.equal((await api(`/api/sales/prospects/${solo.uid}/assignment`, 'solo', { coachUid: null })).status, 400);
});
it('conversion emits one logical CONVERTED event on retry using existing conversion', async () => {
  const { id, uid } = await trial('convert'); await mark(id);
  const body = { email: `convert-${randomUUID()}@example.test`, coachUid: people.coach.uid }, path = `/api/prospects/${uid}/convert`;
  const first = await api(path, 'manager', body); assert.equal(first.status, 200); const retry = await api(path, 'manager', body); assert.equal(retry.status, 200); assert.equal(retry.body.uid, first.body.uid);
  const event = (await db().doc(`salesEvents/${salesEventId(`converted:${uid}`)}`).get()).data(); assert.equal(event?.eventType, 'CONVERTED'); assert.equal(event?.coachUid, people.coach.uid); assert.equal(event?.sourceSnapshot, ' Instagram ');
  const events = await db().collection('salesEvents').where('prospectUid', '==', uid).where('eventType', '==', 'CONVERTED').get(); assert.equal(events.size, 1);
});
it('500 prospects overview uses four tenant queries and never finance or N queries', async () => {
  const capClub = `${club}-500`; await person('portfolio', 'owner', capClub, 9550); await db().doc(`clubs/${capClub}`).set({ isActive: true, id: capClub, accountType: 'studio', ownerId: people.portfolio.uid });
  const batch = db().batch(); for (let i = 0; i < 500; i++) batch.set(db().doc(`prospects/${capClub}-${i}`), { id: i + 1, clubId: capClub, name: `Lead ${i}`, status: 'lead', date: new Date().toISOString() }); await batch.commit();
  const collections: string[] = [], database = new Proxy(db(), { get(target, key) { if (key === 'collection') return (name: string) => { collections.push(name); assert.ok(!['payments', 'subscriptions', 'invoices', 'plans'].includes(name)); return target.collection(name); }; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
  const facts = await loadSales(database, people.portfolio.uid); assert.equal(facts.input.prospects.length, 500); assert.equal(collections.length, 4);
  const response = await api(overviewPath(), 'portfolio'); assert.equal(response.body.funnel.leads, 500); assert.equal(response.body.partial, false);
});
it('Pulse uses attendance and removes no-show followup after reminder/new trial', async () => {
  const { id, uid } = await trial('pulse'); let pulse = await api('/api/pulse?category=planning&limit=50', 'coach'); assert.ok(pulse.body.actions.some((a: any) => a.type === 'TRIAL_ATTENDANCE_MISSING' && a.bookingId === id));
  await mark(id, 'coach', 'NO_SHOW'); pulse = await api('/api/pulse?category=planning&limit=50', 'manager'); assert.ok(pulse.body.actions.some((a: any) => a.type === 'TRIAL_NO_SHOW_FOLLOWUP' && a.bookingId === id));
  await api(`/api/sales/prospects/${uid}/stage`, 'manager', { status: 'call_pending', nextReminderDate: new Date(Date.now() + 86400000).toISOString() }); pulse = await api('/api/pulse?category=planning&limit=50', 'manager'); assert.ok(!pulse.body.actions.some((a: any) => a.bookingId === id));
  await api(`/api/sales/prospects/${uid}/stage`, 'manager', { status: 'lead' }); await db().doc(`bookings/${id}-future`).set({ ...(await db().doc(`bookings/${id}`).get()).data(), id: `${id}-future`, attendanceStatus: 'PENDING', startTime: new Date(Date.now() + 2 * 86400000).toISOString() });
  pulse = await api('/api/pulse?category=planning&limit=50', 'manager'); assert.ok(!pulse.body.actions.some((a: any) => a.type === 'TRIAL_NO_SHOW_FOLLOWUP' && a.bookingId === id));
});
it('historical trial detail is available to its actual Coach, never another actor scope', async () => {
  const { id } = await trial('history-detail');
  await db().doc(`bookings/${id}`).update({ assignedCoachUid: (await import('firebase-admin/firestore')).FieldValue.delete() });
  const own = await api(`/api/sales/trials/${id}`, 'coach'); assert.equal(own.status, 200); assert.equal(own.body.group, 'missing'); assert.equal(own.body.prospectName, 'Lead');
  for (const role of ['coachB', 'member', 'superadmin', 'other', 'suspended']) assert.equal((await api(`/api/sales/trials/${id}`, role)).status, 403);
});
it('concurrent attendance retries commit one transition and preserve corrections', async () => {
  const { id, uid } = await trial('attendance-race');
  const responses = await Promise.all([mark(id, 'coach', 'NO_SHOW'), mark(id, 'manager', 'NO_SHOW')]); assert.ok(responses.every(r => r.status === 200));
  assert.equal((await db().collection('salesEvents').where('prospectUid', '==', uid).get()).size, 1);
  assert.equal((await db().doc(`bookings/${id}`).get()).data()?.attendanceRevision, 1);
});
it('reader signals cap truncation instead of claiming complete analytics', async () => {
  const known = (await db().collection('prospects').where('clubId', '==', club).limit(1).get()).docs[0];
  const database = new Proxy(db(), { get(target, key) {
    if (key === 'collection') return (name: string) => name === 'prospects' ? { where: () => ({ limit: (cap: number) => ({ get: async () => { assert.equal(cap, 5001); return { size: 5001, docs: Array.from({ length: 5001 }, () => known) }; } }) }) } : target.collection(name);
    const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
  } }) as any;
  const facts = await loadSales(database, people.manager.uid); assert.equal(facts.input.prospects.length, 5000); assert.deepEqual(facts.input.partialSources, ['prospects']);
});
it('suspended Manager, inactive club and detached Owner lose Sales access', async () => {
  await db().doc(`users/${people.manager.uid}`).update({ isSuspended: true }); assert.equal((await api(overviewPath(), 'manager')).status, 403); await db().doc(`users/${people.manager.uid}`).update({ isSuspended: false });
  await db().doc(`clubs/${club}`).update({ isActive: false }); assert.equal((await api(overviewPath(), 'owner')).status, 403); await db().doc(`clubs/${club}`).update({ isActive: true, ownerId: people.other.uid }); assert.equal((await api(overviewPath(), 'owner')).status, 403); await db().doc(`clubs/${club}`).update({ ownerId: people.owner.uid });
});
it('trial creation stores both identities and one booked event; preserves cancelled history', async () => {
  const { uid } = await trial('booked-event'), start = new Date(Date.now() + 10 * 86400000), body = { prospectUid: uid, coachUid: people.coach.uid, startTime: start.toISOString(), endTime: new Date(start.getTime() + 3600000).toISOString() };
  const first = await api('/api/bookings/trial', 'manager', body); assert.equal(first.status, 200); const retry = await api('/api/bookings/trial', 'manager', body); assert.equal(retry.body.id, first.body.id);
  const b = (await db().doc(`bookings/${first.body.id}`).get()).data(); assert.equal(b?.prospectUid, uid); assert.equal(b?.coachUid, people.coach.uid); assert.equal(b?.assignedCoachUid, people.coach.uid); assert.equal(b?.attendanceStatus, 'PENDING');
  const events = await db().collection('salesEvents').where('prospectUid', '==', uid).where('eventType', '==', 'TRIAL_BOOKED').get(); assert.equal(events.size, 1);
  await api('/api/bookings/cancel', 'owner', { id: first.body.id }); assert.equal((await api('/api/bookings/trial', 'manager', body)).status, 409);
});
