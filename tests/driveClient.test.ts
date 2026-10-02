// Exercise the real frontend helper with a fake Firebase identity/network, never production.
import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
let openDriveFile: (file:any, download?:boolean)=>Promise<void>;
const saved={fetch:globalThis.fetch,window:(globalThis as any).window,document:(globalThis as any).document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
let previews:any[]=[],blobs:Blob[]=[],downloads:any[]=[],requests:any[]=[];
const file={id:'known-id',name:'report.pdf',url:'https://old-bearer.invalid/?token=obsolete'};
before(async()=>{
  const bundle=await build({entryPoints:['services/driveAccess.ts'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'fake-firebase',setup(b){
    b.onResolve({filter:/^\.\.\/firebase$/},()=>({path:'firebase',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const auth={get currentUser(){return globalThis.__driveClientIdentity;}};',loader:'js'}));
  }}]});
  ({openDriveFile}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')));
  (globalThis as any).__driveClientIdentity={getIdToken:async()=> 'fake-test-token'};
  (globalThis as any).window={open:()=>{const p={opener:'parent',closed:false,location:{replace:(url:string)=>{p.url=url;}},close:()=>{p.closed=true;},url:''};previews.push(p);return p;},setTimeout:()=>0};
  (globalThis as any).document={createElement:()=>{const a:any={click:()=>downloads.push({...a})};return a;}};
  URL.createObjectURL=(blob:Blob)=>{blobs.push(blob);return 'blob:local-'+blobs.length;};URL.revokeObjectURL=()=>{};
});
after(()=>{globalThis.fetch=saved.fetch;(globalThis as any).window=saved.window;(globalThis as any).document=saved.document;URL.createObjectURL=saved.create;URL.revokeObjectURL=saved.revoke;delete (globalThis as any).__driveClientIdentity;});
it('preview ignores a known bearer URL and sends the live identity to the private API',async()=>{
  globalThis.fetch=async(url,options)=>{requests.push({url,options});return new Response('PDF',{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline'}});};
  await openDriveFile(file);assert.equal(requests.at(-1).url,'/api/drive/files/known-id/content');assert.equal(requests.at(-1).options.headers.Authorization,'Bearer fake-test-token');assert.equal(requests.at(-1).options.cache,'no-store');assert.equal(previews.at(-1).opener,null);assert.match(previews.at(-1).url,/^blob:/);assert.equal(await blobs.at(-1)!.text(),'PDF');
});
it('reusing the same stale visible file after revoke cannot reuse previously fetched bytes',async()=>{
  const count=blobs.length;globalThis.fetch=async()=>new Response(JSON.stringify({error:'Partage révoqué'}),{status:403});
  await assert.rejects(openDriveFile(file),/révoqué/);assert.equal(blobs.length,count);assert.equal(previews.at(-1).closed,true);assert.equal(previews.at(-1).url,'');
});
it('authorized chunks assemble in order and every subsequent request carries identity and generation',async()=>{
  let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal((options!.headers as any).Authorization,'Bearer fake-test-token');if(calls===2){assert.equal((options!.headers as any).Range,'bytes=3-');assert.equal((options!.headers as any)['If-Match'],'"generation"');}
    return new Response(calls===1?'abc':'de',{status:206,headers:{'Content-Type':'application/pdf','ETag':'"generation"','Content-Range':calls===1?'bytes 0-2/5':'bytes 3-4/5'}});};
  await openDriveFile(file,true);assert.equal(calls,2);assert.equal(await blobs.at(-1)!.text(),'abcde');assert.equal(downloads.at(-1).download,'report.pdf');
});
it('revoked access midway through chunked download never creates a preview or download',async()=>{
  const count=blobs.length;let calls=0;globalThis.fetch=async()=>++calls===1?new Response('abc',{status:206,headers:{'Content-Range':'bytes 0-2/5','ETag':'"generation"'}}):new Response(JSON.stringify({error:'Accès révoqué'}),{status:403});
  await assert.rejects(openDriveFile(file),/révoqué/);assert.equal(blobs.length,count);assert.equal(previews.at(-1).closed,true);
});
it('unauthenticated client never fetches an old URL or the backend',async()=>{
  (globalThis as any).__driveClientIdentity=null;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('private');};
  await assert.rejects(openDriveFile(file),/Authentification/);assert.equal(calls,0);assert.equal(previews.at(-1).closed,true);
});
