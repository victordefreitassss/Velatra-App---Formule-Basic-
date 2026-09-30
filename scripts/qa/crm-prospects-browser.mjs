// Isolated browser fixture. No production identity, API or Firestore write.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = await mkdtemp(path.join(os.tmpdir(), 'velatra-crm-qa-'));
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProspectFlowPage } from '${root}/pages/ProspectFlowPage';
import { TasksPage } from '${root}/pages/TasksPage';
const parameters = new URLSearchParams(location.search);
const scenario = parameters.get('scenario') || 'many', page = parameters.get('page') || 'pipeline', studio = parameters.get('studio') === 'yes';
const now = new Date();
const date = (days) => new Date(now.getTime() + days * 86400000).toISOString();
const coach = { id: 10, firebaseUid: 'crm-qa-coach', clubId: 'crm-qa', name: 'Coach QA', role: 'coach' };
const owner = { id: 1, firebaseUid: 'crm-qa-owner', clubId: 'crm-qa', name: 'Propriétaire QA', role: 'owner' };
const stages = ['lead','contacted','call_pending','trial','won','lost'];
const count = scenario === 'empty' ? 0 : scenario === 'one' ? 1 : 120;
const prospects = Array.from({length:count}, (_, index) => ({
  id: 1000 + index, firebaseUid: 'qa-prospect-'+index, clubId:'crm-qa',
  name: index === 0 ? 'Alexandre de La Rochefoucauld au nom volontairement très long' : 'Prospect '+index,
  email: index === 0 ? 'adresse-email-volontairement-longue-pour-verifier-le-responsive@example.test' : 'prospect'+index+'@example.test',
  phone: index === 0 || index % 3 ? '06 12 34 56 78' : '',
  status: stages[index % 6], date: date(-index), answers: {},
  notesHistory: index === 0 ? [{id:'note',date:date(-1),content:'Premier contact et objectif de reprise sportive.'}] : [],
  ...(index % 6 === 2 ? {nextReminderDate: date(index === 2 ? -2 : 1)} : {}),
  ...(index % 6 === 4 ? {convertedMemberUid: 'qa-member-'+index, convertedMemberId: 5000+index} : {})
}));
const bookings = count > 3 ? [{id:'trial',clubId:'crm-qa',prospectId:1003,coachId:'10',type:'trial',status:'confirmed',startTime:date(2),endTime:date(2)}] : [];
const initial = {user:owner,currentClub:{id:'crm-qa',ownerId:owner.firebaseUid,accountType:studio?'studio':'solo'},users:[owner,coach],prospects,bookings,page:'crm_pipeline'};
function Fixture(){const [state,setState]=React.useState(initial);window.__qaState=state;return <div className="va-content">{page==='tasks'?<TasksPage state={state} setState={setState} showToast={()=>{}}/>:<ProspectFlowPage state={state} setState={setState} showToast={()=>{}}/>}</div>}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
await writeFile(path.join(work, 'entry.tsx'), entry);
await build({ entryPoints: [path.join(work, 'entry.tsx')], outfile: path.join(work, 'entry.js'), bundle: true, format: 'esm', jsx: 'automatic', target: 'es2022', nodePaths: [path.join(root, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'firebase-fixture', setup(bundle) { bundle.onLoad({ filter: /[/\\]firebase\.ts$/ }, () => ({ loader: 'ts', contents: `export const db={};export const auth={currentUser:{uid:'crm-qa-owner'}};export const doc=()=>({});export const updateDoc=async()=>{throw Error('No QA writes')};export const setDoc=async()=>{throw Error('No QA writes')};export const deleteDoc=async()=>{throw Error('No QA writes')};export const sendPasswordResetEmail=async()=>{throw Error('No QA email')};export const apiFetch=async()=>{throw Error('No QA API')};` })); } }] });
const assets = await readdir(path.join(root, 'dist/assets'));
const styles = (await Promise.all(assets.filter(name => name.endsWith('.css')).map(name => readFile(path.join(root, 'dist/assets', name), 'utf8')))).join('\n');
const tailwind = await readFile('/private/tmp/velatra-tailwind-3.4.17.js');
const html = '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><script src="/tailwind.js"></script><link rel="stylesheet" href="/styles.css"></head><body style="margin:0;background:#f5f7ef"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/tailwind.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(tailwind); return; }
  if (pathname === '/styles.css') { response.setHeader('Content-Type', 'text/css'); response.end(styles); return; }
  if (pathname === '/entry.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(await readFile(path.join(work, 'entry.js'))); return; }
  response.setHeader('Content-Type', 'text/html'); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const sizes = [[320,568],[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1180,820],[1280,800],[1366,768],[1440,900],[1600,1000],[1920,1080],[2560,1440]];
let checks = 0, failures = 0;
try {
  for (const [scenario, pageName, studio] of [['empty','pipeline',false],['one','pipeline',false],['many','pipeline',true],['many','tasks',true]]) {
    for (const [width,height] of sizes) {
      const page = await browser.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<768,hasTouch:width<1024});
      await page.setRequestInterception(true);
      page.on('request', request => request.url().startsWith(origin) ? void request.continue() : void request.abort());
      await page.goto(`${origin}/?scenario=${scenario}&page=${pageName}&studio=${studio?'yes':'no'}`, {waitUntil:'networkidle0'});
      await page.waitForSelector('h1');
      const result = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,width:innerWidth,heading:document.querySelector('h1')?.textContent||''}));
      const valid = !errors.length && result.scroll <= width + 1 && !!result.heading;
      checks++; if (!valid) failures++;
      console.log(`${valid?'PASS':'FAIL'} ${scenario} ${pageName} ${width}x${height} ${JSON.stringify({...result,errors})}`);
      if (width === 320 && scenario === 'many' && pageName === 'pipeline') {
        await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Alexandre'))?.click());
        const detail = await page.evaluate(() => ({dialog:!!document.querySelector('[role="dialog"]'), call:!!document.querySelector('a[href^="tel:"]'), email:!!document.querySelector('a[href^="mailto:"]'), stages:document.querySelector('#crm-stage')?.options.length||0}));
        checks++; if (!detail.dialog || !detail.call || !detail.email || detail.stages !== 6) failures++;
        console.log(`${detail.dialog && detail.call && detail.email && detail.stages===6?'PASS':'FAIL'} phone Prospect 360 ${JSON.stringify(detail)}`);
        await page.select('#crm-stage', 'trial');
        const trialModal = await page.evaluate(() => document.querySelector('[data-crm-modal="true"]')?.textContent?.includes('Séance d’essai') || document.querySelector('[data-crm-modal="true"]')?.textContent?.includes("Séance d'essai"));
        checks++; if (!trialModal) failures++; console.log(`${trialModal?'PASS':'FAIL'} phone trial action`);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('[data-crm-modal="true"]'), {timeout:3000}).catch(() => {});
        const closed = await page.evaluate(() => !document.querySelector('[data-crm-modal="true"]'));
        checks++; if (!closed) failures++; console.log(`${closed?'PASS':'FAIL'} Escape closes business dialog`);
      }
      await page.close();
    }
  }
  console.log(`CRM browser QA: ${checks} checks, ${failures} failures`);
  if (failures) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(work,{recursive:true,force:true}); }
