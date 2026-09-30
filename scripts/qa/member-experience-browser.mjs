// Isolated member-page browser recipe. No production credentials or writes.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = '/private/tmp/velatra-member-experience-browser';
await mkdir(work, { recursive: true });
const entry = path.join(work, 'entry.tsx');
await writeFile(entry, `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemberDashboard} from '${root}/components/MemberDashboard';
import {CalendarPage} from '${root}/pages/CalendarPage';
import {StatsPage} from '${root}/pages/StatsPage';
import {MemberNutritionPage} from '${root}/pages/MemberNutritionPage';
import '${root}/components/member-mobile.css';
const params=new URLSearchParams(location.search), page=params.get('page')||'home', full=params.get('scenario')!=='empty';
const date=new Date().toISOString().slice(0,10);
const user={id:901,clubId:'qa-club',role:'member',firebaseUid:'qa-member',name:'Alexandre Martin au nom volontairement long',objectifs:['Prendre confiance dans mon entraînement'],xp:150,streak:2,avatar:'AM',credits:2};
const coach={id:902,clubId:'qa-club',role:'owner',firebaseUid:'qa-coach',name:'Coach Élodie Martin'};
const program={id:1,clubId:'qa-club',memberId:901,name:'Programme complet de préparation et de progression',nbDays:1,currentDayIndex:0,durationWeeks:6,days:[{name:'Haut du corps',exercises:[{exId:1,sets:3,reps:'10',rest:'90 s',targetRpe:'8',notes:'Mouvement contrôlé',duration:''}]}]};
const state={user,currentClub:{id:'qa-club',settings:{booking:{sessionTypes:[{id:'one',name:'Coaching individuel'}]}}},users:[user,coach],exercises:[{id:1,name:'Développé couché',cat:'Poitrine',perfId:'press'}],programs:full?[program]:[],archivedPrograms:[],logs:full?[{id:1,clubId:'qa-club',memberId:901,date,week:1,isCoaching:false,dayName:'Haut du corps',exerciseData:{},exercises:[{exId:1,name:'Développé couché',sets:[{weight:'40',reps:'10',duration:''}]}]}]:[],performances:full?[{id:1,clubId:'qa-club',memberId:901,date,exId:'press',weight:40,reps:10,fromCoaching:false}]:[],bodyData:full?[{id:1,clubId:'qa-club',memberId:901,date,weight:75,fat:20,muscle:34}]:[],nutritionPlans:full?[{id:'plan',memberId:901,clubId:'qa-club',targetCalories:2200,protein:140,carbs:250,fat:70,meals:[]}]:[],nutritionLogs:[],bookings:full?[{id:'booking',clubId:'qa-club',memberId:901,coachId:'qa-coach',startTime:new Date(Date.now()+86400000).toISOString(),endTime:new Date(Date.now()+90000000).toISOString(),status:'confirmed',type:'coaching',sessionTypeId:'one'}]:[],messages:[],feed:[],supplementOrders:[],newsletters:[],progressPhotos:[],page};
function Fixture(){const [value,setValue]=React.useState(state);return <div className="va-member-shell"><div className="va-content"><main>{page==='home'?<MemberDashboard state={value} setState={setValue} showToast={()=>{}} onToggleTimer={()=>{}}/>:page==='sessions'?<CalendarPage state={value} setState={setValue}/>:page==='progression'?<StatsPage state={value} setState={setValue}/>:<MemberNutritionPage state={value} setState={setValue} showToast={()=>{}}/>}</main></div></div>}
createRoot(document.getElementById('root')).render(<Fixture/>);
`);
const firebaseFixture = `export const db={};export const doc=()=>({});export const setDoc=async()=>{throw Error('Fixture write blocked')};export async function apiFetch(input){const url=String(input);const today=new Date().toISOString().slice(0,10);const empty=new URLSearchParams(location.search).get('scenario')==='empty';const body=url.includes('/followup/me')?{journey:empty?null:{phases:[{id:'phase',name:'Progression',objective:'Gagner en régularité',status:'active'}]},assignments:empty?[]:[{id:'weekly',active:true,status:'expected',templateName:'Bilan hebdomadaire',dueDate:today,questions:[]}],responses:[],habits:empty?[]:[{id:'water',active:true,dueDate:today,startDate:today,name:'Hydratation',valueType:'boolean',todayEntry:null}],entries:[],logs:[],today}:{checkIn:null};return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})}`;
await build({ entryPoints:[entry], outfile:path.join(work,'entry.js'), absWorkingDir:root, nodePaths:[path.join(root,'node_modules')], bundle:true, format:'esm', jsx:'automatic', target:'es2022', define:{'process.env.NODE_ENV':'"production"'}, plugins:[{name:'firebase-fixture',setup(bundle){bundle.onResolve({filter:/(?:^|\/)firebase(?:\.[jt]s)?$/},()=>({path:'firebase-fixture',namespace:'qa'}));bundle.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:firebaseFixture,loader:'js'}));}}] });
const tailwind=await readFile(process.env.VELATRA_QA_TAILWIND_PATH || '/private/tmp/velatra-tailwind-3.4.17.js');
const html='<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="/tailwind.js"></script><link rel="stylesheet" href="/entry.css"></head><body style="margin:0;background:#f5f7ef"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server=createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/tailwind.js'){res.setHeader('Content-Type','application/javascript');res.end(tailwind);return;}if(pathname==='/entry.js'||pathname==='/entry.css'){res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(path.join(work,pathname.slice(1))));return;}res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[[320,568],[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1180,820],[1280,800],[1366,768],[1440,900],[1600,1000],[1920,1080],[2560,1440]];
let failed=0;
try {for(const scenario of ['full','empty']) for(const pageName of ['home','sessions','progression','nutrition']) for(const [width,height] of sizes){
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<768,hasTouch:width<1024});
  await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(origin)?void request.continue():void request.abort());
  await page.goto(origin+'/?page='+pageName+'&scenario='+scenario,{waitUntil:'networkidle0'});
  const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth,heading:!!document.querySelector('h1'),content:document.querySelector('main')?.textContent?.length||0}));
  const ok=result.scroll<=width+1&&result.heading&&result.content>30&&!errors.length;
  if(!ok)failed++;console.log((ok?'PASS ':'FAIL ')+scenario+' '+pageName+' '+width+'x'+height+' '+JSON.stringify({...result,errors}));
  if(scenario==='full'&&[320,390,768,1440,2560].includes(width))await page.screenshot({path:path.join(work,scenario+'-'+pageName+'-'+width+'.png'),fullPage:false});
  if(scenario==='full'&&width===390){
    let interaction=true;
    if(pageName==='home'){
      interaction=await page.evaluate(()=>{const text=document.querySelector('main')?.textContent||'';return text.indexOf('Haut du corps')<text.indexOf('Votre bilan à remplir')&&text.indexOf('Votre bilan à remplir')<text.indexOf('Mes habitudes aujourd’hui')&&text.indexOf('Prochain rendez-vous')<text.indexOf('Phase et objectif actuels')});
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent?.includes('Remplir maintenant'))?.click());
      interaction=interaction&&!!(await page.$('[aria-label="Mon suivi de coaching"] form'));
    }
    if(pageName==='sessions'){
      await page.click('.va-member-session summary');
      interaction=await page.evaluate(()=>document.querySelector('.va-member-session[open]')?.textContent?.includes('RPE cible 8')||false);
    }
    if(pageName==='progression')interaction=await page.evaluate(()=>document.querySelector('.va-member-journey')?.textContent?.includes('En cours')||false);
    if(pageName==='nutrition'){
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent?.includes('Noter un repas'))?.click());
      interaction=await page.evaluate(()=>{const form=document.querySelector('.va-meal-form');return !!form&&[...form.querySelectorAll('input')].every(input=>parseFloat(getComputedStyle(input).fontSize)>=16)});
    }
    if(!interaction)failed++;console.log((interaction?'PASS ':'FAIL ')+scenario+' '+pageName+' mobile interaction');
  }
  await page.close();
}}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
if(failed)process.exitCode=1;
