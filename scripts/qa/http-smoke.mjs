// Run only after seed.mjs, with dev:qa and all local emulators running.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';

if (process.env.GCLOUD_PROJECT !== 'demo-velatra') throw new Error('Demo project required');
const accounts = [];
const password = 'Local-QA-only-2026!';
function client() {
  const app = initializeApp({ projectId: 'demo-velatra', apiKey: 'demo-velatra-local-only' }, randomUUID());
  const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  accounts.push(app); return { auth, db };
}
async function post(path, auth, body) {
  return fetch(`http://127.0.0.1:3000/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth?.currentUser ? { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` } : {}) },
    body: JSON.stringify(body)
  });
}
try {
  assert.equal((await post('create-member', null, {})).status, 401);
  const owner = client();
  await signInWithEmailAndPassword(owner.auth, 'qa-owner@example.test', password);
  const email = `qa-member-${randomUUID()}@example.test`;
  const request = { requestId: randomUUID(), password, profile: { name: 'Adhérent QA', email, role: 'superadmin', clubId: '654321' } };
  const response = await post('create-member', owner.auth, request);
  assert.equal(response.status, 200);
  const created = await response.json();
  assert.equal(created.member.role, 'member'); assert.equal(created.member.clubId, '123456');
  const retry = await (await post('create-member', owner.auth, request)).json();
  assert.equal(retry.uid, created.uid);
  const programId = Date.now();
  const program = { id: programId, clubId: '123456', memberId: created.memberId, name: 'Programme QA persistant', nbDays: 1, currentDayIndex: 0, completedWeeks: [], startDate: '2026-09-27', days: [{ name: 'Jour 1', isCoaching: false, exercises: [{ exId: 1, sets: 3, reps: '10', rest: '90', tempo: '2010', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null }] }] };
  await setDoc(doc(owner.db, 'programs', String(programId)), program);
  const member = client(); await signInWithEmailAndPassword(member.auth, email, password);
  assert.equal((await getDoc(doc(member.db, 'programs', String(programId)))).data().name, program.name);
  await assert.rejects(setDoc(doc(member.db, 'programs', String(programId)), { ...program, name: 'Forbidden edit' }));
  assert.equal((await post('create-member', member.auth, request)).status, 403);
  const outsider = client(); await signInWithEmailAndPassword(outsider.auth, 'qa-other-owner@example.test', password);
  await assert.rejects(getDoc(doc(outsider.db, 'programs', String(programId))));
  const session = { requestId: randomUUID(), programId, dayIndex: 0, log: { memberId: created.memberId, exercises: [{ exId: 1, name: 'Squat barre', sets: [{ weight: '20', reps: '10', duration: '' }] }] }, performances: [{ exId: 'squat', weight: 20, reps: 10 }] };
  assert.equal((await post('workouts/complete', null, session)).status, 401);
  assert.equal((await post('workouts/complete', outsider.auth, session)).status, 403);
  const completedResponse = await post('workouts/complete', member.auth, session);
  assert.equal(completedResponse.status, 200);
  const completed = await completedResponse.json();
  assert.equal((await getDoc(doc(member.db, 'logs', String(completed.log.id)))).data().totalVolume, 200);
  assert.equal((await (await post('workouts/complete', member.auth, session)).json()).alreadyCompleted, true);
  assert.equal((await getDoc(doc(member.db, 'users', created.uid))).data().xp, 125);
  const signup = client();
  await createUserWithEmailAndPassword(signup.auth, `qa-signup-${randomUUID()}@example.test`, password);
  assert.equal((await getDoc(doc(signup.db, 'users', signup.auth.currentUser.uid))).exists(), false);
  const registration = { clubName: 'Espace QA', ownerName: 'Coach QA', accountType: 'coach', inviteCode: 'local-qa-invite', role: 'superadmin' };
  assert.equal((await post('register-club', signup.auth, { ...registration, inviteCode: 'wrong-code' })).status, 403);
  assert.equal((await post('register-club', signup.auth, registration)).status, 200);
  assert.equal((await getDoc(doc(signup.db, 'users', signup.auth.currentUser.uid))).data().role, 'owner');
  assert.equal((await post('bootstrap-superadmin', signup.auth, {})).status, 403);
  console.log('HTTP smoke passed: login, canonical member, retry, persisted program, member read, forbidden edits/cross-club, atomic workout/retry, coach signup and admin denial.');
  console.log(`Local member fixture for browser QA: ${email}`);
} finally { await Promise.all(accounts.map(deleteApp)); }
