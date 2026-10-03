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
const work=path.join(tmpdir(),'velatra-member360-browser');
const evidence=process.env.VELATRA_MEMBER360_QA_OUTPUT || path.join(work,'evidence');
await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});await mkdir(evidence,{recursive:true});
const imported=new Set(['auth','db','firebaseConfig','googleProvider','apiFetch','getMessagingClient','getStorageClient','onAuthStateChanged','onSnapshot','getDoc','getDocFromServer','getDocs','doc','collection','query','where','signOut','signInWithEmailAndPassword','setDoc','updateDoc','deleteDoc','addDoc','getDownloadURL','uploadBytes','ref','listAll']);
async function scan(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||['node_modules','dist'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory()){await scan(full);}else if(/\.tsx?$/.test(ent.name)){const source=await readFile(full,'utf8');const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);ast.forEachChild(node=>{const moduleName=node.moduleSpecifier?.text;if(moduleName==='../firebase'||moduleName==='../../firebase'||moduleName==='./firebase'||moduleName?.startsWith('firebase/')){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.add(item.propertyName?.text||item.name.text);}});}}}
await scan(root);
const known=`
const params=new URLSearchParams(location.search);const role=params.get('role')||'coach';const uid='context-'+role;window.__qaListeners=[];window.__qaApi=[];window.__qaWrites=[];window.__qaSignouts=0;
const user={uid,email:'fixture@example.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};
const profile={id:10,firebaseUid:uid,clubId:'context-club',name:'Coach Test',role,onboardingCompleted:true,xp:0,assignedMemberIds:[],...(role==='member'?{assignedCoachUid:'context-coach'}:{})};
const club={id:'context-club',ownerId:'context-owner',accountType:params.get('accountType')||'studio',name:'Club recette',isActive:true,canAddStaff:true,settings:{booking:{enabled:true,schedule:[],sessionTypes:[{id:'coaching',name:'Coaching',durationMinutes:60}]}}};
export const auth={currentUser:null};export const db={};export const firebaseConfig={projectId:'demo-velatra'};export const googleProvider={};
const coach={id:11,role:'coach',firebaseUid:'context-coach',clubId:club.id,name:'Coach Lucas',onboardingCompleted:true};
const owner={...profile,id:12,role:'owner',firebaseUid:'context-owner',name:'Owner Studio'};
const count=Number(params.get('clients')||1);const members=Array.from({length:count},(_,index)=>({id:901+index,role:'member',firebaseUid:'member-'+index,clubId:club.id,name:index?'Client '+index:'Emma Martin',email:'emma@example.test',assignedCoachUid:'context-coach',status:'active',avatar:'EM',gender:'F',xp:0,streak:0,pointsFidelite:0,createdAt:'2026-09-01',objectifs:[],notes:'',age:30,weight:70,height:175,planRequested:index===0,lastWorkoutDate:new Date(Date.now()-10*86400000).toISOString()}));
const foreign={...members[0],id:9998,firebaseUid:'foreign',clubId:'other',name:'FOREIGN TENANT'};const reassigned={...members[0],id:9999,firebaseUid:'reassigned',assignedCoachUid:'other-coach',name:'OTHER PORTFOLIO'};
const iso=date=>date.toISOString();const day=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
const assignedCoachUid=club.accountType==='solo'?'context-owner':'context-coach';
const data={users:[owner,profile,coach,...members,foreign,reassigned].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i),programs:members.slice(1).map(member=>({id:member.id+1000,clubId:club.id,memberId:member.id,assignedCoachUid,name:'Programme actif',nbDays:1,startDate:iso(new Date(Date.now()-86400000)),durationWeeks:4,days:[{name:'Jour 1',isCoaching:false,exercises:[]}],completedWeeks:[],currentDayIndex:0})),tasks:count?[{id:'task-1',clubId:club.id,title:'Préparer le bilan Emma',description:'Tâche affectée',assignedTo:role==='coach'?'10':'11',relatedMemberId:901,status:'todo',dueDate:day}]:[],bookings:count?[{id:'booking-1',clubId:club.id,coachId:assignedCoachUid,assignedCoachUid,memberId:901,startTime:iso(new Date(Date.now()+5*60000)),endTime:iso(new Date(Date.now()+65*60000)),status:'confirmed',type:'coaching',sessionTypeId:'coaching'}]:[],prospects:count?[{id:500,clubId:club.id,firebaseUid:'prospect-1',name:'Prospect à rappeler',status:'call_pending',nextReminderDate:iso(new Date(Date.now()-86400000)),date:iso(new Date()),activityHistory:[],notesHistory:[]}]:[],messages:count?[{id:600,clubId:club.id,assignedCoachUid:'context-coach',from:901,to:10,text:'Bonjour Coach',date:iso(new Date()),read:false}]:[],subscriptions:count?[{id:'sub-1',clubId:club.id,memberId:901,status:'active',price:100,billingCycle:'monthly',currency:'eur'}]:[],payments:count?[{id:'payment-1',clubId:club.id,memberId:901,status:'paid',amount:100,date:iso(new Date()),currency:'eur'}]:[]};
if(role==='member'){data.bookings[0]={...data.bookings[0],memberId:10,memberUid:uid,coachId:'11',coachUid:'context-coach'};data.messages[0]={...data.messages[0],from:11,to:10};}
if(params.get('providerOnly')==='true'){members.forEach(m=>m.assignedCoachUid='other-coach');data.bookings[0].assignedCoachUid='other-coach';}

for (const member of members) { member.planRequested=false;member.coachingNotesHistory=[{id:'note-1',date:'2026-09-29T10:00:00Z',content:'Bilan de reprise : privilégier la régularité et ajuster les charges à la prochaine séance.',authorName:'Coach Lucas'},{id:'note-0',date:'2026-09-23T10:00:00Z',content:'Premier échange autour des objectifs.'}];member.objectifs=['Remise en forme']; }
data.programs.push({id:1901,clubId:club.id,memberId:901,assignedCoachUid,name:'Force & mobilité · Cycle 1',nbDays:2,startDate:'2026-09-15',durationWeeks:4,days:[{name:'Renforcement complet',isCoaching:true,exercises:[]},{name:'Mobilité',isCoaching:false,exercises:[]}],completedWeeks:[1],currentDayIndex:3});
data.archivedPrograms=[{...data.programs.at(-1),id:1801,name:'Cycle découverte · Archive',startDate:'2026-08-01'}];
data.logs=[{id:800,clubId:club.id,memberId:901,assignedCoachUid,date:'2026-09-29T09:00:00Z',dayName:'Renforcement complet',week:2,isCoaching:true,exercises:[],exerciseData:{},notes:'Séance de reprise terminée.'}];
data.bodyData=[{id:700,clubId:club.id,memberId:901,assignedCoachUid,date:'2026-09-26',weight:70,fat:22,muscle:50},{id:701,clubId:club.id,memberId:901,assignedCoachUid,date:'2026-09-01',weight:72,fat:23,muscle:49}];
data.driveFiles=[{id:'drive-1',clubId:club.id,name:'Bilan de rentrée.pdf',path:'clubs/context-club/drive/fixture.pdf',size:32000,type:'application/pdf',uploadedBy:10,sharedWith:[901],createdAt:'2026-09-29'}];
Object.assign(data.subscriptions[0]||{},{planName:'Coaching essentiel',planId:1,startDate:'2026-09-01',commitmentEndDate:'2026-12-01'});
const docSnap=value=>({id:String(value.firebaseUid||value.id||'fixture'),data:()=>value});
const snap=value=>({exists:()=>!!value,data:()=>value,id:String(value?.firebaseUid||value?.id||'fixture'),docs:Array.isArray(value)?value.map(docSnap):[],forEach:cb=>{if(Array.isArray(value))value.map(docSnap).forEach(cb);},docChanges:()=>Array.isArray(value)?value.map(item=>({type:'added',doc:docSnap(item)})):[]});
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=(r,...args)=>({...r,args});export const where=(...args)=>args;
const getValue=r=>r.path==='users/'+uid?profile:r.path==='clubs/context-club'?club:r.path==='tasks/task-1'?data.tasks[0]:data[r.path];
const scoped=r=>{const value=getValue(r);return Array.isArray(value)?value.filter(item=>(r.args||[]).every(([field,operator,expected])=>operator==='=='?item[field]===expected:operator==='in'?expected.includes(item[field]):true)):value;};
export const getDoc=async r=>snap(getValue(r));export const getDocFromServer=getDoc;export const getDocs=async r=>snap(scoped(r));
export function onAuthStateChanged(_auth,cb){const timer=setTimeout(()=>{auth.currentUser=user;cb(user);},20);return()=>clearTimeout(timer);}
const subscriptions=[];
window.__qaSetOrganizationActivation=value=>{if(value===undefined)delete club.isActive;else club.isActive=value;for(const entry of [...subscriptions])if(entry.r.path==='clubs/context-club')entry.cb(snap({...club}));};
window.__qaActiveTenantListeners=()=>subscriptions.filter(entry=>entry.r.path!=='clubs/context-club'&&entry.r.path!=='users/'+uid).map(entry=>entry.r.path);

export function onSnapshot(r,cb){window.__qaListeners.push({path:r.path,args:r.args});const entry={r,cb};subscriptions.push(entry);const timer=setTimeout(()=>cb(snap(scoped(r))),20);return()=>{clearTimeout(timer);const i=subscriptions.indexOf(entry);if(i>=0)subscriptions.splice(i,1);};}
export async function signOut(){auth.currentUser=null;window.__qaSignouts++;}export const signInWithEmailAndPassword=async()=>({user});
const noticeRows=[{id:'1'.repeat(64),category:'MESSAGE',title:'Notification message',destination:{velatraPage:'chat',conversationMemberId:901}},{id:'2'.repeat(64),category:'PLANNING',title:'Notification séance',destination:{velatraPage:'calendar',planningBookingId:'booking-1'}},{id:'3'.repeat(64),category:'FOLLOWUP',title:'Notification bilan',destination:role==='member'?{velatraPage:'coaching',followupAssignmentId:'member-bilan'}:{velatraPage:'users',client360MemberId:901,client360Section:'followup'}}].map(n=>({...n,createdAt:new Date().toISOString(),readAt:null,body:'Texte générique'}));
export async function apiFetch(path,opts){window.__qaApi.push({path,method:opts?.method||'GET'});
if(path.startsWith('/api/retention/'))return new Response(JSON.stringify({assessment:{memberUid:'member-0',memberId:901,memberName:'Emma Martin',state:'watch',signals:[{family:'ENGAGEMENT',type:'ACTIVITY',title:'Rythme à suivre',evidence:'Une séance enregistrée sur la période récente.',window:'14 jours',source:'Séances'}],partial:false,activity:{recent:1,previous:2},suggestedActions:[],timeline:[],timelineTotal:0,evaluatedAt:new Date().toISOString()},interventions:[],interventionsPartial:false}));
if(path.startsWith('/api/onboarding/'))return new Response(JSON.stringify({assessment:{memberUid:'member-0',memberId:901,memberName:'Emma Martin',state:'IN_PROGRESS',completedSteps:3,totalSteps:5,steps:[{id:'first_session',label:'Première séance',state:'pending',reason:'Première séance à planifier'}]},partialSources:[]}));
if(opts?.method&&opts.method!=='GET'&&!path.startsWith('/api/notifications/'))throw Error('Unexpected mutating API');if(path.startsWith('/api/notifications/bookings/'))return new Response(JSON.stringify({booking:data.bookings.find(b=>b.id===path.split('/').at(-1))}),{status:200,headers:{'Content-Type':'application/json'}});if(path.startsWith('/api/notifications')){if(opts?.method==='POST'&&path.endsWith('/read')){const row=noticeRows.find(n=>n.id===path.split('/').at(-2));if(row)row.readAt=new Date().toISOString();}const item=noticeRows.find(n=>path==='/api/notifications/'+n.id);const value=path.endsWith('/unread-count')?{count:noticeRows.filter(n=>!n.readAt).length}:path.endsWith('/preferences')?{pushEnabled:false,categories:{MESSAGE:true,PLANNING:true,COACHING:true,FOLLOWUP:true,SALES:true,SYSTEM:true}}:path.endsWith('/devices')?{devices:[]}:item||{items:noticeRows,nextCursor:null};return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});}const result=path==='/api/member/assigned-coach'?{coach}:path==='/api/followup/me'?{journey:null,assignments:[{id:'member-bilan',templateName:'Bilan membre',status:'expected',active:true,questions:[{id:'q',label:'Question membre',type:'text',required:true}]}],responses:[],habits:[],entries:[],logs:[],today:day}:path.startsWith('/api/pulse?')?{actions:count?[{key:'task:task-1',type:'TASK_TODAY',category:'tasks',priority:'normal',title:'Préparer le bilan Emma',reason:'Tâche due aujourd’hui',sourceFingerprint:'0'.repeat(64),createdFrom:'tasks/task-1',group:'today',state:'open',destination:{page:'crm_tasks',taskId:'task-1'},quickActions:[{label:'Ouvrir la tâche',destination:{page:'crm_tasks',taskId:'task-1'}}]}]:[],total:count?1:0,nextCursor:null,categories:role==='coach'?['clients','coaching','followup','messages','tasks','planning']:role==='manager'?['clients','coaching','followup','messages','tasks','planning','crm']:['clients','coaching','followup','messages','tasks','planning','crm','business'],partialSources:[],generatedAt:iso(new Date())}:path==='/api/coach/assigned-members'?{assignedMemberIds:members.map(item=>item.id)}:path==='/api/followup/priorities'?{priorities:count?[{memberUid:'member-0',memberName:'Emma Martin',templateName:'Bilan',dueDate:day,status:'expected'}]:[],dueCount:count?1:0}:path.startsWith('/api/bookings/availability')?{slots:[]}:path.startsWith('/api/followup/clients/')?{journey:null,assignments:[],responses:[],habits:[],entries:[],logs:[],today:day}:path==='/api/followup/templates'?{templates:[]}:path.startsWith('/api/followup/journey/')?{journey:null}:{};return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});}
export const getMessagingClient=async()=>null;export const getStorageClient=async()=>({});
const denied=()=>{throw new Error('Unexpected fixture write');};export const setDoc=denied,deleteDoc=denied,addDoc=denied,uploadBytes=denied;
export const updateDoc=async(r,patch)=>{if(r.path==='users/member-0'&&patch.coachingNotesHistory){window.__qaWrites.push({path:r.path,patch});Object.assign(members[0],patch);return;}if(r.path!=='messages/600'||Object.keys(patch).join()!=='read')throw Error('Unexpected fixture write');window.__qaWrites.push({path:r.path,patch});data.messages[0].read=patch.read;};
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
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/brand/') && /\.(png|webp)$/.test(pathname)){const asset=path.resolve(root,'public',pathname.slice(1));if(!asset.startsWith(path.join(root,'public','brand')+path.sep)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',pathname.endsWith('.png')?'image/png':'image/webp');res.end(await readFile(asset));return;}if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const records=[];const errors=[];
const check=(label,passed,details)=>{records.push({label,passed,details});if(!passed)errors.push({label,details});};
// Re-resolve after route/sheet animation; a retained ElementHandle can become
// detached or temporarily unclickable while React restores the mobile shell.
const pointerClick=async(page,selector,text=null)=>{
  await page.evaluate(target=>{window.__qaPointerTarget=target;},{selector,text});
  await page.locator(()=>{const {selector,text}=window.__qaPointerTarget;return [...document.querySelectorAll(selector)].find(e=>e.offsetHeight&&(text===null||e.textContent?.trim()===text));})
    .map(e=>{e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});return e;})
    .filter(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}).click();
};
const clickSelector=(page,selector)=>pointerClick(page,selector);
const clickText=(page,text,selector='button')=>pointerClick(page,selector,text);
async function open(role,accountType,width,height,clients=1){
  const page=await browser.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);await page.setViewport({width,height,deviceScaleFactor:1});
  await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(origin)?void request.continue():void request.abort());
  page.on('console',message=>{if(message.type()==='error'&&/TypeError|ReferenceError|Uncaught UI error/.test(message.text())){errors.push({label:'Console exception',details:message.text().slice(0,500)});}});
  page.on('pageerror',error=>errors.push({label:'Runtime exception',details:error.message}));
  await page.goto(`${origin}/dashboard?role=${role}&accountType=${accountType}&clients=${clients}`,{waitUntil:'networkidle0'});
  await page.waitForSelector('[data-experience]');await page.waitForFunction(()=>!document.body.innerText.includes('Chargement des bilans'));
  return page;
}

const navigate = async (page, memberId=901, section='overview', adminSection) => {
 await page.evaluate(({memberId,section,adminSection})=>{history.pushState({usr:{velatraPage:'users',client360MemberId:memberId,client360Section:section,client360AdminSection:adminSection},key:crypto.randomUUID(),idx:(history.state?.idx||0)+1},'',location.href);window.dispatchEvent(new PopStateEvent('popstate'));},{memberId,section,adminSection});
};
const tab = async(page,title,nav='Espaces Client 360')=>{await clickText(page,title,`nav[aria-label="${nav}"] button`);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
const shot = async(page,name)=>{await page.waitForFunction(()=>[...document.querySelectorAll('.m360-workspace,.va-member-dossier')].every(e=>Number(getComputedStyle(e).opacity)>.99));await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});};
try {
 for(const [role,type,label] of [['owner','solo','solo'],['owner','studio','owner'],['manager','studio','manager'],['coach','studio','coach']]) {
  const page=await open(role,type,1440,1000,3);
  await navigate(page); await page.waitForSelector('[data-member-overview]');
  await page.waitForSelector('[data-retain-summary]');
  check(label+' opens inline workspace',await page.$eval('.m360-workspace',e=>e.getBoundingClientRect().width>900)&&!await page.$('[aria-modal="true"].va-member-dossier'));
  check(label+' no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(label+' header real facts',await page.$eval('.m360-header',e=>e.textContent.includes('Emma Martin')&&e.textContent.includes('Force & mobilité')));
  await shot(page,label+'-overview-1440');
  await tab(page,'Coaching');await shot(page,label+'-coaching-1440');
  check(label+' shows existing programme archives',await page.evaluate(()=>document.body.innerText.includes('Anciens programmes')));await clickText(page,'Aperçu du plan');check(label+' opens existing programme viewer',await page.evaluate(()=>window.__qaGetState().viewingProg?.name==='Force & mobilité · Cycle 1'));await page.evaluate(()=>window.__qaSetState(s=>({...s,viewingProg:null})));
  await tab(page,'Séances','Rubriques Client 360');check(label+' existing session logs',await page.$eval('.m360-coaching-sessions',e=>e.textContent.includes('Renforcement complet')));
  await tab(page,'Nutrition','Rubriques Client 360');await page.waitForFunction(()=>document.body.innerText.includes('Nutrition'));check(label+' nutrition section opens',true);
  await tab(page,'Progression');await shot(page,label+'-progress-1440');
  await tab(page,'Suivi');await shot(page,label+'-followup-1440');
  check(label+' legacy note author is honest',await page.$eval('.va-client-360-followup',e=>e.textContent.includes('Auteur non renseigné')));
  await tab(page,'Rétention','Rubriques Client 360');await page.waitForSelector('[data-retain-detail]');await shot(page,label+'-retain-1440');
  await tab(page,'Onboarding','Rubriques Client 360');await page.waitForSelector('[data-onboarding-detail]');
  await tab(page,'Planning');check(label+' real booking',await page.evaluate(()=>document.body.innerText.includes('À venir')));await shot(page,label+'-planning-1440');
  await clickText(page,'Planifier','.m360-header button');await page.waitForFunction(()=>history.state?.usr?.planningMemberId===901);check(label+' scheduling keeps selected member',true);await page.goBack();await page.waitForSelector('.m360-workspace');
  await tab(page,'Documents');await page.waitForFunction(()=>document.body.innerText.includes('Bilan de rentrée.pdf'));await shot(page,label+'-documents-1440');
  await tab(page,'Gestion');
  const billing=await page.$$eval('nav[aria-label="Rubriques Client 360"] button',bs=>bs.some(b=>b.textContent==='Abonnement & facturation'));
  check(label+' respects existing billing capabilities',billing===(role!=='manager'));
  if(billing){await tab(page,'Abonnement & facturation','Rubriques Client 360');await shot(page,label+'-billing-1440');}
  await tab(page,'Messages');await page.waitForSelector('.va-client-360-conversation');check(label+' embedded messages open',true);
  await tab(page,'Suivi');await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('.va-client-360-followup');check(label+' refresh retains member and tab',true);
  await page.goBack();await page.waitForFunction(()=>!document.querySelector('.m360-workspace'));check(label+' Back returns to previous context',true);
  for(const id of [9998,999999]){await navigate(page,id);await page.waitForFunction(()=>!document.querySelector('.m360-workspace'));check(label+' denies foreign/missing '+id,true);}
  if(role==='coach'){await navigate(page,9999);await page.waitForFunction(()=>!document.querySelector('.m360-workspace'));check('coach denies unassigned member',true);}
  await navigate(page);await page.waitForSelector('.m360-workspace');

  check(label+' no business writes during navigation',await page.evaluate(()=>window.__qaWrites.every(w=>w.path==='messages/600')));
  {
   await navigate(page,901,'followup');await page.waitForSelector('.va-client-360-followup textarea');await page.type('.va-client-360-followup textarea','Note synthétique de recette');await clickText(page,'Ajouter la note');await page.waitForFunction(()=>window.__qaWrites.some(w=>w.path==='users/member-0'&&w.patch.coachingNotesHistory?.[0]?.authorUid));
   check(label+' saves note using existing document and factual author',await page.evaluate(()=>window.__qaWrites.find(w=>w.path==='users/member-0').patch.coachingNotesHistory[0].content==='Note synthétique de recette'));
  }
  if(role==='coach'){await page.evaluate(()=>window.__qaSetState(s=>({...s,users:s.users.map(u=>u.id===901?{...u,assignedCoachUid:'other-coach'}:u)})));await page.waitForFunction(()=>!document.querySelector('.m360-workspace'));check('revoked assignment closes dossier',true);}
  await page.close();
 }
 for(const width of [390,820]){const page=await open('owner','solo',width,900,1);await navigate(page);await page.waitForSelector('.va-member-dossier[aria-modal="true"]');check(width+' preserves modal and original navigation',!await page.$('.m360-workspace')&&!!await page.$('#client-360-section'));check(width+' no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();}
} catch(error) {errors.push({label:'Scenario',details:error.stack});for(const page of await browser.pages()){if(page.url().startsWith(origin)){console.log((await page.evaluate(()=>document.body.innerText)).slice(-2500));await shot(page,'failure');}}}
finally {await browser.close();await new Promise(r=>server.close(r));await writeFile(path.join(evidence,'results.json'),JSON.stringify({records,errors},null,2));}
console.log(JSON.stringify({checks:records.length,errors,evidence},null,2));if(errors.length)process.exitCode=1;
