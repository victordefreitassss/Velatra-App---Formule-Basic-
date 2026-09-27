import { createHash } from 'node:crypto';

const ORIGIN = 'https://firebaserules.googleapis.com';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const timestamp = value => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value));

export class StorageRulesReadError extends Error {
  constructor(code) { super(code); this.name = 'StorageRulesReadError'; }
}
const reject = code => { throw new StorageRulesReadError(code); };

export function validateStorageRulesOptions(options, env = process.env) {
  if (!options || typeof options.project !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(options.project) || options.project.startsWith('demo-')) reject('INVALID_PRODUCTION_PROJECT');
  if (typeof options.bucket !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(options.bucket) || options.bucket.includes('..')) reject('INVALID_STORAGE_BUCKET');
  if (options.rules !== 'storage.rules') reject('EXPLICIT_STORAGE_RULES_FILE_REQUIRED');
  if (options.confirmProductionRead !== `${options.project}/${options.bucket}`) reject('EXPLICIT_PRODUCTION_READ_CONFIRMATION_REQUIRED');
  if (env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) reject('PRODUCTION_EMULATOR_ENVIRONMENT_CONFLICT');
  return Object.freeze({ ...options });
}

export function parseStorageRulesArgs(args, env = process.env) {
  const flags = new Map([
    ['--project', 'project'], ['--bucket', 'bucket'], ['--rules', 'rules'],
    ['--confirm-production-read', 'confirmProductionRead'], ['--token-stdin', 'tokenStdin']
  ]);
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const key = flags.get(args[index]);
    if (!key || Object.hasOwn(result, key)) reject('UNKNOWN_OR_DUPLICATE_ARGUMENT');
    if (key === 'tokenStdin') result[key] = true;
    else {
      const value = args[++index];
      if (!value || value.startsWith('--')) reject('MISSING_ARGUMENT_VALUE');
      result[key] = value;
    }
  }
  if (!result.tokenStdin) reject('PRODUCTION_TOKEN_STDIN_REQUIRED');
  return validateStorageRulesOptions(result, env);
}

const releaseName = options => `projects/${options.project}/releases/firebase.storage/${options.bucket}`;
const validRuleset = (name, project) => typeof name === 'string' &&
  name.startsWith(`projects/${project}/rulesets/`) && /^[a-zA-Z0-9_-]{1,128}$/.test(name.slice(`projects/${project}/rulesets/`.length));

/** Rejects every write and broad read before fetch; ruleset must be the observed reference. */
export function assertStorageRulesReadOnlyRequest(url, init, options, observedRuleset) {
  if (init.method !== 'GET' || init.body !== undefined || init.redirect !== 'error') reject('WRITE_OR_REDIRECT_BLOCKED');
  let target;
  try { target = new URL(url); } catch { reject('ENDPOINT_BLOCKED'); }
  if (target.origin !== ORIGIN || target.username || target.password || target.search || target.hash) reject('ENDPOINT_BLOCKED');
  if (target.pathname === `/v1/${releaseName(options)}`) return;
  if (validRuleset(observedRuleset, options.project) && target.pathname === `/v1/${observedRuleset}`) return;
  reject('ENDPOINT_BLOCKED');
}

function utf8Bytes(source) {
  if (typeof source !== 'string') reject('INVALID_RULES_SOURCE');
  const bytes = Buffer.from(source, 'utf8');
  if (bytes.length > MAX_SOURCE_BYTES) reject('RULES_SOURCE_TOO_LARGE');
  // Do not silently replace unpaired UTF-16 surrogates from a malformed response.
  if (bytes.toString('utf8') !== source) reject('INVALID_RULES_SOURCE');
  return bytes;
}

/** Exact UTF-8 bytes: BOM, CRLF, spaces and final newline all participate in SHA-256. */
export function compareStorageRulesSources(expectedSource, deployedSource) {
  const expected = utf8Bytes(expectedSource);
  const deployed = utf8Bytes(deployedSource);
  const expectedHash = createHash('sha256').update(expected).digest('hex');
  const deployedHash = createHash('sha256').update(deployed).digest('hex');
  return { expectedHash, deployedHash, match: expectedHash === deployedHash };
}

async function boundedJson(response) {
  if (!response.body) reject('INVALID_JSON_RESPONSE');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        reject('READ_RESPONSE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof StorageRulesReadError) throw error;
    reject('READ_TRANSPORT_FAILED');
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch { reject('INVALID_JSON_RESPONSE'); }
}

/**
 * No Firebase/Admin SDK and no mutable operation. The final GET detects a release
 * changed during the comparison; the result remains a point-in-time observation.
 * @param {any} options
 * @param {{accessToken?: string, expectedSource?: string, fetchImpl?: typeof fetch, env?: NodeJS.ProcessEnv}} [dependencies]
 */
export async function readStorageRulesDrift(options, { accessToken, expectedSource, fetchImpl = globalThis.fetch, env = process.env } = {}) {
  options = validateStorageRulesOptions(options, env);
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 16_384 || /\s/.test(accessToken)) reject('VALID_ACCESS_TOKEN_REQUIRED');
  utf8Bytes(expectedSource);
  let requests = 0;
  async function get(name, observedRuleset) {
    const url = `${ORIGIN}/v1/${name}`;
    const init = { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` }, redirect: 'error', signal: AbortSignal.timeout(30_000) };
    assertStorageRulesReadOnlyRequest(url, init, options, observedRuleset);
    let response;
    try { response = await fetchImpl(url, init); } catch { reject('READ_TRANSPORT_FAILED'); }
    requests++;
    if (!response.ok) reject(`READ_HTTP_${Number(response.status)}`);
    return boundedJson(response);
  }
  const expectedRelease = releaseName(options);
  const validateRelease = release => {
    if (!object(release) || release.name !== expectedRelease) reject('RELEASE_IDENTITY_MISMATCH');
    if (!validRuleset(release.rulesetName, options.project)) reject('RULESET_REFERENCE_BLOCKED');
    if (!timestamp(release.updateTime)) reject('INVALID_RELEASE_UPDATE_TIME');
    return release;
  };
  const release = validateRelease(await get(expectedRelease));
  const ruleset = await get(release.rulesetName, release.rulesetName);
  if (!object(ruleset) || ruleset.name !== release.rulesetName) reject('RULESET_IDENTITY_MISMATCH');
  if (!object(ruleset.source) || !Array.isArray(ruleset.source.files) || ruleset.source.files.length !== 1) reject('EXACTLY_ONE_RULES_FILE_REQUIRED');
  const file = ruleset.source.files[0];
  if (!object(file) || file.name !== 'storage.rules') reject('STORAGE_RULES_FILE_MISMATCH');
  const comparison = compareStorageRulesSources(expectedSource, file.content);
  if (ruleset.createTime !== undefined && !timestamp(ruleset.createTime)) reject('INVALID_RULESET_CREATE_TIME');
  const latestRelease = validateRelease(await get(expectedRelease));
  if (latestRelease.rulesetName !== release.rulesetName || latestRelease.updateTime !== release.updateTime) reject('RELEASE_CHANGED_DURING_READ');
  return {
    project: options.project,
    bucket: options.bucket,
    release: expectedRelease,
    ruleset: release.rulesetName,
    releaseUpdateTime: release.updateTime,
    ...(ruleset.createTime ? { rulesetCreateTime: ruleset.createTime } : {}),
    sourceFile: 'storage.rules',
    ...comparison,
    evidence: { methods: ['GET'], requests, writes: 0, releaseStable: true, complete: true }
  };
}
