import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createManagedMember } from '../server/createMember';
import { resolveMemberCoachingContact } from '../server/memberCoachingContact';

const app = initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore(app);
const auth = getAuth(app);
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  await db.doc('clubs/123456').set({ id: '123456', ownerId: 'provision-owner', accountType: 'solo' });
  await db.doc('users/provision-owner').set({ id: 12, role: 'owner', clubId: '123456', name: 'Solo Owner' });
  await db.doc('users/provision-coach').set({ id: 10, role: 'coach', clubId: '123456', assignedMemberIds: [] });
  await db.doc('users/provision-member').set({ id: 11, role: 'member', clubId: '123456' });
  await db.doc('clubs/studio-club').set({ id: 'studio-club', ownerId: 'studio-owner', accountType: 'studio' });
  await db.doc('users/studio-owner').set({ id: 20, role: 'owner', clubId: 'studio-club' });
  await db.doc('users/studio-coach').set({ id: 21, role: 'coach', clubId: 'studio-club', assignedMemberIds: [] });
  await db.doc('users/other-coach').set({ id: 22, role: 'coach', clubId: 'other-club', assignedMemberIds: [] });
  await db.doc('clubs/legacy-club').set({ id: 'legacy-club', ownerId: 'legacy-owner' });
  await db.doc('users/legacy-owner').set({ id: 30, role: 'owner', clubId: 'legacy-club' });
});
after(() => deleteApp(app));

it('creates Auth and a canonical member profile, strips privilege fields, and retries safely', async () => {
  const body = { password: 'Local-test-only-2026!', requestId: randomUUID(), profile: {
    name: 'QA Member', email: `member-${randomUUID()}@example.test`, id: 99, role: 'superadmin', clubId: '654321', assignedCoachUid: 'attacker'
  } };
  const result = await createManagedMember(auth, db, 'provision-coach', body);
  assert.equal(result.member.role, 'member');
  assert.equal(result.member.clubId, '123456');
  assert.equal(result.member.assignedCoachUid, 'provision-coach');
  assert.notEqual(result.memberId, 99);
  assert.equal(result.member.firebaseUid, result.uid);
  assert.equal(result.member.pwd, '');
  assert.equal('password' in result.member, false);
  assert.equal((await auth.getUser(result.uid)).email, body.profile.email);
  assert.equal((await db.doc(`users/${result.uid}`).get()).data()?.id, result.memberId);
  assert.ok((await db.doc('users/provision-coach').get()).data()?.assignedMemberIds.includes(result.memberId));
  const retry = await createManagedMember(auth, db, 'provision-coach', body);
  assert.equal(retry.uid, result.uid);
  assert.equal(retry.memberId, result.memberId);
});

it('rejects members and invalid input before creating an Auth account', async () => {
  await assert.rejects(createManagedMember(auth, db, 'provision-member', {}), { status: 403 });
  await assert.rejects(createManagedMember(auth, db, 'provision-coach', { profile: { name: 'A', email: 'bad' }, password: 'x' }), { status: 400 });
});

it('never claims an existing Auth identity with no profile', async () => {
  const email = `unclaimed-${randomUUID()}@example.test`;
  const account = await auth.createUser({ email, password: 'Local-test-only-2026!' });
  await assert.rejects(createManagedMember(auth, db, 'provision-coach', {
    profile: { name: 'Attempted claim', email }, password: 'Different-password!', requestId: randomUUID()
  }), { status: 409 });
  assert.equal((await db.doc(`users/${account.uid}`).get()).exists, false);
});

function memberBody() {
  return { requestId: randomUUID(), profile: { name: 'QA Member', email: `member-${randomUUID()}@example.test` } };
}

it('creates a Solo owner member without a fake assignment and resolves the owner as contact', async () => {
  const result = await createManagedMember(auth, db, 'provision-owner', memberBody());
  assert.equal(result.member.assignedCoachUid, undefined);
  assert.equal((await resolveMemberCoachingContact(db, result.member))?.firebaseUid, 'provision-owner');
  assert.equal((await resolveMemberCoachingContact(db, result.member))?.role, 'owner');
  assert.equal('password' in result.member, false);
});

it('atomically assigns a Studio owner-created member to an eligible coach', async () => {
  const result = await createManagedMember(auth, db, 'studio-owner', { ...memberBody(), coachUid: 'studio-coach' });
  assert.equal(result.member.assignedCoachUid, 'studio-coach');
  assert.ok((await db.doc('users/studio-coach').get()).data()?.assignedMemberIds.includes(result.memberId));
  assert.equal((await resolveMemberCoachingContact(db, result.member))?.firebaseUid, 'studio-coach');
});

it('leaves a Studio owner-created member unassigned when no coach is chosen', async () => {
  const result = await createManagedMember(auth, db, 'studio-owner', memberBody());
  assert.equal(result.member.assignedCoachUid, undefined);
  assert.equal(await resolveMemberCoachingContact(db, result.member), null);
});

it('assigns a coach-created member to that coach and rejects forged Studio assignments', async () => {
  const created = await createManagedMember(auth, db, 'studio-coach', memberBody());
  assert.equal(created.member.assignedCoachUid, 'studio-coach');
  assert.ok((await db.doc('users/studio-coach').get()).data()?.assignedMemberIds.includes(created.memberId));
  for (const [requester, coachUid] of [
    ['studio-coach', 'other-coach'], ['studio-owner', 'other-coach'],
    ['studio-owner', 'provision-owner'], ['provision-owner', 'studio-coach'],
  ]) {
    await assert.rejects(createManagedMember(auth, db, requester, { ...memberBody(), coachUid }), { status: 400 });
  }
});

it('preserves Legacy owner behavior without inventing a coach assignment', async () => {
  const result = await createManagedMember(auth, db, 'legacy-owner', memberBody());
  assert.equal(result.member.assignedCoachUid, undefined);
});
