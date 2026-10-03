// Manual only. Default: list Drive object metadata. Never run by app startup or CI.
import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { open, readFile } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const PROJECT = 'velatra-75daa', BUCKET = 'velatra-75daa.firebasestorage.app';
export function parseDriveMigrationArgs(args: string[]) {
  const o = { apply: false, project: PROJECT, manifest: '', paths: '', receipt: '' };
  const seen = new Set<string>();
  for (let i=0;i<args.length;i++) {
    const flag=args[i]; if(seen.has(flag))throw Error('DUPLICATE_ARGUMENT'); seen.add(flag);
    if(flag==='--apply')o.apply=true;
    else {const key=({'--project':'project','--manifest':'manifest','--paths-json':'paths','--receipt':'receipt'} as const)[flag];if(!key||!args[i+1]||args[i+1].startsWith('--'))throw Error('INVALID_ARGUMENT');o[key]=args[++i];}
  }
  if(o.project!==PROJECT||!o.manifest||o.apply&&(!o.paths||!o.receipt))throw Error('EXPLICIT_TARGET_AND_MANIFEST_REQUIRED');
  return o;
}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function describeDriveObject(metadata: any) {
  if(typeof metadata.name!=='string'||!metadata.name.startsWith('drive/'))throw Error('OUTSIDE_DRIVE');
  return { path:metadata.name,generation:String(metadata.generation),metageneration:String(metadata.metageneration),size:String(metadata.size),crc32c:metadata.crc32c,noncurrent:Boolean(metadata.timeDeleted),publicAcl:Boolean(metadata.acl?.some((a:any)=>['allUsers','allAuthenticatedUsers'].includes(a.entity))),
    hasToken:Boolean(metadata.metadata?.firebaseStorageDownloadTokens),
    // Detect token changes without including a usable token in the inventory.
    tokenFingerprint:digest(String(metadata.metadata?.firebaseStorageDownloadTokens||'')) };
}
async function save(path:string,value:any){
  const absolute=resolve(path), repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),offset=relative(repo,absolute);
  if(offset!=='..'&&!offset.startsWith('..'+sep))throw Error('PRIVATE_REPORT_MUST_BE_OUTSIDE_REPOSITORY');
  const h=await open(absolute,'wx',0o600);try{await h.writeFile(JSON.stringify(value,null,2)+'\n');await h.sync();}finally{await h.close();}}
export async function revokeDriveObject(bucket: any, approved: any) {
  if(!approved.path?.startsWith('drive/'))throw Error('OUTSIDE_DRIVE');
  const object=bucket.file(approved.path),[current]=await object.getMetadata({projection:'full'});
  const now=describeDriveObject(current);
  if(current.acl?.some((entry:any)=>['allUsers','allAuthenticatedUsers'].includes(entry.entity)))throw Error('PUBLIC_OBJECT_MANUAL_REVIEW_REQUIRED');
  if(!now.hasToken && current.cacheControl==='private, no-store') return {path:approved.path,alreadyPrivate:true};
  if(JSON.stringify(now)!==JSON.stringify(approved))throw Error('OBJECT_CHANGED_RESCAN_REQUIRED');
  // Rewriting the same object strips the token, preserves bytes/path/custom metadata
  // and invalidates old bearer URLs. Source + destination preconditions guard races.
  if(current.customerEncryption || current.temporaryHold || current.eventBasedHold || current.retention)throw Error('PROTECTED_OBJECT_MANUAL_REVIEW_REQUIRED');
  const metadata={...current.metadata,firebaseStorageDownloadTokens:''};
  const body:any={metadata,cacheControl:'private, no-store'};
  for(const key of ['contentType','contentDisposition','contentEncoding','contentLanguage','customTime','storageClass','contexts'])if(current[key]!==undefined)body[key]=current[key];
  let rewriteToken: string | undefined;
  do {
    const [response] = await object.request({method:'POST',uri:`/rewriteTo/b/${bucket.name}/o/${encodeURIComponent(approved.path)}`,
      qs:{sourceGeneration:current.generation,ifSourceGenerationMatch:current.generation,
        ifSourceMetagenerationMatch:current.metageneration,ifGenerationMatch:current.generation,
        ifMetagenerationMatch:current.metageneration,...(current.kmsKeyName?{destinationKmsKeyName:current.kmsKeyName}:{}),...(rewriteToken?{rewriteToken}:{})},
      json:body});
    rewriteToken = response.rewriteToken;
    if(!response.done&&!rewriteToken)throw Error('REWRITE_INCOMPLETE_STOP');
  } while(rewriteToken);
  const [after]=await object.getMetadata({projection:'full'});
  if(after.metadata?.firebaseStorageDownloadTokens||String(after.size)!==String(current.size)||after.crc32c!==current.crc32c||after.cacheControl!=='private, no-store')throw Error('POSTCHECK_FAILED_STOP');
  return {path:approved.path,before:now,after:describeDriveObject(after)};
}
export async function main(args=process.argv.slice(2)) {
  const o=parseDriveMigrationArgs(args);
  if(process.env.CI||process.env.FIREBASE_STORAGE_EMULATOR_HOST||process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Error('PRODUCTION_ENVIRONMENT_CONFLICT');
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT'])if(process.env[key]&&process.env[key]!==PROJECT)throw Error('PROJECT_MISMATCH');
  // ADC only: no tokens/private keys accepted as command-line arguments or logged.
  const bucket=new Storage({projectId:PROJECT}).bucket(BUCKET);
  const [bucketMetadata]=await bucket.getMetadata({projection:'full'});
  if(!o.apply){const [objects]=await bucket.getFiles({prefix:'drive/',versions:true});const rows=[];for(const f of objects){const[m]=await f.getMetadata({projection:'full'});rows.push(describeDriveObject(m));}await save(o.manifest,{schema:1,project:PROJECT,bucket:BUCKET,versioningEnabled:bucketMetadata.versioning?.enabled===true,objects:rows});console.log(JSON.stringify({readOnly:true,objects:rows.length,withTokens:rows.filter(r=>r.hasToken).length}));return;}
  const approved=JSON.parse(await readFile(o.manifest,'utf8')),paths=JSON.parse(await readFile(o.paths,'utf8'));
  if(approved.schema!==1||approved.project!==PROJECT||approved.bucket!==BUCKET||!Array.isArray(approved.objects)||!Array.isArray(paths)||!paths.length||new Set(paths).size!==paths.length)throw Error('INVALID_APPROVAL');
  // A rewrite must not leave a readable archived generation containing the old token.
  // Versioned buckets/history require generation-specific metadata revocation first.
  if(bucketMetadata.versioning?.enabled===true||approved.versioningEnabled||approved.objects.some((r:any)=>r.noncurrent)||new Set(approved.objects.map((r:any)=>r.path)).size!==approved.objects.length)throw Error('VERSION_HISTORY_MANUAL_REVOCATION_REQUIRED');
  if([...(bucketMetadata.acl||[]),...(bucketMetadata.defaultObjectAcl||[])].some((a:any)=>['allUsers','allAuthenticatedUsers'].includes(a.entity)))throw Error('PUBLIC_BUCKET_MANUAL_REVIEW_REQUIRED');
  const [policy]=await bucket.iam.getPolicy({requestedPolicyVersion:3});
  if(policy.bindings?.some((b:any)=>b.members?.some((m:string)=>m==='allUsers'||m==='allAuthenticatedUsers')))throw Error('PUBLIC_BUCKET_MANUAL_REVIEW_REQUIRED');
  const selected=paths.map(path=>{const matches=approved.objects.filter((r:any)=>r.path===path);if(matches.length!==1||typeof path!=='string'||!path.startsWith('drive/'))throw Error('PATH_NOT_APPROVED');return matches[0];});
  // Persist the exact selection before the first write; never overwrite a receipt.
  await save(o.receipt,{project:PROJECT,bucket:BUCKET,selected});
  for(const row of selected){const result=await revokeDriveObject(bucket,row);console.log(JSON.stringify(result));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('DRIVE_MIGRATION_FAILED_STOP: inspect local manifest; no secrets logged.');process.exitCode=1;});
