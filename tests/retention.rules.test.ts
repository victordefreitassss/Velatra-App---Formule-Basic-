import { before, after, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'clubs/retain-rules'), { accountType: 'studio', ownerId: 'retain-rules-owner' });
    for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin']) await setDoc(doc(db, `users/retain-rules-${role}`), { id: 9800, role, clubId: 'retain-rules', firebaseUid: `retain-rules-${role}` });
    await setDoc(doc(db, 'retentionInterventions/fixture'), { actorUid: 'retain-rules-owner', clubId: 'retain-rules', memberUid: 'member', kind: 'called', note: '', createdAt: '2026-10-01' });
  });
});
after(async () => env?.cleanup());
for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin', 'anonymous']) it(`retentionInterventions default-deny blocks SDK ${role} read/list/create/update/delete`, async () => {
  const db = (role === 'anonymous' ? env.unauthenticatedContext() : env.authenticatedContext(`retain-rules-${role}`, role === 'superadmin' ? { email: 'admin@velatra.app' } : {})).firestore();
  const ref = doc(db, 'retentionInterventions/fixture');
  await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'retentionInterventions')));
  await assertFails(setDoc(doc(db, `retentionInterventions/${role}-forged`), { actorUid: `retain-rules-${role}`, clubId: 'retain-rules', status: 'handled' }));
  await assertFails(updateDoc(ref, { status: 'snoozed' })); await assertFails(deleteDoc(ref));
});
