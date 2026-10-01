import { before, after, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'clubs/pulse-rules'), { accountType: 'studio', ownerId: 'pulse-rules-owner' });
    for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin']) await setDoc(doc(db, `users/pulse-rules-${role}`), { id: 9800, role, clubId: 'pulse-rules', firebaseUid: `pulse-rules-${role}` });
    await setDoc(doc(db, 'pulseActionStates/fixture'), { actorUid: 'pulse-rules-owner', clubId: 'pulse-rules', key: 'task:x', sourceFingerprint: 'hash', status: 'handled' });
  });
});
after(async () => env?.cleanup());
for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin', 'anonymous']) it(`pulseActionStates default-deny blocks SDK ${role} read/list/create/update/delete`, async () => {
  const db = (role === 'anonymous' ? env.unauthenticatedContext() : env.authenticatedContext(`pulse-rules-${role}`, role === 'superadmin' ? { email: 'admin@velatra.app' } : {})).firestore();
  const ref = doc(db, 'pulseActionStates/fixture');
  await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'pulseActionStates')));
  await assertFails(setDoc(doc(db, `pulseActionStates/${role}-forged`), { actorUid: `pulse-rules-${role}`, clubId: 'pulse-rules', status: 'handled' }));
  await assertFails(updateDoc(ref, { status: 'snoozed' })); await assertFails(deleteDoc(ref));
});
