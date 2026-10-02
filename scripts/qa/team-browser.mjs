// Actual Team UI and navigation, synthetic scoped API only. No Firebase/FCM production connection.
import {build} from 'esbuild';
import puppeteer from 'puppeteer';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const work=await mkdtemp(path.join(tmpdir(),'velatra-team-browser-'));
const evidence=process.env.VELATRA_TEAM_QA_OUTPUT||path.join(work,'evidence');await mkdir(evidence,{recursive:true});
await writeFile(path.join(work,'entry.tsx'),`
import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{TeamPage}from'${root}/pages/TeamPage';import{Layout}from'${root}/components/Layout';
const role=new URLSearchParams(location.search).get('role')||'manager';
const members=Array.from({length:22},(_,i)=>({id:100+i,firebaseUid:'member-'+i,name:'Client '+i,role:'member',clubId:'team-fixture',assignedCoachUid:i<18?'coach-a':i===18?'coach-b':undefined}));
const user={id:10,role,firebaseUid:role==='coach'?'coach-a':role+'-fixture',clubId:'team-fixture',name:'Recette',onboardingCompleted:true};
const club={id:'team-fixture',ownerId:'owner-fixture',accountType:'studio',isActive:true};
function Recipe(){const[state,setState]=React.useState({user,currentClub:club,users:[...members,{id:20,firebaseUid:'coach-a',name:'Coach Alice',role:'coach',clubId:club.id},{id:21,firebaseUid:'coach-b',name:'Coach Bruno',role:'coach',clubId:club.id}],logs:[],programs:[],bookings:[],messages:[],subscriptions:[]});window.__switchRole=next=>setState(s=>({...s,user:{...s.user,role:next,firebaseUid:next==='coach'?'coach-a':next+'-fixture'}}));window.__switchTenant=()=>setState(s=>({...s,user:{...s.user,clubId:'other-fixture'},currentClub:{...s.currentClub,id:'other-fixture'},users:[]}));return <Layout user={state.user} club={state.currentClub} activePage="team" onPageChange={page=>window.__navigation=page} onLogout={()=>{}}><TeamPage state={state} setState={setState} showToast={text=>window.__toast=text}/></Layout>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Recipe/></BrowserRouter>);
`);
const fixture=String.raw`
const params=new URLSearchParams(location.search);export const auth={currentUser:{uid:params.get('role')==='coach'?'coach-a':'manager-fixture'}};export const db={};export const doc=()=>({});export const updateDoc=async()=>{throw Error('Unexpected SDK write')};
export const setDoc=updateDoc,deleteDoc=updateDoc,addDoc=updateDoc,createMemberAccount=updateDoc,sendPasswordResetEmail=updateDoc;export const collection=doc,query=doc,where=doc;export const getDocs=async()=>({docs:[]});export const getStorageClient=async()=>null;
window.__calls=[];window.__toast=null;
const settings=capacity=>({capacity,available:true,specialties:['Force'],weeklyAvailability:[],revision:0});
const coaches=[{uid:'coach-a',id:20,name:'Coach Alice',avatar:'CA',status:'active',isSuspended:false,settings:settings(25),assignedClients:18,nextAvailability:null},{uid:'coach-b',id:21,name:'Coach Bruno',avatar:'CB',status:'active',isSuspended:false,settings:settings(2),assignedClients:1,nextAvailability:null}];
const members=Array.from({length:22},(_,i)=>({uid:'member-'+i,id:100+i,name:'Client '+i,assignedCoachUid:i<18?'coach-a':i===18?'coach-b':null,status:'active',isSuspended:false,lastWorkoutDate:null,lastCheckInDate:null}));
export async function apiFetch(input,opts={}){
const url=new URL(input,location.origin),body=opts.body?JSON.parse(opts.body):null;window.__calls.push({path:url.pathname,method:opts.method||'GET',body});let result={},status=200;
if(url.pathname==='/api/team'){
 await new Promise(resolve=>setTimeout(resolve,params.get('mode')==='loading'?10000:params.get('mode')==='slow'?600:30));
 if(params.get('mode')==='error'){status=503;result={error:'Équipe temporairement indisponible'};}
 else if(params.get('mode')==='denied'){status=403;result={error:'Accès équipe refusé'};}
 else{const role=document.querySelector('h1')?.textContent?.startsWith('Ma charge')?'coach':params.get('role');const self=role==='coach';result={clubId:'team-fixture',scope:self?'self':'tenant',coaches:params.get('mode')==='empty'?[]:self?[coaches[0]]:coaches,members:params.get('mode')==='empty'?[]:members.filter(m=>!self||m.assignedCoachUid==='coach-a'),evaluatedAt:new Date().toISOString()};}
}
else if(url.pathname.startsWith('/api/team/coaches/')){const coach=coaches.find(c=>c.uid===url.pathname.split('/').at(-1));Object.assign(coach.settings,{...body,revision:coach.settings.revision+1});result={success:true};}
else if(url.pathname==='/api/assign-member-coach'){const member=members.find(m=>m.uid===body.memberUid);member.assignedCoachUid=body.coachUid;coaches.forEach(c=>c.assignedClients=members.filter(m=>m.assignedCoachUid===c.uid).length);result={success:true};}
else if(url.pathname==='/api/retention'){result={assessments:members.filter(m=>url.searchParams.get('coach')==='all'||m.assignedCoachUid===url.searchParams.get('coach')).map(m=>({memberUid:m.uid,state:'watch'})),counts:{},total:18,nextCursor:null,coaches:[],signalTypes:[],partialSources:[]};}
return new Response(JSON.stringify(result),{status,headers:{'Content-Type':'application/json'}});
}
`;
await build({entryPoints:[path.join(work,'entry.tsx')],outfile:path.join(work,'entry.js'),absWorkingDir:root,nodePaths:[path.join(root,'node_modules')],bundle:true,format:'esm',jsx:'automatic',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-firebase',setup(b){b.onResolve({filter:/(?:^|\/)firebase(?:\.[jt]s)?$/},()=>({path:'fixture',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:fixture,loader:'js'}));}}]});
const tailwind=await readFile(process.env.VELATRA_QA_TAILWIND_PATH||'/private/tmp/velatra-tailwind-3.4.17.js').catch(async()=>{const r=await fetch('https://cdn.tailwindcss.com');if(!r.ok)throw Error('Tailwind unavailable');return r.text();});
const html='<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/tailwind.js"></script><link rel="stylesheet" href="/entry.css"></head><body style="margin:0"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/tailwind.js'){res.setHeader('Content-Type','text/javascript');res.end(tailwind);}else if(['/entry.js','/entry.css'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('css')?'text/css':'text/javascript');res.end(await readFile(path.join(work,url.pathname.slice(1))));}else{res.setHeader('Content-Type','text/html');res.end(html);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
async function click(page,text){const handle=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);assert.ok(handle.asElement(),'Missing '+text);await handle.asElement().evaluate(button=>button.scrollIntoView({block:'center',behavior:'instant'}));await handle.asElement().click();await handle.dispose();}
async function pageFor(query,width=390){const page=await browser.newPage();page.__errors=[];await page.setViewport({width,height:900});page.on('pageerror',e=>page.__errors.push(e.message));await page.setRequestInterception(true);page.on('request',req=>req.url().startsWith(origin)?void req.continue():void req.abort());await page.goto(origin+'/?'+query,{waitUntil:'networkidle0'});return page;}
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
try{
  for(const role of ['owner','manager','coach','member'])for(const width of [390,820,1440]){
    const page=await pageFor('role='+role,width);
    if(role==='member'){assert.ok(await page.evaluate(()=>document.body.innerText.includes('n’est pas accessible')));assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.path==='/api/team').length),0);}
    else{
      await page.bringToFront();
      await page.waitForSelector('[data-team-workspace] progress');
      if(role==='coach'){
        assert.equal(await page.evaluate(()=>document.body.innerText.includes('Coach Bruno')),false);
        assert.equal(await page.evaluate(()=>document.body.innerText.includes('Client 18')),false);
        assert.equal(await page.evaluate(()=>document.body.innerText.includes('Capacité maximale')),false);
        assert.equal(await page.evaluate(()=>document.body.innerText.includes('Préparer l’affectation')),false);
        await click(page,'Ajouter une plage');await click(page,'Enregistrer le profil équipe');await page.waitForFunction(()=>window.__calls.some(c=>c.method==='PATCH'));
        const body=await page.evaluate(()=>window.__calls.find(c=>c.method==='PATCH').body);assert.ok(!('capacity'in body));assert.equal(body.weeklyAvailability.length,1);
      }else{
        await click(page,'Charge et capacité');assert.ok(await page.evaluate(()=>document.body.innerText.includes('18 / 25 clients')));
        await click(page,'Voir Coach Alice');await page.waitForFunction(()=>document.body.innerText.includes('Retain : À surveiller'));
        assert.ok(await noOverflow(page));
        const memberSelects=await page.$$('select[aria-label="Client à affecter"]'),coachSelects=await page.$$('select[aria-label="Coach pour l’affectation"]');await memberSelects.at(-1).select('member-19');await coachSelects.at(-1).select('coach-b');await click(page,'Préparer l’affectation');
        assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.path==='/api/assign-member-coach').length),0);
        await click(page,'Annuler');assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.path==='/api/assign-member-coach').length),0);
        await click(page,'Préparer l’affectation');await click(page,'Confirmer l’affectation');await page.waitForFunction(()=>window.__calls.some(c=>c.path==='/api/assign-member-coach'));
        const call=await page.evaluate(()=>window.__calls.find(c=>c.path==='/api/assign-member-coach'));assert.equal(call.body.expectedCoachUid,null);assert.equal(call.body.coachUid,'coach-b');
      }
      await page.waitForSelector('[data-team-workspace] progress');
      await page.waitForFunction(()=>!document.body.innerText.includes('Chargement de l’équipe…'));
      if(width===390||width===1440){
        await page.bringToFront();await page.evaluate(()=>window.scrollTo(0,0));
        await page.waitForFunction(()=>!!document.querySelector('[data-team-workspace] progress')&&!document.body.innerText.includes('Chargement de l’équipe…'));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:path.join(evidence,role+'-'+width+'.png')});
      }
    }
    assert.ok(await noOverflow(page));assert.deepEqual(page.__errors,[]);results.push({role,width,passed:true});await page.close();
  }
  for(const mode of ['empty','error','denied','loading']){
    const page=await pageFor('role=manager&mode='+mode);
    const text=await page.evaluate(()=>document.body.innerText);assert.ok(text.includes(({empty:'Aucun coach configuré',error:'Équipe temporairement indisponible',denied:'Accès équipe refusé',loading:'Chargement de l’équipe…'})[mode]));assert.ok(await noOverflow(page));results.push({mode,passed:true});await page.close();
  }
  for(const next of ['coach','member']){
    const page=await pageFor('role=manager');await page.waitForFunction(()=>document.body.innerText.includes('Coach Bruno'));await page.evaluate(next=>window.__switchRole(next),next);
    assert.equal(await page.evaluate(()=>document.body.innerText.includes('Coach Bruno')),false);
    if(next==='coach'){await page.waitForFunction(()=>document.body.innerText.includes('Coach Alice'));assert.equal(await page.evaluate(()=>document.body.innerText.includes('Coach Bruno')),false);}
    results.push({switchRole:next,passed:true});await page.close();
  }
  const page=await pageFor('role=manager&mode=slow');await page.waitForFunction(()=>document.body.innerText.includes('Coach Bruno'));await page.evaluate(()=>window.__switchTenant());assert.equal(await page.evaluate(()=>document.body.innerText.includes('Coach Bruno')),false);await page.waitForFunction(()=>document.body.innerText.includes('Les données de cette équipe ne sont pas disponibles.'));assert.equal(await page.evaluate(()=>document.body.innerText.includes('Coach Bruno')),false);results.push({switchTenant:true,passed:true});await page.close();
  console.log('PASS '+results.length+' Team browser cases: mobile/tablet/desktop, permissions, confirmation, empty/error/loading and scope changes');
}catch(error){const last=(await browser.pages()).at(-1);if(last){console.error(JSON.stringify(await last.evaluate(()=>({text:document.body.innerText,calls:window.__calls})),null,2));console.error(JSON.stringify(last.__errors));await last.screenshot({path:path.join(evidence,'failure.png'),fullPage:true});}throw error;}finally{await writeFile(path.join(evidence,'results.json'),JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
