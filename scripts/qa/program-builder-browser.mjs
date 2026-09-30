// Isolated component fixture: no Firebase or production service is loaded.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'velatra-program-builder-'));
const output = path.join(root, 'mobile-review-evidence');
await mkdir(output, { recursive: true });
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProgramEditor } from '${path.join(root, 'components/Editor.tsx')}';
const initial = { id: 42, clubId: 'club-qa', memberId: 7, name: 'Programme QA', presetId: null, nbDays: 2, durationWeeks: 6, startDate: '2026-09-30', completedWeeks: [], currentDayIndex: 0, days: [{ name: 'Séance A', isCoaching: false, exercises: [{ exId: 1, sets: 3, reps: '8-12', rest: '90', tempo: '3010', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null }, { exId: 2, sets: 3, reps: '10', rest: '60', tempo: '', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null }] }, { name: 'Séance B', isCoaching: false, exercises: [] }] };
function Fixture() {
  const [exercises, setExercises] = React.useState([{ id: 1, clubId: 'club-qa', name: 'Développé couché', cat: 'Poitrine', equip: 'Barre', photo: null, perfId: 'dev' }, { id: 2, clubId: 'global', name: 'Rowing', cat: 'Dos', equip: 'Haltères', photo: null, perfId: 'rowing' }]);
  return <ProgramEditor program={initial} preset={null} exercises={exercises} clubId="club-qa" onSave={async data => { window.__saved = data; }} onCancel={() => { window.__cancelled = true; }} onCreateExercise={async exercise => { setExercises(current => [...current, exercise]); }} />;
}
createRoot(document.getElementById('root')).render(<Fixture />);
`;
await writeFile(path.join(temporary, 'entry.tsx'), fixture);
await build({ entryPoints: [path.join(temporary, 'entry.tsx')], outdir: temporary, bundle: true, format: 'esm', jsx: 'automatic', target: 'es2022', nodePaths: [path.join(root, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl', '.svg': 'dataurl' } });
const tailwindResponse = await fetch('https://cdn.tailwindcss.com');
if (!tailwindResponse.ok) throw new Error('Tailwind CDN unavailable for visual QA');
const tailwind = await tailwindResponse.text();
const originalHtml = await readFile(path.join(root, 'index.html'), 'utf8');
const baseStyle = (originalHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '').replace(/@import[^;]+;/g, '');
const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><script src="/tailwind.js"></script><style>${baseStyle}</style><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`;
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/tailwind.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(tailwind); return; }
    if (pathname === '/entry.js' || pathname === '/entry.css') { response.setHeader('Content-Type', pathname.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(await readFile(path.join(temporary, pathname.slice(1)))); return; }
    response.setHeader('Content-Type', 'text/html'); response.end(html);
  } catch { response.statusCode = 404; response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [];
const check = (name, valid, detail) => { checks.push({ name, valid, detail }); console.log(`${valid ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(detail)}`); };
try {
  for (const width of [320, 390, 430, 768, 1024, 1280, 1440, 1600, 1920, 2560]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width === 320 ? 568 : 900, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 1024 });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(origin) || request.url().startsWith('data:') ? void request.continue() : void request.abort());
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.va-editor-header');
    const geometry = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth, metadata: document.querySelector('.va-editor-program-meta').checkVisibility(), session: document.querySelector('.va-editor-session').checkVisibility(), details: document.querySelector('.va-editor-details').checkVisibility(), columns: getComputedStyle(document.querySelector('.va-editor-workspace-grid')).gridTemplateColumns.split(' ').length }));
    check(`initial layout ${width}`, geometry.scroll <= geometry.viewport && geometry.session && (width < 768 ? !geometry.metadata && !geometry.details : width < 1280 ? !geometry.details : geometry.details), geometry);
    if ([320, 390, 768, 1440, 1920].includes(width)) await page.screenshot({ path: path.join(output, `program-builder-${width}.png`), fullPage: width !== 320 });
    if (width === 320) {
      await page.click('.va-editor-session ol li button[aria-pressed]');
      const details = await page.evaluate(() => ({ visible: document.querySelector('.va-editor-details').checkVisibility(), session: document.querySelector('.va-editor-session').checkVisibility(), scroll: document.documentElement.scrollWidth }));
      check('320 exercise settings are reachable without horizontal overflow', details.visible && !details.session && details.scroll <= 320, details);
      await page.click('button[aria-label="Ajouter une série"]');
      check('320 series stepper works', await page.$eval('#editor-sets', element => element.value === '4'), await page.$eval('#editor-sets', element => element.value));
      await page.click('.va-editor-close-details');
      await page.evaluate(() => [...document.querySelectorAll('.va-editor-session button')].find(button => button.textContent.includes('Ajouter un exercice'))?.click());
      check('320 picker opens', await page.$eval('#choose-exercise-title', element => element.textContent.includes('Ajouter')), 'dialog');
      await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(button => button.textContent.includes('Créer un exercice'))?.click());
      await page.type('dialog label:nth-of-type(1) input', 'Fente avant');
      await page.type('dialog label:nth-of-type(3) input', 'Autre : élastique');
      await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(button => button.textContent.includes('Créer et ajouter'))?.click());
      await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 3000 }).catch(() => {});
      const creation = await page.evaluate(() => ({ count: document.querySelectorAll('.va-editor-session ol li').length, title: document.querySelector('.va-editor-header h1')?.textContent, error: document.querySelector('dialog [role="alert"]')?.textContent, dialog: !!document.querySelector('dialog[open]') }));
      check('inline exercise creation keeps program draft', creation.count === 3 && creation.title?.includes('Programme QA'), creation);
      await page.click('.va-editor-close-details');
      await page.click('.va-editor-session ol li button[aria-pressed]');
      await page.select('.va-editor-details select', 'superset');
      await page.click('dialog[open] input[type="checkbox"]');
      await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')].find(button => button.textContent.includes('Créer le groupe'))?.click());
      await page.click('.va-editor-close-details');
      const groups = await page.$$eval('.va-editor-session ol li', items => items.slice(0, 2).map(item => item.textContent));
      check('320 explicit superset association is visible as A1/A2', groups[0]?.includes('A1') && groups[1]?.includes('A2'), groups);
      await page.evaluate(() => [...document.querySelectorAll('.va-editor-header button')].find(button => button.textContent.includes('Enregistrer'))?.click());
      await page.waitForFunction(() => !!window.__saved);
      const saved = await page.evaluate(() => ({ count: window.__saved.days[0].exercises.length, sets: window.__saved.days[0].exercises[0].sets, group: window.__saved.days[0].exercises.slice(0, 2).map(item => item.setGroup) }));
      check('320 save preserves edits, new exercise and group', saved.count === 3 && saved.sets === 4 && saved.group[0] === saved.group[1], saved);
    }
    if (width === 768) {
      await page.click('.va-editor-session ol li button[aria-pressed]');
      const drawer = await page.evaluate(() => ({ visible: document.querySelector('.va-editor-details').checkVisibility(), position: getComputedStyle(document.querySelector('.va-editor-details')).position }));
      check('tablet settings open in a focused drawer', drawer.visible && drawer.position === 'fixed', drawer);
    }
    await page.close();
  }
  await writeFile(path.join(output, 'program-builder-results.json'), JSON.stringify(checks, null, 2));
  if (checks.some(item => !item.valid)) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
