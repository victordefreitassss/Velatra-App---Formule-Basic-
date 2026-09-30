import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { dayKey, shiftDay } from '../server/followupModel';

let server: Server, base: string;
const db = () => getFirestore();
const people: Record<string, { uid: string; token: string; id: number }> = {};
const club = `followup-${randomUUID()}`;
const otherClub = `followup-other-${randomUUID()}`;
const password = 'Local-followup-test-2026!';

async function person(name: string, role: string, clubId: string, id: number, extras: Record<string, unknown> = {}) {
  const email = `${name}-${randomUUID()}@example.test`;
  const account = await getAuth().createUser({ email, password });
  await db().doc(`users/${account.uid}`).set({ id, role, clubId, firebaseUid: account.uid, name, ...extras });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  assert.equal(response.status, 200);
  people[name] = { uid: account.uid, token: (await response.json()).idToken, id };
}
async function api(path: string, personName?: string, method = 'GET', body?: unknown) {
  return fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(personName ? { Authorization: `Bearer ${people[personName].token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function json(path: string, personName?: string, method = 'GET', body?: unknown) {
  const response = await api(path, personName, method, body);
  return { status: response.status, body: await response.json() };
}
const phase = (id: string, status: string) => ({ id, name: id, objective: 'Progresser', durationWeeks: 2, startDate: dayKey(), plannedEndDate: null, programId: null, checkInTemplateIds: [], notes: '', status });

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const { default: app } = await import('../server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  await person('owner', 'owner', club, 3001);
  await person('coachA', 'coach', club, 3002);
  await person('coachB', 'coach', club, 3003);
  await person('memberA', 'member', club, 3004, { assignedCoachUid: people.coachA.uid });
  await person('memberB', 'member', club, 3005, { assignedCoachUid: people.coachB.uid });
  await person('otherOwner', 'owner', otherClub, 3006);
  await db().doc(`clubs/${club}`).set({ id: club, ownerId: people.owner.uid, accountType: 'studio' });
  await db().doc(`clubs/${otherClub}`).set({ id: otherClub, ownerId: people.otherOwner.uid, accountType: 'solo' });
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

it('enforces anonymous, member, assigned coach, owner and cross-club boundaries', async () => {
  const path = `/api/followup/clients/${people.memberA.uid}`;
  assert.equal((await api(path)).status, 401);
  assert.equal((await api(path, 'memberA')).status, 200);
  assert.equal((await api(path, 'memberB')).status, 403);
  assert.equal((await api(path, 'coachA')).status, 200);
  assert.equal((await api(path, 'coachB')).status, 403);
  assert.equal((await api(path, 'owner')).status, 200);
  assert.equal((await api(path, 'otherOwner')).status, 403);
  assert.equal((await api(`/api/followup/templates`, 'memberA')).status, 403);
});

it('creates an ordered journey, prevents concurrent writes and two active phases', async () => {
  const path = `/api/followup/journeys/${people.memberA.uid}`;
  assert.equal((await api(path, 'memberA', 'PUT', { phases: [phase('one', 'active')], expectedVersion: 0 })).status, 403);
  assert.equal((await api(path, 'coachB', 'PUT', { phases: [phase('one', 'active')], expectedVersion: 0 })).status, 403);
  const created = await json(path, 'coachA', 'PUT', { phases: [{ ...phase('one', 'active'), notes: 'Note réservée au coach' }, phase('two', 'planned')], expectedVersion: 0 });
  assert.equal(created.status, 200);
  assert.equal(created.body.journey.version, 1);
  assert.equal((await json('/api/followup/me', 'memberA')).body.journey.phases[0].notes, '');
  assert.equal((await json(`/api/followup/clients/${people.memberA.uid}/summary`, 'coachA')).body.journey.phases[0].name, 'one');
  assert.equal((await json(`/api/followup/clients/${people.memberA.uid}/journey`, 'coachA')).body.journey.phases[0].notes, 'Note réservée au coach');
  assert.equal((await api(`/api/followup/clients/${people.memberA.uid}/journey`, 'coachB')).status, 403);
  assert.equal((await api(`/api/followup/clients/${people.memberA.uid}/journey`, 'memberA')).status, 403);
  assert.equal((await api(path, 'coachA', 'PUT', { phases: [phase('one', 'active'), phase('two', 'active')], expectedVersion: 1 })).status, 400);
  assert.equal((await api(path, 'coachA', 'PUT', { phases: [phase('one', 'active')], expectedVersion: 0 })).status, 409);
  const next = await json(path, 'coachA', 'PUT', { phases: [phase('one', 'completed'), phase('two', 'active')], expectedVersion: 1 });
  assert.equal(next.status, 200);
  assert.deepEqual(next.body.journey.phases.map((item: any) => item.status), ['completed', 'active']);
  assert.equal((await api(path, 'coachA', 'PUT', { phases: [phase('two', 'active')], expectedVersion: 2 })).status, 409);
  assert.equal((await db().doc(`coachingJourneys/${people.memberA.uid}`).get()).data()?.phases.length, 2);
});

let templateId = '', assignmentId = '';
it('creates a configurable template and preserves a question snapshot after editing', async () => {
  const questions = [{ id: 'fatigue', label: 'Fatigue', type: 'scale', required: true, min: 0, max: 10 }];
  const created = await json('/api/followup/templates', 'coachA', 'POST', { name: 'Bilan semaine', questions });
  assert.equal(created.status, 200); templateId = created.body.template.id;
  assert.equal((await json('/api/followup/templates', 'coachB')).body.templates.length, 0);
  assert.equal((await json('/api/followup/templates', 'coachA')).body.templates[0].id, templateId);
  assert.equal((await json('/api/followup/templates', 'owner')).body.templates[0].id, templateId);
  assert.equal((await api(`/api/followup/templates/${templateId}`, 'coachB', 'PATCH', { name: 'Volé' })).status, 403);
  assert.equal((await api(`/api/followup/assignments/${people.memberA.uid}`, 'coachB', 'POST', { templateId, frequency: { kind: 'weekly' }, startDate: dayKey() })).status, 403);
  const assigned = await json(`/api/followup/assignments/${people.memberA.uid}`, 'coachA', 'POST', { templateId, frequency: { kind: 'weekly' }, startDate: dayKey(), clubId: otherClub, memberId: people.memberB.id });
  assert.equal(assigned.status, 200); assignmentId = assigned.body.assignment.id;
  assert.equal(assigned.body.assignment.memberId, people.memberA.id);
  assert.equal(assigned.body.assignment.clubId, club);
  const renamed = await json(`/api/followup/templates/${templateId}`, 'coachA', 'PATCH', { name: 'Bilan renommé', questions: [{ ...questions[0], label: 'Fatigue nouvelle' }] });
  assert.equal(renamed.status, 200);
  const own = await json('/api/followup/me', 'memberA');
  assert.equal(own.status, 200);
  assert.equal(own.body.assignments[0].questions[0].label, 'Fatigue');
  assert.equal(own.body.assignments[0].status, 'expected');
});

it('accepts one member response per due instance and rejects cross-member writes', async () => {
  const path = `/api/followup/checkins/${assignmentId}/respond`;
  assert.equal((await api(path, 'memberB', 'POST', { answers: { fatigue: 8 } })).status, 403);
  assert.equal((await api(path, 'memberA', 'POST', { answers: { fatigue: 11 } })).status, 400);
  const first = await json(path, 'memberA', 'POST', { answers: { fatigue: 8 }, clubId: otherClub, memberId: people.memberB.id });
  assert.equal(first.status, 200); assert.equal(first.body.alreadySubmitted, false);
  assert.equal(first.body.response.memberId, people.memberA.id);
  assert.equal(first.body.response.questions[0].label, 'Fatigue');
  const retry = await json(path, 'memberA', 'POST', { answers: { fatigue: 2 } });
  assert.equal(retry.status, 200); assert.equal(retry.body.alreadySubmitted, true);
  assert.equal(retry.body.response.answers.fatigue, 8);
  assert.equal((await json('/api/followup/me', 'memberA')).body.assignments[0].status, 'received');
});

let habitId = '';
it('creates a numeric habit, stores one completion and reports week adherence', async () => {
  const path = `/api/followup/habits/${people.memberA.uid}`;
  assert.equal((await api(path, 'memberA', 'POST', { name: 'Pas', valueType: 'number', startDate: dayKey() })).status, 403);
  const created = await json(path, 'coachA', 'POST', { name: 'Pas', valueType: 'number', target: 8000, unit: 'pas', startDate: dayKey(), clubId: otherClub });
  assert.equal(created.status, 200); habitId = created.body.habit.id;
  assert.equal(created.body.habit.clubId, club);
  const endpoint = `/api/followup/habits/${habitId}/complete`;
  assert.equal((await api(endpoint, 'memberB', 'POST', { value: 9000 })).status, 403);
  assert.equal((await api(endpoint, 'memberA', 'POST', { value: -1 })).status, 400);
  const saved = await json(endpoint, 'memberA', 'POST', { value: 7350 });
  assert.equal(saved.status, 200); assert.equal(saved.body.entry.met, false);
  const retry = await json(endpoint, 'memberA', 'POST', { value: 9500 });
  assert.equal(retry.body.alreadyCompleted, true); assert.equal(retry.body.entry.value, 7350);
  const own = await json('/api/followup/me', 'memberA');
  assert.equal(own.body.habits[0].week.completed, 0);
  assert.equal(own.body.entries.length, 1);
});

it('groups a weekly habit completion by its due instance rather than the submission day', async () => {
  const startDate = shiftDay(dayKey(), -2);
  const created = await json(`/api/followup/habits/${people.memberA.uid}`, 'coachA', 'POST',
    { name: 'Mobilité', valueType: 'boolean', frequency: { kind: 'weekly' }, startDate });
  assert.equal(created.status, 200);
  const endpoint = `/api/followup/habits/${created.body.habit.id}/complete`;
  const first = await json(endpoint, 'memberA', 'POST', { value: true });
  assert.equal(first.status, 200);
  assert.equal(first.body.entry.date, startDate);
  assert.equal((await json(endpoint, 'memberA', 'POST', { value: true })).body.alreadyCompleted, true);
  const own = await json('/api/followup/me', 'memberA');
  const habit = own.body.habits.find((item: any) => item.id === created.body.habit.id);
  assert.equal(habit.todayEntry.date, startDate);
  assert.deepEqual(habit.week, { completed: 1, expected: 1 });
});

it('attaches optional feedback to the actual workout once, with bounded fields', async () => {
  const logId = `${Math.floor(Math.random() * 1e12)}`;
  await db().doc(`logs/${logId}`).set({ id: Number(logId), clubId: club, memberId: people.memberA.id, isCoaching: false, date: dayKey(), dayName: 'Séance' });
  const path = `/api/followup/sessions/${logId}/feedback`;
  assert.equal((await api(path, 'memberB', 'POST', { rpe: 6, energy: 3, pain: false, comment: '' })).status, 403);
  assert.equal((await api(path, 'memberA', 'POST', { rpe: 0, energy: 3, pain: false, comment: '' })).status, 400);
  const saved = await json(path, 'memberA', 'POST', { rpe: 7, energy: 2, pain: true, painArea: 'Épaule', comment: '' });
  assert.equal(saved.status, 200); assert.equal(saved.body.feedback.pain, true);
  const retry = await json(path, 'memberA', 'POST', { rpe: 3, energy: 5, pain: false, comment: '' });
  assert.equal(retry.body.alreadySubmitted, true);
  assert.equal((await db().doc(`logs/${logId}`).get()).data()?.rpe, 7);
});

it('allows Solo owner and Legacy owner without inventing a coach assignment', async () => {
  const solo = `solo-followup-${randomUUID()}`, legacy = `legacy-followup-${randomUUID()}`;
  await person('soloOwner', 'owner', solo, 4001); await person('soloMember', 'member', solo, 4002);
  await person('legacyOwner', 'owner', legacy, 4003); await person('legacyMember', 'member', legacy, 4004);
  await db().doc(`clubs/${solo}`).set({ ownerId: people.soloOwner.uid, accountType: 'solo' });
  await db().doc(`clubs/${legacy}`).set({ ownerId: people.legacyOwner.uid });
  assert.equal((await api(`/api/followup/clients/${people.soloMember.uid}`, 'soloOwner')).status, 200);
  assert.equal((await api(`/api/followup/clients/${people.legacyMember.uid}`, 'legacyOwner')).status, 200);
  assert.equal((await db().doc(`users/${people.soloMember.uid}`).get()).data()?.assignedCoachUid, undefined);
});
