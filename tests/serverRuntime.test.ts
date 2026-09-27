import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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
