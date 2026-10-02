import { before, after, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore(); await setDoc(doc(db, 'clubs/sales-rules'), { accountType: 'studio', ownerId: 'sales-rules-owner' });
    for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin']) await setDoc(doc(db, `users/sales-rules-${role}`), { id: 9900, role, clubId: 'sales-rules', firebaseUid: `sales-rules-${role}` });
    await setDoc(doc(db, 'prospects/sales-protected'), { id: 99, clubId: 'sales-rules', status: 'lead', date: '2026-10-01', salesVersion: 2, activityHistory: [] });
    await setDoc(doc(db, 'salesEvents/sales-protected'), { clubId: 'sales-rules', prospectUid: 'sales-protected', eventType: 'LEAD_CREATED', at: '2026-10-01' });
    await setDoc(doc(db, 'bookings/sales-protected'), { clubId: 'sales-rules', type: 'trial', status: 'confirmed', coachId: '9900', prospectUid: 'sales-protected' });
  });
});
after(async () => env?.cleanup());
for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin', 'anonymous']) it(`salesEvents denies SDK ${role} read/list/write and trial attendance forgery`, async () => {
  const db = (role === 'anonymous' ? env.unauthenticatedContext() : env.authenticatedContext(`sales-rules-${role}`)).firestore();
  const event = doc(db, 'salesEvents/sales-protected'); await assertFails(getDoc(event)); await assertFails(getDocs(collection(db, 'salesEvents'))); await assertFails(setDoc(doc(db, `salesEvents/${role}-fake`), { clubId: 'sales-rules', eventType: 'CONVERTED' })); await assertFails(updateDoc(event, { eventType: 'CONVERTED' })); await assertFails(deleteDoc(event));
  await assertFails(updateDoc(doc(db, 'bookings/sales-protected'), { attendanceStatus: 'SHOWED_UP' }));
});
for (const role of ['owner', 'manager', 'coach']) it(`${role} SDK notes remain usable but all analytical fields are server owned`, async () => {
  const db = env.authenticatedContext(`sales-rules-${role}`).firestore(), ref = doc(db, 'prospects/sales-protected');
  await assertSucceeds(updateDoc(ref, { notesHistory: [{ id: role, date: '2026-10-01', content: 'Note' }], activityHistory: [] }));
  for (const patch of [{ status: 'contacted' }, { date: '2026-01-01' }, { source: 'Google' }, { assignedCoachUid: 'foreign' }, { convertedMemberUid: 'fake' }, { lostAt: '2026-10-01' }, { nextReminderDate: '2026-10-02' }, { salesVersion: 0 }]) await assertFails(updateDoc(ref, patch));
  await assertFails(deleteDoc(ref)); await assertFails(setDoc(doc(db, `prospects/${role}-fake-lead`), { clubId: 'sales-rules', status: 'lead' }));
});
