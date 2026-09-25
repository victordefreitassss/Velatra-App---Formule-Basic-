import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

const projectId = 'demo-velatra-rules';
let testEnv: RulesTestEnvironment;

const profiles = {
  owner: { id: 1, clubId: 'club-a', role: 'owner', firebaseUid: 'owner' },
  ownerOtherClub: { id: 4, clubId: 'club-b', role: 'owner', firebaseUid: 'owner-other' },
  coachA: { id: 2, clubId: 'club-a', role: 'coach', firebaseUid: 'coach-a', assignedMemberIds: [101] },
  coachB: { id: 3, clubId: 'club-a', role: 'coach', firebaseUid: 'coach-b', assignedMemberIds: [202] },
  memberA: { id: 101, clubId: 'club-a', role: 'member', firebaseUid: 'member-a', assignedCoachUid: 'coach-a' },
  memberB: { id: 202, clubId: 'club-a', role: 'member', firebaseUid: 'member-b', assignedCoachUid: 'coach-b' }
};

const testFile = new Uint8Array([1, 2, 3, 4]);

function storageFor(uid: string) {
  return testEnv.authenticatedContext(uid).storage();
}

describe('Cloud Storage coach/member isolation', () => {
  before(async () => {
    const [firestoreRules, storageRules] = await Promise.all([
      readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      readFile(new URL('../storage.rules', import.meta.url), 'utf8')
    ]);
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { rules: firestoreRules },
      storage: { rules: storageRules }
    });
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await Promise.all(Object.values(profiles).map(profile =>
        setDoc(doc(db, 'users', profile.firebaseUid), profile)
      ));
      await setDoc(doc(db, 'driveFiles', 'shared-file'), {
        id: 'shared-file', clubId: 'club-a', uploadedBy: 2, sharedWith: [101]
      });
    });
  });

  after(async () => {
    await testEnv?.cleanup();
  });

  it('limits member avatar reads to the member, assigned coach, and their club owner', async () => {
    const path = 'avatars/member-a/avatar.png';
    await assertSucceeds(uploadBytes(ref(storageFor('member-a'), path), testFile, { contentType: 'image/png' }));
    await assertSucceeds(getBytes(ref(storageFor('member-a'), path)));
    await assertSucceeds(getBytes(ref(storageFor('coach-a'), path)));
    await assertSucceeds(getBytes(ref(storageFor('owner'), path)));
    await assertFails(getBytes(ref(storageFor('coach-b'), path)));
    await assertFails(getBytes(ref(storageFor('owner-other'), path)));
  });

  it('lets members read their assigned coach avatar and blocks other coaches from reading member files', async () => {
    const coachAvatar = 'avatars/coach-a/avatar.png';
    await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), coachAvatar), testFile, { contentType: 'image/png' }));
    await assertSucceeds(getBytes(ref(storageFor('member-a'), coachAvatar)));
    await assertFails(getBytes(ref(storageFor('member-b'), coachAvatar)));

    const memberDocument = 'users/member-a/documents/plan.pdf';
    await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), memberDocument), testFile, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(ref(storageFor('member-a'), memberDocument)));
    await assertSucceeds(getBytes(ref(storageFor('coach-a'), memberDocument)));
    await assertFails(getBytes(ref(storageFor('coach-b'), memberDocument)));
    await assertFails(uploadBytes(ref(storageFor('coach-b'), memberDocument), testFile, { contentType: 'application/pdf' }));
  });

  it('allows a member to read only Drive files explicitly shared with their profile', async () => {
    const sharedPath = 'drive/club-a/coach-a/shared-file/report.pdf';
    await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), sharedPath), testFile, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(ref(storageFor('member-a'), sharedPath)));
    await assertFails(getBytes(ref(storageFor('member-b'), sharedPath)));
  });
});
