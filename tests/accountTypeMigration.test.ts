import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Firestore } from 'firebase-admin/firestore';
import { assertTestEmulators } from '../scripts/assert-test-emulators.mjs';
import { classifyAccounts, type RecordRow } from '../scripts/migrations/account-type-policy.ts';
import { applyInventory, parseArgs, readInventory, savePrivateJson, validateTarget } from '../scripts/migrations/activate-modern-account-types.ts';
import { resolveProductExperience, resolveExperienceCapabilities, resolvePresentationStrategy } from '../productExperience.ts';
import type { Club } from '../types.ts';

const owner: RecordRow = { key: 'owner', data: { id: 1, role: 'owner', clubId: 'club' } };
const staff = (role: string): RecordRow => ({ key: role, data: { id: 2, role, clubId: 'club' } });
const classify = (club: Record<string, any> = {}, users = [owner]) => classifyAccounts([{ key: 'club', data: { ownerId: 'owner', ...club } }], users).rows[0];
for (const [label, club, users, expected] of [
  ['legacy without staff', {}, [owner], 'solo'], ['legacy with coach', {}, [owner, staff('coach')], 'studio'],
  ['legacy with manager', {}, [owner, staff('manager')], 'studio'], ['premium without staff', { plan: 'premium' }, [owner], 'solo'],
  ['basic with coach', { plan: 'basic' }, [owner, staff('coach')], 'studio'],
  ['suspended with coach', { isActive: false }, [owner, staff('coach')], 'studio'],
] as const) test(label, () => {
  const row = classify(club, [...users]); assert.equal(row.nextAccountType, expected); assert.equal(row.change, true); assert.equal(row.classification, 'SAFE_TO_MIGRATE');
});
for (const accountType of ['solo', 'studio']) test(`explicit ${accountType} preserved even with staff`, () => {
  const row = classify({ accountType }, [owner, staff('coach')]); assert.equal(row.change, false); assert.equal(row.nextAccountType, accountType);
});
for (const value of [null, '', 'legacy', 'premium', 0]) test(`present invalid value ${JSON.stringify(value)} requires review`, () => {
  const row = classify({ accountType: value }); assert.equal(row.classification, 'NEEDS_REVIEW'); assert.equal(row.change, false);
});
test('serious anomalies isolated; cross-club references never count as internal staff', () => {
  assert.equal(classify({}, [owner, { ...owner, key: 'owner2' }]).classification, 'NEEDS_REVIEW');
  assert.equal(classify({ ownerId: undefined }).classification, 'NEEDS_REVIEW');
  assert.equal(classify({ ownerId: 'wrong' }).classification, 'NEEDS_REVIEW');
  assert.equal(classify({ coaches: [{ id: 9, clubId: 'other' }] }).classification, 'NEEDS_REVIEW');
  assert.equal(classify({}, [owner, { key: 'outside', data: { role: 'coach', clubId: 'other' } }]).nextAccountType, 'solo');
  assert.equal(classify({}, [owner, { key: 'member', data: { role: 'member', clubId: 'club', assignedCoachUid: 'outside' } }, { key: 'outside', data: { role: 'coach', clubId: 'other' } }]).classification, 'NEEDS_REVIEW');
  const report = classifyAccounts([{ key: 'club', data: { ownerId: 'owner' } }, { key: 'broken', data: {} }], [owner, { key: 'orphan', data: { role: 'coach', clubId: 'missing' } }, { key: 'no-club', data: { role: 'member' } }]);
  assert.equal(report.summary.toSolo, 1); assert.equal(report.summary.needsReview, 1); assert.equal(report.summary.accountsWithoutClub, 1); assert.equal(report.summary.usersLinkedToNonexistentClub, 1);
});
test('manager warning is reported but allowed studio classification', () => assert.deepEqual(classify({}, [owner, staff('manager')]).warnings, ['MANAGER_WITHOUT_ACCOUNT_TYPE']));
test('production target, CI, emulator and environment guards; default dry-run', () => {
  assert.equal(parseArgs([]).apply, false); assert.equal(parseArgs(['--dry-run']).apply, false);
  assert.throws(() => parseArgs(['--apply']), /AUDIT_AND_BACKUP_REQUIRED/);
  assert.throws(() => parseArgs(['--apply', '--dry-run']), /CONFLICTING/);
  assert.throws(() => parseArgs(['--unknown']), /INVALID/);
  assert.throws(() => validateTarget('another-project', {}), /PROJECT_MISMATCH/);
  assert.throws(() => validateTarget('velatra-75daa', { CI: 'true' }), /ENVIRONMENT_CONFLICT/);
  assert.throws(() => validateTarget('velatra-75daa', { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }), /ENVIRONMENT_CONFLICT/);
  assert.throws(() => validateTarget('velatra-75daa', { GCLOUD_PROJECT: 'other' }), /ENVIRONMENT_MISMATCH/);
  validateTarget('velatra-75daa', {});
});
test('migrated fixtures resolve modern experiences, own scopes, formats, Pulse and Retain', () => {
  for (const [role, type, experience] of [['owner', 'solo', 'SOLO_OWNER'], ['owner', 'studio', 'STUDIO_OWNER'], ['manager', 'studio', 'STUDIO_MANAGER'], ['coach', 'studio', 'STUDIO_COACH'], ['member', 'studio', 'MEMBER']] as const) {
    const club = { id: 'club', isActive: true, accountType: type, ownerId: 'owner', plan: 'basic' } as Club;
    const actor = { role, clubId: 'club' };
    assert.equal(resolveProductExperience(club, actor), experience);
    if (role !== 'member') {
      const capabilities = resolveExperienceCapabilities(club, actor);
      assert.equal(capabilities.tasks.runtimeUsable, true); assert.equal(capabilities.retention.runtimeUsable, true);
      if (role === 'coach') { assert.equal(capabilities.finances.runtimeUsable, false); assert.equal(capabilities.clients.scope, 'assigned'); }
      assert.notDeepEqual(resolvePresentationStrategy(experience, 'phone'), resolvePresentationStrategy(experience, 'desktop'));
    }
  }
});

let db: Firestore, work: string;
before(async () => { assertTestEmulators(process.env); db = new Firestore({ projectId: 'demo-velatra', databaseId: `migration-${randomUUID()}` }); work = await mkdtemp(join(tmpdir(), 'velatra-migration-tests-')); });
after(async () => { await db?.terminate(); if (work) await rm(work, { recursive: true, force: true }); });
test('real Admin transaction: backup first, accountType only, suspended preserved, second apply zero', async () => {
  const untouched = { ownerId: 'owner', isActive: false, plan: 'basic', settings: { payment: { fixture: true } }, nested: [1, 2] };
  await db.collection('clubs').doc('club').set(untouched); await db.collection('users').doc('owner').set(owner.data); await db.collection('users').doc('coach').set(staff('coach').data);
  const originalUsers = (await db.collection('users').get()).docs.map(doc => doc.data());
  const approved = await readInventory(db), backupPath = join(work, 'backup.json');
  const result = await applyInventory(db, approved, backupPath);
  assert.equal(result.migratedStudio, 1); assert.equal(result.healthyLegacyRemaining, 0); assert.equal(result.usersUnchanged, true);
  assert.equal(result.protectedClubFieldsUnchanged, true);
  assert.deepEqual((await db.collection('clubs').doc('club').get()).data(), { ...untouched, accountType: 'studio' });
  assert.deepEqual((await db.collection('users').get()).docs.map(doc => doc.data()), originalUsers);
  assert.deepEqual(JSON.parse(await readFile(backupPath, 'utf8')), [{ clubId: 'club', previousAccountType: { present: false }, nextAccountType: 'studio', reason: '1 internal coaches, 0 internal managers' }]);
  assert.equal((await stat(backupPath)).mode & 0o777, 0o600);
  const second = await applyInventory(db, await readInventory(db), join(work, 'backup-second.json'));
  assert.equal(second.migratedSolo + second.migratedStudio, 0); assert.deepEqual(second.results, []);
});
test('changed audit and existing backup block writes', async () => {
  await assert.rejects(savePrivateJson('./..migration-audit.json', {}), /OUTSIDE_REPOSITORY/);
  // Create a second healthy legacy club, without altering prior fixture state.
  await db.collection('clubs').doc('new').set({ ownerId: 'new-owner' }); await db.collection('users').doc('new-owner').set({ role: 'owner', clubId: 'new' });
  const approved = await readInventory(db);
  await assert.rejects(applyInventory(db, approved, join(work, 'backup.json')), /EEXIST/);
  assert.equal((await db.collection('clubs').doc('new').get()).get('accountType'), undefined);
  await db.collection('users').doc('new-coach').set({ role: 'coach', clubId: 'new' });
  await assert.rejects(applyInventory(db, approved, join(work, 'stale.json')), /INVENTORY_CHANGED/);
  await assert.rejects(applyInventory(db, { ...approved, project: 'wrong' }, join(work, 'wrong.json')), /TARGET_MISMATCH/);
  assert.equal((await db.collection('clubs').doc('new').get()).get('accountType'), undefined);
});
test('staff change after backup is caught by transaction; review club does not block healthy club', async () => {
  const approved = await readInventory(db);
  const originalTransaction = db.runTransaction.bind(db);
  let calls = 0;
  const guarded = new Proxy(db, { get(target, property) {
    if (property === 'runTransaction') return async (...args: any[]) => {
      if (++calls === 2) await db.collection('users').doc('racing-manager').set({ role: 'manager', clubId: 'new' });
      return originalTransaction(args[0], args[1]);
    };
    const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const result = await applyInventory(guarded, approved, join(work, 'racing-backup.json'));
  assert.equal(result.results[0].status, 'SKIPPED_CONCURRENT_CHANGE');
  assert.equal((await db.collection('clubs').doc('new').get()).get('accountType'), undefined);
  await db.collection('clubs').doc('broken').set({ ownerId: 'missing' });
  const healthy = await applyInventory(db, await readInventory(db), join(work, 'isolated-backup.json'));
  assert.equal(healthy.migratedStudio, 1); assert.equal(healthy.after.summary.needsReview, 1);
  assert.equal((await db.collection('clubs').doc('broken').get()).get('accountType'), undefined);
});
