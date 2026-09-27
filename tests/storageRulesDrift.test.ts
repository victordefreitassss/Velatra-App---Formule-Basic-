import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  StorageRulesReadError, assertStorageRulesReadOnlyRequest, compareStorageRulesSources,
  parseStorageRulesArgs, readStorageRulesDrift, validateStorageRulesOptions,
} from '../scripts/audit/storage-rules-reader.mjs';

const project = 'storage-audit-fixture';
const bucket = `${project}.firebasestorage.app`;
const options = { project, bucket, rules: 'storage.rules', confirmProductionRead: `${project}/${bucket}` };
const releaseName = `projects/${project}/releases/firebase.storage/${bucket}`;
const rulesetName = `projects/${project}/rulesets/11111111-2222-3333-4444-555555555555`;
const release = { name: releaseName, rulesetName, updateTime: '2026-09-28T14:20:30.123456Z' };
const source = "rules_version = '2';\nservice firebase.storage { match /b/{bucket}/o { allow read, write: if false; } }\n";
const fakeToken = 'synthetic-storage-token-not-a-credential';
const ruleset = (content = source) => ({ name: rulesetName, createTime: '2026-09-28T14:00:00Z', source: { files: [{ name: 'storage.rules', content }] } });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const code = (message: string) => (error: unknown) => error instanceof StorageRulesReadError && error.message === message;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const getInit = { method: 'GET', redirect: 'error' as const };
const releaseUrl = `https://firebaserules.googleapis.com/v1/${releaseName}`;
const rulesetUrl = `https://firebaserules.googleapis.com/v1/${rulesetName}`;

function mockedRead(responses: Response[], overrides: Record<string, unknown> = {}) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init: init! });
    assert.ok(responses.length, 'no additional endpoint may be read');
    return responses.shift()!;
  };
  return { requests, result: readStorageRulesDrift(options, { accessToken: fakeToken, expectedSource: source, fetchImpl, env: {}, ...overrides }) };
}

test('storage drift requires an explicit safe project, bucket, file and exact read confirmation', () => {
  assert.ok(Object.isFrozen(validateStorageRulesOptions(options, {})));
  for (const value of ['', 'demo-fixture', '../project', 'UPPERCASE', 'https://example.test']) {
    assert.throws(() => validateStorageRulesOptions({ ...options, project: value }, {}), code('INVALID_PRODUCTION_PROJECT'));
  }
  for (const value of ['', 'bucket/path', 'BUCKET', '..bucket', 'bucket?token=secret', 'a'.repeat(223)]) {
    assert.throws(() => validateStorageRulesOptions({ ...options, bucket: value }, {}), code('INVALID_STORAGE_BUCKET'));
  }
  for (const rules of [undefined, '', '.env', '/private/storage.rules', 'other.rules']) {
    assert.throws(() => validateStorageRulesOptions({ ...options, rules }, {}), code('EXPLICIT_STORAGE_RULES_FILE_REQUIRED'));
  }
  for (const confirmProductionRead of [undefined, '', `${project}/other-bucket`]) {
    assert.throws(() => validateStorageRulesOptions({ ...options, confirmProductionRead }, {}), code('EXPLICIT_PRODUCTION_READ_CONFIRMATION_REQUIRED'));
  }
  for (const variable of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
    assert.throws(() => validateStorageRulesOptions(options, { [variable]: '127.0.0.1:8080' }), code('PRODUCTION_EMULATOR_ENVIRONMENT_CONFLICT'));
  }
});

test('storage drift CLI accepts only named arguments and never accepts credentials in argv', () => {
  const args = ['--project', project, '--bucket', bucket, '--rules', 'storage.rules', '--confirm-production-read', `${project}/${bucket}`, '--token-stdin'];
  assert.deepEqual(parseStorageRulesArgs(args, {}), { ...options, tokenStdin: true });
  for (const extra of [['--token', fakeToken], ['--access-token', fakeToken], ['--token-stdin'], ['--project', project], ['constructor'], ['__proto__']]) {
    assert.throws(() => parseStorageRulesArgs([...args, ...extra], {}), code('UNKNOWN_OR_DUPLICATE_ARGUMENT'));
  }
  assert.throws(() => parseStorageRulesArgs(args.slice(0, -1), {}), code('PRODUCTION_TOKEN_STDIN_REQUIRED'));
  assert.throws(() => parseStorageRulesArgs(['--rules'], {}), code('MISSING_ARGUMENT_VALUE'));
});

test('storage read guard blocks every write, redirect, expanded URL and unobserved ruleset', () => {
  assert.doesNotThrow(() => assertStorageRulesReadOnlyRequest(releaseUrl, getInit, options));
  assert.doesNotThrow(() => assertStorageRulesReadOnlyRequest(rulesetUrl, getInit, options, rulesetName));
  assert.throws(() => assertStorageRulesReadOnlyRequest(rulesetUrl, getInit, options), code('ENDPOINT_BLOCKED'));
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'HEAD']) {
    assert.throws(() => assertStorageRulesReadOnlyRequest(releaseUrl, { ...getInit, method }, options), code('WRITE_OR_REDIRECT_BLOCKED'));
  }
  for (const init of [{ ...getInit, body: '{}' }, { ...getInit, body: null }, { ...getInit, redirect: 'follow' }, { method: 'GET' }]) {
    assert.throws(() => assertStorageRulesReadOnlyRequest(releaseUrl, init, options), code('WRITE_OR_REDIRECT_BLOCKED'));
  }
  for (const url of [
    releaseUrl.replace('https:', 'http:'), releaseUrl.replace('firebaserules.googleapis.com', 'example.test'),
    releaseUrl.replace('https://', 'https://secret@'), `${releaseUrl}?anything=1`, `${releaseUrl}#secret`,
    releaseUrl.replace(project, 'another-project'), `${releaseUrl}/extra`, `${releaseUrl}:test`,
    rulesetUrl.replace('11111111', '66666666'), 'not a URL',
  ]) assert.throws(() => assertStorageRulesReadOnlyRequest(url, getInit, options, rulesetName), code('ENDPOINT_BLOCKED'));
});

test('source comparison hashes exact UTF-8 bytes without trimming newlines, CRLF or BOM', () => {
  assert.deepEqual(compareStorageRulesSources(source, source), { expectedHash: hash(source), deployedHash: hash(source), match: true });
  for (const changed of [source.trimEnd(), source + '\n', source.replaceAll('\n', '\r\n'), '\uFEFF' + source, source.replace('false', 'true')]) {
    const result = compareStorageRulesSources(source, changed);
    assert.equal(result.match, false);
    assert.equal(result.deployedHash, hash(changed));
  }
  assert.equal(compareStorageRulesSources('é\n', 'é\n').expectedHash, hash(Buffer.from('é\n', 'utf8')));
  for (const invalid of [undefined, null, {}, '\uD800']) {
    assert.throws(() => compareStorageRulesSources(source, invalid), code('INVALID_RULES_SOURCE'));
  }
  assert.throws(() => compareStorageRulesSources(source, 'x'.repeat(1024 * 1024 + 1)), code('RULES_SOURCE_TOO_LARGE'));
});

test('drift reader checks one same-project ruleset and rechecks the release before declaring match', async () => {
  const { result, requests } = mockedRead([response(release), response(ruleset()), response(release)]);
  const report = await result;
  assert.equal(report.match, true);
  assert.equal(report.expectedHash, hash(source));
  assert.equal(report.deployedHash, hash(source));
  assert.equal(report.release, releaseName);
  assert.equal(report.ruleset, rulesetName);
  assert.equal(report.releaseUpdateTime, release.updateTime);
  assert.deepEqual(report.evidence, { methods: ['GET'], requests: 3, writes: 0, releaseStable: true, complete: true });
  assert.deepEqual(requests.map(request => request.url), [releaseUrl, rulesetUrl, releaseUrl]);
  for (const { init } of requests) {
    assert.equal(init.method, 'GET'); assert.equal(init.body, undefined); assert.equal(init.redirect, 'error');
    assert.deepEqual(init.headers, { Authorization: `Bearer ${fakeToken}` });
  }
  assert.equal(JSON.stringify(report).includes(fakeToken), false);
  assert.equal(JSON.stringify(report).includes(source), false);
  assert.equal(Object.hasOwn(report, 'source'), false);
});

test('drift reader reports changed content without exposing deployed rule text', async () => {
  const privateSource = source + '// Do not echo this server-side content\n';
  const { result } = mockedRead([response(release), response(ruleset(privateSource)), response(release)]);
  const report = await result;
  assert.equal(report.match, false);
  assert.equal(report.deployedHash, hash(privateSource));
  assert.equal(JSON.stringify(report).includes('Do not echo'), false);
});

test('drift reader rejects release races and invalid release metadata without a misleading match', async () => {
  for (const changed of [
    { ...release, rulesetName: rulesetName.replace('11111111', '66666666') },
    { ...release, updateTime: '2026-09-28T14:25:00Z' },
  ]) await assert.rejects(mockedRead([response(release), response(ruleset()), response(changed)]).result, code('RELEASE_CHANGED_DURING_READ'));
  for (const malformed of [null, [], {}, { ...release, name: 'projects/other/releases/firebase.storage/other' }]) {
    await assert.rejects(mockedRead([response(malformed)]).result, code('RELEASE_IDENTITY_MISMATCH'));
  }
  for (const updateTime of [undefined, 'private-data', 123, '2026-99-99T12:00:00Z']) {
    await assert.rejects(mockedRead([response({ ...release, updateTime })]).result, code('INVALID_RELEASE_UPDATE_TIME'));
  }
});

test('drift reader rejects malicious cross-project and redirected ruleset references before fetching them', async () => {
  for (const malicious of [
    'projects/another-project/rulesets/123', 'https://example.test/secret', `${rulesetName}/extra`,
    `projects/${project}/rulesets/../releases/other`, `${rulesetName}?secret=1`, `${rulesetName}%2fextra`,
  ]) {
    const { result, requests } = mockedRead([response({ ...release, rulesetName: malicious })]);
    await assert.rejects(result, code('RULESET_REFERENCE_BLOCKED'));
    assert.equal(requests.length, 1);
  }
  await assert.rejects(mockedRead([new Response(null, { status: 302, headers: { location: 'https://example.test' } })]).result, code('READ_HTTP_302'));
});

test('drift reader fails closed on multi-file, wrong filename, empty and mismatched rulesets', async () => {
  for (const invalid of [null, [], {}, { ...ruleset(), name: rulesetName.replace(project, 'other-project') }]) {
    await assert.rejects(mockedRead([response(release), response(invalid)]).result, code('RULESET_IDENTITY_MISMATCH'));
  }
  for (const invalidSource of [undefined, {}, { files: [] }, { files: {} }, { files: [...ruleset().source.files, ...ruleset().source.files] }]) {
    await assert.rejects(mockedRead([response(release), response({ ...ruleset(), source: invalidSource })]).result, code('EXACTLY_ONE_RULES_FILE_REQUIRED'));
  }
  for (const invalidFile of [null, {}, { name: 'firestore.rules', content: source }, { name: '../storage.rules', content: source }]) {
    await assert.rejects(mockedRead([response(release), response({ ...ruleset(), source: { files: [invalidFile] } })]).result, code('STORAGE_RULES_FILE_MISMATCH'));
  }
  await assert.rejects(mockedRead([
    response(release), response({ ...ruleset(), source: { files: [{ name: 'storage.rules' }] } }),
  ]).result, code('INVALID_RULES_SOURCE'));
  await assert.rejects(mockedRead([response(release), response({ ...ruleset(), createTime: 'private-value' })]).result, code('INVALID_RULESET_CREATE_TIME'));
});

test('drift reader redacts unauthorized responses, transport errors and malformed JSON', async () => {
  for (const status of [401, 403, 404, 500]) {
    await assert.rejects(mockedRead([response({ error: { message: fakeToken } }, status)]).result, code(`READ_HTTP_${status}`));
  }
  await assert.rejects(mockedRead([response(release), response({ secret: fakeToken }, 403)]).result, code('READ_HTTP_403'));
  await assert.rejects(readStorageRulesDrift(options, { accessToken: fakeToken, expectedSource: source, env: {}, fetchImpl: async () => { throw new Error(fakeToken); } }), code('READ_TRANSPORT_FAILED'));
  await assert.rejects(mockedRead([new Response(fakeToken)]).result, code('INVALID_JSON_RESPONSE'));
  await assert.rejects(mockedRead([new Response(Buffer.from([0xff, 0xfe, 0xff]))]).result, code('INVALID_JSON_RESPONSE'));
  await assert.rejects(mockedRead([new Response(' '.repeat(2 * 1024 * 1024 + 1))]).result, code('READ_RESPONSE_TOO_LARGE'));
});

test('drift reader validates tokens and local source before sending a request', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; throw new Error('never called'); };
  for (const accessToken of [undefined, '', 'two tokens', 'line\nbreak', 'x'.repeat(16_385)]) {
    await assert.rejects(readStorageRulesDrift(options, { accessToken, expectedSource: source, fetchImpl, env: {} }), code('VALID_ACCESS_TOKEN_REQUIRED'));
  }
  await assert.rejects(readStorageRulesDrift(options, { accessToken: fakeToken, fetchImpl, env: {} }), code('INVALID_RULES_SOURCE'));
  assert.equal(calls, 0);
});

function runCli(local: string | Buffer, bodies: unknown[], env: NodeJS.ProcessEnv = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'velatra-storage-drift-'));
  try {
    writeFileSync(join(directory, 'storage.rules'), local);
    const preload = 'data:text/javascript,' + encodeURIComponent(
      `const bodies = ${JSON.stringify(bodies)}; globalThis.fetch = async () => { if (!bodies.length) throw new Error('NO_MORE_NETWORK'); return new Response(JSON.stringify(bodies.shift())); };`
    );
    const cli = new URL('../scripts/audit/storage-rules-drift.mjs', import.meta.url);
    return spawnSync(process.execPath, [
      '--import', preload, cli.pathname, '--project', project, '--bucket', bucket, '--rules', 'storage.rules',
      '--confirm-production-read', `${project}/${bucket}`, '--token-stdin',
    ], { cwd: directory, env, input: fakeToken, encoding: 'utf8', timeout: 10_000 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('manual CLI exits 0 for an exact match and 2 for drift, including a final newline difference', () => {
  const matched = runCli(source, [release, ruleset(), release]);
  assert.equal(matched.status, 0);
  assert.equal(matched.stderr, '');
  assert.equal(JSON.parse(matched.stdout).match, true);
  const drift = runCli(source.trimEnd(), [release, ruleset(), release]);
  assert.equal(drift.status, 2);
  assert.equal(JSON.parse(drift.stdout).match, false);
  assert.equal(drift.stdout.includes(fakeToken), false);
  assert.equal(drift.stdout.includes('allow read'), false);
});

test('manual CLI preserves local BOM and exits 1 on invalid UTF-8 without revealing contents', () => {
  const withBom = '\uFEFF' + source;
  const matched = runCli(Buffer.from(withBom, 'utf8'), [release, ruleset(withBom), release]);
  assert.equal(matched.status, 0);
  assert.equal(JSON.parse(matched.stdout).expectedHash, hash(Buffer.from(withBom, 'utf8')));
  const invalid = runCli(Buffer.from([0xff, 0xfe, 0xff]), []);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.deepEqual(JSON.parse(invalid.stderr), { complete: false, writes: 0, error: 'LOCAL_STORAGE_RULES_UNREADABLE_OR_INVALID' });
});

test('manual CLI refuses CI before reading stdin or production, with a fixed sanitized error', () => {
  const result = runCli(source, [], { CI: 'true' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { complete: false, writes: 0, error: 'LIVE_AUDIT_FORBIDDEN_IN_CI' });
  assert.equal(result.stderr.includes(fakeToken), false);
  assert.equal(result.stderr.includes('NO_MORE_NETWORK'), false);
});
