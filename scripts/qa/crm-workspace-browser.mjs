// Isolated local fixture: actual Layout + CRM components. No production Firebase or email.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const root=process.cwd(), work=await mkdtemp(path.join(tmpdir(),'velatra-crm-workspace-'));
const output=process.env.VELATRA_CRM_QA_OUTPUT||path.join(work,'evidence');await mkdir(output,{recursive:true});
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import {Layout} from '${root}/components/Layout';import {ProspectFlowPage} from '${root}/pages/ProspectFlowPage';
const params=new URLSearchParams(location.search),manager=params.get('role')==='manager',count=Number(params.get('count')||18);
const date=n=>new Date(Date.now()+n*86400000).toISOString();
const user={id:1,firebaseUid:'actor',role:manager?'manager':'owner',clubId:'qa-club',name:manager?'Camille Gérant':'Alex Coach',avatar:'AC',onboardingCompleted:true};
const coach={id:2,firebaseUid:'coach',role:'coach',clubId:'qa-club',name:'Léa Bernard'};
const club={id:'qa-club',name:'Studio de recette',accountType:manager?'studio':'solo',ownerId:manager?'owner':'actor',isActive:true,settings:{booking:{enabled:true}}};
const names=['Emma Laurent','Thomas Martin','Julie Moreau','Lucas Bernard','Sarah Petit','Hugo Richard','Léa Dubois','Maxime Robert','Clara Simon','Nathan Michel','Chloé Garcia','Louis Lefebvre'];
const stages=['lead','contacted','call_pending','trial','won','lost'];
const prospects=Array.from({length:count},(_,i)=>({id:100+i,firebaseUid:'prospect-'+i,clubId:'qa-club',name:names[i%names.length]+(i>11?' '+i:''),firstName:i===0?'Emma':undefined,lastName:i===0?'Laurent':undefined,email:'contact'+i+'@example.test',phone:'06 12 34 56 78',status:stages[i%6],date:date(-8-i),source:i%2?'Recommandation':'Site web',assignedCoachUid:i%2?'coach':null,tags:i%3===0?['Reprise sportive']:[],proposedOffer:i%2?'Coaching individuel':'',nextAction:'Faire le point sur les objectifs',...(i%6===2?{nextReminderDate:date(-1)}:{}),...(i%6===4?{convertedMemberUid:'member-'+i,convertedMemberId:1000+i,convertedAt:date(-1)}:{}),answers:{},notesHistory:i===0?[{id:'note-0',date:date(-2),content:'Souhaite reprendre une activité régulière. Préfère les créneaux en soirée.',authorName:'Alex Coach'}]:[],activityHistory:i===0?[{id:'lead-0',date:date(-8),label:'Lead créé'}]:[]}));
const foreign={...prospects[0],id:9999,firebaseUid:'foreign',clubId:'other',name:'FOREIGN TENANT'};
function Fixture(){const [state,setState]=React.useState({user,currentClub:club,users:[user,coach],prospects:[...prospects,foreign],bookings:[],tasks:[],page:'crm_pipeline'});window.__qaState=state;window.__qaSetState=setState;return <BrowserRouter><Layout user={user} club={club} activePage={state.page} onPageChange={page=>setState(s=>({...s,page}))} onLogout={()=>{}} users={state.users}><ProspectFlowPage state={state} setState={setState} showToast={msg=>window.__qaToast=msg}/></Layout></BrowserRouter>}
createRoot(document.getElementById('root')).render(<Fixture/>);
`;
const firebase=`
const denied=()=>{throw Error('Unexpected fixture operation')};export const setDoc=denied,updateDoc=denied,addDoc=denied,createMemberAccount=denied,uploadBytes=denied,uploadBytesResumable=denied,deleteObject=denied,getDownloadURL=denied;export const getStorageClient=async()=>({});export const ref=(...args)=>args;export const getDocs=async()=>({docs:[]});
export const db={};export const auth={currentUser:{uid:'actor',emailVerified:true}};
export const doc=(_db,...parts)=>({path:parts.join('/')});export const collection=doc;export const query=(ref,...args)=>ref;export const where=(...args)=>args;export const orderBy=where;export const limit=where;
export const onSnapshot=(_ref,cb)=>{cb({docs:[],forEach:()=>{}});return()=>{}};
export const runTransaction=async()=>{throw Error('Unexpected direct transaction')};export const deleteDoc=async()=>{throw Error('Unexpected deletion')};export const sendPasswordResetEmail=async()=>{};
window.__qaRequests=[];
export const apiFetch=async(url,options={})=>{const body=options.body?JSON.parse(options.body):null;window.__qaRequests.push({url,body});
let result={};const state=window.__qaState;const id=url.split('/')[4];const p=state.prospects.find(p=>p.firebaseUid===id);
if(url.startsWith('/api/sales/trials'))result={trials:[],total:0};
else if(url.startsWith('/api/sales/overview'))result={};
else if(url==='/api/sales/prospects'){result={prospect:{...body,id:500,firebaseUid:'created',clubId:'qa-club',status:'lead',date:new Date().toISOString(),answers:{}}};}
else if(url.endsWith('/activity')){if(body.content==='FAIL')return new Response(JSON.stringify({error:'Échec de recette'}),{status:500});const at=new Date().toISOString();result={prospect:{...p,activityHistory:[{id:body.requestId,date:at,label:body.kind==='note'?'Note CRM ajoutée':'Appel consigné',noteId:body.kind==='note'?body.requestId:undefined,content:body.kind!=='note'?body.content:undefined},...(p.activityHistory||[])],notesHistory:body.kind==='note'?[{id:body.requestId,date:at,content:body.content},...(p.notesHistory||[])]:p.notesHistory,...(body.kind!=='note'?{lastContactAt:at}:{})}};}
else if(url.endsWith('/profile'))result={prospect:{...p,...body}};
else if(url.endsWith('/stage'))result={prospect:{...p,...body}};
else if(url.endsWith('/convert')){const p=state.prospects.find(p=>p.firebaseUid===url.split('/')[3]);window.__qaSetState(s=>({...s,prospects:s.prospects.map(v=>v===p?{...v,status:'won',convertedMemberUid:'converted',convertedMemberId:850}:v)}));result={uid:'converted',memberId:850,alreadyConverted:false};}
else if(options.method==='POST')throw Error('Unexpected fixture mutation: '+url);
return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});};
`;
await writeFile(path.join(work,'entry.tsx'),entry);
await build({entryPoints:[path.join(work,'entry.tsx')],outfile:path.join(work,'entry.js'),bundle:true,format:'esm',jsx:'automatic',target:'es2022',nodePaths:[path.join(root,'node_modules')],define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-firebase',setup(b){b.onResolve({filter:/^firebase\//},args=>({path:args.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'ts',contents:firebase}));b.onLoad({filter:/[/\\]firebase\.ts$/},()=>({loader:'ts',contents:firebase}));}}]});
const tailwind=await readFile(path.join(tmpdir(),'velatra-tailwind-3.4.17.js')).catch(async()=>Buffer.from(await(await fetch('https://cdn.tailwindcss.com')).arrayBuffer()));
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{if(url.pathname==='/entry.js'||url.pathname==='/entry.css'){res.setHeader('Content-Type',url.pathname.endsWith('js')?'application/javascript':'text/css');res.end(await readFile(path.join(work,url.pathname)));}else if(url.pathname==='/tailwind.js'){res.setHeader('Content-Type','application/javascript');res.end(tailwind);}else if(url.pathname.startsWith('/brand/')){res.setHeader('Content-Type','image/png');res.end(await readFile(path.join(root,'public',url.pathname)));}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><script src="/tailwind.js"></script><link rel="stylesheet" href="/entry.css"></head><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>');}}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
const click=async(page,text,selector='button')=>{const h=await page.evaluateHandle((text,selector)=>[...document.querySelectorAll(selector)].find(e=>e.offsetHeight&&e.textContent.trim()===text),text,selector);assert.ok(h.asElement(),'Missing '+text);await h.asElement().click();await h.dispose();};
const check=(name,value)=>{results.push({name,pass:!!value});assert.ok(value,name);};
try{
 for(const role of ['owner','manager'])for(const width of [320,768,1440]){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width,height:1000,deviceScaleFactor:1});await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)?void r.continue():void r.abort());
  await page.goto(origin+'/?role='+role,{waitUntil:'networkidle0'});await page.waitForSelector('[data-crm-workspace]');
  check(role+width+' pipeline responsive',await page.evaluate(width=>document.documentElement.scrollWidth<=width+1,width));check(role+width+' tenant isolation',!await page.evaluate(()=>document.body.innerText.includes('FOREIGN TENANT')));
  if(width===1440){await click(page,'Pipeline','nav[aria-label="Vues CRM"] button');await page.screenshot({path:path.join(output,role+'-navigation-1440.png')});await page.screenshot({path:path.join(output,role+'-pipeline-1440.png')});}
  await click(page,'Liste','nav[aria-label="Vues CRM"] button');await page.waitForSelector('table[aria-label="Liste prospects"]');check(role+width+' list rows',await page.$$eval('.vi-table tbody tr',rows=>rows.length===18));
  if(width===1440)await page.screenshot({path:path.join(output,role+'-list-1440.png')});
  await page.type('[aria-label="Rechercher un prospect"]','contact0@example.test');check(role+width+' search filters',await page.$$eval('.vi-table tbody tr',r=>r.length===1));
  await click(page,'Réinitialiser');await page.select('[aria-label="Filtrer par étape"]','lost');check(role+width+' stage filter',await page.$$eval('.vi-table tbody tr',r=>r.length===3));await click(page,'Réinitialiser');
  await page.click('[aria-label="Ouvrir Emma Laurent"]');await page.waitForSelector('.vi-dialog');
  if(width===1440)await page.screenshot({path:path.join(output,role+'-record-1440.png')});
  await click(page,'Ajouter une note');await page.type('textarea','Note de recette');await click(page,'Enregistrer l’activité');await page.waitForFunction(()=>window.__qaState.prospects[0].notesHistory[0].content==='Note de recette');
  check(role+width+' note persisted through Sales API',await page.evaluate(()=>window.__qaRequests.some(r=>r.url.endsWith('/activity')&&r.body.kind==='note')));
  await click(page,'Activité','nav[aria-label="Sections du dossier prospect"] button');check(role+width+' unified timeline once',await page.$$eval('.crm-timeline p',rows=>rows.filter(r=>r.textContent==='Note de recette').length===1));
  await click(page,'Vue d’ensemble');await page.select('#crm-stage','contacted');await page.waitForFunction(()=>window.__qaState.prospects[0].status==='contacted');
  await page.select('#crm-stage','call_pending');await page.waitForSelector('[data-crm-modal="true"]');check(role+width+' reminder form',await page.$eval('[data-crm-modal="true"]',e=>e.textContent.includes('relance')));await page.keyboard.press('Escape');
  await click(page,'Modifier la fiche');await page.type('input[name="proposedOffer"]','Suivi trimestriel');await page.type('input[name="tags"]',', Prioritaire');check(role+width+' duplicate warning requires explicit acknowledgement',await page.$eval('.crm-duplicate',e=>e.textContent.includes('Un contact similaire existe déjà')));await page.click('.crm-duplicate input[type=checkbox]');await click(page,'Enregistrer la fiche');await page.waitForFunction(()=>window.__qaState.prospects[0].proposedOffer==='Suivi trimestriel');
  check(role+width+' profile metadata persisted',await page.evaluate(()=>window.__qaState.prospects[0].tags.includes('Prioritaire')));
  await click(page,'Notes & échanges','nav[aria-label="Sections du dossier prospect"] button');await page.select('.crm-record form select','call');await page.type('.crm-record form textarea','Appel effectué');await click(page,'Enregistrer l’activité');await page.waitForFunction(()=>!!window.__qaState.prospects[0].lastContactAt);
  check(role+width+' explicit contact recorded',true);
  const activityCount=await page.evaluate(()=>window.__qaState.prospects[0].activityHistory.length);await page.type('.crm-record form textarea','FAIL');await click(page,'Enregistrer l’activité');await page.waitForSelector('.crm-error');
  check(role+width+' failed activity keeps draft and journal',await page.evaluate(n=>document.querySelector('.crm-record form textarea').value==='FAIL'&&window.__qaState.prospects[0].activityHistory.length===n,activityCount));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.vi-dialog'));
  await click(page,'Relances','nav[aria-label="Vues CRM"] button');await click(page,'En retard','nav[aria-label="Échéances de relance"] button');await page.waitForSelector('.crm-followups article');await click(page,'Terminer','.crm-followups article button');await page.waitForFunction(()=>window.__qaRequests.some(r=>r.url.endsWith('/stage')&&r.body.nextReminderDate===null));check(role+width+' reminder completion uses existing stage API',true);
  await click(page,'Liste','nav[aria-label="Vues CRM"] button');await page.click('[aria-label="Ouvrir Emma Laurent"]');await page.waitForSelector('.vi-dialog');await click(page,'Convertir');await page.waitForSelector('[data-crm-modal="true"]');check(role+width+' conversion preserves commercial context',await page.$eval('[data-crm-modal="true"]',e=>e.textContent.includes('Suivi trimestriel')));await click(page,'Créer l’adhérent');await page.waitForSelector('[data-sales-onboarding]');
  check(role+width+' existing conversion API links member',await page.evaluate(()=>window.__qaState.prospects[0].convertedMemberUid==='converted'&&window.__qaRequests.some(r=>r.url.endsWith('/convert')&&r.body.email==='contact0@example.test')));

  check(role+width+' no page errors',!errors.length);await page.close();
 }
 const paging=await browser.newPage();await paging.setViewport({width:1440,height:1000});await paging.goto(origin+'/?role=manager&count=45',{waitUntil:'networkidle0'});await paging.waitForSelector('[data-crm-workspace]');await click(paging,'Liste','nav[aria-label="Vues CRM"] button');check('bounded list first page',await paging.$$eval('.vi-table tbody tr',rows=>rows.length===20));await click(paging,'Suivante');check('pagination page two',await paging.$eval('.vi-pagination',e=>e.textContent.includes('Page 2 / 3')));await paging.close();
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});await page.goto(origin+'/?role=manager&count=0',{waitUntil:'networkidle0'});await page.waitForSelector('[data-crm-workspace]');check('empty state CTA',await page.evaluate(()=>document.body.innerText.includes('Aucun prospect pour le moment')));await page.close();
 await writeFile(path.join(output,'results.json'),JSON.stringify({synthetic:true,productionWrites:0,results},null,2));console.log('CRM workspace: '+results.length+' checks PASS; evidence '+output);
}catch(e){for(const page of await browser.pages())if(page.url().startsWith(origin)){await page.screenshot({path:path.join(output,'failure.png')});await writeFile(path.join(output,'failure-state.json'),JSON.stringify(await page.evaluate(()=>({body:document.body.innerText,requests:window.__qaRequests?.slice(-5)})),null,2));}await writeFile(path.join(output,'failure.txt'),String(e.stack));throw e;}finally{await browser.close();await new Promise(r=>server.close(r));await rm(work,{recursive:true,force:true});}
