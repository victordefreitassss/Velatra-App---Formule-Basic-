// Isolated fixtures: Firebase SDK and billing APIs are stubbed; external requests are blocked.
import { build } from "esbuild";
import puppeteer from "puppeteer";
import ts from "typescript";
import { createServer } from "node:http";
import { readFile, writeFile, readdir, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url))),
  work =
    "/private/tmp/velatra-billing-browser" +
    (process.env.VELATRA_QA_SURFACE
      ? "-" + process.env.VELATRA_QA_SURFACE
      : ""),
  evidence = path.join(work, "evidence");
await rm(work, { recursive: true, force: true });
await mkdir(evidence, { recursive: true });
const names = new Set();
async function scan(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".") || ["node_modules", "dist"].includes(ent.name))
      continue;
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) await scan(file);
    else if (/\.tsx?$/.test(file)) {
      const ast = ts.createSourceFile(
        file,
        await readFile(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      ast.forEachChild((n) => {
        if (!ts.isImportDeclaration(n)) return;
        const from = n.moduleSpecifier.text,
          b = n.importClause?.namedBindings;
        if (
          (from.endsWith("/firebase") ||
            from === "./firebase" ||
            from.startsWith("firebase/")) &&
          b &&
          ts.isNamedImports(b)
        )
          for (const e of b.elements)
            names.add(e.propertyName?.text || e.name.text);
      });
    }
  }
}
await scan(root);
const known = `export const db={};export const auth={currentUser:{uid:'qa-owner',getIdToken:async()=> 'fixture-token'}};export const apiFetch=async(path,options)=>{window.__qaCalls.push({path,body:options?.body?JSON.parse(options.body):null});if(path==='/api/stripe/status')return new Response(JSON.stringify({connected:new URLSearchParams(location.search).get('stripe')==='yes',webhookConfigured:true}),{status:200});return new Response(JSON.stringify({success:true,link:'https://checkout.stripe.com/fixture-only'}),{status:200});};export const getDoc=async()=>({exists:()=>false,data:()=>undefined});export const getDocs=async()=>({docs:[],forEach:()=>{}});export const getStorageClient=async()=>({});export const getMessagingClient=async()=>null;export const setDoc=async()=>{throw Error('QA SDK writes forbidden')};export const updateDoc=setDoc,deleteDoc=setDoc,addDoc=setDoc;`;
const defined = new Set(
  [...known.matchAll(/export (?:async )?(?:const|function)\s+(\w+)/g)].map(
    (m) => m[1],
  ),
);
["updateDoc", "deleteDoc", "addDoc"].forEach((n) => defined.add(n));
const stub =
  known +
  [...names]
    .filter((n) => !defined.has(n))
    .map((n) => `export const ${n}=(...args)=>({args});`)
    .join("\n");
const entry = `import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';import{FinancesPage}from'${root}/pages/FinancesPage';import{MembersPage}from'${root}/pages/MembersPage';import{ProfilePage}from'${root}/pages/ProfilePage';import{SettingsPage}from'${root}/pages/SettingsPage';import'${root}/components/visual-polish.css';
const params=new URLSearchParams(location.search),surface=params.get('surface')||'finances',scenario=params.get('scenario')||'many',count=scenario==='empty'?0:scenario==='one'?1:100;
const owner={id:1,role:'owner',firebaseUid:'qa-owner',clubId:'qa-club',name:'Coach fixture',email:'owner@example.test',xp:0,objectifs:[],age:30,weight:70,height:175};
const users=Array.from({length:count},(_,i)=>({id:100+i,role:'member',firebaseUid:'qa-member-'+i,clubId:'qa-club',name:i===0?'Lucas Martin':'Adhérent '+i,email:'member'+i+'@example.test',phone:'',status:'active',objectifs:[],age:30,weight:70,height:175,createdAt:'2026-09-01',credits:8,sessionCredits:{default:4},xp:0,streak:0,pointsFidelite:0,avatar:''}));
const plans=[{id:'legacy',name:'Formule historique',price:49,billingCycle:'monthly',description:'TVA inconnue, données historiques préservées'},{id:'yearly',name:'Suivi annuel',price:490,billingCycle:'yearly',vatRate:0,isTTC:true},{id:'archived',name:'Ancienne formule archivée',price:39,billingCycle:'monthly',isActive:false}].map(p=>({...p,clubId:'qa-club'}));
const subscriptions=users.map((u,i)=>({id:'sub-'+i,clubId:'qa-club',memberId:u.id,planId:'legacy',planName:'Coaching personnalisé',price:49,billingCycle:'monthly',status:i===0?'pending':'active',collectionMode:i===0?'stripe':'manual',startDate:'2026-09-01'}));
const statuses=['paid','pending','failed','refunded','partially_refunded'];const payments=users.map((u,i)=>({id:'pay-'+i,clubId:'qa-club',memberId:u.id,amount:49,method:i%2?'cash':'card',status:statuses[i%5],date:new Date().toISOString(),description:'Coaching individuel',...(i%5===3?{refundedAmount:49}:i%5===4?{refundedAmount:15}:{}),...(i%2?{vatRate:0}:{})}));
const arrays='exercises programs presets nutritionPresets logs messages bodyData performances archivedPrograms feed supplementProducts supplementOrders fixedCosts expenses invoices products commissionPayments prospects tasks newsletters nutritionPlans nutritionLogs crmClients crmFormulas manualStats pendingProspects bookings driveFiles driveFolders progressPhotos notifications coaches'.split(' ');
const initial={...Object.fromEntries(arrays.map(n=>[n,[]])),user:surface==='profile'?users[0]:owner,currentClub:{id:'qa-club',ownerId:'qa-owner',accountType:params.get('type')||'solo',name:'Structure fixture',isActive:true,settings:{payment:{stripeConnected:params.get('stripe')==='yes'},booking:{enabled:true,sessionTypes:[{id:'default',name:'Séance',duration:60}],schedule:[]}}},users:[owner,...users],plans,subscriptions,payments,aboutInfo:{},selectedMember:surface==='client360'?users[0]:null};
window.__qaCalls=[];function Fixture(){const[state,setState]=React.useState(initial);window.__qaState=state;const props={state,setState,showToast:(m)=>{window.__qaToast=m;}};return <div className="va-content">{surface==='client360'?<MembersPage {...props}/>:surface==='profile'?<ProfilePage {...props}/>:surface==='settings'?<SettingsPage {...props}/>:<FinancesPage {...props}/>}</div>;}createRoot(document.getElementById('root')).render(<BrowserRouter><Fixture/></BrowserRouter>);`;
await writeFile(path.join(work, "entry.tsx"), entry);
await build({
  entryPoints: [path.join(work, "entry.tsx")],
  outdir: path.join(work, "bundle"),
  bundle: true,
  splitting: true,
  format: "esm",
  jsx: "automatic",
  target: "es2022",
  nodePaths: [path.join(root, "node_modules")],
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env": '{"MODE":"test"}',
  },
  plugins: [
    {
      name: "qa-firebase",
      setup(b) {
        b.onResolve({ filter: /(?:^firebase\/|(?:^|\/)firebase$)/ }, () => ({
          path: "fixture",
          namespace: "qa",
        }));
        b.onLoad({ filter: /.*/, namespace: "qa" }, () => ({
          loader: "js",
          contents: stub,
        }));
      },
    },
  ],
});
const bundle = path.join(work, "bundle"),
  files = await readdir(bundle),
  js = files.find((n) => n.startsWith("entry") && n.endsWith(".js")),
  css = files.find((n) => n.startsWith("entry") && n.endsWith(".css"));
const tailwind = await readFile("/private/tmp/velatra-tailwind-3.4.17.js"),
  index = await readFile(path.join(root, "index.html"), "utf8"),
  base = (index.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "").replace(
    /@import[^;]+;/g,
    "",
  );
const html = `<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/tailwind.js"></script><style>${base}</style><link rel="stylesheet" href="/${css}"></head><body style="margin:0;background:#f5f7ef"><div id="root"></div><script type="module" src="/${js}"></script></body></html>`;
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/tailwind.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(tailwind);
  } else if (/\.(js|css)$/.test(pathname)) {
    res.setHeader(
      "Content-Type",
      pathname.endsWith(".css") ? "text/css" : "text/javascript",
    );
    res.end(await readFile(path.join(bundle, path.basename(pathname))));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
const sizes = [
  [320, 568],
  [360, 800],
  [375, 812],
  [390, 844],
  [430, 932],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1180, 820],
  [1280, 800],
  [1366, 768],
  [1440, 900],
  [1600, 1000],
  [1920, 1080],
  [2560, 1440],
];
const records = [];
let failures = 0;
async function clickText(page, label) {
  const found = await page.$$eval(
    "button",
    (buttons, label) => {
      const b = buttons.find(
        (b) =>
          b.textContent.trim() === label ||
          b.textContent.trim().toLowerCase() === label.toLowerCase(),
      );
      if (!b) return false;
      b.click();
      return true;
    },
    label,
  );
  if (!found) throw Error("Missing button: " + label);
  await new Promise((r) => setTimeout(r, 250));
}
async function check(page, name, errors, width) {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    text: document.body.innerText.length,
    overflow: [...document.querySelectorAll("input,select,button,article")]
      .filter(
        (e) =>
          e.getClientRects().length &&
          e.getBoundingClientRect().right > innerWidth + 1,
      )
      .map((e) => e.textContent.slice(0, 50)),
  }));
  const valid =
    !errors.length && result.scroll <= width + 1 && result.text > 20;
  records.push({ name, ...result, errors: [...errors], valid });
  if (!valid) failures++;
  console.log(
    `${valid ? "PASS" : "FAIL"} ${name} ${result.scroll}/${width} ${errors.join(",")}`,
  );
}
try {
  for (const [surface, scenario, stripe, type] of [
    ["finances", "empty", false, "solo"],
    ["finances", "one", false, "solo"],
    ["finances", "many", true, "studio"],
    ["client360", "many", true, "studio"],
    ["profile", "many", true, "solo"],
    ["settings", "one", false, "solo"],
  ])
    for (const [width, height] of sizes) {
      if (
        process.env.VELATRA_QA_SURFACE &&
        surface !== process.env.VELATRA_QA_SURFACE
      )
        continue;
      const page = await browser.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewport({
        width,
        height,
        isMobile: width < 768,
        hasTouch: width < 1024,
        deviceScaleFactor: 1,
      });
      await page.setRequestInterception(true);
      page.on("request", (r) =>
        r.url().startsWith(origin) ? void r.continue() : void r.abort(),
      );
      await page.goto(
        `${origin}/dashboard?surface=${surface}&scenario=${scenario}&stripe=${stripe ? "yes" : "no"}&type=${type}`,
        { waitUntil: "networkidle0" },
      );
      await new Promise((r) => setTimeout(r, 300));
      if (surface === "finances") {
        for (const tab of [
          "Résumé",
          "Paiements",
          "Abonnements",
          "Formules",
          "Dépenses",
        ]) {
          await clickText(page, tab);
          await check(
            page,
            `${surface}/${scenario}/${tab}/${width}`,
            errors,
            width,
          );
          if (
            scenario === "many" &&
            [320, 768, 1440, 1920, 2560].includes(width)
          )
            await page.screenshot({
              path: path.join(evidence, `finance-${tab}-${width}.png`),
            });
        }
        if (width === 320 && scenario === "many") {
          await clickText(page, "Paiements");
          await clickText(page, "Créer un paiement en attente");
          await check(page, "payment form at 320", errors, width);
          const labeled = await page.$$eval("form input,form select", (els) =>
            els.every((e) => !!e.closest("label")),
          );
          if (!labeled) failures++;
          await clickText(page, "Annuler");
          await clickText(page, "Formules");
          await clickText(page, "Nouvelle formule");
          await check(page, "plan form at 320", errors, width);
        }
      } else if (surface === "client360") {
        await clickText(page, "Administratif");
        await clickText(page, "Facturation");
        await page.$$eval("h3", (els) =>
          els
            .find((e) => e.textContent.includes("Crédits Coaching"))
            ?.scrollIntoView(),
        );
        await check(page, `Client360 billing/${width}`, errors, width);
        if ([320, 768, 1440, 1920].includes(width))
          await page.screenshot({
            path: path.join(evidence, `client360-${width}.png`),
          });
      } else if (surface === "settings") {
        await page.$$eval("h2", (els) =>
          els
            .find((e) => e.textContent.includes("Formules d'abonnement"))
            ?.scrollIntoView(),
        );
        await check(page, `Settings plans/${width}`, errors, width);
        if ([320, 360, 768, 1440].includes(width)) {
          await clickText(page, "NOUVELLE FORMULE");
          await page.evaluate(() =>
            document.querySelector("#billing-plan-name")?.scrollIntoView(),
          );
          await check(page, `Settings plan editor/${width}`, errors, width);
        }
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(evidence, `settings-${width}.png`),
          });
      } else {
        await check(page, `member billing/${width}`, errors, width);
        if ([320, 390, 768, 1440].includes(width))
          await page.screenshot({
            path: path.join(evidence, `member-${width}.png`),
            fullPage: true,
          });
        const leaked = await page.evaluate(() =>
          document.body.innerText.includes("Adhérent 1"),
        );
        if (leaked) failures++;
      }
      await page.close();
    }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  await writeFile(
    path.join(evidence, "results.json"),
    JSON.stringify(
      {
        records,
        failures,
        environment:
          "Isolated fixture; no production API, no SDK write, all external requests blocked",
      },
      null,
      2,
    ),
  );
}
console.log(
  `Billing browser QA: ${records.length} checks; ${failures} failures`,
);
if (failures) process.exitCode = 1;
