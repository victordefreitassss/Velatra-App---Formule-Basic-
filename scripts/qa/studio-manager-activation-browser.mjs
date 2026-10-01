// Isolated Manager/Owner/Coach navigation and profile-loading fixture. It stubs Firebase and never writes to production.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const work='/private/tmp/velatra-manager-activation-browser';
const evidence=path.join(work,'evidence');
await rm(work,{recursive:true,force:true});await mkdir(evidence,{recursive:true});
const imported=new Set(['auth','db','firebaseConfig','googleProvider','apiFetch','getMessagingClient','getStorageClient','onAuthStateChanged','onSnapshot','getDoc','getDocFromServer','getDocs','doc','collection','query','where','signOut','signInWithEmailAndPassword','setDoc','updateDoc','deleteDoc','addDoc','getDownloadURL','uploadBytes','ref','listAll']);
async function scan(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||['node_modules','dist'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory()){await scan(full);}else if(/\.tsx?$/.test(ent.name)){const source=await readFile(full,'utf8');const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);ast.forEachChild(node=>{const moduleName=node.moduleSpecifier?.text;if(moduleName==='../firebase'||moduleName==='../../firebase'||moduleName==='./firebase'||moduleName?.startsWith('firebase/')){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.add(item.propertyName?.text||item.name.text);}});}}}
await scan(root);
const known=`
const params=new URLSearchParams(location.search);const uid=params.get('role')==='owner'?'context-owner':'context-manager'; window.__qaListeners=[]; window.__qaApi=[]; window.__qaSignouts=0;
const user={uid,email:'owner@example.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};
const profile={id:10,firebaseUid:uid,clubId:'context-club',name:'Coach Test',role:params.get('role')||'manager',onboardingCompleted:true,xp:0,assignedMemberIds:[]};
const club={id:'context-club',ownerId:'context-owner',accountType:params.get('accountType')==='legacy'?undefined:params.get('accountType')||'studio',name:'Club recette',isActive:true,settings:{booking:{enabled:true,schedule:[]}}};
export const auth={currentUser:null};export const db={};export const firebaseConfig={projectId:'demo-velatra'};export const googleProvider={};
const coach={id:11,role:'coach',firebaseUid:'context-coach',clubId:club.id,name:'Coach Lucas',onboardingCompleted:true}; const member={id:901,role:'member',firebaseUid:'context-member',clubId:club.id,name:'Emma Martin',email:'emma@example.test',assignedCoachUid:coach.firebaseUid,status:'active',avatar:'EM',gender:'F',xp:0,streak:0,pointsFidelite:0,createdAt:'2026-09-01',objectifs:[],notes:'',age:30,weight:70,height:175}; const owner={...profile,role:'owner',firebaseUid:'context-owner',name:'Owner Studio'};
const expiredProgram={id:902,clubId:club.id,memberId:member.id,assignedCoachUid:coach.firebaseUid,name:'Cycle historique',nbDays:1,startDate:'2025-01-01',durationWeeks:4,days:[{name:'Jour 1',isCoaching:false,exercises:[]}],completedWeeks:[],currentDayIndex:0};
const docSnap=value=>({id:value.firebaseUid||'fixture',data:()=>value});
const snap=value=>({exists:()=>!!value,data:()=>value,id:value?.firebaseUid||'fixture',docs:Array.isArray(value)?value.map(docSnap):[],forEach:cb=>{if(Array.isArray(value))value.map(docSnap).forEach(cb);},docChanges:()=>[]});
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=(r,...args)=>({...r,args});export const where=(...args)=>args;
export const getDoc=async r=>snap(r.path==='users/'+uid?profile:r.path==='clubs/context-club'?club:undefined);export const getDocFromServer=async r=>snap(r.path==='users/'+uid?profile:undefined);export const getDocs=async()=>snap(undefined);
export function onAuthStateChanged(_auth,cb){const timer=setTimeout(()=>{auth.currentUser=user;cb(user);},50);return()=>clearTimeout(timer);}
export function onSnapshot(r,cb){window.__qaListeners.push(r.path);const value=r.path==='users/'+uid?profile:r.path==='clubs/context-club'?club:r.path==='users'?[owner,profile,coach,member].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i):r.path==='programs'&&profile.role==='manager'?[expiredProgram]:undefined;const timer=setTimeout(()=>cb(snap(value)),r.path==='users/'+uid?80:10);return()=>clearTimeout(timer);}
export async function signOut(){auth.currentUser=null;window.__qaSignouts++;}export const signInWithEmailAndPassword=async()=>({user});
export async function apiFetch(path,opts){window.__qaApi.push({path,body:opts?.body?JSON.parse(opts.body):null});return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});}export const getMessagingClient=async()=>null;export const getStorageClient=async()=>({});
const denied=()=>{throw new Error('Unexpected fixture write');};export const setDoc=denied,updateDoc=denied,deleteDoc=denied,addDoc=denied,uploadBytes=denied;
export const ref=(...args)=>args;export const getDownloadURL=async()=>'about:blank';export const listAll=async()=>({items:[],prefixes:[]});
`;
const defined=new Set([...known.matchAll(/export (?:async )?(?:const|function)\s+(\w+)/g)].map(m=>m[1]));for(const name of ['updateDoc','deleteDoc','addDoc','uploadBytes'])defined.add(name);
const stub=known+[...imported].filter(name=>!defined.has(name)).map(name=>`export const ${name}=(...args)=>({args});`).join('\n');
const entry=path.join(work,'entry.tsx');
await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{HelmetProvider}from'react-helmet-async';import RootApp from '${root}/RootApp';createRoot(document.getElementById('root')).render(<HelmetProvider><BrowserRouter><RootApp/></BrowserRouter></HelmetProvider>);`);
await build({absWorkingDir:root,entryPoints:[entry],outdir:path.join(work,'bundle'),bundle:true,splitting:true,format:'esm',metafile:true,jsx:'automatic',target:'es2022',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"','process.env.APP_URL':'""','import.meta.env':'{"DEV":true,"MODE":"test"}'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^firebase\/|(?:^|\/)firebase$)/},()=>({path:'firebase-fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:stub,loader:'js'}));b.onLoad({filter:/[\\/]App\.tsx$/},async args=>{let source=await readFile(args.path,'utf8');const anchor='const [state, setState] = useState<AppState>(INITIAL_STATE);';if(!source.includes(anchor))throw Error('App fixture instrumentation changed');source=source.replace(anchor,anchor+'\n  (window as any).__qaSetState=setState; (window as any).__qaGetState=()=>state;');return{contents:source,loader:'tsx'};});}}]});
const bundle=path.join(work,'bundle');
const outputList=await readdir(bundle);const jsFile=outputList.find(name=>name.endsWith('.js')&&name.startsWith('entry'));const cssFile=outputList.find(name=>name.endsWith('.css'));
if(!jsFile)throw Error('App entry bundle missing');
const tailwind=await readFile(process.env.VELATRA_QA_TAILWIND_PATH||'/private/tmp/velatra-tailwind-3.4.17.js').catch(async()=>{const response=await fetch('https://cdn.tailwindcss.com');if(!response.ok)throw Error('Tailwind QA runtime unavailable');return Buffer.from(await response.arrayBuffer());});
const index=await readFile(path.join(root,'index.html'),'utf8');const meta=index.match(/<meta name="viewport"[^>]+>/)?.[0]||'';const base=(index.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'').replace(/@import[^;]+;/g,'');
const html=`<!doctype html><html lang="fr"><head>${meta}<script src="/tailwind.js"></script><style>${base}</style>${cssFile?`<link rel="stylesheet" href="/${cssFile}">`:''}</head><body><div id="root"></div><script type="module" src="/${jsFile}"></script></body></html>`;
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[[390,844],[820,1180],[1440,1000]];
let failures=0; const records=[];
const check=async(page,label,width)=>{const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,role:window.__qaGetState().user?.role,club:window.__qaGetState().currentClub?.accountType}));if(result.overflow)failures++;records.push({label,width,...result});await page.screenshot({path:path.join(evidence,`${label}-${width}.png`)});};
const clickText=async(page,text)=>{const clicked=await page.$$eval('button', (buttons,label)=>{const button=buttons.find(button=>button.textContent?.trim()===label);if(!button)return false;button.click();return true;},text);if(!clicked)throw Error(`Missing button: ${text}`);};
try {
  for(const [width,height] of sizes){
    const page=await browser.newPage();page.setDefaultTimeout(15000);await page.setViewport({width,height,isMobile:width<1024,hasTouch:width<1024,deviceScaleFactor:1});await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(origin)?void request.continue():void request.abort());page.on('console',message=>{if(message.type()==='error')console.error('Browser console:',message.text());});page.on('pageerror',error=>{failures++;console.error('Browser error:',error.message);});
    await page.goto(origin+'/dashboard',{waitUntil:'networkidle0'});await page.waitForSelector('.va-rail,.va-mobile-nav');
    const loaded=await page.evaluate(()=>({role:window.__qaGetState().user?.role,club:window.__qaGetState().currentClub?.accountType,signouts:window.__qaSignouts,financialListeners:window.__qaListeners.filter(name=>['plans','subscriptions','payments','invoices','expenses','fixedCosts','manualStats'].includes(name)),financialCalls:window.__qaApi.filter(call=>call.path.includes('stripe')||call.path.includes('billing')),financeLabels:document.body.innerText.includes('CA DU MOIS')}));
    if(loaded.role!=='manager'||loaded.club!=='studio'||loaded.signouts||loaded.financialListeners.length||loaded.financialCalls.length||loaded.financeLabels)failures++;
    records.push({label:'Manager login, tenant and protected data loading',width,...loaded});await check(page,'home',width);
    await clickText(page,'Clients');await page.waitForSelector('.va-members-row');await page.click('.va-members-row');await page.waitForSelector('.va-client-360-action').catch(async error=>{console.error(JSON.stringify(await page.evaluate(()=>({body:document.body.innerText.slice(0,2500),route:history.state,user:window.__qaGetState().user,club:window.__qaGetState().currentClub})),null,2));await page.screenshot({path:path.join(evidence,'client360-error.png')});throw error;});
    if(!await page.evaluate(()=>document.body.innerText.includes('Emma Martin')))failures++;
    await check(page,'client360',width);
    await page.select('#client-360-section','administrative');
    if(await page.evaluate(()=>document.body.innerText.includes('Facturation')))failures++;records.push({label:'Client360 administrative billing hidden',width});
    await page.select('#client-360-section','overview');
    await page.$$eval('.va-client-360-action',buttons=>buttons.find(button=>button.textContent?.trim()==='Programme')?.click());await page.waitForSelector('.va-editor-header');await check(page,'program-editor',width);if(await page.evaluate(()=>[...document.querySelectorAll('button')].some(button=>button.textContent?.trim()==='Démarrer')))failures++;await page.click('button[aria-label="Quitter l’éditeur"]');await page.waitForSelector('.va-members-row');await page.click('.va-members-row');await page.waitForSelector('.va-client-360-action');
    await page.$$eval('.va-client-360-action',buttons=>buttons.find(button=>button.textContent?.includes('Planifier'))?.click());
    await page.waitForFunction(()=>document.body.innerText.includes('Réservation pour Emma Martin'));await check(page,'planning',width);
    await clickText(page,'Business');await page.waitForFunction(()=>history.state?.usr?.velatraPage==='crm_pipeline');await check(page,'crm',width);
    // Secondary destinations use the existing contextual menu on small screens.
    if(!await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Équipe'))){
      const opened=await page.$$eval('button',buttons=>{const button=buttons.find(b=>b.getAttribute('aria-label')?.includes('destinations')||b.textContent?.trim()==='Plus');button?.click();return !!button;});
      if(!opened)throw Error('Manager secondary menu inaccessible');
    }
    await clickText(page,'Équipe');await page.waitForSelector('select[aria-label="Rôle du collaborateur"]');
    const team=await page.evaluate(()=>({roles:[...document.querySelector('select[aria-label="Rôle du collaborateur"]').options].map(o=>o.value),owner:document.body.innerText.includes('Owner Studio'),coach:document.body.innerText.includes('Coach Lucas')}));if(team.roles.join(',')!=='coach'||!team.owner||!team.coach)failures++;records.push({label:'Manager Team Coach-only provisioning',width,...team});await check(page,'team',width);
    await page.type('form input:not([type="email"]):not([type="password"])','QA Coach');await page.type('form input[type="email"]','qa@example.test');await page.type('form input[type="password"]','Local-password-2026!');await page.$eval('form',form=>form.requestSubmit());await page.waitForFunction(()=>window.__qaApi.some(c=>c.path==='/api/create-staff'));
    await page.evaluate(()=>window.__qaSetState(s=>({...s,page:'crm_finances'})));await page.waitForFunction(()=>!document.body.innerText.includes('Cockpit financier'));await check(page,'denied-finances',width);
    await page.evaluate(()=>window.__qaSetState(s=>({...s,page:'drive'})));await page.waitForFunction(()=>!document.body.innerText.includes('Mes documents'));await check(page,'documents',width);
    await page.close();
  }
  for(const [width,height] of sizes){
    const page=await browser.newPage();await page.setViewport({width,height});await page.goto(origin+'/dashboard?role=owner',{waitUntil:'networkidle0'});await page.waitForSelector('.va-rail,.va-mobile-nav');await clickText(page,'Business');await clickText(page,'Équipe');await page.waitForSelector('select[aria-label="Rôle du collaborateur"]');
    const roles=await page.$eval('select[aria-label="Rôle du collaborateur"]',select=>[...select.options].map(option=>option.value));if(roles.join(',')!=='coach,manager')failures++;records.push({label:'Owner Team Coach and Manager provisioning',width,roles});await check(page,'owner-team',width);
    await page.select('select[aria-label="Rôle du collaborateur"]','manager');await page.type('form input:not([type="email"]):not([type="password"])','QA Manager');await page.type('form input[type="email"]','manager@example.test');await page.type('form input[type="password"]','Local-password-2026!');await page.$eval('form',form=>form.requestSubmit());await page.waitForFunction(()=>window.__qaApi.some(c=>c.path==='/api/create-manager'&&!c.body.role));await page.close();
    const coachPage=await browser.newPage();await coachPage.setViewport({width,height});await coachPage.goto(origin+'/dashboard?role=coach',{waitUntil:'networkidle0'});await coachPage.waitForSelector('.va-rail,.va-mobile-nav');const forbidden=await coachPage.evaluate(()=>window.__qaListeners.filter(p=>['expenses','fixedCosts','manualStats'].includes(p)));if(forbidden.length)failures++;await coachPage.evaluate(()=>window.__qaSetState(s=>({...s,page:'settings'})));await check(coachPage,'coach-denied-settings',width);if(await coachPage.evaluate(()=>document.body.innerText.includes('Configuration Stripe')))failures++;await coachPage.close();
  }
  for(const accountType of ['solo','legacy']){
    const page=await browser.newPage();await page.goto(origin+'/dashboard?accountType='+accountType,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__qaSignouts>0);const invalid=await page.evaluate(()=>({signouts:window.__qaSignouts,role:window.__qaGetState().user?.role,tenantListeners:window.__qaListeners.filter(p=>p!=='users/context-manager')}));if(invalid.role||invalid.tenantListeners.length)failures++;records.push({label:'Invalid Manager '+accountType,...invalid});await page.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(evidence,'results.json'),JSON.stringify({checks:records,failures,environment:'Puppeteer isolated Firebase fixture; API authorization verified separately on local emulators'},null,2));}
console.log(JSON.stringify({checks:records.length,failures,evidence},null,2));if(failures)process.exitCode=1;
