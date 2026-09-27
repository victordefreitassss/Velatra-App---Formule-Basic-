import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditMemberAssignments } from '../scripts/audit/member-assignment-classifier.mjs';

const scope = 'fictional-project/(default)';
const options = { environment: 'production', scope };
const profile = (uid: string, role: string, id: number, clubId = 'club-a', extra: Record<string, unknown> = {}): Record<string, any> => ({
  documentId: uid, firebaseUid: uid, role, id, clubId, ...extra
});
const coach = (extra: Record<string, unknown> = {}) => profile('coach-a', 'coach', 2, 'club-a', { assignedMemberIds: [101], ...extra });
const member = (extra: Record<string, unknown> = {}) => profile('member-a', 'member', 101, 'club-a', { assignedCoachUid: 'coach-a', ...extra });
const one = (users: object[]) => auditMemberAssignments(users, options).members[0];
const hashed = (kind: string, value: unknown) => createHash('sha256').update(`${scope}|${kind}|${JSON.stringify(value)}`).digest('hex').slice(0, 16);

describe('read-only member assignment classification', () => {
  it('recognizes the canonical coach/member relation without a derived-index warning', () => {
    const result = auditMemberAssignments([coach(), member()], options);
    assert.equal(result.summary.totalMembers, 1);
    assert.equal(result.summary.productionMembers, 1);
    assert.equal(result.summary.testAccounts, 0);
    assert.equal(result.summary.categories.OK, 1);
    assert.equal(result.summary.productionCategories.OK, 1);
    assert.equal(result.summary.testAssignmentCategories.OK, 0);
    assert.deepEqual(result.members[0], {
      memberRef: hashed('user', 'member-a'), clubRef: hashed('club', 'club-a'), assignedCoachRef: hashed('user', 'coach-a'),
      category: 'OK', assignmentCategory: 'OK', issues: [], sameClubCoachCount: 1, sameClubOwnerCount: 0
    });
  });

  it('reports absent, null, empty and whitespace assignments as missing without assigning the sole coach', () => {
    for (const assignment of [undefined, null, '', '   ']) {
      const result = one([coach({ assignedMemberIds: [] }), member({ assignedCoachUid: assignment })]);
      assert.equal(result.category, 'MISSING');
      assert.equal(result.assignedCoachRef, null);
      assert.equal(result.sameClubCoachCount, 1);
      assert.deepEqual(result.issues, ['MISSING_ASSIGNMENT']);
    }
    const absent = member();
    delete absent.assignedCoachUid;
    assert.equal(one([absent]).category, 'MISSING');
  });

  it('distinguishes missing target, cross-club target and forbidden target role', () => {
    const orphan = one([member({ assignedCoachUid: 'deleted-user' })]);
    assert.equal(orphan.category, 'ORPHAN');
    assert.deepEqual(orphan.issues, ['ASSIGNED_COACH_NOT_FOUND']);
    const otherClub = one([coach({ clubId: 'club-b' }), member()]);
    assert.equal(otherClub.category, 'CROSS_CLUB');
    assert.ok(otherClub.issues.includes('ASSIGNED_COACH_CROSS_CLUB'));
    for (const role of ['member', 'owner', 'superadmin', 'unknown-role']) {
      const target = coach({ role });
      const result = auditMemberAssignments([target, member()], options).members.find(item => item.memberRef === hashed('user', 'member-a'))!;
      assert.equal(result.category, 'INVALID_ROLE');
      assert.ok(result.issues.includes('ASSIGNED_COACH_ROLE_INVALID'));
    }
  });

  it('leaves several possible coaches ambiguous and never chooses by creator or reverse index', () => {
    const result = one([
      coach(), profile('coach-b', 'coach', 3, 'club-a', { assignedMemberIds: [101] }),
      member({ assignedCoachUid: null, createdByUid: 'coach-a' })
    ]);
    assert.equal(result.category, 'AMBIGUOUS');
    assert.equal(result.createdByRole, 'coach');
    assert.equal(result.sameClubCoachCount, 2);
    assert.equal(result.assignedCoachRef, null);
    assert.ok(result.issues.includes('MISSING_ASSIGNMENT'));
    assert.ok(result.issues.includes('MULTIPLE_COACH_CANDIDATES'));
    assert.ok(result.issues.includes('OTHER_COACH_INDEX_CONTAINS_MEMBER'));
  });

  it('does not consider owner-only member creation an implicit coach assignment', () => {
    const owner = profile('owner-a', 'owner', 1);
    const result = one([owner, member({ assignedCoachUid: null, createdByUid: 'owner-a' })]);
    assert.equal(result.category, 'MISSING');
    assert.equal(result.sameClubCoachCount, 0);
    assert.equal(result.sameClubOwnerCount, 1);
    assert.equal(result.createdByRole, 'owner');
    assert.deepEqual(result.issues, ['MISSING_ASSIGNMENT']);
  });

  it('reports malformed assignment types, padding and paths without normalizing them', () => {
    for (const assignedCoachUid of [2, false, {}, [], ' coach-a', 'coach-a ', 'users/coach-a', 'coach-a\n', 'x'.repeat(129)]) {
      const result = one([coach(), member({ assignedCoachUid })]);
      assert.equal(result.category, 'AMBIGUOUS');
      assert.ok(result.issues.includes('ASSIGNMENT_UID_INVALID'));
      assert.equal(result.assignedCoachRef, hashed('user', assignedCoachUid));
    }
  });

  it('does not silently resolve legacy numeric aliases or a noncanonical firebaseUid field', () => {
    for (const [target, assignedCoachUid] of [[coach(), '2'], [coach({ firebaseUid: 'alias-a' }), 'alias-a']] as const) {
      const result = one([target, member({ assignedCoachUid })]);
      assert.equal(result.category, 'AMBIGUOUS');
      assert.ok(result.issues.includes('NONCANONICAL_COACH_REFERENCE'));
    }
  });

  it('requires canonical member UID, club and numeric identity even when the assignment otherwise exists', () => {
    for (const [extra, issue] of [
      [{ firebaseUid: undefined }, 'MEMBER_FIREBASE_UID_MISSING'],
      [{ firebaseUid: 'different-user' }, 'MEMBER_FIREBASE_UID_MISMATCH'],
      [{ firebaseUid: 'users/member-a' }, 'MEMBER_FIREBASE_UID_INVALID'],
      [{ firebaseUid: { invalidType: 'mapValue' } }, 'MEMBER_FIREBASE_UID_INVALID'],
      [{ documentId: 'users/member-a' }, 'MEMBER_DOCUMENT_UID_INVALID'],
      [{ clubId: undefined }, 'MEMBER_CLUB_ID_MISSING'],
      [{ clubId: ' club-a' }, 'MEMBER_CLUB_ID_INVALID'],
      [{ clubId: 123456 }, 'MEMBER_CLUB_ID_INVALID'],
      [{ id: '101' }, 'MEMBER_INTERNAL_ID_INVALID'],
      [{ id: 1.5 }, 'MEMBER_INTERNAL_ID_INVALID'],
      [{ id: Number.MAX_SAFE_INTEGER + 1 }, 'MEMBER_INTERNAL_ID_INVALID']
    ] as const) {
      const result = one([coach(), member(extra)]);
      assert.equal(result.category, 'AMBIGUOUS');
      assert.ok(result.issues.includes(issue));
    }
  });

  it('rejects ambiguous coach metadata instead of calling an incomplete reference valid', () => {
    for (const [extra, issue] of [
      [{ firebaseUid: undefined }, 'ASSIGNED_COACH_IDENTITY_INVALID'],
      [{ firebaseUid: 'different-coach' }, 'ASSIGNED_COACH_IDENTITY_INVALID'],
      [{ clubId: undefined }, 'ASSIGNED_COACH_CLUB_ID_INVALID'],
      [{ id: undefined }, 'ASSIGNED_COACH_INTERNAL_ID_INVALID']
    ] as const) {
      const result = one([coach(extra), member()]);
      assert.equal(result.category, 'AMBIGUOUS');
      assert.ok(result.issues.includes(issue));
      assert.equal(result.sameClubCoachCount, 0);
    }
  });

  it('detects duplicate document UIDs, alias UIDs and member IDs without overwriting one profile', () => {
    const duplicateDocument = auditMemberAssignments([coach(), member(), member({ id: 102 })], options);
    assert.equal(duplicateDocument.summary.totalMembers, 2);
    assert.ok(duplicateDocument.members.every(row => row.category === 'AMBIGUOUS' && row.issues.includes('DUPLICATE_MEMBER_DOCUMENT_UID')));
    const duplicateAlias = auditMemberAssignments([coach(), member(), profile('member-b', 'member', 102, 'club-a', { firebaseUid: 'member-a' })], options);
    assert.ok(duplicateAlias.members.every(row => row.category === 'AMBIGUOUS' && row.issues.includes('DUPLICATE_MEMBER_FIREBASE_UID')));
    const duplicateId = auditMemberAssignments([coach(), member(), profile('member-b', 'member', 101)], options);
    assert.ok(duplicateId.members.every(row => row.category === 'AMBIGUOUS' && row.issues.includes('DUPLICATE_INTERNAL_ID_SAME_CLUB')));
    const crossClubId = auditMemberAssignments([coach(), member(), profile('member-b', 'member', 101, 'club-b')], options);
    assert.ok(crossClubId.members.every(row => row.issues.includes('DUPLICATE_INTERNAL_ID_GLOBAL')));
    assert.ok(crossClubId.members.every(row => !row.issues.includes('DUPLICATE_INTERNAL_ID_SAME_CLUB')));
  });

  it('checks identity collisions with staff too, as messaging uses the same ID namespace', () => {
    const result = one([coach(), profile('owner-a', 'owner', 101), member()]);
    assert.equal(result.category, 'AMBIGUOUS');
    assert.ok(result.issues.includes('DUPLICATE_INTERNAL_ID_SAME_CLUB'));
  });

  it('reports missing, wrongly typed and duplicate derived-index entries separately from a valid assignment', () => {
    const withoutIndex = coach();
    delete withoutIndex.assignedMemberIds;
    const missing = one([withoutIndex, member()]);
    assert.equal(missing.category, 'OK');
    assert.deepEqual(missing.issues, ['ASSIGNED_COACH_INDEX_MISSING']);
    for (const assignedMemberIds of [null, '101', ['101'], [101, 101], [101, -2]]) {
      const result = one([coach({ assignedMemberIds }), member()]);
      assert.equal(result.assignmentCategory, 'OK');
      assert.ok(result.issues.includes('ASSIGNED_COACH_INDEX_INVALID'));
    }
    const omitted = one([coach({ assignedMemberIds: [] }), member()]);
    assert.deepEqual(omitted.issues, ['ASSIGNED_COACH_INDEX_MEMBER_MISSING']);
    const stale = one([coach(), profile('coach-b', 'coach', 3, 'club-a', { assignedMemberIds: [101] }), member()]);
    assert.equal(stale.category, 'OK');
    assert.deepEqual(stale.issues, ['OTHER_COACH_INDEX_CONTAINS_MEMBER']);
  });

  it('keeps emulator fixtures out of production statistics and retains their underlying problems', () => {
    const result = auditMemberAssignments([
      coach(), member(), profile('member-b', 'member', 102, 'club-a')
    ], { environment: 'emulator', scope: 'demo-velatra/(default)' });
    assert.equal(result.summary.totalMembers, 2);
    assert.equal(result.summary.productionMembers, 0);
    assert.equal(result.summary.testAccounts, 2);
    assert.equal(result.summary.categories.TEST_ACCOUNT, 2);
    assert.equal(result.summary.categories.MISSING, 0);
    assert.equal(result.summary.testAssignmentCategories.OK, 1);
    assert.equal(result.summary.testAssignmentCategories.MISSING, 1);
    assert.equal(Object.values(result.summary.productionCategories).reduce((sum, count) => sum + count, 0), 0);
    assert.ok(result.members.every(row => row.category === 'TEST_ACCOUNT'));
  });

  it('never marks production accounts fake because of names, email patterns or unreviewed flags', () => {
    const result = auditMemberAssignments([member({
      assignedCoachUid: null, name: 'QA DEMO TEST', email: 'qa@example.test', isTest: true, isDemo: true
    })], options);
    assert.equal(result.summary.productionMembers, 1);
    assert.equal(result.summary.testAccounts, 0);
    assert.equal(result.members[0].category, 'MISSING');
    assert.throws(() => auditMemberAssignments([], { ...options, testEvidence: [{ uid: 'private-user', reason: 'unreviewed' }] }),
      { message: 'AUDIT_TEST_EVIDENCE_UNSUPPORTED' });
  });

  it('exposes only scoped hashes, fixed issue codes, enums and counts; input remains untouched', () => {
    const source = [coach(), member({
      email: 'private-person@secret.example', phone: '0601020304', address: 'Private address', injuries: 'Private health',
      messages: ['Private message'], payment: 'Private payment', createdByUid: 'coach-a'
    })];
    const before = structuredClone(source);
    source.forEach(Object.freeze);
    Object.freeze(source);
    const report = auditMemberAssignments(source, options);
    assert.deepEqual(source, before);
    const json = JSON.stringify(report);
    for (const privateValue of ['member-a', 'coach-a', 'club-a', 'private-person', '0601020304', 'Private']) {
      assert.equal(json.includes(privateValue), false);
    }
    assert.deepEqual(report, auditMemberAssignments([...source].reverse(), options));
    assert.notEqual(report.members[0].memberRef, auditMemberAssignments(source, { ...options, scope: 'other-project/db' }).members[0].memberRef);
    assert.deepEqual(Object.keys(report.members[0]).sort(), [
      'memberRef', 'clubRef', 'assignedCoachRef', 'category', 'assignmentCategory', 'issues', 'sameClubCoachCount', 'sameClubOwnerCount', 'createdByRole'
    ].sort());
  });

  it('rejects invalid audit invocation with fixed errors instead of input or credential echoes', () => {
    for (const users of [null, {}, [null], ['private-value']]) {
      assert.throws(() => auditMemberAssignments(users as any, options), { message: 'AUDIT_USERS_INVALID' });
    }
    assert.throws(() => auditMemberAssignments([], { environment: 'unknown', scope }), { message: 'AUDIT_SCOPE_INVALID' });
    assert.throws(() => auditMemberAssignments([], { environment: 'production', scope: '' }), { message: 'AUDIT_SCOPE_INVALID' });
    assert.deepEqual(auditMemberAssignments([], options).members, []);
  });

  it('does not reflect arbitrary creator roles or malformed reference contents in reports', () => {
    const privateText = 'Do not expose this private field';
    const report = auditMemberAssignments([
      profile('creator-a', privateText, 3), member({
        assignedCoachUid: { invalidType: 'mapValue', content: privateText }, createdByUid: 'creator-a'
      })
    ], options);
    assert.equal(report.members[0].category, 'AMBIGUOUS');
    assert.equal('createdByRole' in report.members[0], false);
    assert.equal(JSON.stringify(report).includes(privateText), false);
  });
});
