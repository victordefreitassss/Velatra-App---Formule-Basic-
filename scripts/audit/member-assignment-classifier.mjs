import { createHash } from 'node:crypto';

const CATEGORIES = ['OK', 'MISSING', 'ORPHAN', 'CROSS_CLUB', 'INVALID_ROLE', 'AMBIGUOUS', 'TEST_ACCOUNT'];
const ROLES = new Set(['owner', 'coach', 'member', 'superadmin']);
const counts = () => Object.fromEntries(CATEGORIES.map(category => [category, 0]));
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const missingValue = value => value == null || typeof value === 'string' && !value.trim();
const validSegment = value => nonempty(value) && value === value.trim() && !/[\x00-\x1f\x7f/]/.test(value);
const validUid = value => validSegment(value) && value.length <= 128;
const validClub = value => validSegment(value) && Buffer.byteLength(value, 'utf8') <= 1500;
const validInternalId = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** Scope separates the same identity in different projects/databases. Never return raw values. */
export function hashAuditIdentifier(scope, kind, value) {
  return createHash('sha256').update(`${scope}|${kind}|${JSON.stringify(value)}`).digest('hex').slice(0, 16);
}

const addToIndex = (index, key, row) => {
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(row);
};

/**
 * Pure classification of a complete, minimal users snapshot. No SDK, I/O or mutations.
 * Existing canonical member assignments are authoritative; creation, ownership and
 * reverse indexes never choose a replacement coach. Missing assignments are also
 * created by current owner/public signup flows and do not alone prove a breach.
 * TEST_ACCOUNT requires a caller-verified emulator environment. Production fixture
 * manifests are deliberately unsupported until their provenance can be reviewed.
 * @param {Array<Record<string, any>>} users
 * @param {{environment?: string, scope?: string, testEvidence?: Array<unknown>}} [options]
 */
export function auditMemberAssignments(users, { environment, scope, testEvidence = [] } = {}) {
  if (!Array.isArray(users) || users.some(user => !user || typeof user !== 'object' || Array.isArray(user))) {
    throw new Error('AUDIT_USERS_INVALID');
  }
  if (!['production', 'emulator'].includes(environment) || !nonempty(scope)) throw new Error('AUDIT_SCOPE_INVALID');
  if (!Array.isArray(testEvidence) || testEvidence.length) throw new Error('AUDIT_TEST_EVIDENCE_UNSUPPORTED');

  const byDocument = new Map();
  const byFirebaseUid = new Map();
  const byInternalId = new Map();
  for (const user of users) {
    if (validUid(user.documentId)) addToIndex(byDocument, user.documentId, user);
    if (validUid(user.firebaseUid)) addToIndex(byFirebaseUid, user.firebaseUid, user);
    if (validInternalId(user.id)) addToIndex(byInternalId, user.id, user);
  }
  const hasCanonicalUid = user => validUid(user.documentId) && user.firebaseUid === user.documentId &&
    byDocument.get(user.documentId)?.length === 1 && byFirebaseUid.get(user.firebaseUid)?.length === 1;
  const canBeCandidate = user => hasCanonicalUid(user) && validClub(user.clubId) && validInternalId(user.id) &&
    byInternalId.get(user.id)?.length === 1;
  const members = users.filter(user => user.role === 'member').map((member, position) => {
    const issues = new Set();
    let identityAmbiguous = false;
    const identityIssue = code => { issues.add(code); identityAmbiguous = true; };
    if (!validUid(member.documentId)) identityIssue('MEMBER_DOCUMENT_UID_INVALID');
    if (missingValue(member.firebaseUid)) identityIssue('MEMBER_FIREBASE_UID_MISSING');
    else if (!validUid(member.firebaseUid)) identityIssue('MEMBER_FIREBASE_UID_INVALID');
    else if (member.firebaseUid !== member.documentId) identityIssue('MEMBER_FIREBASE_UID_MISMATCH');
    if (byDocument.get(member.documentId)?.length > 1) identityIssue('DUPLICATE_MEMBER_DOCUMENT_UID');
    if (byFirebaseUid.get(member.firebaseUid)?.length > 1) identityIssue('DUPLICATE_MEMBER_FIREBASE_UID');
    if (missingValue(member.clubId)) identityIssue('MEMBER_CLUB_ID_MISSING');
    else if (!validClub(member.clubId)) identityIssue('MEMBER_CLUB_ID_INVALID');
    if (!validInternalId(member.id)) identityIssue('MEMBER_INTERNAL_ID_INVALID');
    else if (byInternalId.get(member.id).length > 1) {
      identityIssue('DUPLICATE_INTERNAL_ID_GLOBAL');
      if (byInternalId.get(member.id).filter(user => user.clubId === member.clubId).length > 1) {
        identityIssue('DUPLICATE_INTERNAL_ID_SAME_CLUB');
      }
    }

    const sameClub = validClub(member.clubId) ? users.filter(user => user.clubId === member.clubId) : [];
    const possibleCoaches = sameClub.filter(user => user.role === 'coach' && canBeCandidate(user));
    const possibleOwners = sameClub.filter(user => user.role === 'owner' && canBeCandidate(user));
    const rawAssignment = member.assignedCoachUid;
    const missing = missingValue(rawAssignment);
    let assignmentCategory = 'OK';
    let coach;
    if (missing) {
      issues.add('MISSING_ASSIGNMENT');
      assignmentCategory = 'MISSING';
      if (possibleCoaches.length > 1) {
        issues.add('MULTIPLE_COACH_CANDIDATES');
        assignmentCategory = 'AMBIGUOUS';
      }
    } else if (!validUid(rawAssignment)) {
      issues.add('ASSIGNMENT_UID_INVALID');
      assignmentCategory = 'AMBIGUOUS';
    } else {
      const matching = byDocument.get(rawAssignment) || [];
      if (!matching.length) {
        // UI legacy fallbacks are not authority: never resolve an alias to a UID.
        const alias = byFirebaseUid.has(rawAssignment) || users.some(user =>
          validInternalId(user.id) && String(user.id) === rawAssignment);
        issues.add(alias ? 'NONCANONICAL_COACH_REFERENCE' : 'ASSIGNED_COACH_NOT_FOUND');
        assignmentCategory = alias ? 'AMBIGUOUS' : 'ORPHAN';
      } else if (matching.length > 1) {
        issues.add('ASSIGNED_COACH_DOCUMENT_UID_DUPLICATED');
        assignmentCategory = 'AMBIGUOUS';
      } else {
        coach = matching[0];
        if (coach.role !== 'coach') {
          issues.add('ASSIGNED_COACH_ROLE_INVALID');
          assignmentCategory = 'INVALID_ROLE';
        }
        if (validClub(member.clubId) && validClub(coach.clubId) && coach.clubId !== member.clubId) {
          issues.add('ASSIGNED_COACH_CROSS_CLUB');
          assignmentCategory = 'CROSS_CLUB';
        }
        if (!hasCanonicalUid(coach)) {
          issues.add('ASSIGNED_COACH_IDENTITY_INVALID');
          assignmentCategory = 'AMBIGUOUS';
        }
        if (!validClub(coach.clubId)) {
          issues.add('ASSIGNED_COACH_CLUB_ID_INVALID');
          assignmentCategory = 'AMBIGUOUS';
        }
        if (!validInternalId(coach.id) || byInternalId.get(coach.id)?.length !== 1) {
          issues.add('ASSIGNED_COACH_INTERNAL_ID_INVALID');
          assignmentCategory = 'AMBIGUOUS';
        }
      }
    }

    // Separate denormalized-index health from the actual relationship category.
    // Consumers must also inspect issues before claiming the legacy risk closed.
    if (coach?.role === 'coach') {
      if (!hasOwn(coach, 'assignedMemberIds')) issues.add('ASSIGNED_COACH_INDEX_MISSING');
      else if (!Array.isArray(coach.assignedMemberIds) || coach.assignedMemberIds.some(id => !validInternalId(id)) ||
        new Set(coach.assignedMemberIds).size !== coach.assignedMemberIds.length) issues.add('ASSIGNED_COACH_INDEX_INVALID');
      if (Array.isArray(coach.assignedMemberIds) && validInternalId(member.id) && !coach.assignedMemberIds.includes(member.id)) {
        issues.add('ASSIGNED_COACH_INDEX_MEMBER_MISSING');
      }
    }
    if (validInternalId(member.id)) {
      const staleIndexes = sameClub.filter(user => user.role === 'coach' && user.documentId !== rawAssignment &&
        Array.isArray(user.assignedMemberIds) && user.assignedMemberIds.includes(member.id));
      if (staleIndexes.length) issues.add('OTHER_COACH_INDEX_CONTAINS_MEMBER');
    }
    if (identityAmbiguous) assignmentCategory = 'AMBIGUOUS';

    const creationMatches = validUid(member.createdByUid) ? byDocument.get(member.createdByUid) || [] : [];
    const creator = creationMatches.length === 1 && hasCanonicalUid(creationMatches[0]) ? creationMatches[0] : undefined;
    // Only known enum values may leave the pure classifier; never echo free text.
    const createdByRole = creator && ROLES.has(creator.role) ? creator.role : undefined;
    const category = environment === 'emulator' ? 'TEST_ACCOUNT' : assignmentCategory;
    return {
      memberRef: hashAuditIdentifier(scope, 'user', validUid(member.documentId) ? member.documentId : { invalidDocumentPosition: position }),
      clubRef: member.clubId == null ? null : hashAuditIdentifier(scope, 'club', member.clubId),
      assignedCoachRef: missing ? null : hashAuditIdentifier(scope, 'user', rawAssignment),
      category,
      assignmentCategory,
      issues: [...issues].sort(),
      sameClubCoachCount: possibleCoaches.length,
      sameClubOwnerCount: possibleOwners.length,
      ...(createdByRole ? { createdByRole } : {})
    };
  }).sort((left, right) => left.memberRef.localeCompare(right.memberRef));

  const categories = counts();
  const productionCategories = counts();
  const testAssignmentCategories = counts();
  for (const member of members) {
    categories[member.category] += 1;
    if (environment === 'emulator') testAssignmentCategories[member.assignmentCategory] += 1;
    else productionCategories[member.assignmentCategory] += 1;
  }
  return {
    summary: {
      totalMembers: members.length,
      productionMembers: environment === 'production' ? members.length : 0,
      testAccounts: environment === 'emulator' ? members.length : 0,
      categories,
      productionCategories,
      testAssignmentCategories
    },
    members
  };
}
