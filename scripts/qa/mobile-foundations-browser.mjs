// Component-level browser regression suite. No real Firebase/service is contacted.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import ts from 'typescript';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const output = path.join(root, 'mobile-review-evidence');
const work = path.join(root, '.runtime-test-mobile-browser');
await mkdir(output, { recursive: true });
await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });
const importedFirebaseNames = new Set(['auth', 'db', 'firebaseConfig', 'googleProvider', 'apiFetch', 'getMessagingClient', 'getStorageClient', 'onAuthStateChanged', 'onSnapshot', 'getDoc', 'getDocFromServer', 'getDocs', 'doc', 'collection', 'query', 'where', 'signOut', 'signInWithEmailAndPassword', 'setDoc', 'updateDoc', 'deleteDoc', 'addDoc', 'getDownloadURL', 'uploadBytes', 'ref', 'listAll']);
async function scan(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.') || ['node_modules', 'dist', 'mobile-review-evidence'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (dir === root && !['components','pages','services'].includes(ent.name)) continue; await scan(full); }
    else if (/\.tsx?$/.test(ent.name)) {
      const source = ts.createSourceFile(full, await readFile(full, 'utf8'), ts.ScriptTarget.Latest, true);
      source.forEachChild(node => {
        if (!ts.isImportDeclaration(node) || !/firebase(?:\/|$)/.test(node.moduleSpecifier.text)) return;
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) importedFirebaseNames.add(item.propertyName?.text || item.name.text);
      });
    }
  }
}
await scan(root);
const known = `
const params = new URLSearchParams(location.search);
const role = params.get('qaRole') || 'owner';
const uid = 'mobile-review-' + role;
const user = role === 'anonymous' ? null : { uid, email: role + '@example.invalid', emailVerified: true, getIdToken: async () => 'local-fixture-not-a-token' };
const profile = { id: role === 'member' ? 901 : 900, firebaseUid: uid, clubId: '654321', name: 'Compte de recette', role, onboardingCompleted: true, xp: 0, assignedMemberIds: [], assignedCoachUid: null };
const club = { id: '654321', name: 'Club fictif', ownerUid: 'mobile-review-owner', plan: 'basic', isActive: true, settings: { booking: {enabled:true} } };
export const auth = { currentUser: null };
export const db = {};
export const firebaseConfig = { projectId: 'demo-velatra' };
export const googleProvider = {};
const listeners = new Set();
export function onAuthStateChanged(_auth, cb) { listeners.add(cb); const t=setTimeout(()=>{auth.currentUser=user; cb(user);},80); return ()=>{clearTimeout(t);listeners.delete(cb)}; }
export async function signOut() { auth.currentUser=null; for(const cb of listeners) cb(null); }
window.__qaSignOut = signOut;
const snap = value => ({exists:()=>Boolean(value), data:()=>value, id: value?.firebaseUid || 'fixture', docs:[], forEach:()=>{}, docChanges:()=>[]});
export const doc = (_db, ...parts) => ({path:parts.join('/')});
export const collection = doc;
export const query = (r,...args)=>({...r,query:true,args});
export const where = (...args)=>args;
export const getDoc = async r => snap(r.path?.startsWith('clubs/') ? club : undefined);
export const getDocFromServer = async () => snap(undefined);
export const getDocs = async () => snap(undefined);
export function onSnapshot(r, cb) { const value = r.path === 'users/'+uid ? profile : r.path === 'clubs/654321' ? club : undefined; const t=setTimeout(()=>cb(snap(value)), r.path==='users/'+uid?350:5);return()=>clearTimeout(t); }
export async function apiFetch() { return new Response(JSON.stringify({assignedMemberIds:[],checkIn:null}),{status:200,headers:{'Content-Type':'application/json'}}); }
export const getMessagingClient = async () => null;
export const getStorageClient = async () => ({});
const denied = () => { throw new Error('Unexpected fixture write; no production allowed'); };
export const setDoc=denied,updateDoc=denied,deleteDoc=denied,addDoc=denied,uploadBytes=denied;
export const ref = (...args) => args;
export const getDownloadURL = async () => 'about:blank';
export const listAll = async () => ({items:[],prefixes:[]});
export const signInWithEmailAndPassword = async () => ({user});
`;
const defined = new Set([...known.matchAll(/export (?:async )?(?:const|function)\s+(\w+)/g)].map(m=>m[1]));
for(const n of ['updateDoc','deleteDoc','addDoc','uploadBytes']) defined.add(n);
const stub = known + [...importedFirebaseNames].filter(n=>!defined.has(n)).map(n=>`export const ${n} = (...args) => ({ args });`).join('\n');

const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import {HelmetProvider} from 'react-helmet-async';
import RootApp from '../RootApp';
import {Input, Textarea} from '../components/UI';
function Probe(){const [open,setOpen]=React.useState(false);window.__qaPortal=setOpen;return open?createPortal(<div className="qa-portal" style={{position:'fixed',inset:'100px 20px auto',zIndex:9999,background:'white',padding:20}}><Input aria-label="Champ modal QA"/><Textarea aria-label="Notes QA"/></div>,document.body):null;}
createRoot(document.getElementById('root')).render(<HelmetProvider><BrowserRouter><RootApp/><Probe/></BrowserRouter></HelmetProvider>);
`;
await writeFile(path.join(work, 'entry.tsx'), entry);
const result = await build({
  absWorkingDir: root, entryPoints: [path.join(work, 'entry.tsx')], outdir: path.join(work,'bundle'), bundle:true, splitting:true, format:'esm', metafile:true, jsx:'automatic', target:'es2022',
  define:{'process.env.NODE_ENV':'"production"','process.env.APP_URL':'""','import.meta.env':'{"DEV":true,"MODE":"test"}'},
  plugins:[{name:'no-live-services',setup(b){
    b.onResolve({filter:/(?:^firebase\/|(?:^|\/)firebase$)/},()=>({path:'firebase-fixture',namespace:'qa'}));
    b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:stub,loader:'js'}));
    b.onLoad({filter:/[\\/]App\.tsx$/},async args=>{
      let source=await readFile(args.path,'utf8');
      const anchor='const [state, setState] = useState<AppState>(INITIAL_STATE);';
      if(!source.includes(anchor)) throw new Error('App fixture instrumentation anchor changed');
      source=source.replace(anchor,anchor+'\n  (window as any).__qaSetState = setState;');
      return {contents:source,loader:'tsx'};
    });
  }}]
});
const bundleDir=path.join(work,'bundle');
const destinationPaths=['pages/CalendarPage.tsx','pages/StatsPage.tsx','pages/MemberNutritionPage.tsx','pages/MembersPage.tsx','pages/CoachingPage.tsx','pages/ProspectFlowPage.tsx','pages/PlanningPage.tsx'];
const destinations=new Map(Object.entries(result.metafile.outputs).filter(([,v])=>destinationPaths.includes(v.entryPoint)).map(([k,v])=>[path.basename(k),v.entryPoint]));
const overlayChunks=Object.entries(result.metafile.outputs).filter(([,v])=>['components/WorkoutView.tsx','components/CoachingSessionView.tsx','components/Editor.tsx'].includes(v.entryPoint)).map(([k,v])=>({file:path.basename(k),entry:v.entryPoint}));
await writeFile(path.join(output,'bundle-map.json'),JSON.stringify({destinations:[...destinations],overlayChunks},null,2));
// Use the app's actual Tailwind runtime; local copy for a network-isolated renderer.
const tailwindResponse = await fetch('https://cdn.tailwindcss.com');
if(!tailwindResponse.ok) throw new Error('Cannot acquire current production Tailwind runtime for faithful CSS checks');
const tailwind = await tailwindResponse.text();
const originalHtml = await readFile(path.join(root,'index.html'),'utf8');
const baseStyle=(originalHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'').replace(/@import[^;]+;/g,'');
const html='<!doctype html><html lang="fr"><head>'+originalHtml.match(/<meta name="viewport"[^>]+>/)[0]+'<script src="/qa-tailwind.js"></script><style>'+baseStyle+'</style><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const requestLog=[];
let delayModules=false;
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/qa-tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}
    if(pathname.endsWith('.js')||pathname.endsWith('.css')){
      requestLog.push({file:path.basename(pathname),at:Date.now()});
      if(delayModules&&overlayChunks.some(c=>c.file===path.basename(pathname))) await new Promise(r=>setTimeout(r,800));
      const file=path.join(bundleDir,path.basename(pathname));
      res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(file));return;
    }
    if(pathname.startsWith('/brand/')){res.setHeader('Content-Type','image/png');res.end(await readFile(path.join(root,'public',pathname)));return;}
    res.setHeader('Content-Type','text/html');res.end(html);
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];
const record=(name,ok,detail)=>{checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}: ${JSON.stringify(detail)}`);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let page;
async function open(role='owner',width=390,height=844,{saveData=false,url='/dashboard',top=44,bottom=34}={}){
  if(page)await page.close();
  page=await browser.newPage();
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const cdp=await page.createCDPSession();
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,bottom,left:0,right:0}});
  await page.evaluateOnNewDocument((saveData)=>{
    Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData,effectiveType:saveData?'2g':'4g'}});
    window.__qaRoutes=[location.pathname];
    for(const name of ['pushState','replaceState']){const original=history[name].bind(history);history[name]=(...args)=>{const result=original(...args);window.__qaRoutes.push(location.pathname);return result;};}
  },saveData);
  await page.setRequestInterception(true);
  page.on('request',req=>{if(req.url().startsWith(origin)||req.url().startsWith('data:')||req.url().startsWith('blob:'))void req.continue();else void req.abort();});
  page.on('pageerror',error=>console.log('BROWSER ERROR',error.message));
  const since=Date.now();
  await page.goto(origin+url+'?qaRole='+role,{waitUntil:'networkidle0',timeout:45000});
  return since;
}
const program={id:930,memberId:901,clubId:'654321',name:'Recette mobile',nbDays:1,currentDayIndex:0,days:[{name:'Séance test',exercises:[{exId:1,sets:3,reps:'8',rest:'90s',type:'normal'}]}]};
const member={id:901,firebaseUid:'mobile-review-member',name:'Membre fictif',clubId:'654321',role:'member',onboardingCompleted:true};
const ex={id:1,name:'Développé couché',cat:'Poitrine',perfId:1};
async function loadEditor(){
  await page.evaluate(program=>window.__qaSetState(s=>({...s,editingProg:null,editingPreset:{...program},exercises:[{id:1,name:'Développé couché',cat:'Poitrine'}]})),program);
}
try{
  const manifest=JSON.parse(await readFile(path.join(root,'public/manifest.json'),'utf8'));
  record('manifest launches dashboard within root scope',manifest.start_url==='/dashboard'&&manifest.scope==='/',manifest);
  await open('anonymous');
  record('anonymous launch settles on login',await page.evaluate(()=>location.pathname==='/login'),await page.evaluate(()=>window.__qaRoutes));
  await open('owner');
  record('restoring authenticated profile does not flash login',await page.evaluate(()=>!window.__qaRoutes.includes('/login')),await page.evaluate(()=>window.__qaRoutes));
  await page.waitForSelector('.va-topbar');
  const coachTop=await page.$eval('.va-topbar',el=>parseFloat(getComputedStyle(el).paddingTop));
  record('coach header has one safe inset',coachTop>=53&&coachTop<60,coachTop);
  await page.evaluate(()=>window.__qaPortal(true));
  const portal=await page.$$eval('.qa-portal input,.qa-portal textarea',els=>els.map(el=>parseFloat(getComputedStyle(el).fontSize)));
  record('portal fields retain mobile 16px minimum',portal.every(n=>n>=16),portal);
  await page.evaluate(()=>window.__qaPortal(false));
  await page.evaluate(()=>{window.__qaMaxPages=0;window.__qaTracking=true;function sample(){if(!window.__qaTracking)return;window.__qaMaxPages=Math.max(window.__qaMaxPages,document.querySelectorAll('.va-content').length);requestAnimationFrame(sample);}sample();window.__qaSetState(s=>({...s,page:'users'}));});
  await wait(450);
  await page.evaluate(()=>{window.__qaTracking=false;});
  record('navigation never mounts two content pages',await page.evaluate(()=>window.__qaMaxPages===1),await page.evaluate(()=>window.__qaMaxPages));
  delayModules=true;
  await loadEditor();
  await wait(120);
  const editorNav=await page.$eval('.va-topbar',el=>getComputedStyle(el).display!=='none');
  record('editor loading preserves navigation',editorNav,await page.evaluate(()=>({nav:getComputedStyle(document.querySelector('.va-topbar')).display,pending:!!document.querySelector('.va-content-loading')})));
  await page.waitForSelector('.va-editor-header');
  const editorFields=await page.$$eval('.va-editor-page input,.va-editor-page select,.va-editor-page textarea',els=>els.filter(el=>el.getClientRects().length&&el.type!=='checkbox').map(el=>({font:parseFloat(getComputedStyle(el).fontSize),label:el.getAttribute('aria-label')||el.type})));
  record('editor visible fields are 16px minimum',editorFields.every(f=>f.font>=16),editorFields);
  await page.screenshot({path:path.join(output,'editor-390.png')});
  delayModules=false;
  await open('member');
  const memberTop=await page.$eval('.va-topbar',el=>parseFloat(getComputedStyle(el).paddingTop));
  record('member header has one safe inset',memberTop>=50&&memberTop<60,memberTop);
  await page.screenshot({path:path.join(output,'member-390.png')});
  delayModules=true;
  await page.evaluate(({program,member,ex})=>window.__qaSetState(s=>({...s,programs:[program],exercises:[ex],workout:program,workoutMember:member})),{program,member,ex});
  await wait(150);
  record('workout lazy-load does not remove shell',await page.$('.va-mobile-nav')!==null,await page.evaluate(()=>({shell:!!document.querySelector('.va-mobile-nav'),globalFallback:document.body.textContent.includes('Chargement de votre espace')})));
  await page.waitForSelector('.va-workout[open]');
  const workoutTop=await page.$eval('.va-workout-header',el=>parseFloat(getComputedStyle(el).paddingTop));
  record('workout header accounts for safe inset',workoutTop>=58,workoutTop);
  await page.screenshot({path:path.join(output,'workout-390.png')});
  delayModules=false;
  const since=await open('owner',390,844,{saveData:true});
  await wait(2200);
  const loaded=requestLog.filter(r=>r.at>=since&&destinations.has(r.file)).map(r=>destinations.get(r.file));
  record('save-data connection avoids speculative page downloads',loaded.length===0,loaded);
  const actualRoot=await page.evaluate(()=>document.documentElement.getAttribute('data-va-app'));
  record('application context includes portal styling',actualRoot==='true',actualRoot);
  await page.evaluate(()=>window.__qaSignOut());await wait(600);
  record('logout settles on login without loop',await page.evaluate(()=>location.pathname==='/login'),await page.evaluate(()=>window.__qaRoutes));
}catch(error){record('browser suite completed',false,{error:error.stack});}
finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(output,'results.json'),JSON.stringify({base:'PR7',renderer:'Puppeteer Chromium; synthetic 44px/34px insets; isolated Firebase fixture, NOT device validation',checks},null,2));}
if(checks.some(c=>!c.ok)) process.exitCode=1;
