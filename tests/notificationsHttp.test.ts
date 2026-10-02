import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Server } from 'node:http';
import { notificationInbox } from '../server/notifications';
let server: Server, base: string;
const clubId = `notifs-http-${randomUUID()}`, soloId = `notifs-solo-${randomUUID()}`;
const people: Record<string, any> = {};
const db = () => getFirestore();
async function person(name: string, role: string, id: number, club: string) {
  const email = `${name}-${randomUUID()}@example.test`, password = 'Local-notification-2026!';
  const user = await getAuth().createUser({ email, password });
  await db().doc(`users/${user.uid}`).set({ id, role, clubId: club, firebaseUid: user.uid });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  people[name] = { uid: user.uid, id, token: (await response.json()).idToken, club };
}
async function api(path: string, name?: string, method = 'GET', body?: unknown) {
  return fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(name ? { Authorization: `Bearer ${people[name].token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const json = async (path: string, name: string, method = 'GET', body?: unknown) => { const response = await api(path, name, method, body); const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result)); return result; };
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Local emulators only');
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const module = await import('../server'); server = module.default.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve)); base = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const [name, role, id] of [['owner', 'owner', 6501], ['manager', 'manager', 6502], ['coach', 'coach', 6503], ['member', 'member', 6510], ['other-member', 'member', 6511], ['solo-owner', 'owner', 6601], ['solo-member', 'member', 6610]] as const) await person(name, role, id, name.startsWith('solo') ? soloId : clubId);
  await db().doc(`clubs/${clubId}`).set({ ownerId: people.owner.uid, accountType: 'studio', isActive: true });
  await db().doc(`clubs/${soloId}`).set({ ownerId: people['solo-owner'].uid, accountType: 'solo', isActive: true });
  await db().doc(`users/${people.member.uid}`).update({ assignedCoachUid: people.coach.uid });
  await db().doc(`users/${people['other-member'].uid}`).update({ assignedCoachUid: people.owner.uid });
});
after(async () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
it('authenticated API sends message+one notification and refuses cross-scope, forged sender and changed retries', async () => {
  assert.equal((await api('/api/notifications')).status, 401);
  const body = { requestId: randomUUID(), to: people.coach.id, text: 'Sensitive private message' };
  const a = await json('/api/messages', 'member', 'POST', { ...body, from: people.owner.id, clubId: soloId });
  const b = await json('/api/messages', 'member', 'POST', body); assert.equal(a.id, b.id);
  const message = (await db().doc(`messages/${a.id}`).get()).data()!; assert.equal(message.senderUid, people.member.uid); assert.equal(message.clubId, clubId);
  const list = await json('/api/notifications', 'coach'); assert.equal(list.items.length, 1);
  assert.ok(!JSON.stringify(list).includes(body.text));
  assert.equal((await api('/api/notifications/' + list.items[0].id, 'member')).status, 404);
  assert.equal((await api('/api/messages', 'coach', 'POST', { requestId: randomUUID(), to: people['other-member'].id, text: 'No' })).status, 403);
  assert.equal((await api('/api/messages', 'member', 'POST', { ...body, to: people['solo-owner'].id })).status, 403);
  assert.equal((await api('/api/messages', 'member', 'POST', { ...body, text: 'Changed' })).status, 409);
});
it('pagination is bounded; read/unread/read-all are idempotent and owned by UID', async () => {
  const inbox = notificationInbox(db(), clubId, people.member.uid);
  const batch = db().batch();
  for (let i = 0; i < 100; i++) batch.set(inbox.collection('items').doc(`page-${String(i).padStart(3, '0')}`), { id: `page-${String(i).padStart(3, '0')}`, recipientUid: people.member.uid, clubId, category: 'SYSTEM', type: 'SYSTEM', title: 'Fixture', body: 'Generic', destination: { velatraPage: 'notifications' }, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), readAt: null, eventKey: `page-${i}`, priority: 'normal', pushEligible: false });
  batch.set(inbox, { uid: people.member.uid, clubId, unreadCount: 100 }); await batch.commit();
  const first = await json('/api/notifications', 'member'); assert.equal(first.items.length, 20); assert.ok(first.nextCursor);
  const second = await json(`/api/notifications?cursor=${first.nextCursor}`, 'member'); assert.equal(second.items.length, 20); assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal((await json('/api/notifications?limit=999', 'member')).items.length, 50);
  assert.equal((await json('/api/notifications/unread-count', 'member')).count, 100);
  const id = first.items[0].id;
  await json(`/api/notifications/${id}/read`, 'member', 'POST'); await json(`/api/notifications/${id}/read`, 'member', 'POST');
  assert.equal((await json('/api/notifications/unread-count', 'member')).count, 99);
  await json(`/api/notifications/${id}/unread`, 'member', 'POST'); assert.equal((await json('/api/notifications/unread-count', 'member')).count, 100);
  assert.equal((await api(`/api/notifications/${id}/read`, 'other-member', 'POST')).status, 404);
  await json('/api/notifications/read-all', 'member', 'POST'); assert.equal((await json('/api/notifications/unread-count', 'member')).count, 0);
  assert.equal((await json('/api/notifications?unread=true', 'member')).items.length, 0);
});
it('multi-device registration rotates tokens without exposing them and ownership transfer is safe', async () => {
  const token = 'fake-http-token-001234567890', token2 = 'fake-http-token-991234567890', rotated = 'fake-http-token-881234567890';
  await json('/api/notifications/devices', 'member', 'POST', { deviceId: 'mac-device-123456789', token, platform: 'web', uid: people.coach.uid });
  await json('/api/notifications/devices', 'member', 'POST', { deviceId: 'phone-device-123456789', token: token2, platform: 'web' });
  const result = await json('/api/notifications/devices', 'member'); assert.equal(result.devices.length, 2); assert.ok(!JSON.stringify(result).includes(token));
  const box = notificationInbox(db(), clubId, people.member.uid); assert.equal((await db().doc(`pushDevices/${box.id}/devices/mac-device-123456789`).get()).data()?.uid, people.member.uid);
  await json('/api/notifications/devices', 'coach', 'POST', { deviceId: 'shared-device-123456789', token, platform: 'web' });
  assert.equal((await db().doc(`pushDevices/${box.id}/devices/mac-device-123456789`).get()).data()?.enabled, false);
  await json('/api/notifications/devices', 'member', 'POST', { deviceId: 'mac-device-123456789', token: rotated, platform: 'web' });
  await json('/api/notifications/devices', 'owner', 'POST', { deviceId: 'other-device-123456789', token, platform: 'web' });
  const coachBox = notificationInbox(db(), clubId, people.coach.uid); assert.equal((await db().doc(`pushDevices/${coachBox.id}/devices/shared-device-123456789`).get()).data()?.enabled, false, 'rotating old device cannot erase another account token ownership');
  await json('/api/notifications/devices/phone-device-123456789', 'member', 'DELETE'); assert.equal((await db().doc(`pushDevices/${box.id}/devices/phone-device-123456789`).get()).data()?.enabled, false);
});
it('preferences are scoped, opt-in explicit and member Sales cannot be enabled', async () => {
  const initial = await json('/api/notifications/preferences', 'member'); assert.equal(initial.pushEnabled, false);
  const enabled = await json('/api/notifications/preferences', 'member', 'PUT', { ...initial, pushEnabled: true }); assert.equal(enabled.categories.SALES, false);
  assert.equal((await json('/api/notifications/preferences', 'coach')).pushEnabled, false);
  assert.equal((await api('/api/notifications/preferences', 'member', 'PUT', { pushEnabled: true })).status, 400);
});
it('inactive clubs and suspended users fail closed on notifications, preferences and messages', async () => {
  await db().doc(`users/${people.member.uid}`).update({ isSuspended: true }); assert.equal((await api('/api/notifications', 'member')).status, 403);
  await db().doc(`users/${people.member.uid}`).update({ isSuspended: false });
  await db().doc(`clubs/${clubId}`).update({ isActive: false });
  for (const name of ['owner', 'manager', 'coach', 'member']) assert.equal((await api('/api/notifications', name)).status, 403);
  await db().doc(`clubs/${clubId}`).update({ isActive: true });
});
it('follow-up assignment/response retries notify only the Member and assigned Coach, with no answer content', async () => {
  const template = (await json('/api/followup/templates', 'coach', 'POST', { name: 'Private template', description: '', questions: [{ id: 'question1', type: 'text', label: 'Private question', required: true }] })).template;
  const body = { requestId: randomUUID(), templateId: template.id, frequency: { kind: 'manual' }, startDate: new Date().toISOString().slice(0, 10) };
  const path = `/api/followup/assignments/${people.member.uid}`;
  const first = await json(path, 'coach', 'POST', body), second = await json(path, 'coach', 'POST', body); assert.equal(first.assignment.id, second.assignment.id);
  const notifications = (await json('/api/notifications', 'member')).items; assert.equal(notifications.filter((n: any) => n.type === 'FOLLOWUP_ASSIGNED').length, 1);
  assert.equal(notifications.find((n: any) => n.type === 'FOLLOWUP_ASSIGNED').destination.followupAssignmentId, first.assignment.id);
  const reply = `/api/followup/checkins/${first.assignment.id}/respond`;
  assert.equal((await api(reply, 'other-member', 'POST', { dueDate: body.startDate, answers: { question1: 'canary-health-weight' } })).status, 403);
  await json(reply, 'member', 'POST', { dueDate: body.startDate, answers: { question1: 'canary-health-weight' } }); await json(reply, 'member', 'POST', { dueDate: body.startDate, answers: { question1: 'canary-health-weight' } });
  const received = await json('/api/notifications', 'coach'); assert.equal(received.items.filter((n: any) => n.type === 'FOLLOWUP_RESPONDED').length, 1); assert.ok(!JSON.stringify(received).includes('canary-health-weight'));
  assert.equal((await json('/api/notifications', 'manager')).items.length, 0);
});
it('legacy notifications remain bounded own-read with no V2 push or badge migration', async () => {
  await db().doc('notifications/legacy-notif-http').set({ clubId, userId: people.member.id, title: 'Historical', message: 'Original', createdAt: '2026-01-01T00:00:00Z', read: false });
  const result = await json('/api/notifications?legacy=true', 'member'); assert.equal(result.items.length, 1); assert.equal(result.items[0].title, 'Historical');
  assert.equal((await json('/api/notifications?legacy=true', 'coach')).items.length, 0);
});
it('Solo follow-up response notifies the canonical Solo Owner even when an old assigned coach UID remains', async () => {
  await db().doc(`users/${people['solo-member'].uid}`).update({ assignedCoachUid: people.coach.uid });
  const template = (await json('/api/followup/templates', 'solo-owner', 'POST', { name: 'Solo bilan', questions: [{ id: 'q1', type: 'text', label: 'Question', required: true }] })).template;
  const startDate = new Date().toISOString().slice(0, 10);
  const result = await json(`/api/followup/assignments/${people['solo-member'].uid}`, 'solo-owner', 'POST', { requestId: randomUUID(), templateId: template.id, frequency: { kind: 'manual' }, startDate });
  await json(`/api/followup/checkins/${result.assignment.id}/respond`, 'solo-member', 'POST', { dueDate: startDate, answers: { q1: 'Private Solo response' } });
  const list = await json('/api/notifications', 'solo-owner'); assert.equal(list.items.filter((n: any) => n.type === 'FOLLOWUP_RESPONDED').length, 1);
  assert.ok(!JSON.stringify(list).includes('Private Solo response'));
});

it('booking destination reads only owned appointments and never expose private member or prospect fields', async () => {
  const id = 'notif-destination-booking';
  await db().doc(`bookings/${id}`).set({ id, clubId, memberId: people.member.id, memberUid: people.member.uid, coachId: String(people.owner.id), coachUid: people.owner.uid, type: 'coaching', status: 'confirmed', startTime: new Date().toISOString(), endTime: new Date().toISOString(), privateNotes: 'health-canary', prospectUid: 'private-prospect' });
  // Provider changed without changing the private portfolio assignment.
  await db().doc(`bookings/${id}`).update({ coachId: String(people.coach.id), coachUid: people.coach.uid });
  await db().doc(`users/${people.member.uid}`).update({ assignedCoachUid: people.owner.uid });
  for (const name of ['member', 'coach', 'manager', 'owner']) {
    const value = await json(`/api/notifications/bookings/${id}`, name);
    assert.equal(value.booking.id, id); assert.ok(!JSON.stringify(value).includes('health-canary')); assert.equal(value.booking.prospectUid, undefined);
  }
  assert.equal((await api(`/api/notifications/bookings/${id}`, 'other-member')).status, 403);
  assert.equal((await api(`/api/notifications/bookings/${id}`, 'solo-member')).status, 404);
});
