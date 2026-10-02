import { before, after, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'clubs/notif-rules-club'), { ownerId: 'notif-rules-owner', accountType: 'studio', isActive: true });
    for (const [name, role, id] of [['owner', 'owner', 7701], ['manager', 'manager', 7702], ['coach', 'coach', 7703], ['member', 'member', 7710], ['other', 'member', 7711], ['suspended', 'member', 7712]] as const) {
      const uid = `notif-rules-${name}`;
      await setDoc(doc(db, `users/${uid}`), { role, id, clubId: 'notif-rules-club', ...(name === 'suspended' ? { isSuspended: true } : {}) });
      await setDoc(doc(db, `notificationInboxes/${uid}/items/one`), { recipientUid: uid, clubId: 'notif-rules-club', type: 'SYSTEM', readAt: null });
    }
    await setDoc(doc(db, 'pushDevices/hidden/devices/one'), { token: 'never-readable' });
    await setDoc(doc(db, 'notificationPreferences/hidden'), { pushEnabled: true });
    await setDoc(doc(db, 'messages/notif-receipt'), { clubId: 'notif-rules-club', senderUid: 'notif-rules-coach', recipientUid: 'notif-rules-member', from: 7703, to: 7710, read: false, assignedCoachUid: 'notif-rules-coach', text: 'private' });
  });
});
after(() => env.cleanup());
it('every role reads only its UID-owned inbox, never another user or forged SYSTEM notification', async () => {
  for (const role of ['owner', 'manager', 'coach', 'member']) {
    const uid = `notif-rules-${role}`, db = env.authenticatedContext(uid).firestore();
    await assertSucceeds(getDoc(doc(db, `notificationInboxes/${uid}/items/one`)));
    await assertSucceeds(getDocs(query(collection(db, `notificationInboxes/${uid}/items`), where('recipientUid', '==', uid), where('clubId', '==', 'notif-rules-club'))));
    await assertFails(getDoc(doc(db, 'notificationInboxes/notif-rules-other/items/one')));
    await assertFails(setDoc(doc(db, `notificationInboxes/${uid}/items/forged`), { recipientUid: uid, clubId: 'notif-rules-club', type: 'SYSTEM' }));
    await assertFails(updateDoc(doc(db, `notificationInboxes/${uid}/items/one`), { recipientUid: 'notif-rules-other' }));
    await assertFails(getDoc(doc(db, 'pushDevices/hidden/devices/one')));
    await assertFails(setDoc(doc(db, 'pushDevices/hidden/devices/forged'), { token: 'forged' }));
    await assertFails(getDoc(doc(db, 'notificationPreferences/hidden')));
    await assertFails(setDoc(doc(db, 'notifications/new-fake-system'), { userId: 7711, clubId: 'notif-rules-club', title: 'SYSTEM' }));
  }
});
it('anonymous, suspended and cross-club own UID attempts are refused', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'notificationInboxes/notif-rules-member/items/one')));
  await assertFails(getDoc(doc(env.authenticatedContext('notif-rules-suspended').firestore(), 'notificationInboxes/notif-rules-suspended/items/one')));
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'notificationInboxes/notif-rules-member/items/cross'), { recipientUid: 'notif-rules-member', clubId: 'another-club' }));
  await assertFails(getDoc(doc(env.authenticatedContext('notif-rules-member').firestore(), 'notificationInboxes/notif-rules-member/items/cross')));
});
it('SDK cannot send or alter messages; receipt-only update belongs exclusively to the recipient', async () => {
  const member = env.authenticatedContext('notif-rules-member').firestore(), sender = env.authenticatedContext('notif-rules-coach').firestore();
  await assertFails(setDoc(doc(member, 'messages/forged-v2'), { from: 7703, to: 7710, recipientUid: 'notif-rules-other', clubId: 'notif-rules-club', text: 'fake' }));
  await assertSucceeds(updateDoc(doc(member, 'messages/notif-receipt'), { read: true }));
  await assertFails(updateDoc(doc(member, 'messages/notif-receipt'), { text: 'modified' }));
  await assertFails(updateDoc(doc(sender, 'messages/notif-receipt'), { read: true }));
  await assertFails(getDoc(doc(env.authenticatedContext('notif-rules-manager').firestore(), 'messages/notif-receipt')));
});
