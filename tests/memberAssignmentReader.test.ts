import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  AuditReadError, USER_FIELDS, assertReadOnlyRequest, parseAuditArgs,
  readUserProfiles, validateAuditOptions,
} from '../scripts/audit/member-assignment-reader.mjs';

const project = 'audit-fixture-project';
const database = '(default)';
const production = { environment: 'production', project, database, dryRun: true, confirmProductionRead: `${project}/${database}` };
const emulator = { environment: 'emulator', project: 'demo-audit-fixture', database, dryRun: true, emulatorHost: '127.0.0.1:8080' };
const prefix = `projects/${project}/databases/${database}`;
const fixedDate = 'Mon, 28 Sep 2026 12:34:56 GMT';
const fakeToken = 'synthetic-test-token-not-a-credential';
const errorCode = (code: string) => (error: unknown) => error instanceof AuditReadError && error.message === code;
const response = (body: unknown, { status = 200, date = fixedDate } = {}) => new Response(JSON.stringify(body), {
  status, headers: date ? { date, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
});
const metadata = (body: unknown = { name: prefix, type: 'FIRESTORE_NATIVE', databaseEdition: 'STANDARD' }, date = fixedDate) => response(body, { date });
const field = (value: string) => ({ stringValue: value });
const document = (id: string, fields: Record<string, unknown> = {}) => ({ name: `${prefix}/documents/users/${id}`, fields });

function mockedRead(pages: Response[], options = production) {
  const requests: Array<{ url: URL; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ url: new URL(String(input)), init: init! });
    assert.ok(pages.length, 'reader must not send unexpected requests');
    return pages.shift()!;
  };
  return { requests, result: readUserProfiles(options, { accessToken: fakeToken, fetchImpl, env: {} }) };
}

function usersUrl() {
  const url = new URL(`https://firestore.googleapis.com/v1/${prefix}/documents/users`);
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('readTime', '2026-09-28T12:34:56.000Z');
  USER_FIELDS.forEach(name => url.searchParams.append('mask.fieldPaths', name));
  return url;
}
const getInit = { method: 'GET', redirect: 'error' as const };

test('audit requires explicit production target, dry-run and exact read confirmation', () => {
  const valid = validateAuditOptions(production, {});
  assert.equal(Object.isFrozen(valid), true);
  for (const override of [{ environment: undefined }, { dryRun: false }, { dryRun: undefined }]) {
    assert.throws(() => validateAuditOptions({ ...production, ...override }, {}), errorCode('EXPLICIT_ENVIRONMENT_AND_DRY_RUN_REQUIRED'));
  }
  for (const override of [{ confirmProductionRead: undefined }, { confirmProductionRead: `${project}/wrong` }, { project: 'demo-fixture' }]) {
    assert.throws(() => validateAuditOptions({ ...production, ...override }, {}), errorCode('EXPLICIT_PRODUCTION_READ_CONFIRMATION_REQUIRED'));
  }
});

test('audit validates project/database path segments and prevents emulator/production mixing', () => {
  for (const invalid of ['', '../users', 'UPPER', 'https://example.test', 'a'.repeat(64)]) {
    assert.throws(() => validateAuditOptions({ ...production, project: invalid }, {}), errorCode('INVALID_PROJECT'));
    assert.throws(() => validateAuditOptions({ ...production, database: invalid }, {}), errorCode('INVALID_DATABASE'));
  }
  for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
    assert.throws(() => validateAuditOptions(production, { [key]: '127.0.0.1:8080' }), errorCode('PRODUCTION_EMULATOR_ENVIRONMENT_CONFLICT'));
  }
  assert.throws(() => validateAuditOptions({ ...production, emulatorHost: '127.0.0.1:8080' }, {}), errorCode('PRODUCTION_EMULATOR_ENVIRONMENT_CONFLICT'));
  assert.equal(validateAuditOptions(emulator, {}).environment, 'emulator');
  assert.throws(() => validateAuditOptions(emulator, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8181' }), errorCode('EMULATOR_HOST_ENVIRONMENT_CONFLICT'));
  for (const override of [{ project }, { emulatorHost: 'localhost:8080' }, { emulatorHost: '192.168.1.1:8080' }, { emulatorHost: '127.0.0.1:65536' }]) {
    assert.throws(() => validateAuditOptions({ ...emulator, ...override }, {}), errorCode('EXPLICIT_DEMO_LOOPBACK_REQUIRED'));
  }
  assert.throws(() => validateAuditOptions({ ...emulator, confirmProductionRead: 'anything' }, {}), errorCode('EMULATOR_PRODUCTION_CONFIRMATION_CONFLICT'));
});

test('audit CLI argument parser refuses secret arguments, duplicates and implicit values', () => {
  for (const args of [['--token', fakeToken], ['--access-token', fakeToken], ['--credentials', '/private/not-a-real-file'], ['--dry-run', '--dry-run'], ['--project'], ['--database', '--dry-run']]) {
    assert.throws(() => parseAuditArgs(args), (error: unknown) => error instanceof AuditReadError && !error.message.includes(fakeToken));
  }
  assert.throws(() => parseAuditArgs(['--environment', 'production']), errorCode('PRODUCTION_TOKEN_STDIN_REQUIRED'));
  assert.throws(() => parseAuditArgs(['--environment', 'emulator', '--token-stdin']), errorCode('EMULATOR_MUST_NOT_RECEIVE_CREDENTIALS'));
  const parsed = parseAuditArgs(['--environment', 'emulator', '--project', emulator.project, '--database', database, '--emulator-host', emulator.emulatorHost, '--dry-run']);
  assert.deepEqual(parsed, emulator);
});

test('production argument parser accepts the fully explicit read-only invocation in a clean environment', () => {
  const reader = new URL('../scripts/audit/member-assignment-reader.mjs', import.meta.url);
  const source = `import { parseAuditArgs } from ${JSON.stringify(reader.href)};
    globalThis.fetch = () => { throw new Error('NETWORK_MUST_NOT_BE_CALLED'); };
    console.log(JSON.stringify(parseAuditArgs(process.argv.slice(1))));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source, '--', '--environment', 'production', '--project', project, '--database', database,
    '--dry-run', '--confirm-production-read', `${project}/${database}`, '--token-stdin'], {
    env: {}, encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { ...production, tokenStdin: true });
});

test('read-only guard permits only projected GETs and database identity GETs', () => {
  assert.doesNotThrow(() => assertReadOnlyRequest(usersUrl().href, getInit, production));
  assert.doesNotThrow(() => assertReadOnlyRequest(`https://firestore.googleapis.com/v1/${prefix}`, getInit, production));
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT', 'HEAD']) {
    assert.throws(() => assertReadOnlyRequest(usersUrl().href, { ...getInit, method }, production), errorCode('WRITE_OR_REDIRECT_BLOCKED'));
  }
  for (const init of [{ ...getInit, body: '{}' }, { ...getInit, body: null }, { ...getInit, redirect: 'follow' }, { method: 'GET' }]) {
    assert.throws(() => assertReadOnlyRequest(usersUrl().href, init, production), errorCode('WRITE_OR_REDIRECT_BLOCKED'));
  }
});

test('read-only guard rejects other origins, collections, documents and credentials in URLs', () => {
  for (const change of [
    (url: URL) => { url.hostname = 'example.test'; },
    (url: URL) => { url.protocol = 'http:'; },
    (url: URL) => { url.username = 'secret'; },
    (url: URL) => { url.hash = 'fragment'; },
    (url: URL) => { url.pathname = url.pathname.replace('/users', '/payments'); },
    (url: URL) => { url.pathname += '/member-1'; },
    (url: URL) => { url.pathname = url.pathname.replace(project, 'another-project'); },
    (url: URL) => { url.pathname = url.pathname.replace('/documents/users', '/documents:runQuery'); },
  ]) {
    const url = usersUrl(); change(url);
    assert.throws(() => assertReadOnlyRequest(url.href, getInit, production), errorCode('ENDPOINT_BLOCKED'));
  }
});

test('read-only guard rejects expanded masks, arbitrary queries and unstable snapshot times', () => {
  for (const [mutate, expected] of [
    [(url: URL) => url.searchParams.append('mask.fieldPaths', 'email'), 'EXACT_PROJECTION_REQUIRED'],
    [(url: URL) => url.searchParams.delete('mask.fieldPaths'), 'EXACT_PROJECTION_REQUIRED'],
    [(url: URL) => url.searchParams.append('orderBy', '__name__'), 'QUERY_BLOCKED'],
    [(url: URL) => url.searchParams.set('pageSize', '1000'), 'PAGE_SIZE_BLOCKED'],
    [(url: URL) => { url.searchParams.append('pageToken', 'one'); url.searchParams.append('pageToken', 'two'); }, 'DUPLICATE_QUERY_PARAMETER'],
    [(url: URL) => url.searchParams.delete('readTime'), 'SNAPSHOT_TIME_REQUIRED'],
    [(url: URL) => url.searchParams.set('readTime', 'today'), 'SNAPSHOT_TIME_REQUIRED'],
  ] as Array<[(url: URL) => unknown, string]>) {
    const url = usersUrl(); mutate(url);
    assert.throws(() => assertReadOnlyRequest(url.href, getInit, production), errorCode(expected));
  }
  assert.throws(() => assertReadOnlyRequest(`https://firestore.googleapis.com/v1/${prefix}?anything=1`, getInit, production), errorCode('DATABASE_QUERY_BLOCKED'));
});

test('reader completes every page with exact projections and one server-derived snapshot time', async () => {
  const { result, requests } = mockedRead([
    metadata(),
    response({ documents: [document('member-1', { id: { integerValue: '101' }, role: field('member'), email: field('private-not-collected@example.test'), health: { mapValue: { fields: {} } } })], nextPageToken: 'second' }),
    response({ documents: [document('coach-1', { id: { integerValue: '102' }, role: field('coach'), assignedMemberIds: { arrayValue: { values: [{ integerValue: '101' }] } } })] }, { date: 'Mon, 28 Sep 2026 12:35:01 GMT' }),
  ]);
  const output = await result;
  assert.deepEqual(output.users, [{ documentId: 'member-1', id: 101, role: 'member' }, { documentId: 'coach-1', id: 102, role: 'coach', assignedMemberIds: [101] }]);
  assert.equal(output.evidence.complete, true);
  assert.equal(output.evidence.snapshotConsistent, true);
  assert.equal(output.evidence.pages, 2);
  assert.equal(output.evidence.requests, 3);
  assert.equal(output.evidence.writes, 0);
  assert.equal(output.evidence.profilesRead, 2);
  assert.deepEqual(output.evidence.methods, ['GET']);
  for (const { url, init } of requests) {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error'); assert.equal(init.body, undefined);
    assert.deepEqual(init.headers, { Authorization: `Bearer ${fakeToken}` });
    if (url.pathname.endsWith('/users')) {
      assert.deepEqual(url.searchParams.getAll('mask.fieldPaths'), USER_FIELDS);
      assert.equal(url.searchParams.get('readTime'), '2026-09-28T12:34:56.000Z');
    }
  }
  assert.equal(requests[2].url.searchParams.get('pageToken'), 'second');
  assert.equal(JSON.stringify(output).includes(fakeToken), false);
  assert.equal(JSON.stringify(output).includes('private-not-collected'), false);
});

test('empty snapshot is complete but emulator snapshots explicitly lack consistency evidence', async () => {
  assert.equal((await mockedRead([metadata(), response({})]).result).evidence.profilesRead, 0);
  const requests: URL[] = [];
  const output = await readUserProfiles(emulator, { env: {}, fetchImpl: async (input, init) => {
    requests.push(new URL(String(input)));
    assert.deepEqual(init?.headers, { Authorization: 'Bearer owner' });
    return response({});
  } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].origin, 'http://127.0.0.1:8080');
  assert.equal(requests[0].searchParams.has('readTime'), false);
  assert.equal(output.evidence.snapshotConsistent, false);
  assert.equal(output.evidence.readTime, null);
});

test('reader refuses missing/invalid tokens and credentials in emulator before fetching', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; throw new Error('must not fetch'); };
  for (const accessToken of [undefined, '', 'two tokens', 'line\nbreak']) {
    await assert.rejects(readUserProfiles(production, { accessToken, fetchImpl, env: {} }), errorCode('VALID_ACCESS_TOKEN_REQUIRED'));
  }
  await assert.rejects(readUserProfiles(emulator, { accessToken: fakeToken, fetchImpl, env: {} }), errorCode('EMULATOR_MUST_NOT_RECEIVE_CREDENTIALS'));
  assert.equal(calls, 0);
});

test('reader fails closed on partial HTTP failure, transport errors and invalid JSON', async () => {
  await assert.rejects(mockedRead([metadata(), response({ documents: [document('member-1')], nextPageToken: 'next' }), response({ secret: fakeToken }, { status: 403 })]).result, errorCode('READ_HTTP_403'));
  await assert.rejects(readUserProfiles(production, { accessToken: fakeToken, env: {}, fetchImpl: async () => { throw new Error(fakeToken); } }), errorCode('READ_TRANSPORT_FAILED'));
  await assert.rejects(mockedRead([metadata(), new Response('not-json-sensitive-content', { status: 200 })]).result, errorCode('INVALID_JSON_RESPONSE'));
});

test('reader rejects repeated page tokens and duplicate documents instead of reporting partial success', async () => {
  await assert.rejects(mockedRead([metadata(), response({ nextPageToken: 'loop' }), response({ nextPageToken: 'loop' })]).result, errorCode('INCOMPLETE_AUDIT_REPEATED_PAGE'));
  await assert.rejects(mockedRead([metadata(), response({ documents: [document('duplicate')], nextPageToken: 'next' }), response({ documents: [document('duplicate')] })]).result, errorCode('INCOMPLETE_AUDIT_DUPLICATE_DOCUMENT'));
  await assert.rejects(mockedRead([metadata(), response({ documents: [document('same'), document('same')] })]).result, errorCode('INCOMPLETE_AUDIT_DUPLICATE_DOCUMENT'));
  await assert.rejects(mockedRead([metadata(), response({ nextPageToken: 123 })]).result, errorCode('INVALID_PAGE_TOKEN'));
});

test('reader aborts an unbounded page sequence instead of claiming completeness', async () => {
  let requests = 0;
  await assert.rejects(readUserProfiles(emulator, { env: {}, fetchImpl: async () => {
    requests++;
    return response({ nextPageToken: `next-${requests}` });
  } }), errorCode('INCOMPLETE_AUDIT_PAGE_LIMIT'));
  assert.equal(requests, 1000);
});

test('reader rejects database identity/edition/time mismatches before reading users', async () => {
  for (const body of [{ name: 'projects/other/databases/(default)', type: 'FIRESTORE_NATIVE', databaseEdition: 'STANDARD' }, { name: prefix, type: 'DATASTORE_MODE', databaseEdition: 'STANDARD' }]) {
    await assert.rejects(mockedRead([metadata(body)]).result, errorCode('DATABASE_IDENTITY_MISMATCH'));
  }
  await assert.rejects(mockedRead([metadata({ name: prefix, type: 'FIRESTORE_NATIVE', databaseEdition: 'UNKNOWN' })]).result, errorCode('UNSUPPORTED_DATABASE_EDITION'));
  for (const date of ['', 'not-a-date']) await assert.rejects(mockedRead([metadata(undefined, date)]).result, errorCode('SERVER_SNAPSHOT_TIME_UNAVAILABLE'));
});

test('reader rejects malformed list envelopes and out-of-scope document names', async () => {
  for (const body of [null, [], 'wrong', { documents: {} }, { error: { message: fakeToken } }, { unexpected: true }]) await assert.rejects(mockedRead([metadata(), response(body)]).result, errorCode('INVALID_LIST_RESPONSE'));
  await assert.rejects(mockedRead([metadata(null)]).result, errorCode('DATABASE_IDENTITY_MISMATCH'));
  await assert.rejects(mockedRead([metadata(), response({ documents: [null] })]).result, errorCode('DOCUMENT_SCOPE_MISMATCH'));
  for (const fields of [null, [], 'bad']) await assert.rejects(mockedRead([metadata(), response({ documents: [{ name: document('one').name, fields }] })]).result, errorCode('INVALID_DOCUMENT_FIELDS'));
  for (const value of [null, 'bad', { arrayValue: null }, { arrayValue: { values: {} } }]) {
    await assert.rejects(mockedRead([metadata(), response({ documents: [document('one', { assignedMemberIds: value })] })]).result, errorCode('INVALID_FIELD_RESPONSE'));
  }
  for (const name of [`${prefix}/documents/payments/one`, 'projects/other/databases/(default)/documents/users/one', 123]) {
    await assert.rejects(mockedRead([metadata(), response({ documents: [{ name }] })]).result, errorCode('DOCUMENT_SCOPE_MISMATCH'));
  }
  for (const id of ['', 'one/subcollection/two']) await assert.rejects(mockedRead([metadata(), response({ documents: [document(id)] })]).result, errorCode('INCOMPLETE_AUDIT_DUPLICATE_DOCUMENT'));
});

test('reader preserves unsafe types as invalid markers without copying nested content', async () => {
  const output = await mockedRead([metadata(), response({ documents: [document('member-1', {
    id: { integerValue: '9007199254740993' }, assignedCoachUid: { mapValue: { fields: { secret: field('private nested content') } } },
    createdByUid: { nullValue: null }, role: field('member'), assignedMemberIds: { arrayValue: {} },
  })] })]).result;
  assert.deepEqual(output.users[0].id, { invalidType: 'unsafeInteger' });
  assert.deepEqual(output.users[0].assignedCoachUid, { invalidType: 'unsupportedFirestoreValue' });
  assert.equal(output.users[0].createdByUid, null);
  assert.deepEqual(output.users[0].assignedMemberIds, []);
  assert.equal(JSON.stringify(output).includes('private nested content'), false);
});

test('live CLI refuses CI execution before token input or any network request', () => {
  const cli = new URL('../scripts/audit/member-assignment-audit.mjs', import.meta.url);
  // Fresh process has no inherited cloud credentials; a fetch trap proves it cannot contact production.
  const preload = 'data:text/javascript,' + encodeURIComponent('globalThis.fetch = () => { throw new Error("NETWORK_MUST_NOT_BE_CALLED"); };');
  const result = spawnSync(process.execPath, ['--import', preload, cli.pathname, '--environment', 'production', '--project', project, '--database', database, '--dry-run', '--confirm-production-read', `${project}/${database}`, '--token-stdin'], {
    env: { CI: 'true' }, input: fakeToken, encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { complete: false, writes: 0, error: 'LIVE_AUDIT_FORBIDDEN_IN_CI' });
  assert.equal(result.stderr.includes(fakeToken), false);
  assert.equal(result.stderr.includes('NETWORK_MUST_NOT_BE_CALLED'), false);
});
