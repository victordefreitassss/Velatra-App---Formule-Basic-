// Isolated browser fixture: no Firestore document is read or written.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'velatra-exercise-library-'));
const output = path.join(root, 'mobile-review-evidence');
await mkdir(output, { recursive: true });
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExercisesPage } from '${path.join(root, 'pages/ExercisesPage.tsx')}';
const state = { user: { id: 1, clubId: 'club-qa', firebaseUid: 'coach-qa', name: 'Coach QA' }, currentClub: { id: 'club-qa' }, programs: [{ id: 8, days: [{ exercises: [{ exId: 3 }] }] }], presets: [], exercises: [
  { id: 1, clubId: 'global', name: 'Développé couché', cat: 'Poitrine', equip: 'Barre', photo: null, perfId: 'global-bench', primaryMuscles: ['Pectoraux'], tags: ['force'] },
  { id: 2, clubId: 'club-qa', name: 'Élévation latérale', cat: 'Épaules', equip: 'Haltères', photo: null, perfId: 'club-lateral', primaryMuscles: ['Épaules'], secondaryMuscles: ['Trapèzes'], difficulty: 'beginner', exerciseType: 'strength', tags: ['débutant'], createdAt: '2026-09-30T10:00:00.000Z' },
  { id: 3, clubId: 'club-qa', name: 'Planche historique', cat: 'Abdos', equip: 'Poids du corps', photo: null, perfId: 'club-plank', isArchived: true, exerciseType: 'timed' }
] };
function Fixture() { const [current, setCurrent] = React.useState(state); return <ExercisesPage state={current} setState={setCurrent} showToast={(message) => { window.__toast = message; }} />; }
createRoot(document.getElementById('root')).render(<Fixture />);
`;
await writeFile(path.join(temporary, 'entry.tsx'), fixture);
await build({ entryPoints: [path.join(temporary, 'entry.tsx')], outdir: temporary, bundle: true, format: 'esm', jsx: 'automatic', target: 'es2022', nodePaths: [path.join(root, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"', '__USE_FIREBASE_EMULATORS__': 'false', '__FIREBASE_APPLET_CONFIG__': JSON.stringify({ apiKey: 'AIzaSyDUMMYqaVisualReviewKey0000000000000', authDomain: 'qa.invalid', projectId: 'velatra-qa', storageBucket: 'qa.invalid', messagingSenderId: '0', appId: '1:0:web:qa' }) }, loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
const assets = await readdir(path.join(root, 'dist/assets'));
const cssFile = assets.find(name => /^index-.*\.css$/.test(name));
if (!cssFile) throw new Error('Build CSS unavailable. Run npm run build before visual QA.');
const styles = await readFile(path.join(root, 'dist/assets', cssFile), 'utf8');
const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`;
const server = createServer(async (request, response) => {
  try { const pathname = new URL(request.url, 'http://localhost').pathname; if (pathname === '/styles.css') { response.setHeader('Content-Type', 'text/css'); response.end(styles); return; } if (pathname === '/entry.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(await readFile(path.join(temporary, 'entry.js'))); return; } response.setHeader('Content-Type', 'text/html'); response.end(html); } catch { response.statusCode = 404; response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [];
const check = (name, valid, detail) => { checks.push({ name, valid, detail }); console.log(`${valid ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(detail)}`); };
try {
  const viewports = [[320, 568], [360, 800], [375, 812], [390, 844], [430, 932], [768, 1024], [820, 1180], [1024, 768], [1280, 800], [1440, 900], [1600, 1000], [1920, 1080], [2560, 1440]];
  for (const [width, height] of viewports) {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error(`PAGE ERROR ${width}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') console.error(`BROWSER ERROR ${width}: ${message.text()}`); });
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768 });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(origin) || request.url().startsWith('data:') ? void request.continue() : void request.abort());
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForSelector('[data-testid="exercise-library"]');
    const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, title: document.querySelector('h1')?.textContent, cards: document.querySelectorAll('article').length, filterVisible: Array.from(document.querySelectorAll('button')).some(button => button.textContent?.includes('Filtres') && (button).checkVisibility()) }));
    check(`library layout ${width}`, geometry.scroll <= geometry.viewport && geometry.title?.includes('Bibliothèque') && geometry.cards === 2, geometry);
    if ([320, 390, 768, 1440, 1920].includes(width)) await page.screenshot({ path: path.join(output, `exercise-library-${width}.png`), fullPage: width > 430 });
    if (width === 320) {
      await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Filtres'))?.click());
      check('320 opens an accessible filter dialog', await page.$eval('dialog[open]', dialog => dialog.getAttribute('aria-label') === 'Filtres des exercices'), 'dialog');
      await page.keyboard.press('Escape');
      check('320 closes filters with Escape', await page.$('dialog[open]') === null, 'closed');
      await page.click('article button');
      const globalDetails = await page.evaluate(() => ({ title: document.querySelector('dialog[open] h2')?.textContent, edit: Array.from(document.querySelectorAll('dialog[open] button')).some(button => button.textContent?.includes('Modifier')) }));
      check('global exercise is readable but not editable', globalDetails.title?.includes('Développé') && !globalDetails.edit, globalDetails);
      await page.keyboard.press('Escape');
    }
    if (width === 390) {
      await page.type('input[placeholder*="Nom"]', 'elevation');
      const result = await page.evaluate(() => document.querySelectorAll('article').length);
      check('390 accent-insensitive search works', result === 1, { result });
    }
    if (width === 1440) {
      const desktop = await page.evaluate(() => ({ filters: Array.from(document.querySelectorAll('select')).length, archivedVisible: Array.from(document.querySelectorAll('article')).some(article => article.textContent?.includes('Planche historique')) }));
      check('desktop keeps filters visible and hides archived by default', desktop.filters >= 7 && !desktop.archivedVisible, desktop);
    }
    await page.close();
  }
  await writeFile(path.join(output, 'exercise-library-results.json'), JSON.stringify(checks, null, 2));
  if (checks.some(item => !item.valid)) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(temporary, { recursive: true, force: true }); }
