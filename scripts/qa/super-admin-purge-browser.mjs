// Real AdminDashboard + purge client. Synthetic isolated services only; no production requests.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile,writeFile,mkdir,rm,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),work=path.join(tmpdir(),'velatra-super-admin-purge-browser');await rm(work,{recursive:true,force:true});await mkdir(work,{recursive:true});
const stub=`
export const db={};export const getStorageClient=async()=>({});
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=r=>r;export const where=()=>null;export const orderBy=()=>null;export const limit=()=>null;
const clubs=[{id:'tenant-a',name:'Alpha',isActive:true,plan:'basic',accountType:'studio',ownerId:'owner-a',createdAt:'2026-10-01'},{id:'tenant-b',name:'Beta',isActive:true,plan:'basic',accountType:'studio',ownerId:'owner-b',createdAt:'2026-10-01'}];
const data={clubs,users:[{firebaseUid:'owner-a',id:10,role:'owner',clubId:'tenant-a',name:'Owner A'},{firebaseUid:'owner-b',id:11,role:'owner',clubId:'tenant-b',name:'Owner B'}],system_announcements:[],admin_audit_logs:[]};
window.__purgeCalls=[];window.__directDeletes=0;window.__completed=false;let last=null;
export async function getDocs(r){return{docs:(data[r.path]||[]).filter(d=>!window.__completed||r.path!=='clubs'||d.id!=='tenant-a').map(d=>({id:d.id||d.firebaseUid,data:()=>d}))};}
export const deleteDoc=()=>{window.__directDeletes++;throw Error('Browser must not delete data');};export const updateDoc=()=>{throw Error('Unexpected update');};export const setDoc=()=>{throw Error('Unexpected write');};export const serverTimestamp=()=>0;export const addDoc=()=>{throw Error('Completion audit must be server-owned');};
export async function apiFetch(url,options){
 if(url!=='/api/admin/clubs/tenant-a/purge')throw Error('Unexpected endpoint '+url);
 if(!options?.method)return new Response(JSON.stringify(last||{error:'No job'}),{status:last?200:404,headers:{'Content-Type':'application/json'}});
 const body=JSON.parse(options.body);if(body.confirmClubId!=='tenant-a'||Object.keys(body).join()!=='confirmClubId')throw Error('Wrong confirmation/scope');window.__purgeCalls.push({url,body});
 const n=window.__purgeCalls.length,scenario=new URLSearchParams(location.search).get('case');
 if(scenario==='network'&&n===2)throw Error('Simulated connection failure');
 last={clubId:'tenant-a',state:n===1?'pending':n===2?'running':scenario==='failure'?'failed':'completed',phase:n===1?'inventory':n===2?'deleting':scenario==='failure'?'deleting':'completed',processed:n<3?n-1:2,total:2,remaining:n<3?3-n:0,error:scenario==='failure'&&n===3?{message:'Storage failure',resource:'drive/tenant-a/file.pdf'}:null};
 if(scenario==='failure'&&n===3)last.remaining=1;
 if(scenario==='inconsistent'&&n===3){last.remaining=1;last.processed=1;}
 if(last.state==='completed'&&scenario!=='inconsistent')window.__completed=true;
 return new Response(JSON.stringify(last),{status:last.state==='failed'?409:last.state==='completed'?200:202,headers:{'Content-Type':'application/json'}});
}
export const ref=()=>({});export const uploadBytes=()=>{throw Error('Unexpected upload');};export const getDownloadURL=()=>{throw Error('Unexpected URL');};
`;
const entry=path.join(work,'entry.tsx');await writeFile(entry,`import React from'react';import{createRoot}from'react-dom/client';import{AdminDashboard}from'${root}/pages/AdminDashboard';window.__toasts=[];createRoot(document.getElementById('root')).render(<AdminDashboard actorEmail="admin@example.test" showToast={(message,type)=>window.__toasts.push({message,type})}/>);`);
await build({absWorkingDir:root,entryPoints:[entry],outdir:path.join(work,'bundle'),bundle:true,format:'esm',jsx:'automatic',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{"DEV":true,"MODE":"test"}'},plugins:[{name:'isolated',setup(b){b.onResolve({filter:/(?:^firebase\/|(?:^|\/)firebase$)/},()=>({path:'fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:stub,loader:'js'}));}}]});
const bundle=path.join(work,'bundle'),names=await readdir(bundle),js=names.find(n=>n.endsWith('.js')),css=names.find(n=>n.endsWith('.css'));
const tailwind=await readFile(path.join(tmpdir(),'velatra-tailwind-3.4.17.js')).catch(async()=>{const r=await fetch('https://cdn.tailwindcss.com');assert.ok(r.ok);return Buffer.from(await r.arrayBuffer());});
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);return;}if(p.endsWith('.js')||p.endsWith('.css')){res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(path.join(bundle,path.basename(p))));return;}res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/tailwind.js"></script>${css?`<link rel="stylesheet" href="/${css}">`:''}</head><body><div id="root"></div><script type="module" src="/${js}"></script></body></html>`);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});let assertions=0;
try{
 for(const scenario of ['failure','network','inconsistent','success']){
  const page=await browser.newPage();await page.setViewport({width:1280,height:900});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());await page.goto(origin+'/?case='+scenario);
  await page.waitForSelector('[data-club-purge="tenant-a"]');await page.click('[data-club-purge="tenant-a"]');await page.waitForSelector('[role="dialog"]');
  assert.ok(await page.$eval('[role="dialog"]',el=>el.textContent.includes('Alpha')&&el.textContent.includes('tenant-a')));assertions++;
  assert.equal(await page.$eval('[role="dialog"] button:last-child',b=>b.disabled),true);assertions++;
  await page.type('[aria-label="ID du club à purger"]','tenant-b');assert.equal(await page.$eval('[role="dialog"] button:last-child',b=>b.disabled),true);assertions++;
  await page.$eval('[aria-label="ID du club à purger"]',el=>{el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.click('[aria-label="ID du club à purger"]',{clickCount:3});await page.keyboard.press('Backspace');await page.type('[aria-label="ID du club à purger"]','tenant-a');
  await page.click('[role="dialog"] button:last-child');
  await page.waitForFunction(()=>window.__toasts.some(t=>t.type==='error'||t.message.startsWith('Purge vérifiée')));
  const state=await page.evaluate(()=>({toasts:window.__toasts,calls:window.__purgeCalls,deletes:window.__directDeletes,alpha:!!document.querySelector('[data-club-purge="tenant-a"]'),beta:!!document.querySelector('[data-club-purge="tenant-b"]')}));
  assert.equal(state.deletes,0);assertions++;assert.ok(state.beta);assertions++;
  if(scenario==='success'){await page.waitForFunction(()=>!document.querySelector('[data-club-purge="tenant-a"]'));assert.ok(state.toasts.some(t=>t.type==='success'&&t.message.startsWith('Purge vérifiée')));assertions++;assert.equal(state.calls.length,3);assertions++;}
  else{assert.ok(state.alpha);assertions++;assert.ok(!state.toasts.some(t=>t.type==='success'));assertions++;}
  await page.close();
 }
 console.log(`Super Admin purge browser: ${assertions} assertions PASS (synthetic services; no production)`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
