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
const work=path.join(tmpdir(),'velatra-role-format-browser');
const evidence=process.env.VELATRA_ROLE_QA_OUTPUT || path.join(work,'evidence');
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
export async function apiFetch(path,opts){window.__qaApi.push({path,method:opts?.method||'GET'});if(opts?.method&&opts.method!=='GET'&&!path.startsWith('/api/notifications/'))throw Error('Unexpected mutating API');if(path.startsWith('/api/notifications/bookings/'))return new Response(JSON.stringify({booking:data.bookings.find(b=>b.id===path.split('/').at(-1))}),{status:200,headers:{'Content-Type':'application/json'}});if(path.startsWith('/api/notifications')){if(opts?.method==='POST'&&path.endsWith('/read')){const row=noticeRows.find(n=>n.id===path.split('/').at(-2));if(row)row.readAt=new Date().toISOString();}const item=noticeRows.find(n=>path==='/api/notifications/'+n.id);const value=path.endsWith('/unread-count')?{count:noticeRows.filter(n=>!n.readAt).length}:path.endsWith('/preferences')?{pushEnabled:false,categories:{MESSAGE:true,PLANNING:true,COACHING:true,FOLLOWUP:true,SALES:true,SYSTEM:true}}:path.endsWith('/devices')?{devices:[]}:item||{items:noticeRows,nextCursor:null};return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});}const result=path==='/api/member/assigned-coach'?{coach}:path==='/api/followup/me'?{journey:null,assignments:[{id:'member-bilan',templateName:'Bilan membre',status:'expected',active:true,questions:[{id:'q',label:'Question membre',type:'text',required:true}]}],responses:[],habits:[],entries:[],logs:[],today:day}:path.startsWith('/api/pulse?')?{actions:count?[{key:'task:task-1',type:'TASK_TODAY',category:'tasks',priority:'normal',title:'Préparer le bilan Emma',reason:'Tâche due aujourd’hui',sourceFingerprint:'0'.repeat(64),createdFrom:'tasks/task-1',group:'today',state:'open',destination:{page:'crm_tasks',taskId:'task-1'},quickActions:[{label:'Ouvrir la tâche',destination:{page:'crm_tasks',taskId:'task-1'}}]}]:[],total:count?1:0,nextCursor:null,categories:role==='coach'?['clients','coaching','followup','messages','tasks','planning']:role==='manager'?['clients','coaching','followup','messages','tasks','planning','crm']:['clients','coaching','followup','messages','tasks','planning','crm','business'],partialSources:[],generatedAt:iso(new Date())}:path==='/api/coach/assigned-members'?{assignedMemberIds:members.map(item=>item.id)}:path==='/api/followup/priorities'?{priorities:count?[{memberUid:'member-0',memberName:'Emma Martin',templateName:'Bilan',dueDate:day,status:'expected'}]:[],dueCount:count?1:0}:path.startsWith('/api/bookings/availability')?{slots:[]}:path.startsWith('/api/followup/clients/')?{journey:null,assignments:[],responses:[],habits:[],entries:[],logs:[],today:day}:path==='/api/followup/templates'?{templates:[]}:path.startsWith('/api/followup/journey/')?{journey:null}:{};return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});}
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
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/brand/') && /\.(png|webp)$/.test(pathname)){const asset=path.resolve(root,'public',pathname.slice(1));if(!asset.startsWith(path.join(root,'public','brand')+path.sep)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',pathname.endsWith('.png')?'image/png':'image/webp');res.end(await readFile(asset));return;}if(pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(pathname.endsWith('.js')||pathname.endsWith('.css')){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(path.join(bundle,path.basename(pathname))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[[320,568],[360,800],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1600,1000],[1920,1080]];
const roles=[['owner','solo','SOLO_OWNER'],['manager','studio','STUDIO_MANAGER'],['coach','studio','STUDIO_COACH'],['owner','studio','STUDIO_OWNER']];
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
async function inspect(page,label,width,height){
  const result=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth,
    format:document.querySelector('[data-experience]')?.dataset.format,
    experience:document.querySelector('[data-experience]')?.dataset.experience,
    sections:[...document.querySelectorAll('[data-home-section]')].map(element=>element.dataset.homeSection),
    finance:!!document.querySelector('[data-home-section="business"]'),
    team:!!document.querySelector('[data-home-section="team"]'),
    foreign:document.body.innerText.includes('FOREIGN TENANT'),
    otherPortfolio:document.body.innerText.includes('OTHER PORTFOLIO'),
    nav:[...document.querySelectorAll(innerWidth<1024?'.va-mobile-nav button':'.va-rail button')].filter(b=>b.offsetHeight).map(b=>b.textContent.trim()),
    financialListeners:window.__qaListeners.filter(item=>['plans','subscriptions','payments','invoices','expenses','fixedCosts','manualStats'].includes(item.path)),
    sensitiveCalls:window.__qaApi.filter(item=>/billing|stripe/.test(item.path)),
    shortActions:[...document.querySelectorAll('.va-experience-home button')].filter(button=>button.getBoundingClientRect().height&&button.getBoundingClientRect().height<43.9).map(button=>button.textContent),
    zones:document.querySelectorAll('[data-home-zone]').length,
    closedBusiness:document.querySelector('details[data-home-section="business"]')?.open===false,
    writes:window.__qaWrites.length
  }));
  check(`${label} ${width}×${height} layout and access`,!result.overflow&&!result.foreign&&!result.shortActions.length&&result.writes===0,result);
  check(`${label} ${width}×${height} format`,result.format===(width<768?'phone':width<1024?'tablet':width<1600?'desktop':'largeDesktop'),result.format);
  if(result.experience==='STUDIO_COACH'||result.experience==='STUDIO_MANAGER')check(`${label} ${width}×${height} no finance loading`,!result.finance&&!result.financialListeners.length&&!result.sensitiveCalls.length,result);
  if(result.experience==='STUDIO_COACH')check(`${label} ${width}×${height} assigned portfolio`,!result.otherPortfolio&&!result.team&&result.sections[0]==='agenda',result);
  if(width<768){check(`${label} phone five roots`,result.nav.length===5,result.nav);if(result.experience.endsWith('OWNER'))check(`${label} phone Business secondary`,result.closedBusiness&&result.sections.at(-1)==='business',result.sections);}
  if(width>=1600)check(`${label} cockpit two zones`,result.zones===2,result.zones);
  if(width>=1024)check(`${label} branded desktop shell`,await page.$('.vd-shell .vd-sidebar-brand img[src="/brand/desktop/velatra-logo.png"]')!==null);
  else check(`${label} existing mobile/tablet shell`,await page.$('.vd-shell')===null);
  return result;
}
try{
  if(process.env.VELATRA_DESKTOP_QA_ONLY){
    for(const [role,type,experience] of roles) for(const [width,height] of [[1024,768],[1280,800],[1440,1000],[1600,1000],[1920,1080]]) {
      const page=await open(role,type,width,height,8); await inspect(page,experience,width,height);
      await page.waitForFunction(()=>[...document.querySelectorAll('.vd-shell img[src^="/brand/desktop/"]')].every(img=>img.complete&&img.naturalWidth>0));
      check(experience+' desktop brand assets loaded',await page.$$eval('.vd-shell img[src^="/brand/desktop/"]',images=>images.length>=3));
      await page.click('.vd-search-bar');await page.waitForSelector('#velatra-command-results');check(experience+' hero opens existing command palette',true);await page.keyboard.press('Escape');await page.waitForSelector('.va-command-overlay',{hidden:true});
      if(width===1440){
        await page.evaluate(()=>window.__qaSetState(state=>({...state,driveFiles:[
          {id:'doc-local',clubId:state.currentClub.id,name:'Programme de préparation.pdf',createdAt:'2026-10-01T09:00:00Z',path:'fixture-only',size:1200,type:'application/pdf',folderId:null,uploadedBy:state.user.id,sharedWith:[]},
          {id:'doc-foreign',clubId:'other',name:'FOREIGN DOCUMENT',createdAt:'2026-10-02T09:00:00Z',path:'fixture-only',size:1200,type:'application/pdf',folderId:null,uploadedBy:999,sharedWith:[]}
        ]})));
        await page.waitForFunction(()=>document.querySelector('.vd-documents')?.textContent.includes('Programme de préparation.pdf'));
        check(experience+' recent documents stay in current tenant',!(await page.$eval('.vd-documents',node=>node.textContent.includes('FOREIGN DOCUMENT'))));
      }
      await page.screenshot({path:path.join(evidence,`${experience}-${width}.png`),fullPage:true});
      if(width===1440){
        const nav=await page.$$eval('.vd-sidebar-navigation button',buttons=>buttons.map(b=>({label:b.textContent,selected:b.getAttribute('aria-current')})));
        check(experience+' dashboard selected',nav.some(b=>b.label.includes('Tableau de bord')&&b.selected==='page'));
        check(experience+' sidebar uses approved copy',await page.$eval('.vd-sidebar-card',card=>card.textContent.includes('Passez au niveau supérieur')&&card.textContent.includes('Plus de possibilités pour accompagner encore plus de clients.')&&card.querySelector('button')?.textContent.includes('Découvrir')));
        await page.click('.va-topbar .va-mobile-profile');await page.waitForSelector('#va-profile-menu');check(experience+' topbar account menu works',await page.$eval('#va-profile-menu',menu=>{const box=menu.getBoundingClientRect();return box.top>=0&&box.bottom<=innerHeight&&box.height<500;}));await page.keyboard.press('Escape');await page.waitForSelector('#va-profile-menu',{hidden:true});check(experience+' account menu restores keyboard focus',await page.$eval('.va-topbar .va-mobile-profile',button=>document.activeElement===button));
        check(experience+' widget rows have real statuses and collapsed secondary actions',await page.evaluate(()=>
          document.querySelector('[data-home-member="901"] .vd-widget-badges')?.textContent.includes('Programme demandé') &&
          document.querySelector('[data-home-booking] .vd-widget-badges')?.textContent.includes('Confirmé') &&
          !document.querySelector('[data-home-member="901"] details')?.open));
        const settleRender=async()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const returnHome=async()=>{await page.goBack();await page.waitForFunction(()=>window.__qaGetState().page==='home'&&document.querySelector('[data-desktop-dashboard]'));await settleRender();};
        const expandClient=async()=>{
          await page.$eval('[data-home-member="901"] summary',element=>{element.scrollIntoView({block:'center'});element.focus();});
          await page.keyboard.press('Enter');await page.waitForSelector('[data-home-member="901"] details[open]');
        };
        await expandClient();
        check(experience+' secondary actions open with keyboard',true);
        await clickText(page,'Ajouter une note','[data-home-member="901"] button');
        await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='followup'&&document.activeElement?.tagName==='TEXTAREA');
        check(experience+' desktop note still focuses existing editor',true);await returnHome();
        await expandClient();await clickText(page,'Préparer le programme','[data-home-member="901"] button');
        await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='coaching');
        check(experience+' desktop programme keeps existing destination',true);await returnHome();
        await expandClient();await clickText(page,'Message','[data-home-member="901"] button');
        await page.waitForFunction(()=>document.body.innerText.includes('Bonjour Coach'));
        check(experience+' desktop message keeps existing conversation',true);await returnHome();
        await clickSelector(page,'[data-home-booking] .vd-row-primary');await page.waitForSelector('[data-planning-dialog="active"]');
        check(experience+' agenda row opens actual booking',await page.$eval('[data-planning-dialog="active"]',element=>element.textContent.includes('Emma Martin')));await returnHome();
        await clickSelector(page,'[data-home-member="901"] .vd-row-primary');await page.waitForSelector('#client-360-section');
        check(experience+' CRM row opens existing client profile',true);await returnHome();
        const writes=await page.evaluate(()=>window.__qaWrites);
        check(experience+' only existing conversation read receipt is written',writes.every(write=>write.path==='messages/600'&&Object.keys(write.patch).join()==='read'&&write.patch.read===true),writes);
        for(const label of ['Drive',...(role!=='coach'?['Prospects']:[])]){
          await clickText(page,label,'.vd-sidebar-navigation button');
          // A removed dashboard can mean Suspense, not a ready destination. Wait for
          // the real page and router state before exercising browser Back.
          await page.waitForFunction(({destination,title})=>window.__qaGetState().page===destination&&history.state?.usr?.velatraPage===destination&&document.querySelector('.va-page-body h1')?.textContent.includes(title),{},
            {destination:label==='Drive'?'drive':'crm_pipeline',title:label==='Drive'?'Drive Intégré':'Prospects'});
          await settleRender();check(experience+' desktop navigation '+label,await page.evaluate(()=>!!document.querySelector('.vd-shell')));await returnHome();
        }
      }
      await page.close();
    }
    for(const role of ['coach','manager'])for(const width of [390,820]){const page=await open(role,'studio',width,900);await inspect(page,role,width,900);check(role+' mobile/tablet theme unchanged',await page.$('.vd-shell')===null);await page.close();}
  } else {
  for(const [role,type,experience] of (process.env.VELATRA_QA_ACTIONS_ONLY?[]:roles))for(const [width,height] of sizes){
    const page=await open(role,type,width,height);const result=await inspect(page,experience,width,height);check('Correct role Home',result.experience===experience,result.experience);
    if([320,820,1600].includes(width))await page.screenshot({path:path.join(evidence,`${experience}-${width}.png`),fullPage:true});await page.close();
  }
  for(const [role,type,experience] of (process.env.VELATRA_QA_ACTIONS_ONLY?[]:roles))for(const count of [0,1,100])for(const [width,height] of [[390,844],[1440,900]]){
    const page=await open(role,type,width,height,count);const result=await inspect(page,`${experience} ${count} clients`,width,height);
    const portfolio=await page.evaluate(()=>({members:document.querySelectorAll('[data-home-member]').length,text:document.querySelector('[data-home-section="clients"]')?.textContent,readiness:window.__qaGetState().onboardingDataReady}));
    check(`${experience} ${count} clients ${width} bounded portfolio`,portfolio.members<=(width<768?4:12)&&portfolio.readiness&&(!count?portfolio.text.includes('Aucun client'):portfolio.members>0),portfolio);
    if(experience==='STUDIO_COACH'&&count===100&&width===1440){await page.type('[data-home-section="clients"] input','Client 99');check('Coach desktop searches full scoped portfolio',await page.$eval('[data-home-section="clients"]',element=>element.textContent.includes('Client 99')&&element.querySelectorAll('[data-home-member]').length===1));}
    await page.close();
  }
  for(const [role,type,experience] of roles){
    const page=await open(role,type,390,844);
    await clickText(page,'Ajouter une note','[data-home-section="clients"] button');await page.waitForSelector('#client-360-section');
    await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='followup'&&document.activeElement?.tagName==='TEXTAREA');
    check(`${experience} opens client note and focuses textarea`,true);await page.goBack();await page.waitForSelector('[data-experience]');
    await clickText(page,'Préparer le programme','[data-home-section="clients"] button');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='coaching');check(`${experience} opens Coaching section`,true);
    await page.goBack();await page.waitForSelector('[data-experience]');
    await clickText(page,'Message','[data-home-section="clients"] button');await page.waitForFunction(()=>document.body.innerText.includes('Bonjour Coach'));check(`${experience} opens assigned conversation`,true);await page.goBack();await page.waitForSelector('[data-experience]');
    await clickSelector(page,'[data-home-booking] button');await page.waitForSelector('[data-planning-dialog="active"]');check(`${experience} opens actual booking`,await page.$eval('[data-planning-dialog="active"]',element=>element.textContent.includes('Emma Martin')));await page.goBack();await page.waitForSelector('[data-experience]');
    await clickSelector(page,'[data-home-action="task"]');await page.waitForSelector('[data-operational-task="task-1"]');check(`${experience} opens focused operational task`,await page.$eval('[data-operational-task="task-1"]',element=>element.contains(document.activeElement)));await clickText(page,'Terminer la tâche','[data-operational-task] button');await page.waitForFunction(()=>window.__qaWrites.some(write=>write.path==='tasks/task-1'&&write.patch.status==='done'));check(`${experience} completes only selected fixture task`,true);
    await page.goBack();await page.waitForSelector('[data-experience]');
    if(experience==='STUDIO_MANAGER'||experience==='STUDIO_OWNER'||experience==='SOLO_OWNER'){await page.locator('.va-mobile-nav button[aria-label="Ouvrir Plus"]').click();await page.waitForSelector('#velatra-mobile-more',{visible:true});await clickText(page,experience==='SOLO_OWNER'?'Finances':'Équipe','#velatra-mobile-more button');check(`${experience} secondary destinations accessible`,true);}
    await page.close();
  }
  for(const [role,type,experience] of roles){
    const page=await open(role,type,390,844);
    const openNotice=async title=>{await clickSelector(page,'button[aria-label^="Notifications"]');await page.waitForSelector('[aria-label="Centre de notifications"]');await page.waitForFunction(()=>document.body.innerText.includes('Notification message'));await page.evaluate(title=>[...document.querySelectorAll('main[aria-label="Centre de notifications"]>ul>li')].find(li=>li.textContent.includes(title)).querySelector('button').click(),title);};
    await openNotice('Notification message');await page.waitForFunction(()=>document.body.innerText.includes('Bonjour Coach'));check(experience+' notification opens conversation in actual App',true);
    await openNotice('Notification séance');await page.waitForSelector('[data-planning-dialog="active"]');check(experience+' notification opens booking in actual App',true);
    await page.goBack();await page.waitForSelector('[aria-label="Centre de notifications"]');
    await openNotice('Notification bilan');await page.waitForFunction(()=>document.querySelector('#client-360-section')?.value==='followup');check(experience+' notification opens Client360 followup in actual App',true);
    await page.close();
  }
  {
    const page=await browser.newPage();await page.setViewport({width:390,height:844});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());
    await page.goto(origin+'/dashboard?role=coach&accountType=studio&clients=1&providerOnly=true',{waitUntil:'networkidle0'});await page.waitForSelector('button[aria-label^="Notifications"]');await clickSelector(page,'button[aria-label^="Notifications"]');await page.waitForFunction(()=>document.body.innerText.includes('Notification séance'));await page.evaluate(()=>[...document.querySelectorAll('main[aria-label="Centre de notifications"]>ul>li')].find(li=>li.textContent.includes('Notification séance')).querySelector('button').click());await page.waitForSelector('[data-planning-dialog="active"]');check('New coach opens own booking through narrow API without a private portfolio listener',await page.evaluate(()=>window.__qaApi.some(r=>r.path==='/api/notifications/bookings/booking-1')));await page.close();
  }
  {
    const page=await browser.newPage();await page.setViewport({width:390,height:844});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());page.on('pageerror',e=>errors.push({label:'Member notification runtime',details:e.message}));
    await page.goto(origin+'/dashboard?role=member&accountType=studio&clients=1',{waitUntil:'networkidle0'});await page.waitForSelector('button[aria-label^="Notifications"]');
    const openNotice=async title=>{await clickSelector(page,'button[aria-label^="Notifications"]');await page.waitForSelector('[aria-label="Centre de notifications"]');await page.waitForFunction(()=>document.body.innerText.includes('Notification message'));await page.evaluate(title=>[...document.querySelectorAll('main[aria-label="Centre de notifications"]>ul>li')].find(li=>li.textContent.includes(title)).querySelector('button').click(),title);};
    await openNotice('Notification message');await page.waitForFunction(()=>document.body.innerText.includes('Bonjour Coach'));check('Member notification opens assigned conversation in actual App',true);
    await openNotice('Notification séance');await page.waitForSelector('[data-planning-dialog="active"]');check('Member notification opens owned booking without staff actions',await page.$eval('[data-planning-dialog="active"]',el=>!el.textContent.includes('Ouvrir le client')&&!el.textContent.includes('Déplacer')));
    await page.goBack();await page.waitForSelector('[aria-label="Centre de notifications"]');await openNotice('Notification bilan');await page.waitForFunction(()=>document.querySelector('form')?.textContent.includes('Question membre'));check('Member notification opens actual questionnaire in App',true);await page.close();
  }
  // Live server status changes must revoke the actual App surfaces and cached
  // tenant data without losing the status listener needed for reactivation.
  for (const role of ['owner','manager','coach','member']) {
    const page=await browser.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);await page.setViewport({width:390,height:844});
    await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());
    page.on('pageerror',e=>errors.push({label:role+' suspension runtime',details:e.message}));
    await page.goto(origin+'/dashboard?role='+role+'&accountType=studio&clients=1',{waitUntil:'networkidle0'});
    await page.waitForFunction(()=>window.__qaGetState?.().currentClub?.isActive===true&&window.__qaActiveTenantListeners().length>0);
    for (const value of [false, undefined, 'true']) {
      await page.evaluate(value=>window.__qaSetOrganizationActivation(value),value);
      await page.waitForFunction(()=>document.body.innerText.includes('Compte Suspendu')&&window.__qaActiveTenantListeners().length===0);
      const state=await page.evaluate(()=>({role:window.__qaGetState().user?.role,signouts:window.__qaSignouts,
        retained:['users','programs','logs','messages','tasks','subscriptions','payments'].filter(key=>window.__qaGetState()[key].length)}));
      check(role+' suspended/malformed activation blocks App and clears tenant data',state.role===role&&state.signouts===0&&state.retained.length===0,state);
      await page.evaluate(()=>window.__qaSetOrganizationActivation(true));
      await page.waitForFunction(()=>!document.body.innerText.includes('Compte Suspendu')&&window.__qaActiveTenantListeners().length>0);
    }
    check(role+' authorized reactivation restores live App',true);await page.close();
  }
  }
}catch(error){const pages=await browser.pages();for(const page of pages){if(page.url().startsWith(origin)){console.log(JSON.stringify(await page.evaluate(()=>({state:history.state,body:document.body.innerText.slice(0,1600),tab:document.querySelector('#client-360-section')?.value,active:document.activeElement?.tagName,notes:document.querySelectorAll('textarea').length})),null,2));await page.screenshot({path:path.join(evidence,'scenario-failure.png')});}}errors.push({label:'Browser scenario',details:error.stack});}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(evidence,'results.json'),JSON.stringify({checks:records,failures:errors,environment:'RootApp with isolated Firebase fixture; all external requests blocked; no production data'},null,2));}
console.log(JSON.stringify({checks:records.length,failures:errors.length,evidence,errors:errors.map(error=>({label:error.label,details:error.details==null?null:typeof error.details==='string'?error.details:{overflow:error.details.overflow,shortActions:error.details.shortActions,financialListeners:error.details.financialListeners}}))},null,2));if(errors.length)process.exitCode=1;
