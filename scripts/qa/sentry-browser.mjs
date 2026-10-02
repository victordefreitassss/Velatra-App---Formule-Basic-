// Actual React boundary + SDK in Chromium; synthetic DSN and in-memory transport only.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

const fixtureUrl = new URL('https://monitoring.invalid/1');
fixtureUrl.username = randomBytes(16).toString('hex');
const bundles = new Map();
for (const [scenario, production, dsn] of [['absent', true, undefined], ['development', false, fixtureUrl.href], ['enabled', true, fixtureUrl.href]]) {
  const result = await build({
    stdin: { contents: `
      import './monitoring/init';
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import * as Sentry from '@sentry/react';
      import { ErrorBoundary } from './components/ErrorBoundary';
      import { setMonitoringContext } from './monitoring/sentry';
      window.envelopes = [];
      const initialClient = Sentry.getClient();
      window.initialEnabled = Boolean(initialClient?.getOptions().enabled);
      if (initialClient) Sentry.init({ ...initialClient.getOptions(),
        transport: () => ({ send: async envelope => { window.envelopes.push(envelope); return { statusCode: 200 }; }, flush: async () => true })
      });
      setMonitoringContext('coach', 'studio');
      const root = createRoot(document.getElementById('root'));
      const error = new TypeError('sensitive-browser-canary');
      function Broken() { throw error; }
      root.render(React.createElement(ErrorBoundary, null, React.createElement('p', null, 'Application ready')));
      window.trigger = () => root.render(React.createElement(ErrorBoundary, null, React.createElement(Broken)));
      window.rejection = () => { Promise.reject(new RangeError('sensitive-browser-canary')); };
      window.flush = () => Sentry.flush(2000);
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'import.meta.env.PROD': JSON.stringify(production), 'import.meta.env.VITE_SENTRY_DSN': dsn ? JSON.stringify(dsn) : 'undefined', '__VELATRA_BUILD_COMMIT__': JSON.stringify('c'.repeat(40)), 'process.env.NODE_ENV': '"production"' },
  });
  bundles.set(`/${scenario}.js`, result.outputFiles[0].text);
}
const server = createServer((request, response) => {
  const code = bundles.get(request.url);
  response.setHeader('Content-Type', code ? 'application/javascript' : 'text/html');
  response.end(code ?? `<div id="root"></div><script src="/${request.url.slice(1)}.js"></script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
let assertions = 0;
try {
  for (const scenario of ['absent', 'development', 'enabled']) {
    const page = await browser.newPage();
    const externalRequests = [];
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().startsWith('http://127.0.0.1:')) { externalRequests.push(request.url()); void request.abort(); }
      else void request.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/${scenario}`);
    await page.waitForFunction(() => document.body.textContent.includes('Application ready'));
    assert.equal(await page.evaluate(() => window.initialEnabled), scenario === 'enabled'); assertions++;
    await page.evaluate(() => window.trigger());
    await page.waitForFunction(() => document.body.textContent.includes('Une erreur est survenue.'));
    assert.equal(await page.$eval('button', element => element.textContent.trim()), 'Recharger la page'); assertions++;
    await page.evaluate(() => window.flush());
    assert.equal(await page.evaluate(() => window.envelopes.length), scenario === 'enabled' ? 1 : 0); assertions++;
    await page.evaluate(() => window.rejection());
    if (scenario === 'enabled') await page.waitForFunction(() => window.envelopes.length === 2);
    await page.evaluate(() => window.flush());
    const envelopes = await page.evaluate(() => window.envelopes);
    assert.equal(envelopes.length, scenario === 'enabled' ? 2 : 0); assertions++;
    assert.ok(!JSON.stringify(envelopes).includes('sensitive-browser-canary')); assertions++;
    assert.deepEqual(externalRequests, []); assertions++;
    if (scenario === 'enabled') {
      assert.deepEqual(envelopes.flatMap(envelope => envelope[1].map(item => item[0].type)), ['event', 'event']); assertions++;
      assert.equal(envelopes[0][1][0][1].tags.role, 'coach'); assertions++;
      assert.equal(envelopes[0][1][0][1].tags.accountType, 'studio'); assertions++;
    }
    await page.close();
  }
  console.log(`Sentry browser: ${assertions} assertions PASS (no external requests)`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
