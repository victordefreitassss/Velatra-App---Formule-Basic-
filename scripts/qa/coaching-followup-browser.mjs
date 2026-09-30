// Isolated browser recipe for the coaching follow-up UI. No production connection.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = '/private/tmp/velatra-followup-browser';
await mkdir(work, { recursive: true });
const entry = path.join(work, 'entry.tsx');
await writeFile(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CoachFollowup, MemberFollowup } from '${root}/components/CoachingFollowup';
const role = new URLSearchParams(location.search).get('role') || 'member';
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-6xl space-y-4 p-2 sm:p-5">
  <h1 className="text-xl font-bold">Recette suivi Velatra</h1>
  {role === 'member' ? <MemberFollowup /> : <><CoachFollowup memberUid="member-a" programs={[]} section="journey"/><CoachFollowup memberUid="member-a" programs={[]} section="followup"/></>}
</main>);
`);
const fixture = `
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const journey = {phases:[{id:'phase1',name:'Progression',objective:'Construire une routine',status:'active',startDate:today,plannedEndDate:today,durationWeeks:2,programId:null,checkInTemplateIds:[],notes:''}],version:1};
const assignment = {id:'assignment1',templateName:'Bilan semaine',questions:[{id:'fatigue',label:'Comment évaluez-vous votre fatigue cette semaine ?',type:'scale',required:true,min:0,max:10},{id:'comment',label:'Un commentaire sur votre progression ?',type:'text',required:false}],frequency:{kind:'weekly'},startDate:today,dueDate:today,status:'expected',active:true};
const habit = {id:'habit1',name:'Hydratation',description:'Boire suffisamment',valueType:'number',target:2,unit:'L',frequency:{kind:'daily'},startDate:today,dueDate:today,active:true,week:{completed:0,expected:7},todayEntry:null};
const state = {journey,assignments:[assignment],responses:[],habits:[habit],entries:[],logs:[{id:'123456',dayName:'Séance du jour',date:today,feedback:null}],today};
const templates = [{id:'template1',name:'Bilan semaine',description:'',questions:assignment.questions,active:true}];
export async function apiFetch(input,options={}) {
  const url=String(input), method=options.method||'GET';
  if(method==='PUT'&&url.includes('/journeys/')){const body=JSON.parse(options.body);journey.phases=body.phases;journey.version++;}
  if(method==='POST'&&url.includes('/checkins/')){assignment.status='received';state.responses.unshift({id:'response1',templateName:assignment.templateName,questions:assignment.questions,answers:JSON.parse(options.body).answers,answeredAt:new Date().toISOString()});}
  if(method==='POST'&&url.includes('/habits/')&&url.endsWith('/complete')){habit.todayEntry={value:JSON.parse(options.body).value,date:today};habit.week.completed=1;}
  if(method==='POST'&&url.includes('/feedback')){state.logs[0].feedback=JSON.parse(options.body);}
  if(method==='POST'&&url.endsWith('/templates')){const body=JSON.parse(options.body);templates.push({id:'template'+templates.length,name:body.name,description:body.description,questions:body.questions,active:true});}
  if(method==='POST'&&url.includes('/assignments/')){const body=JSON.parse(options.body);state.assignments.push({...assignment,id:'assignment'+state.assignments.length,templateName:templates.find(t=>t.id===body.templateId)?.name||'Bilan'});}
  if(method==='POST'&&url.includes('/habits/')&&!url.endsWith('/complete')){const body=JSON.parse(options.body);state.habits.push({...habit,...body,id:'habit'+state.habits.length});}
  const data=url.endsWith('/templates')?{templates}:url.endsWith('/me')||url.includes('/clients/')?state:{};
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
}
`;
await build({ entryPoints: [entry], outfile: path.join(work, 'entry.js'), absWorkingDir: root, nodePaths: [path.join(root, 'node_modules')], bundle: true, format: 'esm', jsx: 'automatic', target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'firebase-fixture', setup(build) {
    build.onResolve({ filter: /(?:^|\/)firebase(?:\.[jt]s)?$/ }, () => ({ path: 'firebase-fixture', namespace: 'qa' }));
    build.onLoad({ filter: /.*/, namespace: 'qa' }, () => ({ contents: fixture, loader: 'js' }));
  } }],
});
const tailwind = process.env.VELATRA_QA_TAILWIND_PATH
  ? await readFile(process.env.VELATRA_QA_TAILWIND_PATH)
  : await fetch('https://cdn.tailwindcss.com').then(response => {
      if (!response.ok) throw new Error('Cannot load Tailwind for browser QA');
      return response.text();
    });
const html = '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="/tailwind.js"></script></head><body style="margin:0;background:#f7f8f2"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/tailwind.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(tailwind); return; }
  if (pathname === '/entry.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(await readFile(path.join(work, 'entry.js'))); return; }
  res.setHeader('Content-Type', 'text/html'); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const sizes = [[320,568],[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1180,820],[1280,800],[1366,768],[1440,900],[1600,1000],[1920,1080],[2560,1440]];
let failures = 0;
try {
  for (const role of ['member', 'coach']) for (const [width, height] of sizes) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height, isMobile: width < 1024, hasTouch: width < 1024, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', req => req.url().startsWith(origin) ? void req.continue() : void req.abort());
    await page.goto(`${origin}/?role=${role}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector(role === 'member' ? '[aria-label="Mon suivi de coaching"]' : '[aria-label="Parcours de coaching"]');
    const result = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      narrowControls: [...document.querySelectorAll('button,input,select,textarea')].filter(el => el.getClientRects().length && el.getBoundingClientRect().width < 38).length }));
    const okay = result.scrollWidth <= width + 1 && errors.length === 0;
    if (!okay) failures++;
    console.log(`${okay ? 'PASS' : 'FAIL'} ${role} ${width}×${height} ${JSON.stringify({ ...result, errors })}`);
    if ([320,390,820,1440,2560].includes(width)) await page.screenshot({ path: path.join(work, `${role}-${width}.png`), fullPage: false, timeout: 10000 });
    if (width === 390 && role === 'member') {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Remplir maintenant'))?.click());
      const opened = await page.$eval('form', form => form.textContent?.includes('fatigue'));
      if (!opened) { failures++; console.log('FAIL member check-in form did not open'); }
      await page.type('form input[type="number"]', '8');
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Envoyer mon bilan'))?.click());
      await page.waitForFunction(() => !document.body.textContent?.includes('Votre bilan à remplir'));
      await page.type('input[aria-label="Valeur Hydratation"]', '2');
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Valider')?.click());
      await page.waitForFunction(() => document.body.textContent?.includes('Enregistré'));
      await page.click('details summary');
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Envoyer mon ressenti'))?.click());
      await page.waitForFunction(() => !document.body.textContent?.includes('Donner mon ressenti'));
      console.log('PASS member check-in, habit and deferred session feedback interactions');
    }
    if (width === 390 && role === 'coach') {
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Ajouter une phase'))?.click());
      await page.type('form input[required]', 'Consolidation');
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Enregistrer la phase'))?.click());
      await page.waitForFunction(() => document.body.textContent?.includes('Consolidation'));
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Créer un modèle'))?.click());
      const forms = await page.$$('form');
      await forms.at(-1).$('input[required]').then(input => input.type('Bilan mobilité'));
      const inputs = await forms.at(-1).$$('input[required]');
      await inputs.at(-1).type('Comment vous sentez-vous ?');
      await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Enregistrer le modèle'))?.click());
      await page.waitForFunction(() => document.body.textContent?.includes('Modèles (2)'));
      console.log('PASS coach phase and template creation interactions');
    }
    await page.close();
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
if (failures) process.exitCode = 1;
