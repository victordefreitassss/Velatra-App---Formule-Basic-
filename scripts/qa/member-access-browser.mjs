// Isolated component fixture: no Firebase connection or production writes.
import { build } from 'esbuild';
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const work = '/private/tmp/velatra-member-access-browser';
await mkdir(work, { recursive: true });
const entry = path.join(work, 'entry.tsx');
await writeFile(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AddMemberDialog } from '${root}/components/AddMemberDialog';
import '${root}/components/visual-polish.css';
function Fixture() {
  const [data, setData] = React.useState({name:'',email:'',coachUid:undefined});
  const [open, setOpen] = React.useState(true);
  const params = new URLSearchParams(location.search);
  const studio = params.get('role') === 'studio';
  const options = studio ? [{name:'Coach Élodie',firebaseUid:'coach-1',role:'coach',clubId:'studio'}] : null;
  return <main><h1>Recette membre</h1>{open && <AddMemberDialog data={data} setData={setData} coachOptions={options} busy={false} onSave={async()=>{}} onClose={()=>setOpen(false)} />}</main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
`);
await build({ entryPoints:[entry], outfile:path.join(work,'entry.js'), absWorkingDir:root, nodePaths:[path.join(root,'node_modules')], bundle:true, format:'esm', jsx:'automatic', target:'es2022', define:{'process.env.NODE_ENV':'"production"'} });
const tailwind = await readFile(process.env.VELATRA_QA_TAILWIND_PATH || '/private/tmp/velatra-tailwind-3.4.17.js')
  .catch(async () => {
    const response = await fetch('https://cdn.tailwindcss.com');
    if (!response.ok) throw new Error('The Tailwind test runtime is unavailable');
    return Buffer.from(await response.arrayBuffer());
  });
const html = '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script src="/tailwind.js"></script><link rel="stylesheet" href="/entry.css"></head><body style="margin:0"><div id="root"></div><script type="module" src="/entry.js"></script></body></html>';
const server = createServer(async (req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  if(pathname==='/tailwind.js') { res.setHeader('Content-Type','application/javascript');res.end(tailwind);return; }
  if(pathname==='/entry.js'||pathname==='/entry.css') { res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(path.join(work,pathname.slice(1))));return; }
  res.setHeader('Content-Type','text/html');res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sizes=[[320,568],[360,800],[375,812],[390,844],[430,932],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080]];
let failures=0;
try {
  for(const [width,height] of sizes) for(const role of ['solo','studio']) {
    const page=await browser.newPage();
    await page.setViewport({width,height,isMobile:width<1024,hasTouch:width<1024,deviceScaleFactor:1});
    await page.setRequestInterception(true);
    page.on('request',req=>req.url().startsWith(origin)?void req.continue():void req.abort());
    await page.goto(`${origin}/?role=${role}`,{waitUntil:'networkidle0'});
    await page.waitForSelector('.va-member-dialog[open]');
    const result=await page.evaluate(()=>{
      const dialog=document.querySelector('.va-member-dialog');
      const footer=dialog.querySelector('footer').getBoundingClientRect();
      const fields=[...dialog.querySelectorAll('input,select')].filter(el=>el.getClientRects().length);
      return { viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
        dialogRight:dialog.getBoundingClientRect().right,
        footerBottom:footer.bottom, footerTop:footer.top,
        visibleFields:fields.length, fonts:fields.map(el=>parseFloat(getComputedStyle(el).fontSize)),
        coachSelector:!!dialog.querySelector('select[id$="-coach"]'),
        focused:document.activeElement?.getAttribute('name')};
    });
    const okay=result.scrollWidth<=width+1 && result.dialogRight<=width+1 && result.footerBottom<=height+1 && result.footerTop>=0 && result.fonts.every(font=>font>=16) && result.coachSelector===(role==='studio') && result.focused==='member-name';
    if(!okay) failures++;
    console.log(`${okay?'PASS':'FAIL'} ${role} ${width}×${height} ${JSON.stringify(result)}`);
    if(width===320||width===390||width===820||width===1440) await page.screenshot({path:path.join(work,`${role}-${width}.png`)});
    await page.close();
  }
} finally { await browser.close();await new Promise(resolve=>server.close(resolve)); }
if(failures) process.exitCode=1;
