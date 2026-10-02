// Actual notification UI + shell, synthetic scoped API and FCM only. No production connection.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = path.join(tmpdir(), 'velatra-notifications-browser');
const evidence = process.env.VELATRA_NOTIFICATIONS_QA_OUTPUT || path.join(work, 'evidence');
await mkdir(work, { recursive: true }); await mkdir(evidence, { recursive: true });
const entry = path.join(work, 'entry.tsx');
await writeFile(entry, `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import {Layout} from '${root}/components/Layout';import {NotificationsPage} from '${root}/pages/NotificationsPage';import {useNotificationBadge,usePushDeviceSync} from '${root}/notifications/client';
const params=new URLSearchParams(location.search);const role=params.get('role');const user={id:10,firebaseUid:'fixture-'+role,role,clubId:'fixture-club',name:'Recette',onboardingCompleted:true};
const club={id:user.clubId,ownerId:'fixture-owner',accountType:role==='owner'?'solo':'studio',isActive:true,name:'Recette',settings:{}};
function Recipe(){const count=useNotificationBadge(user.firebaseUid,user.clubId);usePushDeviceSync(user.firebaseUid);return <Layout user={user} club={club} activePage="notifications" unreadNotificationsCount={count} onPageChange={page=>window.__nav=page} onLogout={()=>{}}><NotificationsPage user={user} onOpen={destination=>window.__destination=destination}/></Layout>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Recipe/></BrowserRouter>);
`);
const fixture = String.raw`
const params=new URLSearchParams(location.search);const uid='fixture-'+params.get('role');export const auth={currentUser:{uid}};export const db={};
window.__permissionRequests=0;window.__calls=[];window.__destination=null;window.__nav=null;
let permission=params.get('permission')||'default';class FakeNotification{static get permission(){return permission}static async requestPermission(){window.__permissionRequests++;permission='granted';return permission}};
Object.defineProperty(window,'Notification',{value:FakeNotification,configurable:true});window.PushManager=class{};
Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({}),ready:Promise.resolve({}),addEventListener(){},removeEventListener(){}},configurable:true});
const categories={MESSAGE:true,PLANNING:true,COACHING:true,FOLLOWUP:true,SALES:params.get('role')!=='member',SYSTEM:true};let prefs={pushEnabled:false,categories};let devices=[];
const count=Number(params.get('count'));let rows=Array.from({length:count},(_,i)=>({id:String(i).padStart(64,'0'),clubId:'fixture-club',recipientUid:uid,category:['MESSAGE','PLANNING','FOLLOWUP'][i%3],type:'FIXTURE',title:'Événement '+i,body:'Texte générique Velatra',createdAt:new Date(Date.UTC(2026,0,1,0,count-i)).toISOString(),readAt:null,destination:i%3===0?{velatraPage:'chat',conversationMemberId:901}:i%3===1?{velatraPage:'calendar',planningBookingId:'booking-fixture'}:{velatraPage:'coaching',followupAssignmentId:'checkin-fixture'}}));
window.__fixture={get rows(){return rows},get prefs(){return prefs},get devices(){return devices}};
export function collection(){return {}};export const doc=collection;export const setDoc=async()=>{throw Error('Unexpected SDK write')};export const updateDoc=setDoc,deleteDoc=setDoc,addDoc=setDoc,createMemberAccount=setDoc,sendPasswordResetEmail=setDoc;export const getStorageClient=async()=>null;export const query=collection,orderBy=collection,limit=collection;export function onSnapshot(_q,cb){cb({docs:[]});return()=>{}};
export const getMessagingClient=async()=>({messaging:{},vapidKey:'fake-public-key',getToken:async()=> 'synthetic-fcm-token-01234567890',deleteToken:async()=>true});
export async function apiFetch(input,opts={}){
const url=new URL(input,location.origin),method=opts.method||'GET';window.__calls.push({path:url.pathname,method,query:url.search});
if(opts.body&&opts.headers?.['Content-Type']!=='application/json')throw Error('JSON header missing');const body=opts.body?JSON.parse(opts.body):null;let data={};
if(url.pathname==='/api/notifications/unread-count')data={count:rows.filter(n=>!n.readAt).length};
else if(url.pathname==='/api/notifications/preferences'){if(method==='PUT')prefs=body;data=prefs;}
else if(url.pathname==='/api/notifications/devices'){if(method==='POST'){devices=[...devices.filter(d=>d.deviceId!==body.deviceId),{deviceId:body.deviceId,platform:'web',enabled:true}];}data={devices};}
else if(url.pathname.startsWith('/api/notifications/devices/')){devices=devices.map(d=>d.deviceId===url.pathname.split('/').at(-1)?{...d,enabled:false}:d);}
else if(url.pathname==='/api/notifications/read-all')rows=rows.map(n=>({...n,readAt:new Date().toISOString()}));
else if(/\/(read|unread)$/.test(url.pathname)){const id=url.pathname.split('/').at(-2),read=url.pathname.endsWith('/read');rows=rows.map(n=>n.id===id?{...n,readAt:read?new Date().toISOString():null}:n);}
else if(url.pathname==='/api/notifications'){let selected=url.searchParams.get('legacy')==='true'?[]:rows.filter(n=>url.searchParams.get('unread')!=='true'||!n.readAt);const cursor=url.searchParams.get('cursor');const start=cursor?selected.findIndex(n=>n.id===cursor)+1:0;const limit=Number(url.searchParams.get('limit')||20);data={items:selected.slice(start,start+limit),nextCursor:selected.length>start+limit?selected[start+limit-1].id:null};}
return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
}
`;
await build({entryPoints:[entry],outfile:path.join(work,'entry.js'),absWorkingDir:root,nodePaths:[path.join(root,'node_modules')],bundle:true,format:'esm',jsx:'automatic',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-firebase',setup(b){b.onResolve({filter:/(?:^|\/)firebase(?:\.[jt]s)?$|^firebase\/firestore$/},()=>({path:'fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:fixture,loader:'js'}));}}]});
const tailwind=process.env.VELATRA_QA_TAILWIND_PATH?await readFile(process.env.VELATRA_QA_TAILWIND_PATH):await fetch('https://cdn.tailwindcss.com').then(r=>{if(!r.ok)throw Error('Tailwind unavailable');return r.text()});
const html='<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="/tailwind.js"></script><link rel="stylesheet" href="/entry.css"></head><body style="margin:0"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind)}else if(['/entry.js','/entry.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');res.end(await readFile(path.join(work,url.pathname.slice(1))))}else{res.setHeader('Content-Type','text/html');res.end(html)}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const records=[];
async function click(page,label){const h=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(b=>b.offsetHeight&&b.textContent.trim()===label),label);assert.ok(h.asElement(),'Missing '+label);await h.asElement().click();await h.dispose();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
const settled=page=>page.waitForFunction(()=>![...document.querySelectorAll('[role="status"]')].some(el=>el.textContent==='Chargement…')&&![...document.querySelectorAll('main[aria-label="Centre de notifications"] button')].some(b=>b.disabled));
try{
for(const role of ['member','owner','manager','coach'])for(const [width,height] of [[390,844],[820,1180],[1440,900],[1920,1080]])for(const count of [0,1,20,100]){
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height,deviceScaleFactor:1});await page.setRequestInterception(true);page.on('request',req=>req.url().startsWith(origin)?void req.continue():void req.abort());
await page.goto(origin+'/?role='+role+'&count='+count,{waitUntil:'networkidle0'});await settled(page);await page.waitForFunction(count=>document.querySelector('button[aria-label^="Notifications"]')?.getAttribute('aria-label')?.includes(String(count)),{},count);
const shape=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,items:document.querySelectorAll('main[aria-label="Centre de notifications"]>ul>li').length,permissionRequests:window.__permissionRequests,bellHeight:document.querySelector('button[aria-label^="Notifications"]').getBoundingClientRect().height,bellWidth:document.querySelector('button[aria-label^="Notifications"]').getBoundingClientRect().width,roots:document.querySelectorAll('.va-mobile-nav button').length}));
assert.ok(!shape.overflow,JSON.stringify({role,width,count,shape}));assert.equal(shape.items,Math.min(count,20));assert.equal(shape.permissionRequests,0);assert.ok(shape.bellHeight>=44&&shape.bellWidth>=44);if(width<768)assert.equal(shape.roots,5);
await page.click('button[aria-label^="Notifications"]');assert.equal(await page.evaluate(()=>window.__nav),'notifications');
if(count){await click(page,'Marquer comme lu');await settled(page);await page.waitForFunction(()=>window.__fixture.rows[0].readAt!==null);await click(page,'Marquer comme non lu');await settled(page);assert.equal(await page.evaluate(()=>window.__fixture.rows[0].readAt),null);await click(page,'Ouvrir');await settled(page);assert.deepEqual(await page.evaluate(()=>window.__destination),{velatraPage:'chat',conversationMemberId:901});
await click(page,'Non lues');await settled(page);assert.equal(await page.$$eval('main[aria-label="Centre de notifications"]>ul>li',els=>els.length),Math.min(count-1,20));await click(page,'Toutes');await settled(page);
if(count===100){await click(page,'Charger 20 suivantes');await settled(page);assert.equal(await page.$$eval('main[aria-label="Centre de notifications"]>ul>li',els=>els.length),40)}
await click(page,'Tout marquer comme lu');await settled(page);await page.waitForFunction(()=>window.__fixture.rows.every(n=>n.readAt));await page.waitForFunction(()=>document.querySelector('button[aria-label^="Notifications"]').getAttribute('aria-label').includes('0'));
}
await page.$eval('fieldset input',input=>input.click());await settled(page);assert.equal(await page.evaluate(()=>window.__fixture.prefs.categories.MESSAGE),false);
if(count===1){await click(page,'Activer les notifications push');await settled(page);await page.waitForFunction(()=>document.body.textContent.includes('Activées'));assert.equal(await page.evaluate(()=>window.__permissionRequests),1);assert.equal(await page.evaluate(()=>window.__fixture.devices.filter(d=>d.enabled).length),1);await click(page,'Désactiver le push');await settled(page);assert.equal(await page.evaluate(()=>window.__fixture.prefs.pushEnabled),false)}
if(count===20&&width===390)await page.screenshot({path:path.join(evidence,role+'-'+width+'.png'),fullPage:false});
assert.deepEqual(errors,[]);records.push({role,width,height,count,passed:true});console.log('PASS '+role+' '+width+'×'+height+' '+count+' notifications');await page.close();
}
for(const role of ['member','owner','manager','coach']){
const page=await browser.newPage();await page.setViewport({width:390,height:844});await page.goto(origin+'/?role='+role+'&count=1&permission=denied',{waitUntil:'networkidle0'});await settled(page);assert.ok(await page.evaluate(()=>document.body.textContent.includes('Refusées')));assert.equal(await page.evaluate(()=>window.__permissionRequests),0);assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Activer les notifications push'))),false);records.push({role,permission:'denied',passed:true});await page.close();
}
console.log('PASS 64 layout/notification cases + 4 denied cases; all FCM calls mocked');
}finally{await writeFile(path.join(evidence,'results.json'),JSON.stringify(records,null,2));await browser.close();await new Promise(r=>server.close(r))}
