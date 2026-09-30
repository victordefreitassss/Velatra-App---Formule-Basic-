import { after, before, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { convertProspect } from '../server/convertProspect';
import { createManagedMember } from '../server/createMember';

const app = initializeApp({ projectId: 'demo-velatra' }, 'crm-conversion-tests');
const db = getFirestore(app), auth = getAuth(app);
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  await db.doc('clubs/crm-solo').set({ accountType: 'solo', ownerId: 'crm-solo-owner' });
  await db.doc('clubs/crm-studio').set({ accountType: 'studio', ownerId: 'crm-studio-owner' });
  await db.doc('clubs/crm-legacy').set({ ownerId: 'crm-legacy-owner' });
  for (const [uid, role, clubId] of [
    ['crm-solo-owner', 'owner', 'crm-solo'], ['crm-studio-owner', 'owner', 'crm-studio'],
    ['crm-studio-coach', 'coach', 'crm-studio'], ['crm-legacy-owner', 'owner', 'crm-legacy'],
    ['crm-member', 'member', 'crm-solo'], ['crm-outsider', 'owner', 'crm-other']
  ]) await db.doc(`users/${uid}`).set({ role, clubId, id: Math.floor(Math.random() * 1000000), name: uid });
});
after(() => deleteApp(app));

async function prospect(clubId: string, email = `crm-${randomUUID()}@example.test`) {
  const id = `crm-${randomUUID()}`;
  await db.doc(`prospects/${id}`).set({ id: Date.now(), clubId, name: 'Conversion Test', email, phone: '0600000000', date: new Date().toISOString(), status: 'lead', answers: {} });
  return { id, email };
}

it('converts Solo once, links both records, keeps history and returns the same member on retry', async () => {
  const item = await prospect('crm-solo');
  const first = await convertProspect(auth, db, 'crm-solo-owner', item.id, { email: item.email });
  const retry = await convertProspect(auth, db, 'crm-solo-owner', item.id, { email: item.email });
  assert.equal(first.uid, retry.uid);
  assert.equal(retry.alreadyConverted, true);
  assert.equal(first.member.assignedCoachUid, undefined);
  assert.equal((await db.doc(`prospects/${item.id}`).get()).data()?.convertedMemberUid, first.uid);
  assert.equal((await db.doc(`prospects/${item.id}`).get()).data()?.status, 'won');
  assert.equal((await db.doc(`users/${first.uid}`).get()).data()?.sourceProspectUid, item.id);
  assert.equal((await db.doc(`users/${first.uid}`).get()).data()?.profileMeasurementsPending, true);
  assert.equal((await db.doc(`crmConversionClaims/${item.id}`).get()).exists, false);
});

it('assigns Studio coach only through canonical member creation', async () => {
  const assigned = await prospect('crm-studio');
  const first = await convertProspect(auth, db, 'crm-studio-owner', assigned.id, { email: assigned.email, coachUid: 'crm-studio-coach' });
  assert.equal(first.member.assignedCoachUid, 'crm-studio-coach');
  const unassigned = await prospect('crm-studio');
  const second = await convertProspect(auth, db, 'crm-studio-owner', unassigned.id, { email: unassigned.email });
  assert.equal(second.member.assignedCoachUid, undefined);
  const coachCreated = await prospect('crm-studio');
  const third = await convertProspect(auth, db, 'crm-studio-coach', coachCreated.id, { email: coachCreated.email });
  assert.equal(third.member.assignedCoachUid, 'crm-studio-coach');
  const forged = await prospect('crm-studio');
  await assert.rejects(convertProspect(auth, db, 'crm-studio-coach', forged.id, { email: forged.email, coachUid: 'crm-studio-owner' }), { status: 400 });
  assert.equal((await db.doc(`prospects/${forged.id}`).get()).data()?.status, 'lead');
});

it('preserves Legacy owner behavior and rejects member, cross-club, missing prospect and occupied email', async () => {
  const legacy = await prospect('crm-legacy');
  const converted = await convertProspect(auth, db, 'crm-legacy-owner', legacy.id, { email: legacy.email });
  assert.equal(converted.member.assignedCoachUid, undefined);
  const item = await prospect('crm-solo');
  await assert.rejects(convertProspect(auth, db, 'crm-member', item.id, { email: item.email }), { status: 403 });
  await assert.rejects(convertProspect(auth, db, 'crm-outsider', item.id, { email: item.email }), { status: 403 });
  await assert.rejects(convertProspect(auth, db, 'crm-solo-owner', 'absent', { email: item.email }), { status: 404 });
  const occupied = await prospect('crm-solo', legacy.email);
  await assert.rejects(convertProspect(auth, db, 'crm-solo-owner', occupied.id, { email: legacy.email }), { status: 409 });
  assert.equal((await db.doc(`prospects/${occupied.id}`).get()).data()?.status, 'lead');
});

it('two concurrent requests produce exactly one member and a retry resolves the result', async () => {
  const item = await prospect('crm-solo');
  const results = await Promise.allSettled([0, 1].map(() => convertProspect(auth, db, 'crm-solo-owner', item.id, { email: item.email })));
  assert.ok(results.some(result => result.status === 'fulfilled'));
  const retry = await convertProspect(auth, db, 'crm-solo-owner', item.id, { email: item.email });
  assert.equal((await auth.getUserByEmail(item.email)).uid, retry.uid);
  assert.equal((await db.collection('users').where('creationRequestId', '==', retry.member.creationRequestId).get()).size, 1);
});

it('recovers when Auth and member exist but the prospect link was not committed', async () => {
  const item = await prospect('crm-solo');
  const requestId = createHash('sha256').update(`prospect:${item.id}`).digest('hex');
  const original = await createManagedMember(auth, db, 'crm-solo-owner', { requestId, profile: { name: 'Conversion Test', email: item.email } });
  await db.doc(`crmConversionClaims/${item.id}`).set({ clubId: 'crm-solo', requesterUid: 'crm-solo-owner', email: item.email, coachUid: null, requestId, createdAt: new Date().toISOString() });
  const recovered = await convertProspect(auth, db, 'crm-solo-owner', item.id, { email: item.email });
  assert.equal(recovered.uid, original.uid);
  assert.equal((await db.doc(`prospects/${item.id}`).get()).data()?.convertedMemberUid, original.uid);
  assert.equal((await db.doc(`crmConversionClaims/${item.id}`).get()).exists, false);
});
