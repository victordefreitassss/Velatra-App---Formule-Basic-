import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const projectId = 'demo-velatra';
let testEnv: RulesTestEnvironment;

const profiles = {
  'legacy-owner': { id: 999, role: 'owner', clubId: 'legacy-club', firebaseUid: 'legacy-owner' },
  owner: { id: 1, clubId: 'club-a', role: 'owner', firebaseUid: 'owner' },
  coachA: { id: 2, clubId: 'club-a', role: 'coach', firebaseUid: 'coach-a', assignedMemberIds: [101] },
  coachB: { id: 3, clubId: 'club-a', role: 'coach', firebaseUid: 'coach-b', assignedMemberIds: [202] },
  memberA: { id: 101, clubId: 'club-a', role: 'member', firebaseUid: 'member-a', assignedCoachUid: 'coach-a' },
  memberB: { id: 202, clubId: 'club-a', role: 'member', firebaseUid: 'member-b', assignedCoachUid: 'coach-b' },
  superadmin: { id: 900, clubId: 'club-root', role: 'superadmin', firebaseUid: 'superadmin' },
  otherClubMember: { id: 303, clubId: 'club-b', role: 'member', firebaseUid: 'other-member' }
};
const memberRecordCollections = [
  'programs', 'archivedPrograms', 'performances', 'logs', 'bodyData', 'nutritionPlans',
  'nutritionLogs', 'subscriptions', 'payments', 'supplementOrders', 'progressPhotos',
  'bookings', 'notifications', 'messages'
];

before(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'clubs', 'club-a'), { id: 'club-a', ownerId: 'owner', accountType: 'studio', name: 'Fixture Studio' });
    await setDoc(doc(db, 'clubs', 'legacy-club'), { id: 'legacy-club', ownerId: 'legacy-owner', name: 'Legacy' });
    for (const [uid, profile] of Object.entries(profiles)) await setDoc(doc(db, 'users', uid.replace('coachA', 'coach-a').replace('coachB', 'coach-b').replace('memberA', 'member-a').replace('memberB', 'member-b').replace('otherClubMember', 'other-member')), profile);
    await setDoc(doc(db, 'programs', 'program-a'), { clubId: 'club-a', memberId: 101, assignedCoachUid: 'coach-a', plan: 'A' });
    await setDoc(doc(db, 'programs', 'program-b'), { clubId: 'club-a', memberId: 202, assignedCoachUid: 'coach-b', plan: 'B' });
    await setDoc(doc(db, 'programs', 'program-other-club'), { clubId: 'club-b', memberId: 303, assignedCoachUid: 'coach-a', plan: 'outside' });
    for (const collectionName of memberRecordCollections) {
      const ownerField = collectionName === 'nutritionLogs' || collectionName === 'notifications'
        ? 'userId'
        : collectionName === 'supplementOrders' ? 'adherentId' : 'memberId';
      await setDoc(doc(db, collectionName, `${collectionName}-a`), {
        clubId: 'club-a', [ownerField]: 101, assignedCoachUid: 'coach-a', value: 'A'
      });
      await setDoc(doc(db, collectionName, `${collectionName}-b`), {
        clubId: 'club-a', [ownerField]: 202, assignedCoachUid: 'coach-b', value: 'B'
      });
    }
  });
});

after(async () => {
  await testEnv?.cleanup();
});

describe('Firestore coach/member isolation', () => {
  it('protects canonical accountType against changes, removal and legacy backfills by clients', async () => {
    for (const [uid, claims] of [
      ['owner', {}], ['coach-a', {}], ['member-a', {}],
      ['superadmin', { email: 'victor.defreitas.pro@gmail.com', email_verified: true }],
    ] as const) {
      const db = testEnv.authenticatedContext(uid, claims).firestore();
      for (const value of ['solo', 'invalid', null, deleteField()]) {
        await assertFails(updateDoc(doc(db, 'clubs', 'club-a'), { accountType: value }));
      }
    }
    const legacyDb = testEnv.authenticatedContext('legacy-owner').firestore();
    await assertFails(updateDoc(doc(legacyDb, 'clubs', 'legacy-club'), { accountType: 'studio' }));
    await assertSucceeds(updateDoc(doc(legacyDb, 'clubs', 'legacy-club'), { name: 'Still editable' }));
    assert.equal((await getDoc(doc(legacyDb, 'clubs', 'legacy-club'))).data()!.accountType, undefined);
  });

  it('keeps owner settings writable and coach settings read-only without widening member access', async () => {
    const owner = testEnv.authenticatedContext('owner').firestore();
    await assertSucceeds(updateDoc(doc(owner, 'clubs', 'club-a'), { 'settings.booking.enabled': true, name: 'Updated' }));
    for (const uid of ['coach-a', 'member-a']) {
      const db = testEnv.authenticatedContext(uid).firestore();
      await assertSucceeds(getDoc(doc(db, 'clubs', 'club-a')));
      await assertFails(updateDoc(doc(db, 'clubs', 'club-a'), { 'settings.booking.enabled': false }));
      await assertFails(updateDoc(doc(db, 'users', uid), { role: 'owner', accountType: 'studio' }));
    }
  });
  it('lets a new identity observe its missing profile without reading anyone else', async () => {
    const db = testEnv.authenticatedContext('new-signup').firestore();
    const missing = await assertSucceeds(getDoc(doc(db, 'users', 'new-signup')));
    assert.equal(missing.exists(), false);
    await assertFails(getDoc(doc(db, 'users', 'member-a')));
  });
  it('blocks unauthenticated private reads and member writes to programs', async () => {
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'programs', 'program-a')));
    await assertFails(updateDoc(doc(testEnv.authenticatedContext('member-a').firestore(), 'programs', 'program-a'), { plan: 'changed' }));
  });

  it('prevents moving club documents to another club after creation', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    await assertSucceeds(setDoc(doc(db, 'tasks', 'club-move'), { clubId: 'club-a', title: 'Task' }));
    await assertFails(updateDoc(doc(db, 'tasks', 'club-move'), { clubId: 'club-b' }));
    await assertSucceeds(setDoc(doc(db, 'presets', 'preset-move'), { clubId: 'club-a', name: 'Template' }));
    await assertFails(updateDoc(doc(db, 'presets', 'preset-move'), { clubId: 'club-b' }));
  });

  it('rejects contradictory member ownership fields', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertFails(setDoc(doc(db, 'logs', 'poisoned-log'), {
      clubId: 'club-a', memberId: 202, userId: 101, assignedCoachUid: 'coach-a'
    }));
  });

  it('blocks forged sender fields, direct member reservations and refund markers', async () => {
    const memberDb = testEnv.authenticatedContext('member-a').firestore();
    await assertFails(setDoc(doc(memberDb, 'logs', 'forged-sender'), { clubId: 'club-a', memberId: 202, from: 101, assignedCoachUid: 'coach-a' }));
    await assertFails(setDoc(doc(memberDb, 'bookings', 'direct-booking'), { clubId: 'club-a', memberId: 101, assignedCoachUid: 'coach-a', status: 'confirmed' }));
    await assertFails(updateDoc(doc(memberDb, 'users', 'member-a'), { credits: 999 }));
    const coachDb = testEnv.authenticatedContext('coach-a').firestore();
    await assertFails(setDoc(doc(coachDb, 'bookings', 'forged-credit'), { clubId: 'club-a', memberId: 101, assignedCoachUid: 'coach-a', creditDebited: true, memberUid: 'member-a' }));
  });

  it('allows member onboarding without granting payment status changes', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'member-a'), { age: 30, weight: 70, height: 175, gender: 'M', objectifs: ['Remise en forme'], injuries: '', blessures: '', phone: '', experienceLevel: 'Débutant', trainingDays: 3, sessionDuration: 60, equipment: 'Salle complète', onboardingCompleted: true }));
    await assertFails(updateDoc(doc(db, 'users', 'member-a'), { paymentStatus: 'active' }));
  });

  it('allows owners to update their own plan while preserving club ownership', async () => {
    const db = testEnv.authenticatedContext('owner').firestore();
    await assertSucceeds(setDoc(doc(db, 'plans', 'valid-plan'), { clubId: 'club-a', name: 'Plan' }));
    await assertSucceeds(updateDoc(doc(db, 'plans', 'valid-plan'), { name: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'plans', 'valid-plan'), { clubId: 'club-b' }));
  });
  it('lets an adherent read their own profile and blocks another adherent profile', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'member-a')));
    await assertFails(getDoc(doc(db, 'users', 'member-b')));
  });

  it('limits a coach profile query to assigned members', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    const ownMembers = query(collection(db, 'users'), where('clubId', '==', 'club-a'), where('role', '==', 'member'), where('assignedCoachUid', '==', 'coach-a'));
    const result = await assertSucceeds(getDocs(ownMembers));
    assert.deepEqual(result.docs.map(snapshot => snapshot.id), ['member-a']);
    await assertFails(getDoc(doc(db, 'users', 'member-b')));
    await assertFails(getDoc(doc(db, 'users', 'coach-b')));
  });

  it('limits coach program queries to assigned members and denies unfiltered club queries', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    const ownPrograms = query(collection(db, 'programs'), where('clubId', '==', 'club-a'), where('assignedCoachUid', '==', 'coach-a'));
    const result = await assertSucceeds(getDocs(ownPrograms));
    assert.deepEqual(result.docs.map(snapshot => snapshot.id).sort(), ['program-a', 'programs-a']);
    await assertFails(getDoc(doc(db, 'programs', 'program-b')));
    await assertFails(getDocs(query(collection(db, 'programs'), where('clubId', '==', 'club-a'))));
    await assertFails(getDoc(doc(db, 'programs', 'program-other-club')));
  });

  it('enforces assigned-coach reads for every member-scoped collection', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    for (const collectionName of memberRecordCollections) {
      const assignedRecords = query(collection(db, collectionName), where('clubId', '==', 'club-a'), where('assignedCoachUid', '==', 'coach-a'));
      const result = await assertSucceeds(getDocs(assignedRecords));
      const expectedIds = collectionName === 'programs' ? ['program-a', 'programs-a'] : [`${collectionName}-a`];
      assert.deepEqual(result.docs.map(snapshot => snapshot.id).sort(), expectedIds, `${collectionName} must return assigned-member data only`);
      await assertFails(getDoc(doc(db, collectionName, `${collectionName}-b`)));
      await assertFails(getDocs(query(collection(db, collectionName), where('clubId', '==', 'club-a'))));
    }
  });

  it('lets the owner manage the club roster and records', async () => {
    const db = testEnv.authenticatedContext('owner').firestore();
    const roster = await assertSucceeds(getDocs(query(collection(db, 'users'), where('clubId', '==', 'club-a'))));
    assert.equal(roster.size, 5);
    await assertSucceeds(getDoc(doc(db, 'programs', 'program-b')));
  });

  it('lets only the verified super-admin read the cross-club user roster', async () => {
    const superadminDb = testEnv.authenticatedContext('superadmin', {
      email: 'victor.defreitas.pro@gmail.com', email_verified: true
    }).firestore();
    const roster = await assertSucceeds(getDocs(collection(superadminDb, 'users')));
    assert.equal(roster.size, Object.keys(profiles).length);
    await assertSucceeds(getDoc(doc(superadminDb, 'users', 'other-member')));

    const unverifiedDb = testEnv.authenticatedContext('superadmin', {
      email: 'victor.defreitas.pro@gmail.com', email_verified: false
    }).firestore();
    await assertFails(getDoc(doc(unverifiedDb, 'users', 'other-member')));
  });

  it('blocks assignment spoofing and changing record ownership', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    await assertFails(setDoc(doc(db, 'programs', 'spoofed-program'), {
      clubId: 'club-a', memberId: 202, assignedCoachUid: 'coach-a', plan: 'spoof'
    }));
    await assertFails(setDoc(doc(db, 'programs', 'own-with-wrong-assignment'), {
      clubId: 'club-a', memberId: 101, assignedCoachUid: 'coach-b', plan: 'wrong coach'
    }));

    const memberDb = testEnv.authenticatedContext('member-a').firestore();
    await assertFails(setDoc(doc(memberDb, 'programs', 'member-assignment-spoof'), {
      clubId: 'club-a', memberId: 101, assignedCoachUid: 'coach-b', plan: 'wrong coach'
    }));
  });

  it('lets coaches message assigned members and blocks other members', async () => {
    const db = testEnv.authenticatedContext('coach-a').firestore();
    await assertSucceeds(setDoc(doc(db, 'messages', 'coach-message-a'), {
      clubId: 'club-a', assignedCoachUid: 'coach-a', from: 2, to: 101, text: 'Bonjour', date: '2026-09-25', read: false
    }));
    await assertFails(setDoc(doc(db, 'messages', 'coach-message-b'), {
      clubId: 'club-a', assignedCoachUid: 'coach-a', from: 2, to: 202, text: 'Interdit', date: '2026-09-25', read: false
    }));
  });

  it('lets an adherent message their assigned coach and blocks coach reassignment spoofing', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertSucceeds(setDoc(doc(db, 'messages', 'member-message-a'), {
      clubId: 'club-a', assignedCoachUid: 'coach-a', from: 101, to: 2, text: 'Bonjour', date: '2026-09-25', read: false
    }));
    await assertFails(setDoc(doc(db, 'messages', 'member-message-b'), {
      clubId: 'club-a', assignedCoachUid: 'coach-b', from: 101, to: 3, text: 'Interdit', date: '2026-09-25', read: false
    }));
  });

  it('does not let an adherent change their role or assigned coach', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertFails(setDoc(doc(db, 'users', 'member-a'), { ...profiles.memberA, role: 'owner' }));
    await assertFails(setDoc(doc(db, 'users', 'member-a'), { ...profiles.memberA, assignedCoachUid: 'coach-b' }));
  });

  it('keeps daily check-ins and AI conversation records behind the authenticated server API', async () => {
    const db = testEnv.authenticatedContext('member-a').firestore();
    await assertFails(getDoc(doc(db, 'dailyCheckIns', 'member-a_2026-09-25')));
    await assertFails(setDoc(doc(db, 'dailyCheckIns', 'member-a_2026-09-25'), {
      userUid: 'member-a', memberId: 101, clubId: 'club-a', date: '2026-09-25'
    }));
    await assertFails(getDoc(doc(db, 'aiConversations', 'member-a_general')));
    await assertFails(setDoc(doc(db, 'aiConversations', 'member-a_general'), {
      ownerUid: 'member-a', clubId: 'club-a', role: 'member', memberId: null, messages: []
    }));
  });
});
