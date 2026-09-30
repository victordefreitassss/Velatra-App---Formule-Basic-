// Local visual fixture: no production account, document or API is accessed.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'velatra-planning-'));
const output = path.join(root, 'mobile-review-evidence');
await mkdir(output, { recursive: true });
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { PlanningPage } from '${path.join(root, 'pages/PlanningPage.tsx')}';
import { parisDateKey, addParisDays, parisLocalInstant } from '${path.join(root, 'components/planningSlots.ts')}';
const member = new URLSearchParams(location.search).get('role') === 'member';
const tomorrow = addParisDays(parisDateKey(new Date()), 1);
const date = parisLocalInstant(tomorrow, '09:00');
const startTime = date.toISOString();
const endTime = new Date(date.getTime() + 3600000).toISOString();
const coach = { id: 1, firebaseUid: 'coach-qa', role: 'owner', name: 'Coach Velatra', clubId: 'club-qa' };
const person = { id: 7, firebaseUid: 'member-qa', role: 'member', name: 'Alexandre de La Rochefoucauld', clubId: 'club-qa', credits: 3, sessionCredits: { group: 2 } };
const club = { id: 'club-qa', ownerId: 'coach-qa', accountType: 'solo', settings: { booking: { enabled: true, sessionDuration: 60,
  sessionTypes: [{ id: 'private', name: 'Coaching individuel', duration: 60, maxParticipants: 1 }, { id: 'group', name: 'Cours petit groupe et mobilité fonctionnelle', duration: 60, maxParticipants: 8 }],
  schedule: Array.from({ length: 7 }, (_, day) => ({ day, slots: [{ start: '09:00', end: '12:00', sessionTypeId: 'private' }, { start: '18:00', end: '20:00', sessionTypeId: 'group' }] })) } } };
const booking = { id: 'book-qa', clubId: 'club-qa', memberId: 7, memberUid: 'member-qa', coachId: '1', startTime, endTime, type: 'coaching', status: 'confirmed', sessionTypeId: 'private', creditDebited: true };
const initial = { user: member ? person : coach, currentClub: club, users: member ? [person] : [coach, person], bookings: [booking], programs: [], prospects: [], page: member ? 'planning' : 'calendar' };
function Fixture() { const [state, setState] = React.useState(initial); return <MemoryRouter><main className="mx-auto max-w-[2200px] p-3 sm:p-5"><PlanningPage state={state} setState={setState} showToast={message => { window.__toast = message; }}/></main></MemoryRouter>; }
createRoot(document.getElementById('root')).render(<Fixture />);
`;
await writeFile(path.join(temporary, 'entry.tsx'), fixture);
await build({ entryPoints: [path.join(temporary, 'entry.tsx')], outdir: temporary, bundle: true, format: 'esm', jsx: 'automatic', target: 'es2022', nodePaths: [path.join(root, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'local-booking-api', setup(build) { build.onLoad({ filter: /[/\\]firebase\.ts$/ }, () => ({ loader: 'ts', contents: `export const apiFetch = async () => ({ ok: true, json: async () => ({ slots: [], success: true }) });` })); } }] });
const assets = await readdir(path.join(root, 'dist/assets'));
const styles = (await Promise.all(assets.filter(name => name.endsWith('.css')).map(name => readFile(path.join(root, 'dist/assets', name), 'utf8')))).join('\n');
const tailwindResponse = await fetch('https://cdn.tailwindcss.com');
if (!tailwindResponse.ok) throw new Error('Tailwind CDN unavailable for visual QA');
const tailwind = await tailwindResponse.text();
const originalHtml = await readFile(path.join(root, 'index.html'), 'utf8');
const baseStyle = (originalHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '').replace(/@import[^;]+;/g, '');
const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><script src="/tailwind.js"></script><style>${baseStyle}</style><link rel="stylesheet" href="/styles.css"></head><body class="bg-[#f7f8f2]"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`;
const server = createServer(async (request, response) => {
  try { const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/styles.css') { response.setHeader('Content-Type', 'text/css'); response.end(styles); return; }
    if (pathname === '/tailwind.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(tailwind); return; }
    if (pathname === '/entry.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(await readFile(path.join(temporary, 'entry.js'))); return; }
    response.setHeader('Content-Type', 'text/html'); response.end(html);
  } catch { response.statusCode = 404; response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [];
const check = (name, valid, detail) => { checks.push({ name, valid, detail }); console.log(`${valid ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(detail)}`); };
try {
  for (const role of ['coach', 'member']) for (const [width, height] of [[320, 568], [360, 800], [375, 812], [390, 844], [430, 932], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1280, 800], [1366, 768], [1440, 900], [1600, 1000], [1920, 1080], [2560, 1440]]) {
    const page = await browser.newPage();
    let pageError = '';
    page.on('pageerror', error => { pageError = error.message; });
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 1024 });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith(origin) || request.url().startsWith('data:') ? void request.continue() : void request.abort());
    await page.goto(`${origin}/?role=${role}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    const result = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth, scrollY, title: document.querySelector('h1')?.textContent,
      weekVisible: [...document.querySelectorAll('div')].some(element => element.textContent === 'Paris' && element.checkVisibility()),
      bookingVisible: document.body.textContent?.includes('Alexandre de La Rochefoucauld'), controls: [...document.querySelectorAll('button')].filter(button => button.checkVisibility()).length }));
    check(`${role} ${width}x${height}`, !pageError && result.scroll <= width + 1 && result.title === 'Planning' && result.controls > 4 && (role === 'member' || width < 1024 || result.weekVisible), { ...result, pageError });
    if ([320, 390, 768, 1024, 1440, 1920, 2560].includes(width)) await page.screenshot({ path: path.join(output, `planning-${role}-${width}.png`), fullPage: false });
    if (role === 'coach' && width === 390) {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('+ Rendez-vous'))?.click());
      await page.evaluate(() => document.querySelector('button[aria-label="Jour suivant"]')?.click());
      const quick = await page.evaluate(() => document.body.textContent?.includes('Planifier une séance'));
      check('coach phone quick booking', quick, { quick });
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Planifier une séance'))?.click());
      check('coach phone booking dialog', await page.$('[role="dialog"]') !== null, 'opened');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 2500 });
      check('coach phone Escape closes dialog', await page.$('[role="dialog"]') === null, 'closed');
    }
    if (role === 'member' && width === 390) {
      const memberFlow = await page.evaluate(() => document.body.textContent?.includes('Crédits standard') && document.body.textContent?.includes('Type de séance'));
      check('member booking information', memberFlow, { memberFlow });
      await page.evaluate(() => document.querySelector('button[aria-label="Jour suivant"]')?.click());
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Réserver'))?.click());
      check('member phone booking dialog', await page.$('[role="dialog"]') !== null, 'opened');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 2500 });
      check('member phone Escape closes dialog', await page.$('[role="dialog"]') === null, 'closed');
    }
    await page.close();
  }
  await writeFile(path.join(output, 'planning-results.json'), JSON.stringify(checks, null, 2));
  if (checks.some(item => !item.valid)) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(temporary, { recursive: true, force: true }); }
