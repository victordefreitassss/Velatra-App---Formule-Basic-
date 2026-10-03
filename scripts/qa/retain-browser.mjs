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
const migrationQA=process.env.VELATRA_ACCOUNT_MIGRATION_QA==='true';
const work=path.join(tmpdir(),migrationQA?'velatra-account-migration-browser':'velatra-retain-browser');
const evidence=process.env.VELATRA_RETAIN_QA_OUTPUT || path.join(work,'evidence');
await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});await mkdir(evidence,{recursive:true});
const imported=new Set(['auth','db','firebaseConfig','googleProvider','apiFetch','getMessagingClient','getStorageClient','onAuthStateChanged','onSnapshot','getDoc','getDocFromServer','getDocs','doc','collection','query','where','signOut','signInWithEmailAndPassword','setDoc','updateDoc','deleteDoc','addDoc','getDownloadURL','uploadBytes','ref','listAll']);
async function scan(dir){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||['node_modules','dist'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory()){await scan(full);}else if(/\.tsx?$/.test(ent.name)){const source=await readFile(full,'utf8');const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);ast.forEachChild(node=>{const moduleName=node.moduleSpecifier?.text;if(moduleName==='../firebase'||moduleName==='../../firebase'||moduleName==='./firebase'||moduleName?.startsWith('firebase/')){const bindings=node.importClause?.namedBindings;if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imported.add(item.propertyName?.text||item.name.text);}});}}}
await scan(root);
const engineFile=path.join(work,'engine.mjs');
await build({stdin:{contents:`export * from '${root}/pulse/pulseEngine.ts';export * from '${root}/retention/retentionEngine.ts';export * from '${root}/retention/retentionPulse.ts';export {snoozeUntil} from '${root}/pulse/pulseModel.ts';`,resolveDir:root,loader:'ts'},outfile:engineFile,bundle:true,platform:'node',format:'esm'});
const {derivePulse,applyPulseStates,snoozeUntil,assessRetention,retentionCounts,withRetentionActions}=await import(engineFile);
const migrationTypes={solo:'solo',studio:'studio'};
if(migrationQA){
 const {classifyAccounts}=await import('../migrations/account-type-policy.ts');
 for(const type of ['solo','studio']){
  const users=[{key:'context-owner',data:{role:'owner',clubId:'context-club'}}];
  if(type==='studio')users.push({key:'context-coach',data:{role:'coach',clubId:'context-club'}},{key:'context-manager',data:{role:'manager',clubId:'context-club'}});
  const row=classifyAccounts([{key:'context-club',data:{ownerId:'context-owner'}}],users).rows[0];
  assert.equal(row.classification,'SAFE_TO_MIGRATE');assert.equal(row.change,true);migrationTypes[type]=row.nextAccountType;
 }
}
const known=`
const params=new URLSearchParams(location.search);const role=params.get('role')||'coach';const uid='context-'+role;window.__qaListeners=[];window.__qaApi=[];window.__qaWrites=[];window.__qaSignouts=0;
const user={uid,email:'fixture@example.test',emailVerified:true,getIdToken:async()=> 'fixture-token'};
const profile={id:10,firebaseUid:uid,clubId:'context-club',name:'Coach Test',role,onboardingCompleted:true,xp:0,assignedMemberIds:[]};
const club={id:'context-club',ownerId:'context-owner',accountType:${JSON.stringify(migrationTypes)}[params.get('accountType')||'studio'],name:'Club recette',isActive:true,canAddStaff:true,settings:{booking:{enabled:true,schedule:[],sessionTypes:[{id:'coaching',name:'Coaching',durationMinutes:60}]}}};
export const auth={currentUser:null};export const db={};export const firebaseConfig={projectId:'demo-velatra'};export const googleProvider={};
const coach={id:11,role:'coach',firebaseUid:'context-coach',clubId:club.id,name:'Coach Lucas',onboardingCompleted:true};
const owner={...profile,id:12,role:'owner',firebaseUid:'context-owner',name:'Owner Studio'};
const count=Number(params.get('clients')||1);const members=Array.from({length:count},(_,index)=>({id:901+index,role:'member',firebaseUid:'member-'+index,clubId:club.id,name:index?'Client '+index:'Emma Martin',email:'emma@example.test',assignedCoachUid:'context-coach',status:'active',avatar:'EM',gender:'F',xp:0,streak:0,pointsFidelite:0,createdAt:'2026-09-01',objectifs:[],notes:'',age:30,weight:70,height:175,planRequested:index===0,lastWorkoutDate:new Date(Date.now()-10*86400000).toISOString()}));
const foreign={...members[0],id:9998,firebaseUid:'foreign',clubId:'other',name:'FOREIGN TENANT'};const reassigned={...members[0],id:9999,firebaseUid:'reassigned',assignedCoachUid:'other-coach',name:'OTHER PORTFOLIO'};
const iso=date=>date.toISOString();const day=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'});
const assignedCoachUid=club.accountType==='solo'?'context-owner':'context-coach';
const data={users:[owner,profile,coach,...members,foreign,reassigned].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i),programs:members.slice(1).map(member=>({id:member.id+1000,clubId:club.id,memberId:member.id,assignedCoachUid,name:'Programme actif',nbDays:1,startDate:iso(new Date(Date.now()-86400000)),durationWeeks:4,days:[{name:'Jour 1',isCoaching:false,exercises:[]}],completedWeeks:[],currentDayIndex:0})),tasks:count?[{id:'task-1',clubId:club.id,title:'Préparer le bilan Emma',description:'Tâche affectée',assignedTo:role==='coach'?'10':'11',relatedMemberId:901,status:'todo',dueDate:day}]:[],bookings:count?[{id:'booking-1',clubId:club.id,coachId:assignedCoachUid,assignedCoachUid,memberId:901,startTime:iso(new Date(Date.now()+5*60000)),endTime:iso(new Date(Date.now()+65*60000)),status:'confirmed',type:'coaching',sessionTypeId:'coaching'}]:[],prospects:count?[{id:500,clubId:club.id,firebaseUid:'prospect-1',name:'Prospect à rappeler',status:'call_pending',nextReminderDate:iso(new Date(Date.now()-86400000)),date:iso(new Date()),activityHistory:[],notesHistory:[]}]:[],messages:count?[{id:600,clubId:club.id,assignedCoachUid:'context-coach',from:901,to:10,text:'Bonjour Coach',date:iso(new Date()),read:false}]:[],subscriptions:count?[{id:'sub-1',clubId:club.id,memberId:901,status:'active',price:100,billingCycle:'monthly',currency:'eur'}]:[],payments:count?[{id:'payment-1',clubId:club.id,memberId:901,status:'paid',amount:100,date:iso(new Date()),currency:'eur'}]:[]};
const pulseStates=[],retentionInterventions=[];const pulseCount='0';
data.users=[owner,profile,coach,...members].filter((p,i,all)=>all.findIndex(other=>other.firebaseUid===p.firebaseUid)===i);
const ago=n=>iso(new Date(Date.now()-n*86400000));
data.logs=[];data.programs=[];data.assignments=[];data.responses=[];data.habits=[];data.entries=[];
members.forEach((member,i)=>{const phase=count===1?2:i%5;member.createdAt=ago(phase===4?1:90);member.planRequested=false;delete member.lastWorkoutDate;if(phase!==4)data.logs.push({id:'log-'+i,clubId:club.id,memberId:member.id,date:ago([1,8,14,21][phase])});data.programs.push({id:'program-'+i,clubId:club.id,memberId:member.id,name:'Programme actif',nbDays:1,completedWeeks:[],currentDayIndex:0,startDate:ago(30),durationWeeks:40,days:[{name:'Jour 1',exercises:[{exerciseId:1}]}]});});
data.tasks=count?[{id:'task-1',clubId:club.id,title:'Appeler Emma — action opérationnelle distincte',assignedTo:String(profile.id),relatedMemberId:901,status:'todo',dueDate:day}]:[];
data.bookings=[];data.prospects=[];data.messages=[];data.payments=[];data.subscriptions=role==='owner'&&count?[{id:'sub-1',clubId:club.id,memberId:901,status:'past_due',price:100,billingCycle:'monthly',currency:'eur'}]:[];
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
  if(path.startsWith('/api/pulse')||path.startsWith('/api/retention')){
    const response=await fetch('/__qa/pulse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,method:opts?.method||'GET',body:opts?.body?JSON.parse(opts.body):null,input:{...data,user:profile,currentClub:club},states:pulseStates,interventions:retentionInterventions,followups:pulseCount===null&&count?[{id:'assignment',memberUid:'member-0',templateName:'Bilan',dueDate:day}]:[]}),signal:opts?.signal});
    if(path.startsWith('/api/retention')&&opts?.method==='POST'&&response.ok){const result=await response.clone().json();retentionInterventions.push({...result.intervention,memberUid:path.split('/')[3]});window.__qaWrites.push({path:'retentionInterventions'});}
    if(path.startsWith('/api/pulse')&&opts?.method==='POST'&&response.ok){const result=await response.clone().json();const i=pulseStates.findIndex(item=>item.key===result.state.key);if(i>=0)pulseStates.splice(i,1);pulseStates.push(result.state);window.__qaWrites.push({path:'pulseActionStates',state:result.state});}return response;
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
await build({absWorkingDir:root,entryPoints:[entry],outdir:path.join(work,'bundle'),bundle:true,splitting:true,format:'esm',metafile:true,jsx:'automatic',target:'es2022',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"','process.env.APP_URL':'""','import.meta.env':'{"DEV":true,"MODE":"test"}'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/(?:^firebase\/|(?:^|\/)firebase$)/},()=>({path:'firebase-fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:stub,loader:'js'}));b.onLoad({filter:/[\\/]ErrorBoundary\.tsx$/},async args=>({contents:(await readFile(args.path,'utf8')).replace("console.error('Uncaught UI error:',","console.error('Fixture UI error: '+error.message+' '+error.stack,"),loader:'tsx'}));b.onLoad({filter:/[\\/]App\.tsx$/},async args=>{let source=await readFile(args.path,'utf8');const anchor='const [state, setState] = useState<AppState>(INITIAL_STATE);';if(!source.includes(anchor))throw Error('App fixture instrumentation changed');source=source.replace(anchor,anchor+'\n  (window as any).__qaSetState=setState; (window as any).__qaGetState=()=>state;');return{contents:source,loader:'tsx'};});}}]});
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
 const input=request.input;
 const assessments=assessRetention({actor:input.user,club:input.currentClub,users:input.users,programs:input.programs,logs:input.logs||[],bookings:input.bookings,assignments:input.assignments||[],responses:input.responses||[],habits:input.habits||[],entries:input.entries||[],messages:input.messages,subscriptions:input.subscriptions,partialSources:[]},now);
 const derived=withRetentionActions(derivePulse(request.input,request.followups,now),assessments);let result;
 if(url.pathname.startsWith('/api/retention')){
  const memberUid=url.pathname.split('/')[3];
  if(request.method==='POST')result={intervention:{id:request.body.requestId,kind:request.body.kind,note:request.body.note||'',actorUid:uid,createdAt:now.toISOString()}};
  else if(memberUid)result={assessment:assessments.find(item=>item.memberUid===memberUid),interventions:request.interventions.filter(item=>item.memberUid===memberUid),interventionsPartial:false};
  else {const filtered=assessments.filter(item=>(['all',null].includes(url.searchParams.get('state'))||item.state===url.searchParams.get('state'))&&(['all',null].includes(url.searchParams.get('signal'))||item.signals.some(s=>s.type===url.searchParams.get('signal')))&&(['all',null].includes(url.searchParams.get('coach'))||item.assignedCoachUid===url.searchParams.get('coach'))&&item.memberName.toLowerCase().includes((url.searchParams.get('search')||'').toLowerCase()));const offset=Number(url.searchParams.get('cursor')||0);result={assessments:filtered.slice(offset,offset+20),total:filtered.length,counts:retentionCounts(assessments),coaches:input.user.role==='coach'?[]:[{uid:'context-coach',name:'Coach Lucas'}],signalTypes:[...new Set(assessments.flatMap(item=>item.signals.map(s=>s.type)))],nextCursor:offset+20<filtered.length?String(offset+20):null,partialSources:[],evaluatedAt:now.toISOString()};}
 }else
 if(request.method==='POST'){
 const key=decodeURIComponent(url.pathname.split('/')[3]),action=derived.find(item=>item.key===key);
 if(!action||action.sourceFingerprint!==request.body.sourceFingerprint)throw Error('Stale fixture action');
 const snoozed=url.pathname.endsWith('/snooze');result={state:{actorUid:uid,clubId,key,sourceFingerprint:action.sourceFingerprint,status:snoozed?'snoozed':'handled',...(snoozed?{snoozedUntil:snoozeUntil(now,request.body.preset)}:{}),createdAt:now.toISOString(),updatedAt:now.toISOString()}};
 }else{
 const filtered=applyPulseStates(derived,request.states,uid,clubId,now).filter(item=>item.state===(url.searchParams.get('status')||'open')&&(['all',null].includes(url.searchParams.get('group'))||item.group===url.searchParams.get('group'))&&(['all',null].includes(url.searchParams.get('category'))||item.category===url.searchParams.get('category')));
 const offset=Number(url.searchParams.get('cursor')||0),limit=Number(url.searchParams.get('limit')||20);
 result={retentionSummary:retentionCounts(assessments),actions:filtered.slice(offset,offset+limit),total:filtered.length,nextCursor:offset+limit<filtered.length?String(offset+limit):null,categories:request.input.user.role==='coach'?['clients','coaching','followup','messages','tasks','planning']:request.input.user.role==='manager'?['clients','coaching','followup','messages','tasks','planning','crm']:['clients','coaching','followup','messages','tasks','planning','crm','business'],partialSources:[],generatedAt:now.toISOString()};
 }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(error){res.statusCode=500;res.end(JSON.stringify({error:error.message}));}return;
} if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const records=[],errors=[];
const check=(label,passed,details)=>{records.push({label,passed,details});if(!passed)errors.push({label,details});};
// Home changes height while the fixture's portfolio and Pulse requests settle.
// Use one physical click only after the target is stable and wins hit testing;
// a visible bounding box alone can still lie under the fixed app navigation.
const clickText=async(page,text,selector='button')=>{
 await page.waitForFunction((selector,label)=>[...document.querySelectorAll(selector)].some(button=>button.offsetHeight&&button.textContent?.trim()===label),{},selector,text);
 const handle=await page.evaluateHandle((selector,label)=>[...document.querySelectorAll(selector)].find(button=>button.offsetHeight&&button.textContent?.trim()===label),selector,text);
 const button=handle.asElement();assert.ok(button,`Missing action ${text}`);
 try {
  await button.evaluate(element=>{element.dataset.qaClickReceived='false';element.addEventListener('click',()=>{element.dataset.qaClickReceived='true';},{once:true});element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});});
  const target=await page.waitForFunction(async element=>{
   const first=element.getBoundingClientRect();await new Promise(resolve=>requestAnimationFrame(resolve));
   const rect=element.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   const hit=document.elementFromPoint(x,y);
   if(!element.isConnected||element.disabled||!rect.width||!rect.height)return false;
   if(x<0||x>=innerWidth||y<0||y>=innerHeight||!hit||!element.contains(hit)){element.scrollIntoView({block:'center',inline:'center',behavior:'instant'});return false;}
   return first.x===rect.x&&first.y===rect.y&&first.width===rect.width&&first.height===rect.height?{x,y}:false;
  },{},button);
  const point=await target.jsonValue();await target.dispose();
  await page.mouse.click(point.x,point.y);
  await page.waitForFunction(element=>element.dataset.qaClickReceived==='true',{timeout:3000},button);
 }finally{await handle.dispose();}
};
async function open(role,type,width,height,count){const page=await browser.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);await page.setViewport({width,height,deviceScaleFactor:1});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());page.on('console',message=>{if(message.type()==='error'&&message.text().includes('Fixture UI error'))console.log(message.text());});page.on('pageerror',error=>errors.push({label:'Runtime exception',details:error.message}));await page.goto(`${origin}/dashboard?role=${role}&accountType=${type}&clients=${count}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-home-retain]');return page;}
async function inspect(page,name,surface){const data=await page.evaluate(surface=>({overflow:document.documentElement.scrollWidth>innerWidth,short:[...document.querySelectorAll(`${surface} button,${surface} select,${surface} input`)].filter(el=>el.offsetHeight&&el.getBoundingClientRect().height<43.9).map(el=>el.textContent),finance:window.__qaListeners.filter(row=>['subscriptions','payments','invoices','plans'].includes(row.path)),writes:window.__qaWrites.length}),surface);check(name+' layout/touch',!data.overflow&&!data.short.length,data);return data;}
const compositions=new Map();
try{
 for(const[role,type,label]of(process.env.VELATRA_RETAIN_QA_ACTIONS_ONLY?[]:[['owner','solo','Solo'],['manager','studio','Manager'],['coach','studio','Coach'],['owner','studio','StudioOwner']]))for(const[width,height]of(migrationQA?[[390,844],[1440,900]]:[[390,844],[820,1180],[1440,900],[1920,1080]]))for(const count of(migrationQA?[1]:[0,1,100,500])){
  const page=await open(role,type,width,height,count),name=`${label}-${width}-${count}`;
  const home=await inspect(page,name+' Home','[data-home-section="actions"]');
  if(migrationQA){
   const actual=await page.evaluate(()=>({experience:document.querySelector('[data-experience]')?.dataset.experience,format:document.querySelector('[data-experience]')?.dataset.format,sections:[...document.querySelectorAll('[data-home-section]')].map(el=>el.dataset.homeSection),nav:[...document.querySelectorAll(innerWidth<1024?'.va-mobile-nav button':'.va-rail button')].filter(el=>el.offsetHeight).map(el=>el.textContent.trim()),business:!!document.querySelector('[data-home-section="business"]')}));
   const expected=role==='owner'?(type==='solo'?'SOLO_OWNER':'STUDIO_OWNER'):role==='manager'?'STUDIO_MANAGER':'STUDIO_COACH';
   check(name+' migrated modern ExperienceHome',actual.experience===expected&&actual.format===(width===390?'phone':'desktop'),actual);
   check(name+' modern navigation',actual.nav.includes('Accueil')&&actual.nav.length>0,actual.nav);
   if(role==='coach')check(name+' no global finance or team',!actual.business&&!actual.nav.some(text=>/Finances|Business|Équipe/.test(text)),actual);
   if(width===390)compositions.set(label,actual);else{const phone=compositions.get(label);check(name+' phone differs from desktop',JSON.stringify(phone.sections)!==JSON.stringify(actual.sections)&&JSON.stringify(phone.nav)!==JSON.stringify(actual.nav),{phone,desktop:actual});}
   await page.screenshot({path:path.join(evidence,name+'-home.png')});
   await clickText(page,'Voir toutes les actions','[data-home-section="actions"] button');await page.waitForSelector('[data-pulse-page]');await page.waitForFunction(()=>!document.querySelector('[data-pulse-page]').textContent.includes('Chargement des actions'));
   check(name+' Pulse route accessible',await page.evaluate(()=>window.__qaApi.some(row=>row.path.startsWith('/api/pulse'))));
   await page.goBack();await page.waitForSelector('[data-home-retain]');
  }
  if(role!=='owner')check(name+' no finance',home.finance.length===0,home.finance);check(name+' GET read-only',home.writes===0);
  if(width===390)check(name+' five mobile roots',await page.$$eval('.va-mobile-nav button',buttons=>buttons.filter(el=>el.offsetHeight).length===5));
  await clickText(page,'Ouvrir Velatra Retain');await page.waitForSelector('[data-retain-page]');await page.waitForFunction(()=>!document.querySelector('[data-retain-page]').textContent.includes('Chargement de Retain'));
  await inspect(page,name+' Retain','[data-retain-page]');check(name+' bounded list',await page.$$eval('[data-retain-card]',cards=>cards.length===Math.min(Number(new URLSearchParams(location.search).get('clients')),20)));
  if(count>=100){check(name+' five levels',await page.$$eval('nav[aria-label="Niveaux Retain"] button',buttons=>buttons.length===5&&buttons.every(el=>!el.textContent.includes('· 0'))));await clickText(page,'Voir les clients suivants');await page.waitForFunction(()=>document.querySelectorAll('[data-retain-card]').length===40);check(name+' unique pagination',await page.$$eval('[data-retain-card] h2',items=>new Set(items.map(el=>el.textContent)).size===40));}
  if(count===1){await clickText(page,'Voir Retain','[data-retain-card] button');await page.waitForSelector('[data-retain-detail]');check(name+' explained detail',await page.$eval('[data-retain-detail]',el=>el.textContent.includes('14 jours sans séance')&&el.textContent.includes('Attention')));await inspect(page,name+' Detail','[data-retain-detail]');if(width===390)await page.screenshot({path:path.join(evidence,name+'-detail.png')});}
  if(count===100&&width===390)await page.screenshot({path:path.join(evidence,name+'.png')});await page.close();
 }
 if(!migrationQA)for(const[role,type]of[['owner','solo'],['manager','studio'],['coach','studio']]){
  const page=await open(role,type,390,844,1);await page.waitForSelector('[data-pulse-action="retention:member-0"]');check(role+' one Pulse aggregate',await page.$$eval('[data-home-section="actions"] [data-pulse-action]',cards=>cards.filter(el=>el.dataset.pulseAction==='retention:member-0').length===1&&!cards.some(el=>el.dataset.pulseAction.startsWith('inactive:'))));
  await clickText(page,'Voir Retain','[data-pulse-action="retention:member-0"] button');await page.waitForSelector('[data-retain-detail]');await clickText(page,'Enregistrer l’intervention','[data-retain-detail] button');await page.waitForFunction(()=>document.querySelector('[data-retain-detail]').textContent.includes('Intervention enregistrée.'));check(role+' intervention source isolated',await page.evaluate(()=>window.__qaWrites.length===1&&window.__qaWrites[0].path==='retentionInterventions'));check(role+' intervention does not resolve',await page.$eval('[data-retain-detail] [data-retain-state]',el=>el.dataset.retainState==='attention'));await clickText(page,'Voir le dossier complet');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='retention');await page.waitForSelector('[data-retain-detail]');check(role+' Client360 light retention',true);await page.close();
 }
 // Filters exercise all states and factual search on a 500-member portfolio.
 if(!migrationQA){const page=await open('manager','studio',1440,900,500);await clickText(page,'Ouvrir Velatra Retain');await page.waitForSelector('[data-retain-card]');
 for(const state of ['critical','attention','watch','stable','insufficient_data']){await page.evaluate(state=>{const labels={critical:'Critique',attention:'Attention',watch:'À surveiller',stable:'Stable',insufficient_data:'Données insuffisantes'};[...document.querySelectorAll('nav[aria-label="Niveaux Retain"] button')].find(el=>el.textContent.startsWith(labels[state]+' ·')).click();},state);await page.waitForFunction(state=>document.querySelectorAll('[data-retain-card]').length===20&&[...document.querySelectorAll('[data-retain-card] [data-retain-state]')].every(el=>el.dataset.retainState===state),{},state);check('Manager filters '+state,true);}
 await page.close();}
}catch(error){for(const page of await browser.pages())if(page.url().startsWith(origin)){console.log(JSON.stringify(await page.evaluate(()=>({body:document.body.innerText.slice(0,2500),calls:window.__qaApi?.slice(-5)})),null,2));await page.screenshot({path:path.join(evidence,'failure.png')});}errors.push({label:'Scenario',details:error.stack});}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(evidence,'results.json'),JSON.stringify({checks:records,failures:errors,environment:'RootApp/Home/Retain/Pulse; actual shared pure engine; synthetic API; no production; external requests blocked'},null,2));}
console.log(JSON.stringify({checks:records.length,failures:errors.length,evidence,errors},null,2));if(errors.length)process.exitCode=1;
