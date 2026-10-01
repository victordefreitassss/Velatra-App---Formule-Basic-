// Role/format functional regression using the actual RootApp and scoped Firebase fixtures. It stubs Firebase and never writes to production.
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
const work=path.join(tmpdir(),'velatra-pulse-browser');
const evidence=process.env.VELATRA_PULSE_QA_OUTPUT || path.join(work,'evidence');
await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});await mkdir(evidence,{recursive:true});
const imported=new Set(['auth','db','firebaseConfig','googleProvider','apiFetch','getMessagingClient','getStorageClient','onAuthStateChanged','onSnapshot','getDoc','getDocFromServer','getDocs','doc','collection','query','where','signOut','signInWithEmailAndPassword','setDoc','updateDoc','deleteDoc','addDoc','getDownloadURL','uploadBytes','ref','listAll']);
async function scan(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||['node_modules','dist'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory()){await scan(full);}else if(/\.tsx?$/.test(ent.name)){const source=await readFile(full,'utf8');const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);ast.forEachChild(node=>{const moduleName=node.moduleSpecifier?.text;if(moduleName==='../firebase'||moduleName==='../../firebase'||moduleName==='./firebase'||moduleName?.startsWith('firebase/')){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.add(item.propertyName?.text||item.name.text);}});}}}
await scan(root);
const engineFile=path.join(work,'engine.mjs');
await build({stdin:{contents:`export * from '${root}/pulse/pulseEngine.ts';export {snoozeUntil} from '${root}/pulse/pulseModel.ts';`,resolveDir:root,loader:'ts'},outfile:engineFile,bundle:true,platform:'node',format:'esm'});
const {derivePulse,applyPulseStates,snoozeUntil}=await import(engineFile);
const known=`
const params=new URLSearchParams(location.search);const role=params.get('role')||'coach';const uid='context-'+role;window.__qaListeners=[];window.__qaApi=[];window.__qaWrites=[];window.__qaSignouts=0;
const user={uid,email:'fixture@example.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};
const profile={id:10,firebaseUid:uid,clubId:'context-club',name:'Coach Test',role,onboardingCompleted:true,xp:0,assignedMemberIds:[]};
const club={id:'context-club',ownerId:'context-owner',accountType:params.get('accountType')||'studio',name:'Club recette',isActive:true,canAddStaff:true,settings:{booking:{enabled:true,schedule:[],sessionTypes:[{id:'coaching',name:'Coaching',durationMinutes:60}]}}};
export const auth={currentUser:null};export const db={};export const firebaseConfig={projectId:'demo-velatra'};export const googleProvider={};
const coach={id:11,role:'coach',firebaseUid:'context-coach',clubId:club.id,name:'Coach Lucas',onboardingCompleted:true};
const owner={...profile,id:12,role:'owner',firebaseUid:'context-owner',name:'Owner Studio'};
const count=Number(params.get('clients')||1);const members=Array.from({length:count},(_,index)=>({id:901+index,role:'member',firebaseUid:'member-'+index,clubId:club.id,name:index?'Client '+index:'Emma Martin',email:'emma@example.test',assignedCoachUid:'context-coach',status:'active',avatar:'EM',gender:'F',xp:0,streak:0,pointsFidelite:0,createdAt:'2026-09-01',objectifs:[],notes:'',age:30,weight:70,height:175,planRequested:index===0,lastWorkoutDate:new Date(Date.now()-10*86400000).toISOString()}));
const foreign={...members[0],id:9998,firebaseUid:'foreign',clubId:'other',name:'FOREIGN TENANT'};const reassigned={...members[0],id:9999,firebaseUid:'reassigned',assignedCoachUid:'other-coach',name:'OTHER PORTFOLIO'};
const iso=date=>date.toISOString();const day=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
const assignedCoachUid=club.accountType==='solo'?'context-owner':'context-coach';
const data={users:[owner,profile,coach,...members,foreign,reassigned].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i),programs:members.slice(1).map(member=>({id:member.id+1000,clubId:club.id,memberId:member.id,assignedCoachUid,name:'Programme actif',nbDays:1,startDate:iso(new Date(Date.now()-86400000)),durationWeeks:4,days:[{name:'Jour 1',isCoaching:false,exercises:[]}],completedWeeks:[],currentDayIndex:0})),tasks:count?[{id:'task-1',clubId:club.id,title:'Préparer le bilan Emma',description:'Tâche affectée',assignedTo:role==='coach'?'10':'11',relatedMemberId:901,status:'todo',dueDate:day}]:[],bookings:count?[{id:'booking-1',clubId:club.id,coachId:assignedCoachUid,assignedCoachUid,memberId:901,startTime:iso(new Date(Date.now()+5*60000)),endTime:iso(new Date(Date.now()+65*60000)),status:'confirmed',type:'coaching',sessionTypeId:'coaching'}]:[],prospects:count?[{id:500,clubId:club.id,firebaseUid:'prospect-1',name:'Prospect à rappeler',status:'call_pending',nextReminderDate:iso(new Date(Date.now()-86400000)),date:iso(new Date()),activityHistory:[],notesHistory:[]}]:[],messages:count?[{id:600,clubId:club.id,assignedCoachUid:'context-coach',from:901,to:10,text:'Bonjour Coach',date:iso(new Date()),read:false}]:[],subscriptions:count?[{id:'sub-1',clubId:club.id,memberId:901,status:'active',price:100,billingCycle:'monthly',currency:'eur'}]:[],payments:count?[{id:'payment-1',clubId:club.id,memberId:901,status:'paid',amount:100,date:iso(new Date()),currency:'eur'}]:[]};
const pulseStates=[];const pulseCount=params.get('actions');
if(pulseCount!==null){
  data.users=[owner,profile,coach,...members].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i);
  data.programs=members.map(member=>({id:member.id+1000,clubId:club.id,memberId:member.id,assignedCoachUid,name:'Programme actif',startDate:iso(new Date(Date.now()-86400000)),durationWeeks:8,days:[{name:'Jour 1',exercises:[{exerciseId:1}]}]}));
  members.forEach(member=>{member.lastWorkoutDate=iso(new Date());member.planRequested=false;});
  data.bookings=[];data.prospects=[];data.messages=[];data.subscriptions=[];data.payments=[];
  data.tasks=Array.from({length:Number(pulseCount)},(_,i)=>({id:'pulse-task-'+i,clubId:club.id,title:i===0?'Préparer le bilan Emma avec une description volontairement longue pour vérifier la lecture sur téléphone':'Tâche '+i,description:'Recette Pulse',assignedTo:String(profile.id),relatedMemberId:members[0]?.id,status:'todo',dueDate:new Date(Date.now()+(i%3-1)*86400000).toLocaleDateString('en-CA',{timeZone:'Europe/Paris'})}));
}
if(pulseCount===null&&role==='owner'&&data.subscriptions[0])data.subscriptions[0].status='past_due';
const docSnap=value=>({id:String(value.firebaseUid||value.id||'fixture'),data:()=>value});
const snap=value=>({exists:()=>!!value,data:()=>value,id:String(value?.firebaseUid||value?.id||'fixture'),docs:Array.isArray(value)?value.map(docSnap):[],forEach:cb=>{if(Array.isArray(value))value.map(docSnap).forEach(cb);},docChanges:()=>Array.isArray(value)?value.map(item=>({type:'added',doc:docSnap(item)})):[]});
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=(r,...args)=>({...r,args});export const where=(...args)=>args;
const getValue=r=>r.path==='users/'+uid?profile:r.path==='clubs/context-club'?club:r.path==='tasks/task-1'?data.tasks[0]:data[r.path];
const scoped=r=>{const value=getValue(r);return Array.isArray(value)?value.filter(item=>(r.args||[]).every(([field,operator,expected])=>operator==='=='?item[field]===expected:operator==='in'?expected.includes(item[field]):true)):value;};
export const getDoc=async r=>snap(getValue(r));export const getDocFromServer=getDoc;export const getDocs=async r=>snap(scoped(r));
export function onAuthStateChanged(_auth,cb){const timer=setTimeout(()=>{auth.currentUser=user;cb(user);},20);return()=>clearTimeout(timer);}
const subscriptions=[];
export function onSnapshot(r,cb){window.__qaListeners.push({path:r.path,args:r.args});const entry={r,cb};subscriptions.push(entry);const timer=setTimeout(()=>cb(snap(scoped(r))),20);return()=>{clearTimeout(timer);const i=subscriptions.indexOf(entry);if(i>=0)subscriptions.splice(i,1);};}
export async function signOut(){auth.currentUser=null;window.__qaSignouts++;}export const signInWithEmailAndPassword=async()=>({user});
export async function apiFetch(path,opts){
  window.__qaApi.push({path,method:opts?.method||'GET'});
  if(path.startsWith('/api/pulse')){
    const response=await fetch('/__qa/pulse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,method:opts?.method||'GET',body:opts?.body?JSON.parse(opts.body):null,input:{...data,user:profile,currentClub:club,logs:[]},states:pulseStates,followups:pulseCount===null&&count?[{id:'assignment',memberUid:'member-0',templateName:'Bilan',dueDate:day}]:[]}),signal:opts?.signal});
    if(opts?.method==='POST'&&response.ok){const result=await response.clone().json();const i=pulseStates.findIndex(item=>item.key===result.state.key);if(i>=0)pulseStates.splice(i,1);pulseStates.push(result.state);window.__qaWrites.push({path:'pulseActionStates',state:result.state});}return response;
  }
  if(opts?.method&&opts.method!=='GET')throw Error('Unexpected mutating API');
  const result=path==='/api/coach/assigned-members'?{assignedMemberIds:members.map(item=>item.id)}:path==='/api/followup/priorities'?{priorities:pulseCount===null&&count?[{memberUid:'member-0',memberName:'Emma Martin',templateName:'Bilan',dueDate:day,status:'expected'}]:[],dueCount:0}:path.startsWith('/api/bookings/availability')?{slots:[]}:path.startsWith('/api/followup/clients/')?{journey:null,assignments:[],responses:[],habits:[],entries:[],logs:[],today:day}:path==='/api/followup/templates'?{templates:[]}:{};
  return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
}
export const getMessagingClient=async()=>null;export const getStorageClient=async()=>({});
const denied=()=>{throw new Error('Unexpected fixture write');};export const setDoc=denied,deleteDoc=denied,addDoc=denied,uploadBytes=denied;
export const updateDoc=async(r,patch)=>{if(r.path!=='messages/600'||Object.keys(patch).join()!=='read')throw Error('Unexpected fixture write');window.__qaWrites.push({path:r.path,patch});data.messages[0].read=patch.read;};
export const runTransaction=async(_db,fn)=>fn({get:async r=>snap(getValue(r)),update:(r,patch)=>{if(r.path!=='tasks/task-1'||Object.keys(patch).join()!=='status')throw Error('Unexpected fixture transaction');Object.assign(data.tasks[0],patch);window.__qaWrites.push({path:r.path,patch});subscriptions.filter(entry=>entry.r.path==='tasks').forEach(entry=>entry.cb(snap(scoped(entry.r))));}});
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
const tailwind=await readFile(process.env.VELATRA_QA_TAILWIND_PATH||path.join(tmpdir(),'velatra-tailwind-3.4.17.js')).catch(async()=>{const response=await fetch('https://cdn.tailwindcss.com');if(!response.ok)throw Error('Tailwind QA runtime unavailable');return Buffer.from(await response.arrayBuffer());});
const index=await readFile(path.join(root,'index.html'),'utf8');const meta=index.match(/<meta name="viewport"[^>]+>/)?.[0]||'';const base=(index.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'').replace(/@import[^;]+;/g,'');
const html=`<!doctype html><html lang="fr"><head>${meta}<script src="/tailwind.js"></script><style>${base}</style>${cssFile?`<link rel="stylesheet" href="/${cssFile}">`:''}</head><body><div id="root"></div><script type="module" src="/${jsFile}"></script></body></html>`;
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
if(pathname==='/__qa/pulse'){
 try{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=JSON.parse(Buffer.concat(chunks).toString());
 const now=new Date(),uid=request.input.user.firebaseUid,clubId=request.input.currentClub.id,url=new URL(request.path,'http://localhost');
 const derived=derivePulse(request.input,request.followups,now);let result;
 if(request.method==='POST'){
 const key=decodeURIComponent(url.pathname.split('/')[3]),action=derived.find(item=>item.key===key);
 if(!action||action.sourceFingerprint!==request.body.sourceFingerprint)throw Error('Stale fixture action');
 const snoozed=url.pathname.endsWith('/snooze');result={state:{actorUid:uid,clubId,key,sourceFingerprint:action.sourceFingerprint,status:snoozed?'snoozed':'handled',...(snoozed?{snoozedUntil:snoozeUntil(now,request.body.preset)}:{}),createdAt:now.toISOString(),updatedAt:now.toISOString()}};
 }else{
 const filtered=applyPulseStates(derived,request.states,uid,clubId,now).filter(item=>item.state===(url.searchParams.get('status')||'open')&&(['all',null].includes(url.searchParams.get('group'))||item.group===url.searchParams.get('group'))&&(['all',null].includes(url.searchParams.get('category'))||item.category===url.searchParams.get('category')));
 const offset=Number(url.searchParams.get('cursor')||0),limit=Number(url.searchParams.get('limit')||20);
 result={actions:filtered.slice(offset,offset+limit),total:filtered.length,nextCursor:offset+limit<filtered.length?String(offset+limit):null,categories:request.input.user.role==='coach'?['clients','coaching','followup','messages','tasks','planning']:request.input.user.role==='manager'?['clients','coaching','followup','messages','tasks','planning','crm']:['clients','coaching','followup','messages','tasks','planning','crm','business'],partialSources:[],generatedAt:now.toISOString()};
 }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(error){res.statusCode=500;res.end(JSON.stringify({error:error.message}));}return;
} if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const records=[],errors=[];
const check=(label,passed,details)=>{records.push({label,passed,details});if(!passed)errors.push({label,details});};
const clickText=async(page,text,selector='button')=>{const handle=await page.evaluateHandle((selector,label)=>[...document.querySelectorAll(selector)].find(button=>button.offsetHeight&&button.textContent?.trim()===label),selector,text);const button=handle.asElement();assert.ok(button,`Missing visible action ${text}`);await button.evaluate(element=>element.scrollIntoView({block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await button.click();await handle.dispose();};
const clickSelector=async(page,selector)=>{await page.$eval(selector,element=>element.scrollIntoView({block:'center'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.click(selector);};
async function open(role,type,width,height,actions=20){
 const page=await browser.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);await page.setViewport({width,height,deviceScaleFactor:1});
 await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(origin)?void request.continue():void request.abort());
 page.on('pageerror',error=>errors.push({label:'Runtime exception',details:error.message}));
 await page.goto(`${origin}/dashboard?role=${role}&accountType=${type}&clients=${actions===0?0:1}${actions===null?'':`&actions=${actions}`}`,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-home-section="actions"]');await page.waitForFunction(()=>!document.querySelector('[data-home-section="actions"]').textContent.includes('Chargement des actions'));
 return page;
}
async function inspect(page,label,surface){
 const details=await page.evaluate(surface=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll(`${surface} [data-pulse-action]`).length,short:[...document.querySelectorAll(`${surface} button,${surface} select`)].filter(item=>item.offsetHeight&&item.getBoundingClientRect().height<43.9).map(item=>item.textContent),writes:window.__qaWrites,finance:window.__qaListeners.filter(item=>['subscriptions','payments','plans','invoices'].includes(item.path)),categories:[...document.querySelectorAll('[data-pulse-page] select')].at(1)?.textContent,body:document.querySelector(surface)?.textContent}),surface);
 check(`${label} layout/accessibility`,!details.overflow&&!details.short.length,details);
 return details;
}
try{
 for(const[role,type,label]of[['owner','solo','Solo'],['manager','studio','Manager'],['coach','studio','Coach'],['owner','studio','StudioOwner']])for(const[width,height]of[[390,844],[820,1180],[1440,900],[1920,1080]])for(const count of[0,1,20,100]){
  const page=await open(role,type,width,height,count),name=`${label}-${width}-${count}`;
  const home=await inspect(page,`${name} Home`,'[data-home-section="actions"]');
  check(`${name} bounded Home`,home.cards===Math.min(count,width<768?5:8)&&home.writes.length===0,home);
  if(role!=='owner')check(`${name} no finance listener`,home.finance.length===0,home.finance);
  if(width===390)check(`${name} five primary roots`,await page.$$eval('.va-mobile-nav button',buttons=>buttons.filter(item=>item.offsetHeight).length===5));
  await clickText(page,'Voir toutes les actions','[data-home-section="actions"] button');await page.waitForSelector('[data-pulse-page]');await page.waitForFunction(()=>!document.querySelector('[data-pulse-page]').textContent.includes('Chargement des actions'));
  const pulse=await inspect(page,`${name} Pulse`,'[data-pulse-page]');check(`${name} first page`,pulse.cards===Math.min(count,20),pulse);
  if(role!=='owner')check(`${name} allowed filters only`,!pulse.categories.includes('Business')&&(role!=='coach'||!pulse.categories.includes('CRM')),pulse.categories);
  if(count===100){await clickText(page,'Voir les actions suivantes');await page.waitForFunction(()=>document.querySelectorAll('[data-pulse-page] [data-pulse-action]').length===40);check(`${name} pagination unique`,await page.$$eval('[data-pulse-page] [data-pulse-action]',cards=>new Set(cards.map(item=>item.dataset.pulseAction)).size===40));}
  if(count===20&&width===390){
    for(const[value,total]of[['overdue',7],['today',7],['upcoming',6]]){
      await page.select('[data-pulse-page] select',value);await page.waitForFunction(total=>document.querySelectorAll('[data-pulse-action]').length===total,{},total);
      check(`${name} ${value} factual date filter`,true);
    }
    await page.select('[data-pulse-page] select','all');await page.waitForFunction(()=>document.querySelectorAll('[data-pulse-action]').length===20);
  }
  if(count===20){await page.screenshot({path:path.join(evidence,`${name}.png`),fullPage:false});}
  await page.close();
 }
 for(const[role,type,label]of[['owner','solo','Solo'],['manager','studio','Manager'],['coach','studio','Coach']]){
  const page=await open(role,type,390,844,1);await clickText(page,'Voir toutes les actions');await page.waitForSelector('[data-pulse-page] [data-pulse-action]');
  await clickText(page,'Traité','[data-pulse-action] button');await page.waitForFunction(()=>!document.querySelector('[data-pulse-action]'));
  check(`${label} handles only Pulse state`,await page.evaluate(()=>window.__qaWrites.length===1&&window.__qaWrites[0].path==='pulseActionStates'));
  await clickText(page,'Traité','nav[aria-label="État des actions"] button');await page.waitForSelector('[data-pulse-action]');check(`${label} lightweight handled view`,await page.$eval('[data-pulse-action]',item=>item.textContent.includes('Pris en charge')));
  await page.close();
  const snooze=await open(role,type,390,844,1);await clickText(snooze,'Voir toutes les actions');await snooze.waitForSelector('[data-pulse-action]');
  await snooze.focus('[data-pulse-action] select');await snooze.keyboard.press('ArrowDown');await snooze.keyboard.press('Enter');
  check(`${label} keyboard reminder control`,await snooze.$eval('[data-pulse-action] select',item=>item===document.activeElement));
  await clickText(snooze,'Rappeler');await snooze.waitForFunction(()=>!document.querySelector('[data-pulse-action]'));await clickText(snooze,'Rappels');await snooze.waitForSelector('[data-pulse-action]');
  check(`${label} snoozes without business writes`,await snooze.evaluate(()=>window.__qaWrites.length===1&&window.__qaWrites[0].path==='pulseActionStates'&&window.__qaWrites[0].state.status==='snoozed'));
  await snooze.close();
 }
 // Existing quick actions, exercised from the real Pulse cards.
 for(const[role,type]of[['owner','solo'],['manager','studio'],['coach','studio']]){
  const page=await open(role,type,390,844,null);await clickText(page,'Voir toutes les actions');await page.waitForSelector('[data-pulse-action]');
  await clickText(page,'Ouvrir la tâche','[data-pulse-action] button');await page.waitForSelector('[data-operational-task="task-1"]');
  check(`${role} Pulse task uses 12B focus destination`,await page.$eval('[data-operational-task="task-1"]',item=>item.contains(document.activeElement)));await page.goBack();await page.waitForSelector('[data-pulse-page]');
  await clickText(page,'Préparer le programme','[data-pulse-action] button');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='coaching');check(`${role} Pulse programme destination`,true);await page.goBack();await page.waitForSelector('[data-pulse-page]');
  await clickText(page,'Ouvrir le bilan','[data-pulse-action] button');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='followup');check(`${role} Pulse followup destination`,true);await page.goBack();await page.waitForSelector('[data-pulse-page]');
  if(role==='owner'){
    await clickText(page,'Voir la facturation','[data-pulse-action] button');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='administrative'&&document.querySelector('.va-client-360-admin-nav [aria-current="page"]')?.textContent.includes('Facturation'));check('Owner Pulse sensitive billing destination uses existing administrative tab',true);await page.goBack();await page.waitForSelector('[data-pulse-page]');
  }
  await clickText(page,'Ouvrir la conversation','[data-pulse-action] button');await page.waitForFunction(()=>document.body.innerText.includes('Bonjour Coach'));check(`${role} Pulse message destination`,true);
  await page.close();
 }
}catch(error){for(const page of await browser.pages())if(page.url().startsWith(origin)){console.log(JSON.stringify(await page.evaluate(()=>({body:document.body.innerText.slice(0,3000),calls:window.__qaApi?.slice(-8)})),null,2));await page.screenshot({path:path.join(evidence,'failure.png')});}errors.push({label:'Scenario',details:error.stack});}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(evidence,'results.json'),JSON.stringify({checks:records,failures:errors,environment:'Actual RootApp/Home/Pulse, shared pure engine, synthetic API transport; external requests blocked; no production'},null,2));}
console.log(JSON.stringify({checks:records.length,failures:errors.length,evidence,errors},null,2));if(errors.length)process.exitCode=1;
