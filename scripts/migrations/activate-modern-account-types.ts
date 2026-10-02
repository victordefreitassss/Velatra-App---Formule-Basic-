// Manual server-side migration. Never imported by the application or executed by CI.
import { Firestore } from 'firebase-admin/firestore';
import { createRequire } from 'node:module';
import { open, readFile } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CLUB_FIELDS, USER_FIELDS, classifyAccounts, fingerprint, projectFields, type RecordRow } from './account-type-policy.ts';
import { assertTestEmulators } from '../assert-test-emulators.mjs';

export const PROJECT = 'velatra-75daa';
export function validateTarget(project: string, env = process.env) {
  if (project !== PROJECT) throw new Error('PROJECT_MISMATCH');
  if (env.CI || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('PRODUCTION_ENVIRONMENT_CONFLICT');
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']) if (env[key] && env[key] !== project) throw new Error('PROJECT_ENVIRONMENT_MISMATCH');
}
export function parseArgs(args: string[]) {
  const options = { apply: false, project: PROJECT, audit: '', backup: '', cliAuthModule: '' };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error('DUPLICATE_ARGUMENT');
    seen.add(flag);
    if (flag === '--apply') options.apply = true;
    else if (flag === '--dry-run') { /* default */ }
    else {
      const key = ({ '--project': 'project', '--audit': 'audit', '--backup': 'backup', '--cli-auth-module': 'cliAuthModule' } as const)[flag];
      if (!key || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('INVALID_ARGUMENT');
      options[key] = args[++i];
    }
  }
  if (seen.has('--apply') && seen.has('--dry-run')) throw new Error('CONFLICTING_MODES');
  if (options.apply && (!options.audit || !options.backup)) throw new Error('APPROVED_AUDIT_AND_BACKUP_REQUIRED');
  return options;
}
export function createProductionClient(project: string, cliAuthModule = '') {
  validateTarget(project);
  const settings: ConstructorParameters<typeof Firestore>[0] = { projectId: project, databaseId: '(default)', preferRest: true };
  if (cliAuthModule) {
    const require = createRequire(import.meta.url);
    const modulePath = resolve(cliAuthModule);
    const pkg = require(resolve(dirname(modulePath), '../package.json'));
    if (pkg.name !== 'firebase-tools' || pkg.version !== '15.31.0' || !modulePath.endsWith('/lib/auth.js')) throw new Error('PINNED_FIREBASE_CLI_REQUIRED');
    const auth = require(modulePath), api = require(resolve(dirname(modulePath), 'api.js'));
    const account = auth.getProjectDefaultAccount(process.cwd());
    if (!account?.tokens?.refresh_token) throw new Error('CLI_LOGIN_REQUIRED');
    // Authorized user credentials stay in memory. Google Auth handles token refresh.
    settings.credentials = { type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token } as typeof settings.credentials;
  }
  return new Firestore(settings);
}
export async function readInventory(db: Firestore) {
  const [clubSnapshot, userSnapshot] = await db.runTransaction(async tx => Promise.all([
    tx.get(db.collection('clubs').select(...CLUB_FIELDS)), tx.get(db.collection('users').select(...USER_FIELDS)),
  ]), { readOnly: true });
  const convert = (snapshot: typeof clubSnapshot): RecordRow[] => snapshot.docs.map(doc => ({ key: doc.id, data: doc.data() }));
  const clubs = convert(clubSnapshot), users = convert(userSnapshot);
  const policy = classifyAccounts(clubs, users);
  return { schema: 1, project: (db as Firestore & { projectId: string }).projectId, database: db.databaseId, complete: true,
    fingerprint: fingerprint({ clubs, users }), usersFingerprint: fingerprint(users),
    userVersionsFingerprint: fingerprint(userSnapshot.docs.map(doc => ({ key: doc.id, updateTime: doc.updateTime.toMillis() }))),
    protectedClubFieldsFingerprint: fingerprint(clubs.map(club => ({ key: club.key, data: projectFields(club.data, CLUB_FIELDS.filter(field => field !== 'accountType')) }))), ...policy };
}
export type Inventory = Awaited<ReturnType<typeof readInventory>>;
function privateExternalPath(file: string) {
  const path = resolve(file), repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const offset = relative(repo, path);
  if (offset !== '..' && !offset.startsWith('..' + sep)) throw new Error('PRODUCTION_REPORT_MUST_BE_OUTSIDE_REPOSITORY');
  return path;
}
export async function savePrivateJson(file: string, value: unknown) {
  const handle = await open(privateExternalPath(file), 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
}
export async function applyInventory(db: Firestore, approved: Inventory, backupPath: string) {
  const project = (db as Firestore & { projectId: string }).projectId;
  if (project === 'demo-velatra') assertTestEmulators(process.env);
  else { validateTarget(project); if (db.databaseId !== '(default)') throw new Error('PRODUCTION_DATABASE_MISMATCH'); }
  if (approved.schema !== 1 || approved.complete !== true || approved.database !== db.databaseId || approved.project !== (db as Firestore & { projectId: string }).projectId) throw new Error('APPROVED_INVENTORY_TARGET_MISMATCH');
  const current = await readInventory(db);
  if (current.fingerprint !== approved.fingerprint || fingerprint(current.rows) !== fingerprint(approved.rows)) throw new Error('INVENTORY_CHANGED_SINCE_DRY_RUN');
  const changes = current.rows.filter(row => row.change);
  const backup = changes.map(row => ({ clubId: row.clubId, previousAccountType: row.previousAccountType, nextAccountType: row.nextAccountType, reason: row.reason }));
  // Exclusive creation + fsync happens before any write, including a zero-change run.
  await savePrivateJson(backupPath, backup);
  const results: { clubId: string; status: string }[] = [];
  for (const row of changes) {
    const status = await db.runTransaction(async tx => {
      const ref = db.collection('clubs').doc(row.clubId);
      const [club, users] = await Promise.all([tx.get(ref), tx.get(db.collection('users').select(...USER_FIELDS))]);
      const userRows = users.docs.map(doc => ({ key: doc.id, data: doc.data() }));
      if (!club.exists || fingerprint(userRows) !== current.usersFingerprint) return 'SKIPPED_CONCURRENT_CHANGE';
      const projected = projectFields(club.data()!, CLUB_FIELDS);
      const fresh = classifyAccounts([{ key: club.id, data: projected }], userRows).rows[0];
      if (!fresh.change || fingerprint(fresh) !== fingerprint(row)) return 'SKIPPED_CONCURRENT_CHANGE';
      tx.update(ref, { accountType: row.nextAccountType });
      return 'MIGRATED';
    });
    results.push({ clubId: row.clubId, status });
  }
  // New, independent read-only transaction; no reuse of the old snapshots.
  const after = await readInventory(db);
  return { migratedSolo: results.filter(result => result.status === 'MIGRATED' && changes.find(row => row.clubId === result.clubId)?.nextAccountType === 'solo').length,
    migratedStudio: results.filter(result => result.status === 'MIGRATED' && changes.find(row => row.clubId === result.clubId)?.nextAccountType === 'studio').length,
    results, after, healthyLegacyRemaining: after.summary.healthyLegacy,
    usersUnchanged: after.usersFingerprint === current.usersFingerprint && after.userVersionsFingerprint === current.userVersionsFingerprint,
    protectedClubFieldsUnchanged: after.protectedClubFieldsFingerprint === current.protectedClubFieldsFingerprint };
}
export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  validateTarget(options.project);
  console.log(`Firebase project: ${options.project}; database: (default); mode: ${options.apply ? 'APPLY' : 'DRY RUN'}`);
  const db = createProductionClient(options.project, options.cliAuthModule);
  try {
    if (!options.apply) {
      const audit = await readInventory(db);
      if (options.audit) await savePrivateJson(options.audit, audit);
      console.log(JSON.stringify(audit, null, 2));
      return audit;
    }
    const approved = JSON.parse(await readFile(privateExternalPath(options.audit), 'utf8')) as Inventory;
    const result = await applyInventory(db, approved, options.backup);
    console.log(JSON.stringify(result, null, 2));
    if (result.healthyLegacyRemaining || !result.usersUnchanged || !result.protectedClubFieldsUnchanged || result.results.some(row => row.status !== 'MIGRATED')) process.exitCode = 2;
    return result;
  } finally { await db.terminate(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('MIGRATION_FAILED: inspect credentials, target, approved audit and backup; no secrets printed. Re-run dry-run before retrying.'); process.exitCode = 1; });
}
