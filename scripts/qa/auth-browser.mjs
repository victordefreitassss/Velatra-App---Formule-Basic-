// Real RootApp auth UI with isolated Firebase provider outcomes. External requests are blocked; OAuth itself is not simulated as a live Google login.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const work=path.join(tmpdir(),'velatra-auth-browser');
const evidence=process.env.VELATRA_AUTH_QA_OUTPUT || path.join(work,'evidence');
await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});await mkdir(evidence,{recursive:true});
const imported=new Set(['auth','db','firebaseConfig','googleProvider','apiFetch','getMessagingClient','getStorageClient','onAuthStateChanged','onSnapshot','getDoc','getDocFromServer','getDocs','doc','collection','query','where','signOut','signInWithEmailAndPassword','setDoc','updateDoc','deleteDoc','addDoc','getDownloadURL','uploadBytes','ref','listAll']);
async function scan(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||['node_modules','dist'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory()){await scan(full);}else if(/\.tsx?$/.test(ent.name)){const source=await readFile(full,'utf8');const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);ast.forEachChild(node=>{const moduleName=node.moduleSpecifier?.text;if(moduleName==='../firebase'||moduleName==='../../firebase'||moduleName==='./firebase'||moduleName?.startsWith('firebase/')){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.add(item.propertyName?.text||item.name.text);}});}}}
await scan(root);
const known=`
const params=new URLSearchParams(location.search);
window.__qaCalls=[];window.__qaWrites=[];window.__qaConfig={google:'new',emailError:'',resetError:'',delay:60,inviteStatus:200};
const listeners=new Set(),subscriptions=new Set();
let saved=JSON.parse(sessionStorage.getItem('auth-qa-session')||'null');
let profile=saved?.profile||null,club=saved?.club||null;
const hydrate=u=>u?{...u,getIdToken:async()=> 'qa-isolated-token'}:null;
export const auth={currentUser:hydrate(saved?.user)};export const db={};export const firebaseConfig={projectId:'demo-velatra'};export const googleProvider={};
const persist=()=>sessionStorage.setItem('auth-qa-session',JSON.stringify({user:auth.currentUser,profile,club}));
const snap=v=>({exists:()=>!!v,data:()=>v,id:v?.firebaseUid||v?.id||'fixture',docs:Array.isArray(v)?v.map(x=>({id:String(x.id),data:()=>x})):[],forEach:fn=>{if(Array.isArray(v))v.forEach(x=>fn({id:String(x.id),data:()=>x}));},docChanges:()=>[]});
const value=r=>r.path?.startsWith('users/')?profile:r.path?.startsWith('clubs/')?club:r.path==='users'?(profile?[profile]:[]):[];
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=(r,...args)=>({...r,args});export const where=(...args)=>args;
export const getDoc=async r=>snap(value(r));export const getDocFromServer=async r=>{if(window.__qaConfig.profileError)throw Error('offline');return snap(value(r));};export const getDocs=async()=>snap([]);
export function onSnapshot(r,cb){const sub={r,cb};subscriptions.add(sub);const timer=setTimeout(()=>cb(snap(value(r))),30);return()=>{clearTimeout(timer);subscriptions.delete(sub);};}
export function onAuthStateChanged(_auth,cb){listeners.add(cb);const timer=setTimeout(()=>cb(auth.currentUser),10);return()=>{clearTimeout(timer);listeners.delete(cb);};}
const notify=()=>{persist();for(const cb of listeners)cb(auth.currentUser);};
const user=(email='alex@example.test',google=false)=>hydrate({uid:'auth-fixture-uid',email,emailVerified:google,displayName:google?'Alex Martin':null,providerData:[{providerId:google?'google.com':'password'}]});
function existing(role='owner',suspended=false,active=true){profile={id:900,firebaseUid:'auth-fixture-uid',name:'Alex Martin',email:'alex@example.test',clubId:'auth-fixture-club',role,isSuspended:suspended,onboardingCompleted:true,xp:0,assignedMemberIds:[]};club={id:'auth-fixture-club',name:'Studio Fixture',ownerId:'auth-fixture-uid',accountType:'studio',isActive:active,plan:'basic',canAddStaff:false};}
const delay=()=>new Promise(r=>setTimeout(r,window.__qaConfig.delay));
export async function signInWithEmailAndPassword(_auth,email){window.__qaCalls.push({type:'email'});await delay();if(window.__qaConfig.emailError)throw{code:window.__qaConfig.emailError};existing(window.__qaConfig.role||'owner',!!window.__qaConfig.suspended,window.__qaConfig.active!==false);auth.currentUser=user(email);notify();return{user:auth.currentUser};}
export async function signInWithPopup(){window.__qaCalls.push({type:'google'});await delay();if(window.__qaConfig.google.startsWith('auth/'))throw{code:window.__qaConfig.google};if(window.__qaConfig.google==='existing')existing();else{profile=null;club=null;}auth.currentUser=user('alex@gmail.com',true);notify();return{user:auth.currentUser};}
export async function createUserWithEmailAndPassword(_auth,email){window.__qaCalls.push({type:'createEmail'});await delay();auth.currentUser=user(email);profile=null;club=null;notify();return{user:auth.currentUser};}
export async function signOut(){window.__qaCalls.push({type:'logout'});auth.currentUser=null;notify();}
window.__qaLogout=signOut;
export async function sendPasswordResetEmail(_auth,email){window.__qaCalls.push({type:'reset',email});await delay();if(window.__qaConfig.resetError)throw{code:window.__qaConfig.resetError};}
export async function apiFetch(path,opts){window.__qaCalls.push({type:'api',path,body:opts?.body?JSON.parse(opts.body):undefined});if(path==='/api/register-club'){
 const body=JSON.parse(opts.body);if(window.__qaConfig.inviteStatus!==200)return new Response('{}',{status:window.__qaConfig.inviteStatus});
 if(profile)return new Response('{}',{status:409});existing();profile.name=body.ownerName;profile.email=auth.currentUser.email;club.accountType=body.accountType;club.name=body.clubName;persist();setTimeout(()=>{for(const sub of subscriptions)sub.cb(snap(value(sub.r)));},70);return new Response(JSON.stringify({success:true,clubId:club.id,accountType:body.accountType}));
 }if(opts?.method&&opts.method!=='GET')throw Error('Unexpected fixture mutation '+path);
 const body=path.includes('/pulse?')?{actions:[],categories:[],total:0,nextCursor:null,partialSources:[],onboardingSummary:'Premiers pas',generatedAt:new Date().toISOString()}:path.includes('assigned-members')?{assignedMemberIds:[]}:path.includes('/notifications')?{count:0,items:[],nextCursor:null}:path.includes('/priorities')?{priorities:[],dueCount:0}:path.includes('/followup')?{journey:null,assignments:[],responses:[],habits:[],entries:[],logs:[]}:{};
 return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}
export const getMessagingClient=async()=>null;export const getStorageClient=async()=>({});
export const setDoc=()=>{throw Error('Direct Firestore write forbidden');};export const updateDoc=setDoc;export const deleteDoc=setDoc;export const addDoc=setDoc;export const uploadBytes=setDoc;
export const ref=(...args)=>args;export const getDownloadURL=async()=> 'about:blank';export const listAll=async()=>({items:[],prefixes:[]});
`;
const defined=new Set([...known.matchAll(/export (?:async )?(?:const|function)\s+(\w+)/g)].map(m=>m[1]));for(const name of ['updateDoc','deleteDoc','addDoc','uploadBytes'])defined.add(name);
const stub=known+[...imported].filter(name=>!defined.has(name)).map(name=>`export const ${name}=(...args)=>({args});`).join('\n');
const entry=path.join(work,'entry.tsx');
await writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{HelmetProvider}from'react-helmet-async';import RootApp from '${root}/RootApp';createRoot(document.getElementById('root')).render(<HelmetProvider><BrowserRouter><RootApp/></BrowserRouter></HelmetProvider>);`);
await build({absWorkingDir:root,entryPoints:[entry],outdir:path.join(work,'bundle'),bundle:true,splitting:true,format:'esm',metafile:true,jsx:'automatic',target:'es2022',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"','process.env.APP_URL':'""','import.meta.env':'{"DEV":true,"MODE":"test"}'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^firebase\/|(?:^|\/)firebase$)/},()=>({path:'firebase-fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:stub,loader:'js'}));b.onLoad({filter:/[\\/]App\.tsx$/},async args=>{let source=await readFile(args.path,'utf8');const anchor='const [state, setState] = useState<AppState>(INITIAL_STATE);';if(!source.includes(anchor))throw Error('App fixture instrumentation changed');source=source.replace(anchor,anchor+'\n  (window as any).__qaSetState=setState; (window as any).__qaGetState=()=>state;');return{contents:source,loader:'tsx'};});}}]});
const bundle=path.join(work,'bundle');
const outputList=await readdir(bundle);const jsFile=outputList.find(name=>name.endsWith('.js')&&name.startsWith('entry'));const cssFile=outputList.find(name=>name.endsWith('.css'));
if(!jsFile)throw Error('App entry bundle missing');
const tailwind=await readFile(process.env.VELATRA_QA_TAILWIND_PATH||path.join(tmpdir(),'velatra-tailwind-3.4.17.js')).catch(async()=>{const response=await fetch('https://cdn.tailwindcss.com');if(!response.ok)throw Error('Tailwind QA runtime unavailable');return Buffer.from(await response.arrayBuffer());});
const index=await readFile(path.join(root,'index.html'),'utf8');const meta=index.match(/<meta name="viewport"[^>]+>/)?.[0]||'';const base=(index.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'').replace(/@import[^;]+;/g,'');
const html=`<!doctype html><html lang="fr"><head>${meta}<script src="/tailwind.js"></script><style>${base}</style>${cssFile?`<link rel="stylesheet" href="/${cssFile}">`:''}</head><body><div id="root"></div><script type="module" src="/${jsFile}"></script></body></html>`;
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/brand/') && /\.(png|webp)$/.test(pathname)){const asset=path.resolve(root,'public',pathname.slice(1));if(!asset.startsWith(path.join(root,'public','brand')+path.sep)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',pathname.endsWith('.png')?'image/png':'image/webp');res.end(await readFile(asset));return;}if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];let page;
const check=(name,ok,detail)=>{checks.push({name,ok,detail});console.log((ok?'PASS ':'FAIL ')+name);if(!ok)console.log(detail);};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function open(url='/login',width=1440,height=960){
 if(page)await page.close();page=await browser.newPage();page.setDefaultTimeout(12000);await page.setViewport({width,height,deviceScaleFactor:1});
 await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());
 page.on('pageerror',e=>check('No runtime error',false,e.message));
 await page.goto(origin+url,{waitUntil:'networkidle0'});await page.waitForSelector('#auth-title');await page.waitForFunction(()=>!document.querySelector('.va-auth-submit,.va-auth-choice')?.disabled);
}
const click=async text=>{const h=await page.evaluateHandle(t=>[...document.querySelectorAll('button,a')].find(e=>e.offsetHeight&&(e.textContent.trim()===t||e.getAttribute('aria-label')===t)),text);const e=h.asElement();assert.ok(e,'Missing '+text);await e.click();await h.dispose();};
const fill=async(sel,value)=>{await page.$eval(sel,e=>{e.value='';});await page.type(sel,value);};
const config=async value=>page.evaluate(v=>Object.assign(window.__qaConfig,v),value);
const title=async()=>page.$eval('#auth-title',e=>e.textContent);
async function emailLogin(){await page.type('#login-email','alex@example.test');await page.type('#login-password','Fixture-password-123');await click('Se connecter');}
async function app(){await page.waitForFunction(()=>location.pathname==='/dashboard');await page.waitForSelector('[data-experience]');}
async function registration(type,google=false){
 await click(type==='solo'?'Je suis coach indépendant':'Je gère une salle ou un studio');await page.waitForSelector('#signup-invite');
 if(!google){await page.type('#signup-first-name','Alex');await page.type('#signup-last-name','Martin');await page.type('#signup-email','new@example.test');await page.type('#signup-password','Fixture-password-123');await page.type('#signup-confirmation','Fixture-password-123');}
 if(type==='studio')await page.type('#signup-studio','Studio Fixture');await page.type('#signup-invite','fixture-invite');
}
try {
 for(const [width,height] of [[320,700],[390,844],[768,1024],[1024,768],[1440,960],[1920,1080]]){
  await open('/login',width,height);const shape=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,labels:[...document.querySelectorAll('input')].every(i=>document.querySelector('label[for="'+i.id+'"]')),scene:getComputedStyle(document.querySelector('.va-auth-story')).backgroundImage,providers:[...document.querySelectorAll('.va-auth-google')].length}));
  check(`Login ${width}px responsive, labels and single provider`,!shape.overflow&&shape.labels&&shape.providers===1&&(!width||width>=768||shape.scene==='none'),shape);
  if([390,768,1440].includes(width))await page.screenshot({path:path.join(evidence,`login-${width}.png`),fullPage:true});
 }
 await open();await page.focus('#login-password');await page.keyboard.press('Tab');await page.keyboard.press('Enter');check('Password visibility keyboard toggle',await page.$eval('#login-password',e=>e.type==='text'));await page.keyboard.press('Enter');check('Password masked again',await page.$eval('#login-password',e=>e.type==='password'));
 for(const code of ['auth/wrong-password','auth/user-not-found','auth/user-disabled','auth/network-request-failed']){
  await open();await config({emailError:code});await emailLogin();await page.waitForSelector('[role="alert"]');const text=await page.$eval('[role="alert"]',e=>e.textContent);check('Email error '+code,!text.includes('auth/')&&(code.includes('password')||code.includes('not-found')?text==='Adresse e-mail ou mot de passe incorrect.':text.length>15),text);
 }
 await open();await config({delay:450});await emailLogin();await page.evaluate(()=>document.querySelector('form').requestSubmit());await app();check('Email success and duplicate submit blocked',await page.evaluate(()=>window.__qaCalls.filter(c=>c.type==='email').length===1));
 await page.reload({waitUntil:'networkidle0'});await app();check('Refresh keeps same profile',await page.evaluate(()=>window.__qaGetState().user.firebaseUid==='auth-fixture-uid'));
 await page.evaluate(()=>window.__qaLogout());await page.waitForSelector('#login-email');check('Logout returns to login',await page.evaluate(()=>location.pathname==='/login'));await emailLogin();await app();check('Login after logout',true);
 await open();await config({suspended:true});await emailLogin();await page.waitForFunction(()=>document.body.innerText.includes('Ce compte n’est actuellement pas accessible.'));check('Suspended user never enters app',await page.evaluate(()=>!window.__qaGetState().user&&location.pathname==='/login'));
 await open();await config({active:false});await emailLogin();await page.waitForFunction(()=>document.body.innerText.includes('Compte Suspendu'));check('Suspended organization blocked',await page.$('[data-experience]')===null);
 await open();await config({google:'existing'});await click('Continuer avec Google');await app();check('Existing Google uses Velatra profile',await page.evaluate(()=>window.__qaGetState().user.role==='owner'&&!window.__qaCalls.some(c=>c.path==='/api/register-club')));
 for(const code of ['auth/popup-closed-by-user','auth/account-exists-with-different-credential','auth/popup-blocked','auth/unauthorized-domain']){
  await open();await config({google:code});await click('Continuer avec Google');await page.waitForFunction(()=>!document.querySelector('.va-auth-google').disabled);const alert=await page.$('[role="alert"]');check('Google '+code,code.includes('closed')?!alert:!!alert);check('Google error cannot provision',await page.evaluate(()=>!window.__qaCalls.some(c=>c.path==='/api/register-club')));
 }
 for(const google of [false,true])for(const type of ['solo','studio']){
  await open(google?'/login':'/register');if(google){await config({delay:400});await click('Continuer avec Google');await page.evaluate(()=>document.querySelector('.va-auth-google')?.click());await page.waitForFunction(()=>document.getElementById('auth-title')?.textContent==='Finaliser mon inscription');check('Google no tenant before explicit selection',await page.evaluate(()=>!window.__qaCalls.some(c=>c.path==='/api/register-club')&&window.__qaCalls.filter(c=>c.type==='google').length===1));}
  if(google&&type==='studio'){await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>document.getElementById('auth-title')?.textContent==='Finaliser mon inscription');check('Pending Google signup survives refresh',true);}
  await registration(type,google);
  check(`Signup ${type} ${google?'Google':'email'} minimal fields`,google?await page.$('#signup-email')===null&&await page.$('#signup-password')===null&&await page.$('#signup-first-name')===null:await page.$('#signup-confirmation')!==null);
  if(!google&&type==='solo'){await fill('#signup-confirmation','Different-123');await click('Créer mon espace');await page.waitForSelector('[role="alert"]');check('Password confirmation rejects mismatch before Auth call',await page.evaluate(()=>!window.__qaCalls.some(c=>c.type==='createEmail')));await fill('#signup-confirmation','Fixture-password-123');}
  if(!google&&type==='studio'){
   await config({inviteStatus:403});await click('Créer mon espace');await page.waitForFunction(()=>document.body.innerText.includes('bêta est invalide'));check('Invalid invitation keeps form and session for retry',await page.$('#signup-invite')!==null);await config({inviteStatus:200});
  }
  if(type==='studio')await page.screenshot({path:path.join(evidence,`signup-${google?'google':'email'}-1440.png`),fullPage:true});
  await click('Créer mon espace');await app();
  const result=await page.evaluate(()=>({payload:window.__qaCalls.filter(c=>c.path==='/api/register-club').at(-1)?.body,creates:window.__qaCalls.filter(c=>c.type==='createEmail').length,state:window.__qaGetState().currentClub}));
  check(`Signup ${type} ${google?'Google':'email'} server payload only`,Object.keys(result.payload).sort().join(',')==='accountType,clubName,inviteCode,ownerName'&&result.payload.accountType===type&&result.creates===(google?0:1),result);
  check(`Signup ${type} enters existing onboarding experience`,await page.$('[data-home-onboarding]')!==null);
 }
 for(const code of ['','auth/user-not-found']){
  await open();await click('Mot de passe oublié ?');await page.waitForSelector('#reset-email');await config({resetError:code});await page.type('#reset-email','unknown@example.test');await click('Recevoir le lien');await page.waitForSelector('[role="status"]');check('Reset indistinguishable success '+(code||'known'),await page.$eval('[role="status"]',e=>e.textContent.startsWith('Si cette adresse')));if(!code)await page.screenshot({path:path.join(evidence,'reset-success-1440.png'),fullPage:true});
 }
 await open('/forgot-password');check('Reset page supports direct URL and refresh',await title()==='Réinitialiser votre mot de passe');await page.reload({waitUntil:'networkidle0'});check('Reset page refresh retains route',await title()==='Réinitialiser votre mot de passe');
 await open('/register');await page.screenshot({path:path.join(evidence,'account-choice-1440.png'),fullPage:true});check('Only two public account types',await page.$$eval('.va-auth-choice',els=>els.length===2));
 await click('Rejoindre mon coach');check('Invited member flow preserved',await page.$('#registration-name')!==null||await page.evaluate(()=>document.body.innerText.includes('code transmis')));
 for(const width of [320,390,768]){await open('/register',width,900);await registration('studio');check('Signup '+width+' no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(evidence,`signup-${width}.png`),fullPage:true});}
} catch(error){check('Suite completed',false,error.stack);if(page)await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});}
finally{await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(evidence,'results.json'),JSON.stringify({checks,passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,evidence}));if(checks.some(c=>!c.ok))process.exitCode=1;
