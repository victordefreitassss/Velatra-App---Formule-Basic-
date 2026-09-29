import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

it('loads the compiled API graph and responds over HTTP without TypeScript source files', () => {
  const root = process.cwd();
  // Keep the fixture under the repository so production dependencies resolve normally.
  const output = mkdtempSync(path.join(root, '.runtime-test-'));
  try {
    const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    assert.equal(config.error, undefined);
    const { options, errors } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    assert.equal(errors.length, 0);
    const sources = ['server.ts', 'productCapabilities.ts', 'api/[...path].ts', ...readdirSync(path.join(root, 'server')).filter(name => name.endsWith('.ts')).map(name => `server/${name}`)];
    for (const source of sources) {
      const compiled = ts.transpileModule(readFileSync(path.join(root, source), 'utf8'), {
        compilerOptions: { ...options, noEmit: false }, fileName: source
      }).outputText;
      const destination = path.join(output, source.replace(/\.ts$/, '.js'));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, compiled);
    }
    const result = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', `
      const { default: app } = await import('./api/[...path].js');
      const server = app.listen(0, '127.0.0.1');
      await new Promise(resolve => server.once('listening', resolve));
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/workouts/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (response.status !== 401) throw new Error('Expected 401, received ' + response.status);
        console.log('COMPILED_RUNTIME_HTTP_OK');
      } finally { await new Promise(resolve => server.close(resolve)); }
    `], {
      cwd: output, encoding: 'utf8', timeout: 15000,
      env: { ...process.env, NODE_ENV: 'production', VERCEL: '1', GCLOUD_PROJECT: 'demo-velatra', FIREBASE_SERVICE_ACCOUNT: '' }
    });
    assert.equal(result.status, 0, `${result.error?.message || ''}\n${result.stderr}`);
    assert.match(result.stdout, /COMPILED_RUNTIME_HTTP_OK/);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

it('resolves signing keys and rejects a forged signature without require(ESM)', () => {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '-e', `
    import { createRequire } from 'node:module';
    import assert from 'node:assert/strict';
    const require = createRequire(import.meta.url);
    const adminRequire = createRequire(require.resolve('firebase-admin'));
    const jwks = adminRequire('jwks-rsa');
    const jose = await import('jose');
    const keys = await jose.generateKeyPair('RS256');
    const jwk = { ...await jose.exportJWK(keys.publicKey), kid: 'local-qa-key', alg: 'RS256', use: 'sig' };
    const client = jwks({ fetcher: async () => ({ keys: [jwk] }), cache: false });
    const signingKey = await client.getSigningKey('local-qa-key');
    const publicKey = await jose.importSPKI(signingKey.getPublicKey(), 'RS256');
    const token = await new jose.SignJWT({ sub: 'local-qa-user' }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).sign(keys.privateKey);
    assert.equal((await jose.jwtVerify(token, publicKey)).payload.sub, 'local-qa-user');
    const attacker = await jose.generateKeyPair('RS256');
    const forged = await new jose.SignJWT({ sub: 'local-qa-user' }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).sign(attacker.privateKey);
    await assert.rejects(jose.jwtVerify(forged, publicKey));
    await assert.rejects(client.getSigningKey('unknown-key'));
    console.log('SIGNING_KEY_VERIFICATION_OK');
  `], { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SIGNING_KEY_VERIFICATION_OK/);
});

it('loads the deployed API with native Node and rejects unauthenticated requests before accessing data', () => {
  const script = `
    const { default: app } = await import('./api/[...path].ts');
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/workouts/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (response.status !== 401) throw new Error('Expected 401, received ' + response.status);
      console.log('NATIVE_RUNTIME_HTTP_OK');
    } finally { await new Promise(resolve => server.close(resolve)); }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 15000,
    env: { ...process.env, NODE_ENV: 'production', VERCEL: '1', GCLOUD_PROJECT: 'demo-velatra', FIREBASE_SERVICE_ACCOUNT: '' }
  });
  assert.equal(result.status, 0, `${result.error?.message || ''}\n${result.stderr}`);
  assert.match(result.stdout, /NATIVE_RUNTIME_HTTP_OK/);
});
