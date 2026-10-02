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
import { deleteObject, getBytes, getDownloadURL, ref, uploadBytes, type FirebaseStorage, type UploadMetadata } from 'firebase/storage';

const projectId = 'demo-velatra';
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

function storageFor(uid: string, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).storage();
}

const adminClaims = { email: 'victor.defreitas.pro@gmail.com', email_verified: true };
const MiB = 1024 * 1024;
const replacement = new Uint8Array([9, 8, 7]);
const anonymous = () => testEnv.unauthenticatedContext().storage();
const adminStorage = () => storageFor('storage-superadmin', adminClaims);

async function seedFile(path: string, contentType: string) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await uploadBytes(ref(context.storage(), path), testFile, { contentType });
  });
}

async function seedDrive(fileId: string, path: string, overrides = {}) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'driveFiles', fileId), {
      id: fileId, clubId: 'club-a', uploadedBy: 2, sharedWith: [101],
      path, name: path.split('/').at(-1), ...overrides,
    });
  });
}

async function expectReadWriteDelete(storage: FirebaseStorage, path: string, contentType: string) {
  await assertSucceeds(uploadBytes(ref(storage, path), testFile, { contentType }));
  assert.deepEqual(new Uint8Array(await assertSucceeds(getBytes(ref(storage, path)))), testFile);
  await assertSucceeds(uploadBytes(ref(storage, path), replacement, { contentType }));
  assert.deepEqual(new Uint8Array(await assertSucceeds(getBytes(ref(storage, path)))), replacement);
  await assertSucceeds(deleteObject(ref(storage, path)));
}

async function expectPrivateDenial(storage: FirebaseStorage, path: string, contentType: string) {
  await seedFile(path, contentType);
  await assertFails(getBytes(ref(storage, path)));
  await assertFails(getDownloadURL(ref(storage, path)));
  await assertFails(uploadBytes(ref(storage, path), replacement, { contentType }));
  await assertFails(uploadBytes(ref(storage, path + '-new'), testFile, { contentType }));
  await assertFails(deleteObject(ref(storage, path)));
}

describe('Cloud Storage coach/member isolation', () => {
  before(async () => {
    const [firestoreRules, storageRules] = await Promise.all([
      readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      readFile(new URL('../storage.rules', import.meta.url), 'utf8')
    ]);
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
      storage: { host: '127.0.0.1', port: 9199, rules: storageRules }
    });
    await testEnv.clearStorage();
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'clubs', 'club-a'), {id:'club-a',isActive:true,accountType:'studio'});
      await setDoc(doc(db, 'clubs', 'club-b'), {id:'club-b',isActive:true,accountType:'studio'});
      await Promise.all(Object.values(profiles).map(profile =>
        setDoc(doc(db, 'users', profile.firebaseUid), profile)
      ));
      for (const profile of [
        { id: 5, clubId: 'club-b', role: 'coach', firebaseUid: 'coach-other' },
        { id: 303, clubId: 'club-b', role: 'member', firebaseUid: 'member-other' },
        { id: 9900, clubId: 'platform', role: 'superadmin', firebaseUid: 'storage-superadmin' },
        { id: 9901, clubId: 'club-a', role: 'superadmin', firebaseUid: 'storage-unverified-admin' },
        { id: 9902, clubId: 'club-a', role: 'superadmin', firebaseUid: 'storage-wrong-email-admin' },
        { id: 9903, clubId: 'club-b', role: 'member', firebaseUid: 'storage-wrong-role-admin' },
      ]) await setDoc(doc(db, 'users', profile.firebaseUid), profile);
      await setDoc(doc(db, 'driveFiles', 'shared-file'), {
        id: 'shared-file', clubId: 'club-a', uploadedBy: 2, sharedWith: [101],
        path: 'drive/club-a/coach-a/shared-file/report.pdf', name: 'report.pdf'
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

  it('final Drive objects deny SDK bytes and token lookup, including active shares', async () => {
    const path = 'drive/club-a/coach-a/shared-file/report.pdf';
    await seedFile(path, 'application/pdf');
    for (const storage of [storageFor('member-a'), storageFor('coach-a'), storageFor('owner'), adminStorage(), anonymous()]) {
      await assertFails(getBytes(ref(storage, path)));
      await assertFails(getDownloadURL(ref(storage, path)));
      await assertFails(uploadBytes(ref(storage, path), replacement, { contentType: 'application/pdf' }));
    }
  });

  for (const [kind, path, contentType] of [
    ['avatar', 'avatars/member-a/matrix.png', 'image/png'],
    ['document', 'users/member-a/documents/matrix.pdf', 'application/pdf'],
    ['contract', 'contracts/member-a/matrix.pdf', 'application/pdf'],
  ]) {
    it(`${kind}: member, assigned coach, same-club owner and verified admin can create/read/overwrite/delete`, async () => {
      for (const storage of [storageFor('member-a'), storageFor('coach-a'), storageFor('owner'), adminStorage()]) {
        await expectReadWriteDelete(storage, path, contentType);
      }
    });
    it(`${kind}: anonymous, missing profile, other member, other coach and other club cannot read/write/delete`, async () => {
      for (const storage of [anonymous(), storageFor('no-profile'), storageFor('member-b'), storageFor('coach-b'), storageFor('owner-other'), storageFor('coach-other'), storageFor('member-other')]) {
        await expectPrivateDenial(storage, path, contentType);
      }
    });
    it(`${kind}: unverified email, wrong email, wrong role and missing admin profile do not grant access`, async () => {
      for (const storage of [
        storageFor('storage-unverified-admin', { ...adminClaims, email_verified: false }),
        storageFor('storage-wrong-email-admin', { email: 'nobody@example.test', email_verified: true }),
        storageFor('storage-wrong-role-admin', adminClaims), storageFor('no-profile', adminClaims),
      ]) await expectPrivateDenial(storage, path, contentType);
    });
  }

  it('members read their assigned coach and owner avatars without editing them', async () => {
    for (const uid of ['coach-a', 'owner']) {
      const path = `avatars/${uid}/staff.png`;
      await assertSucceeds(uploadBytes(ref(storageFor(uid), path), testFile, { contentType: 'image/png' }));
      await assertSucceeds(getBytes(ref(storageFor('member-a'), path)));
      await assertFails(uploadBytes(ref(storageFor('member-a'), path), replacement, { contentType: 'image/png' }));
      await assertFails(deleteObject(ref(storageFor('member-a'), path)));
    }
    await seedFile('avatars/coach-b/staff.png', 'image/png');
    await assertFails(getBytes(ref(storageFor('member-a'), 'avatars/coach-b/staff.png')));
    await assertSucceeds(getBytes(ref(storageFor('coach-a'), 'avatars/coach-b/staff.png')));
  });

  it('uses the current member assignment rather than an old coach reverse index', async () => {
    const path = 'users/member-a/documents/reassigned.pdf';
    await seedFile(path, 'application/pdf');
    await assertSucceeds(getBytes(ref(storageFor('coach-a'), path)));
    await testEnv.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'users', 'member-a'), { assignedCoachUid: 'coach-b' }, { merge: true }));
    try {
      await assertFails(getBytes(ref(storageFor('coach-a'), path)));
      await assertFails(uploadBytes(ref(storageFor('coach-a'), path), replacement, { contentType: 'application/pdf' }));
      await assertFails(deleteObject(ref(storageFor('coach-a'), path)));
      await assertSucceeds(getBytes(ref(storageFor('coach-b'), path)));
    } finally {
      await testEnv.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'users', 'member-a'), { assignedCoachUid: 'coach-a' }, { merge: true }));
    }
  });

  it('member paths require an existing UID profile rather than a legacy numeric ID', async () => {
    for (const path of ['avatars/101/old.png', 'users/101/documents/old.pdf', 'contracts/101/old.pdf']) {
      await expectPrivateDenial(storageFor('member-a'), path, path.endsWith('.png') ? 'image/png' : 'application/pdf');
      await expectPrivateDenial(storageFor('owner'), path, path.endsWith('.png') ? 'image/png' : 'application/pdf');
    }
  });

  it('accepts only jpeg/png/webp/gif declared image types for avatar uploads', async () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      await assertSucceeds(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/type-check'), testFile, { contentType }));
    }
    for (const contentType of ['application/pdf', 'image/svg+xml', 'text/html', 'application/octet-stream', '']) {
      await assertFails(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/type-check'), testFile, { contentType }));
    }
    await assertFails(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/no-type'), testFile));
    await assertFails(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/null-type'), testFile, { contentType: null } as UploadMetadata));
  });

  it('rejects executable, HTML, empty, missing and null document content types on create and overwrite', async () => {
    for (const folder of ['users/member-a/documents', 'contracts/member-a']) {
      const path = `${folder}/types`;
      await seedFile(path, 'application/pdf');
      for (const contentType of ['application/x-msdownload', 'text/html', 'application/octet-stream', '']) {
        await assertFails(uploadBytes(ref(storageFor('member-a'), path), replacement, { contentType }));
        await assertFails(uploadBytes(ref(storageFor('member-a'), `${path}-new`), testFile, { contentType }));
      }
      await assertFails(uploadBytes(ref(storageFor('member-a'), `${path}-no-type`), testFile));
      await assertFails(uploadBytes(ref(storageFor('member-a'), `${path}-null-type`), testFile, { contentType: null } as UploadMetadata));
    }
  });

  it('enforces the 5 MiB avatar size boundary and 25 MiB document ceiling', async () => {
    await assertSucceeds(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/exact-limit.png'), new Uint8Array(5 * MiB), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageFor('member-a'), 'avatars/member-a/oversize.png'), new Uint8Array(5 * MiB + 1), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(storageFor('member-a'), 'users/member-a/documents/oversize.pdf'), new Uint8Array(25 * MiB + 1), { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(storageFor('member-a'), 'contracts/member-a/oversize.pdf'), new Uint8Array(25 * MiB + 1), { contentType: 'application/pdf' }));
  });

  it('club images are readable within the club and by the verified admin; only staff can manage them', async () => {
    const path = 'clubs/club-a/logo.png';
    for (const storage of [storageFor('coach-a'), storageFor('owner'), adminStorage()]) {
      await expectReadWriteDelete(storage, path, 'image/png');
    }
    await seedFile(path, 'image/png');
    await assertSucceeds(getBytes(ref(storageFor('member-a'), path)));
    await assertFails(uploadBytes(ref(storageFor('member-a'), path), replacement, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(storageFor('member-a'), path)));
    for (const storage of [anonymous(), storageFor('no-profile'), storageFor('owner-other'), storageFor('coach-other'), storageFor('member-other')]) {
      await expectPrivateDenial(storage, path, 'image/png');
    }
    await assertFails(uploadBytes(ref(storageFor('owner'), path), replacement, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(storageFor('owner'), 'clubs/club-a/too-large.png'), new Uint8Array(5 * MiB + 1), { contentType: 'image/png' }));
  });

  it('video uploader can manage the video; club members read it; owner can delete but cannot overwrite another uploader', async () => {
    const path = 'videos/club-a/coach-a/demo.mp4';
    await expectReadWriteDelete(storageFor('coach-a'), path, 'video/mp4');
    await seedFile(path, 'video/mp4');
    for (const uid of ['member-a', 'member-b', 'coach-b', 'owner']) await assertSucceeds(getBytes(ref(storageFor(uid), path)));
    for (const uid of ['member-a', 'coach-b', 'owner']) {
      await assertFails(uploadBytes(ref(storageFor(uid), path), replacement, { contentType: 'video/mp4' }));
    }
    await assertFails(deleteObject(ref(storageFor('coach-b'), path)));
    await assertFails(deleteObject(ref(storageFor('member-a'), path)));
    await assertSucceeds(deleteObject(ref(storageFor('owner'), path)));
  });

  it('private videos reject other clubs, anonymous identities and cross-club admin access without broadening admin rights', async () => {
    const path = 'videos/club-a/coach-a/private.mp4';
    for (const storage of [anonymous(), storageFor('no-profile'), storageFor('owner-other'), storageFor('coach-other'), storageFor('member-other'), adminStorage()]) {
      await expectPrivateDenial(storage, path, 'video/mp4');
    }
    const globalPath = 'videos/global/coach-a/old-global.mp4';
    await seedFile(globalPath, 'video/mp4');
    for (const storage of [anonymous(), storageFor('member-a'), storageFor('coach-a'), storageFor('owner'), adminStorage()]) {
      await assertFails(getBytes(ref(storage, globalPath)));
    }
  });

  it('videos require a declared video subtype and reject files over 50 MiB', async () => {
    for (const contentType of ['video/mp4', 'video/webm', 'video/quicktime']) {
      await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), 'videos/club-a/coach-a/typed-video'), testFile, { contentType }));
    }
    for (const contentType of ['image/png', 'application/octet-stream', 'text/html', 'video/', '']) {
      await assertFails(uploadBytes(ref(storageFor('coach-a'), 'videos/club-a/coach-a/typed-video'), replacement, { contentType }));
    }
    await assertFails(uploadBytes(ref(storageFor('coach-a'), 'videos/club-a/coach-a/no-type'), testFile));
    await assertFails(uploadBytes(ref(storageFor('coach-a'), 'videos/club-a/coach-a/null-type'), testFile, { contentType: null } as UploadMetadata));
    await assertFails(uploadBytes(ref(storageFor('coach-a'), 'videos/club-a/coach-a/oversize.mp4'), new Uint8Array(50 * MiB + 1), { contentType: 'video/mp4' }));
  });

  it('Drive staging preserves resumable upload permission without SDK reads or overwrites', async () => {
    const path = 'driveUploads/club-a/coach-a/staged/guide.pdf';
    await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), path), testFile, { contentType: 'application/pdf' }));
    for (const storage of [storageFor('coach-a'), storageFor('member-a'), anonymous(), adminStorage()]) {
      await assertFails(getBytes(ref(storage, path)));
      await assertFails(getDownloadURL(ref(storage, path)));
      await assertFails(uploadBytes(ref(storage, path), replacement, { contentType: 'application/pdf' }));
    }
    await assertSucceeds(deleteObject(ref(storageFor('coach-a'), path)));
  });

  it('Drive metadata allows share/revoke/rename but cannot forge an object path or public URL', async () => {
    const id = 'drive-ui-flow', path = `drive/club-a/coach-a/${id}/guide.pdf`;
    await seedDrive(id, path);
    const coach = testEnv.authenticatedContext('coach-a').firestore();
    await assertFails(setDoc(doc(coach, 'driveFiles', 'forged'), {id:'forged', clubId:'club-a',uploadedBy:2,path,name:'guide.pdf',sharedWith:[101]}));
    for (const patch of [{path:'drive/club-a/coach-b/victim/private.pdf'},{url:'https://public.invalid'},{id:'forged'},{uploadedBy:3},{clubId:'club-b'}])
      await assertFails(setDoc(doc(coach, 'driveFiles', id), patch, {merge:true}));
    await assertSucceeds(setDoc(doc(coach, 'driveFiles', id), {name:'renamed.pdf',sharedWith:[]}, {merge:true}));
    await assertFails(setDoc(doc(testEnv.authenticatedContext('member-a').firestore(), 'driveFiles', id), {sharedWith:[101]}, {merge:true}));
  });

  it('Drive paths do not give a member uploader rights and do not leak across clubs', async () => {
    const path = 'drive/club-a/coach-a/drive-private/private.pdf';
    await seedDrive('drive-private', path, { sharedWith: [101, 303] });
    for (const storage of [anonymous(), storageFor('no-profile'), storageFor('owner-other'), storageFor('coach-other'), storageFor('member-other')]) {
      await expectPrivateDenial(storage, path, 'application/pdf');
    }
    await expectPrivateDenial(storageFor('member-a'), 'drive/club-a/member-a/fake-upload/private.pdf', 'application/pdf');
  });

  it('Drive private objects cannot be overwritten; uploader, owner and verified admin can delete even orphaned uploads', async () => {
    const path = 'drive/club-a/coach-a/drive-delete/report.pdf';
    await seedDrive('drive-delete', path, { uploadedBy: 3 });
    await seedFile(path, 'application/pdf');
    // Mutating numeric metadata.uploadedBy cannot transfer a path's deletion authority.
    await assertFails(deleteObject(ref(storageFor('coach-b'), path)));
    for (const storage of [storageFor('coach-b'), storageFor('owner'), adminStorage()]) {
      await assertFails(uploadBytes(ref(storage, path), replacement, { contentType: 'application/pdf' }));
    }
    await assertFails(uploadBytes(ref(storageFor('coach-a'), path), replacement, { contentType: 'application/pdf' }));
    await assertSucceeds(deleteObject(ref(storageFor('coach-a'), path)));
    await seedFile(path, 'application/pdf');
    await assertSucceeds(deleteObject(ref(storageFor('owner'), path)));
    await seedFile(path, 'application/pdf');
    await assertSucceeds(deleteObject(ref(adminStorage(), path)));
    const orphanPath = 'drive/club-a/coach-a/no-metadata/orphan.pdf';
    await seedFile(orphanPath, 'application/pdf');
    await assertSucceeds(deleteObject(ref(storageFor('owner'), orphanPath)));
  });

  it('Drive staff must still have a staff profile after upload; a demoted uploader is not a private-read bypass', async () => {
    const id = 'demoted-staff';
    await testEnv.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'users', id), {
      id: 404, role: 'coach', clubId: 'club-a', firebaseUid: id,
    }));
    const path = `driveUploads/club-a/${id}/demotion/report.pdf`;
    await assertSucceeds(uploadBytes(ref(storageFor(id), path), testFile, { contentType: 'application/pdf' }));
    await testEnv.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'users', id), { role: 'member' }, { merge: true }));
    await assertFails(getBytes(ref(storageFor(id), path)));
    await assertFails(deleteObject(ref(storageFor(id), path)));
    await assertFails(uploadBytes(ref(storageFor(id), path), replacement, { contentType: 'application/pdf' }));
  });

  it('Drive accepts documented guides/images/videos and rejects generic, executable, absent and oversized types', async () => {
    const path = 'driveUploads/club-a/coach-a/drive-types/typed-file';
    for (const contentType of [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4', 'video/webm',
    ]) await assertSucceeds(uploadBytes(ref(storageFor('coach-a'), path+'-'+contentType.replaceAll('/','-')), testFile, { contentType }));
    for (const contentType of ['application/octet-stream', 'application/x-msdownload', 'text/html', 'image/svg+xml', 'video/', '']) {
      await assertFails(uploadBytes(ref(storageFor('coach-a'), path), replacement, { contentType }));
      await assertFails(uploadBytes(ref(storageFor('coach-a'), `${path}-new`), testFile, { contentType }));
    }
    await assertFails(uploadBytes(ref(storageFor('coach-a'), `${path}-no-type`), testFile));
    await assertFails(uploadBytes(ref(storageFor('coach-a'), `${path}-null-type`), testFile, { contentType: null } as UploadMetadata));
    await assertFails(uploadBytes(ref(storageFor('coach-a'), `${path}-oversize`), new Uint8Array(25 * MiB + 1), { contentType: 'application/pdf' }));
  });

  it('keeps unknown and historical flat paths denied without an authenticated wildcard', async () => {
    for (const path of ['unknown/file.pdf', 'avatars/101_123', 'contracts/101_123_old.pdf', 'videos/123_old.mp4', 'drive/club-a/id_old.pdf', 'users/member-a/nested/elsewhere/file.pdf']) {
      await expectPrivateDenial(storageFor('owner'), path, 'application/pdf');
      await expectPrivateDenial(adminStorage(), path, 'application/pdf');
    }
  });

});
