// Deliberately no Firebase SDK: only masked, paginated REST GETs are possible.
export const USER_FIELDS = Object.freeze([
  'id', 'role', 'clubId', 'firebaseUid', 'assignedCoachUid', 'assignedMemberIds', 'createdByUid'
]);

export class AuditReadError extends Error {
  constructor(code) { super(code); this.name = 'AuditReadError'; }
}
const reject = code => { throw new AuditReadError(code); };

export function validateAuditOptions(options, env = process.env) {
  if (!options || !['production', 'emulator'].includes(options.environment) || options.dryRun !== true) reject('EXPLICIT_ENVIRONMENT_AND_DRY_RUN_REQUIRED');
  if (typeof options.project !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(options.project)) reject('INVALID_PROJECT');
  if (typeof options.database !== 'string' || !(options.database === '(default)' || /^[a-z][a-z0-9-]{2,62}$/.test(options.database))) reject('INVALID_DATABASE');
  if (options.environment === 'production') {
    if (options.project.startsWith('demo-') || options.confirmProductionRead !== `${options.project}/${options.database}`) reject('EXPLICIT_PRODUCTION_READ_CONFIRMATION_REQUIRED');
    if (options.emulatorHost || env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) reject('PRODUCTION_EMULATOR_ENVIRONMENT_CONFLICT');
  } else {
    if (!options.project.startsWith('demo-') || !/^127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(options.emulatorHost || '') || Number(options.emulatorHost.split(':')[1]) > 65535) reject('EXPLICIT_DEMO_LOOPBACK_REQUIRED');
    if (env.FIRESTORE_EMULATOR_HOST && env.FIRESTORE_EMULATOR_HOST !== options.emulatorHost) reject('EMULATOR_HOST_ENVIRONMENT_CONFLICT');
    if (options.confirmProductionRead) reject('EMULATOR_PRODUCTION_CONFIRMATION_CONFLICT');
  }
  return Object.freeze({ ...options });
}

export function parseAuditArgs(args) {
  const flags = new Map([
    ['--environment', 'environment'], ['--project', 'project'], ['--database', 'database'],
    ['--confirm-production-read', 'confirmProductionRead'], ['--emulator-host', 'emulatorHost']
  ]);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const key = flags.get(flag) || ({ '--dry-run': 'dryRun', '--token-stdin': 'tokenStdin' })[flag];
    if (!key || Object.hasOwn(result, key)) reject('UNKNOWN_OR_DUPLICATE_ARGUMENT');
    if (flags.has(flag)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) reject('MISSING_ARGUMENT_VALUE');
      result[key] = value;
    } else result[key] = true;
  }
  if (result.environment === 'production' && !result.tokenStdin) reject('PRODUCTION_TOKEN_STDIN_REQUIRED');
  if (result.environment === 'emulator' && result.tokenStdin) reject('EMULATOR_MUST_NOT_RECEIVE_CREDENTIALS');
  return validateAuditOptions(result);
}

function paths(options) {
  const origin = options.environment === 'production' ? 'https://firestore.googleapis.com' : `http://${options.emulatorHost}`;
  const database = `/v1/projects/${options.project}/databases/${options.database}`;
  return { origin, database, users: `${database}/documents/users` };
}

// This guard runs BEFORE fetch. It rejects writes, bodies, other origins,
// other collections, missing projections, arbitrary query operations and redirects.
export function assertReadOnlyRequest(url, init, options) {
  const allowed = paths(options);
  const target = new URL(url);
  if (init.method !== 'GET' || init.body !== undefined || init.redirect !== 'error') reject('WRITE_OR_REDIRECT_BLOCKED');
  if (target.origin !== allowed.origin || target.username || target.password || target.hash) reject('ENDPOINT_BLOCKED');
  if (target.pathname === allowed.database && options.environment === 'production') {
    if (target.search) reject('DATABASE_QUERY_BLOCKED');
    return;
  }
  if (target.pathname !== allowed.users) reject('ENDPOINT_BLOCKED');
  const params = target.searchParams;
  if ([...params.keys()].some(key => !['mask.fieldPaths', 'pageSize', 'pageToken', 'readTime'].includes(key))) reject('QUERY_BLOCKED');
  const masks = params.getAll('mask.fieldPaths');
  if (masks.length !== USER_FIELDS.length || USER_FIELDS.some(field => masks.filter(value => value === field).length !== 1)) reject('EXACT_PROJECTION_REQUIRED');
  for (const key of ['pageSize', 'pageToken', 'readTime']) if (params.getAll(key).length > 1) reject('DUPLICATE_QUERY_PARAMETER');
  if (params.get('pageSize') !== '100') reject('PAGE_SIZE_BLOCKED');
  if (options.environment === 'production' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(params.get('readTime') || '')) reject('SNAPSHOT_TIME_REQUIRED');
}

function valueFromFirestore(value) {
  if (!value || typeof value !== 'object') reject('INVALID_FIELD_RESPONSE');
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) {
    const n = Number(value.integerValue);
    return Number.isSafeInteger(n) ? n : { invalidType: 'unsafeInteger' };
  }
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) {
    if (!value.arrayValue || typeof value.arrayValue !== 'object' || (value.arrayValue.values !== undefined && !Array.isArray(value.arrayValue.values))) reject('INVALID_FIELD_RESPONSE');
    return (value.arrayValue.values || []).map(valueFromFirestore);
  }
  // Preserve invalidity without copying arbitrary nested data into the report.
  return { invalidType: 'unsupportedFirestoreValue' };
}

/** @param {any} options
 * @param {{accessToken?: string, fetchImpl?: typeof fetch, env?: NodeJS.ProcessEnv}} [dependencies]
 */
export async function readUserProfiles(options, { accessToken, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  options = validateAuditOptions(options, env);
  if (options.environment === 'production' && (typeof accessToken !== 'string' || !accessToken.trim() || /\s/.test(accessToken))) reject('VALID_ACCESS_TOKEN_REQUIRED');
  if (options.environment === 'emulator' && accessToken !== undefined) reject('EMULATOR_MUST_NOT_RECEIVE_CREDENTIALS');
  const allowed = paths(options);
  // The emulator's documented synthetic owner identity is not a live credential.
  // Its use is confined above to an explicit demo project on loopback.
  const headers = { Authorization: options.environment === 'production' ? `Bearer ${accessToken}` : 'Bearer owner' };
  let requests = 0;
  async function get(url) {
    const init = { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(30_000) };
    assertReadOnlyRequest(url, init, options);
    let response;
    try { response = await fetchImpl(url, init); } catch { reject('READ_TRANSPORT_FAILED'); }
    requests++;
    if (!response.ok) reject(`READ_HTTP_${Number(response.status)}`);
    let data;
    try { data = await response.json(); } catch { reject('INVALID_JSON_RESPONSE'); }
    return { data, response };
  }
  let readTime = null;
  let edition = 'EMULATOR';
  if (options.environment === 'production') {
    const { data, response } = await get(allowed.origin + allowed.database);
    if (!data || data.name !== `projects/${options.project}/databases/${options.database}` || data.type !== 'FIRESTORE_NATIVE') reject('DATABASE_IDENTITY_MISMATCH');
    edition = data.databaseEdition;
    if (!['STANDARD', 'ENTERPRISE'].includes(edition)) reject('UNSUPPORTED_DATABASE_EDITION');
    const date = Date.parse(response.headers.get('date') || '');
    if (!Number.isFinite(date)) reject('SERVER_SNAPSHOT_TIME_UNAVAILABLE');
    readTime = new Date(date).toISOString();
  }
  const users = [];
  const seenDocuments = new Set();
  const seenTokens = new Set();
  let pageToken;
  let pages = 0;
  do {
    if (++pages > 1000) reject('INCOMPLETE_AUDIT_PAGE_LIMIT');
    const url = new URL(allowed.origin + allowed.users);
    url.searchParams.set('pageSize', '100');
    USER_FIELDS.forEach(field => url.searchParams.append('mask.fieldPaths', field));
    if (readTime) url.searchParams.set('readTime', readTime);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const { data } = await get(url.href);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !['documents', 'nextPageToken'].includes(key)) || (data.documents !== undefined && !Array.isArray(data.documents))) reject('INVALID_LIST_RESPONSE');
    for (const document of data.documents || []) {
      const prefix = `projects/${options.project}/databases/${options.database}/documents/users/`;
      if (!document || typeof document.name !== 'string' || !document.name.startsWith(prefix)) reject('DOCUMENT_SCOPE_MISMATCH');
      if (document.fields !== undefined && (!document.fields || typeof document.fields !== 'object' || Array.isArray(document.fields))) reject('INVALID_DOCUMENT_FIELDS');
      const documentId = document.name.slice(prefix.length);
      if (!documentId || documentId.includes('/') || seenDocuments.has(documentId)) reject('INCOMPLETE_AUDIT_DUPLICATE_DOCUMENT');
      seenDocuments.add(documentId);
      const user = { documentId };
      for (const field of USER_FIELDS) if (Object.hasOwn(document.fields || {}, field)) user[field] = valueFromFirestore(document.fields[field]);
      users.push(user);
    }
    pageToken = data.nextPageToken;
    if (pageToken !== undefined && typeof pageToken !== 'string') reject('INVALID_PAGE_TOKEN');
    if (pageToken && seenTokens.has(pageToken)) reject('INCOMPLETE_AUDIT_REPEATED_PAGE');
    if (pageToken) seenTokens.add(pageToken);
  } while (pageToken);
  const profileRoles = { member: 0, coach: 0, owner: 0, superadmin: 0, unknown: 0 };
  for (const user of users) profileRoles[['member', 'coach', 'owner', 'superadmin'].includes(user.role) ? user.role : 'unknown']++;
  return { users, evidence: { project: options.project, database: options.database, environment: options.environment, edition, readTime, snapshotConsistent: Boolean(readTime), pages, requests, profilesRead: users.length, profileRoles, methods: ['GET'], writes: 0, complete: true, fields: USER_FIELDS } };
}
