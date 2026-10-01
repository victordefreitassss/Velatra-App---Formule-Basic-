import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
let env: RulesTestEnvironment;
const tenant = 'authz-studio';
const profile = (role: string, id: number, clubId = tenant) => ({ id, role, clubId, firebaseUid: `authz-${role}`, name: role });
const db = (role = 'manager') => env.authenticatedContext(`authz-${role}`).firestore();
const storage = (role = 'manager') => env.authenticatedContext(`authz-${role}`).storage();
const fixture = async (path: string, value: any) => env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), path), value); });
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') }, storage: { rules: await readFile('storage.rules', 'utf8') } });
  await fixture(`clubs/${tenant}`, { id: tenant, ownerId: 'authz-owner', accountType: 'studio' });
  await fixture('clubs/authz-other', { accountType: 'studio' });
  await fixture('clubs/authz-solo', { accountType: 'solo' });
  for (const [role, id] of [['owner', 8101], ['manager', 8102], ['coach', 8103], ['member', 8104]] as const) await fixture(`users/authz-${role}`, profile(role, id));
  await fixture('users/authz-other', { ...profile('member', 8110, 'authz-other'), firebaseUid: 'authz-other' });
  await fixture('users/authz-solo-manager', { ...profile('manager', 8111, 'authz-solo'), firebaseUid: 'authz-solo-manager', accountType: 'studio' });
});
after(async () => env?.cleanup());
it('Manager manages member and coach operational fields but never owner or roles', async () => {
  await assertSucceeds(updateDoc(doc(db(), 'users/authz-member'), { name: 'Managed member', documents: [] }));
  await assertSucceeds(updateDoc(doc(db(), 'users/authz-coach'), { name: 'Managed coach' }));
  for (const uid of ['authz-manager', 'authz-coach', 'authz-member']) await assertFails(updateDoc(doc(db(), `users/${uid}`), { role: 'owner' }));
  await assertFails(updateDoc(doc(db(), 'users/authz-owner'), { name: 'Hacked owner' }));
  await assertFails(updateDoc(doc(db(), 'users/authz-owner'), { role: 'member' }));
  await assertFails(setDoc(doc(db(), 'users/authz-created-owner'), profile('owner', 8112)));
  for (const uid of ['authz-owner', 'authz-coach', 'authz-member']) await assertFails(deleteDoc(doc(db(), `users/${uid}`)));
  await assertFails(updateDoc(doc(db(), 'users/authz-member'), { assignedCoachUid: 'authz-coach' }));
  await assertFails(updateDoc(doc(db(), 'users/authz-member'), { clubId: 'authz-other', id: 999 }));
  await assertFails(updateDoc(doc(db(), 'users/authz-member'), { credits: 999 }));
});
it('Manager cannot access Stripe, billing, club settings, role/plan authority or organisation deletion', async () => {
  await fixture(`stripeSecrets/${tenant}`, { secretKey: 'mock-only' });
  await assertFails(getDoc(doc(db(), `stripeSecrets/${tenant}`)));
  await assertFails(setDoc(doc(db(), `stripeSecrets/${tenant}`), { secretKey: 'replacement' }));
  for (const patch of [{ ownerId: 'authz-manager' }, { accountType: 'solo' }, { saasPlanId: 'studio' }, { settings: { payment: { stripeSecretKey: 'forged' } } }])
    await assertFails(updateDoc(doc(db(), `clubs/${tenant}`), patch));
  await assertFails(deleteDoc(doc(db(), `clubs/${tenant}`)));
  for (const collection of ['expenses', 'fixedCosts', 'subscriptions', 'payments', 'invoices']) {
    await fixture(`${collection}/authz-financial`, { clubId: tenant, memberId: 8104 });
    await assertFails(getDoc(doc(db(), `${collection}/authz-financial`)));
    await assertFails(setDoc(doc(db(), `${collection}/authz-financial-new`), { clubId: tenant, memberId: 8104 }));
  }
  await assertFails(updateDoc(doc(db('owner'), `clubs/${tenant}`), { saasPlanId: 'studio' }));
  await assertSucceeds(updateDoc(doc(db('owner'), `clubs/${tenant}`), { name: 'Studio' }));
});
it('Manager reads and writes operational CRM and coaching data in the Studio, never another tenant', async () => {
  await assertSucceeds(setDoc(doc(db(), 'tasks/authz-task'), { clubId: tenant, title: 'Task' }));
  await assertSucceeds(setDoc(doc(db(), 'prospects/authz-prospect'), { clubId: tenant, status: 'lead' }));
  await assertSucceeds(setDoc(doc(db(), 'programs/authz-program'), { clubId: tenant, memberId: 8104 }));
  await assertSucceeds(getDoc(doc(db(), 'programs/authz-program')));
  await assertSucceeds(updateDoc(doc(db(), 'programs/authz-program'), { name: 'Progression' }));
  await assertFails(deleteDoc(doc(db(), 'programs/authz-program')));
  await assertFails(getDoc(doc(db(), 'users/authz-other')));
  await assertFails(updateDoc(doc(db(), 'users/authz-other'), { name: 'Other' }));
  await assertFails(setDoc(doc(db(), 'tasks/authz-cross-task'), { clubId: 'authz-other' }));
  await assertFails(setDoc(doc(env.authenticatedContext('authz-solo-manager').firestore(), 'tasks/authz-solo-task'), { clubId: 'authz-solo' }));
});
it('Storage supports Manager member documents and own Drive assets but protects owner and contracts', async () => {
  const content = new Uint8Array([1, 2, 3]);
  const manager = storage();
  const memberDoc = ref(manager, 'users/authz-member/documents/authz.pdf');
  await assertSucceeds(uploadBytes(memberDoc, content, { contentType: 'application/pdf' }));
  assert.deepEqual(new Uint8Array(await assertSucceeds(getBytes(memberDoc))), content);
  await assertFails(deleteObject(memberDoc));
  for (const path of ['avatars/authz-owner/photo.png', 'users/authz-owner/documents/test.pdf', 'contracts/authz-member/contract.pdf', 'users/authz-other/documents/test.pdf'])
    await assertFails(uploadBytes(ref(manager, path), content, { contentType: path.endsWith('.png') ? 'image/png' : 'application/pdf' }));
  const drive = ref(manager, `drive/${tenant}/authz-manager/authz-drive/report.pdf`);
  await assertSucceeds(uploadBytes(drive, content, { contentType: 'application/pdf' }));
  await assertSucceeds(getBytes(drive));
  await assertSucceeds(deleteObject(drive));
  await assertFails(uploadBytes(ref(manager, `drive/authz-other/authz-manager/cross/report.pdf`), content, { contentType: 'application/pdf' }));
  const ownerAvatar = ref(storage('owner'), 'avatars/authz-owner/owner-kept.png');
  await assertSucceeds(uploadBytes(ownerAvatar, content, { contentType: 'image/png' }));
  await assertFails(deleteObject(ref(manager, ownerAvatar.fullPath)));
});
