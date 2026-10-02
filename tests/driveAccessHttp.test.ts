import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initializeApp as clientApp, deleteApp } from 'firebase/app';
import { getAuth as clientAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage as clientStorage, connectStorageEmulator, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { assertTestEmulators } from '../scripts/assert-test-emulators.mjs';
import { describeDriveObject, revokeDriveObject } from '../scripts/migrations/revoke-drive-tokens.ts';
const tenant = `drive-${randomUUID()}`, other = tenant+'-other', password='Drive-emulator-only!';
const users: Record<string,{uid:string;token:string;id:number;app?:ReturnType<typeof clientApp>}>={};
let server:Server, base:string, id:string, path:string, oldStageUrl:string;
const db=()=>getFirestore(), bucket=()=>getStorage().bucket('demo-velatra.appspot.com');
const bytes=Buffer.from('%PDF-1.4\nPrivate Drive test\n');
const headers=(role:string)=>({Authorization:'Bearer '+users[role].token});
const request=(role:string|undefined, suffix='',method='GET',body?:any)=>fetch(`${base}/api/drive/files/${id}${suffix||'/content'}`,{method,headers:{...(role?headers(role):{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
async function person(role:string,clubId=tenant){
  const email=`${role}-${randomUUID()}@example.test`,u=await getAuth().createUser({email,password,emailVerified:true});
  const app=clientApp({apiKey:'emulator-only',projectId:'demo-velatra',storageBucket:bucket().name},'drive-'+role);
  const auth=clientAuth(app);connectAuthEmulator(auth,`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,{disableWarnings:true});
  const credential=await signInWithEmailAndPassword(auth,email,password);
  users[role]={uid:u.uid,token:await credential.user.getIdToken(),id:5000+Object.keys(users).length,app};
  await db().doc('users/'+u.uid).set({firebaseUid:u.uid,id:users[role].id,clubId,role:role==='other'?'member':role});
}
before(async()=>{
  assertTestEmulators(process.env);process.env.NODE_ENV='production';process.env.VERCEL='1';
  const {default:app}=await import('../server.ts');server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));base=`http://127.0.0.1:${(server.address() as any).port}`;
  for(const role of ['owner','coach','manager','member'])await person(role);
  await person('other',other);
  await db().doc('clubs/'+tenant).set({id:tenant,isActive:true,accountType:'studio'});
  await db().doc('clubs/'+other).set({id:other,isActive:true,accountType:'studio'});
  id='private-'+randomUUID();path=`drive/${tenant}/${users.coach.uid}/${id}/guide.pdf`;
});
after(async()=>{await Promise.all(Object.values(users).map(u=>deleteApp(u.app!)));if(server)await new Promise<void>(r=>server.close(()=>r()));});
it('resumable SDK staging -> private publication removes the upload-response public URL',async()=>{
  const storage=clientStorage(users.coach.app!);connectStorageEmulator(storage,'127.0.0.1',9199);
  const stagedPath=path.replace('drive/','driveUploads/');
  const oldToken='emulator-stage-token-'+randomUUID();
  await uploadBytesResumable(ref(storage,stagedPath),bytes,{contentType:'application/pdf',customMetadata:{firebaseStorageDownloadTokens:oldToken}});
  await assert.rejects(getDownloadURL(ref(storage,stagedPath)));
  oldStageUrl=`http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket().name}/o/${encodeURIComponent(stagedPath)}?alt=media&token=${oldToken}`;
  assert.equal((await fetch(oldStageUrl)).status,200,'exploit: bearer token alone bypasses authenticated Rules');
  const response=await request('coach','/finalize','POST',{clubId:tenant,name:'guide.pdf',folderId:null,sharedWith:[users.member.id]});
  assert.equal(response.status,201,await response.clone().text());const record=await response.json();
  assert.equal(record.path,path);assert.equal(record.url,undefined);
  const [metadata]=await bucket().file(path).getMetadata();assert.ok(!metadata.metadata?.firebaseStorageDownloadTokens);assert.equal(metadata.cacheControl,'private, no-store');
  assert.notEqual((await fetch(oldStageUrl)).status,200);
  const guessed=oldStageUrl.replace(encodeURIComponent(stagedPath),encodeURIComponent(path));assert.notEqual((await fetch(guessed)).status,200);
  await db().doc('driveFiles/'+id).update({url:'https://obsolete.invalid/?token=old'});
  const retry=await request('coach','/finalize','POST',{clubId:tenant,name:'guide.pdf',folderId:null,sharedWith:[]});
  assert.equal((await retry.json()).url,undefined,'a retry never exposes a legacy bearer field');
  assert.equal((await request('coach','/finalize','POST',{clubId:tenant,name:'guide.pdf',folderId:null,sharedWith:[]})).status,201,'same publish retry is idempotent and does not revoke its existing share');
});
it('active share, Owner, Coach and Studio Manager can preview/download without public URLs',async()=>{
  for(const role of ['member','owner','coach','manager']){const r=await request(role);assert.equal(r.status,200,await r.clone().text());assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.match(r.headers.get('cache-control')!,/no-store/);assert.equal(r.headers.get('vercel-cdn-cache-control'),'no-store');assert.match(r.headers.get('content-disposition')!,/inline/);}
  const r=await request('member','/content?download=1');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition')!,/attachment/);
});
it('Range requests reauthorize and support PDF preview; malformed ranges do not leak bytes',async()=>{
  const url=`${base}/api/drive/files/${id}/content`;
  const r=await fetch(url,{headers:{...headers('member'),Range:'bytes=0-3'}});assert.equal(r.status,206);assert.equal(await r.text(),'%PDF');
  for(const range of ['bytes=10000-','bytes=4-2','bytes=0-1,4-5','bytes=-0'])assert.equal((await fetch(url,{headers:{...headers('member'),Range:range}})).status,416);
});
it('files above the Vercel payload limit use bounded reauthorized chunks, with pinned generation',async()=>{
  const oldId=id,largeId='large-'+randomUUID(),largePath=`drive/${tenant}/${users.coach.uid}/${largeId}/large.pdf`;
  const large=Buffer.alloc(5*1024*1024+29,7);
  await bucket().file(largePath).save(large,{resumable:false,metadata:{contentType:'application/pdf'}});
  await db().doc('driveFiles/'+largeId).set({id:largeId,clubId:tenant,path:largePath,name:'large.pdf',sharedWith:[users.member.id]});
  id=largeId;
  try {
    let next=0,etag='',total=0;
    while(next<large.length){const r=await fetch(`${base}/api/drive/files/${id}/content`,{headers:{...headers('member'),...(next?{Range:`bytes=${next}-`,'If-Match':etag}:{})}});
      assert.equal(r.status,206);etag=r.headers.get('etag')!;const data=Buffer.from(await r.arrayBuffer());assert.ok(data.length<=2*1024*1024);assert.ok(data.equals(large.subarray(next,next+data.length)));next+=data.length;total+=data.length;}
    assert.equal(total,large.length);
    assert.equal((await fetch(`${base}/api/drive/files/${id}/content`,{headers:{...headers('member'),'If-Match':'"old-generation"'}})).status,412);
    await db().doc('driveFiles/'+id).update({sharedWith:[]});assert.equal((await fetch(`${base}/api/drive/files/${id}/content`,{headers:{...headers('member'),Range:'bytes=2097152-','If-Match':etag}})).status,403);
  }finally{id=oldId;await bucket().file(largePath).delete();await db().doc('driveFiles/'+largeId).delete();}
});
it('upload finalization rejects members, foreign tenant, untrusted paths and foreign folder',async()=>{
  const body={clubId:tenant,name:'guide.pdf',folderId:null,sharedWith:[]};
  assert.equal((await request('member','/finalize','POST',body)).status,403);
  assert.equal((await request('other','/finalize','POST',body)).status,403);
  assert.equal((await request('coach','/finalize','POST',{...body,name:'../other.pdf'})).status,400);
  await db().doc('driveFolders/drive-foreign-folder').set({clubId:other});
  assert.equal((await request('coach','/finalize','POST',{...body,folderId:'drive-foreign-folder'})).status,403);
});
it('anonymous, forged identity and other tenant cannot read a known URL',async()=>{
  assert.equal((await request(undefined)).status,401);assert.equal((await request('other')).status,403);
  assert.equal((await fetch(`${base}/api/drive/files/${id}/content`,{headers:{Authorization:'Bearer forged'}})).status,401);
  assert.equal((await request('member','/content?token=old-public-token')).status,200,'query tokens never grant access; real session still needed');
});
it('revocation immediately denies the very same URL and token, including Range; active owner still reads',async()=>{
  await db().doc('driveFiles/'+id).update({sharedWith:[]});
  assert.equal((await request('member')).status,403);assert.equal((await request('member','/content?download=1')).status,403);
  assert.equal((await fetch(`${base}/api/drive/files/${id}/content`,{headers:{...headers('member'),Range:'bytes=0-3'}})).status,403);
  assert.equal((await request('owner')).status,200);await db().doc('driveFiles/'+id).update({sharedWith:[users.member.id]});
});
it('moved, removed and suspended users lose access even with an unexpired token and numeric share',async()=>{
  const user=db().doc('users/'+users.member.uid),saved=(await user.get()).data()!;
  await user.update({clubId:other});assert.equal((await request('member')).status,403);
  await user.set({...saved,isSuspended:true});assert.equal((await request('member')).status,403);
  await user.delete();assert.equal((await request('member')).status,403);await user.set(saved);
  await db().doc('clubs/'+tenant).update({isActive:false});assert.equal((await request('owner')).status,403);await db().doc('clubs/'+tenant).update({isActive:true});
});
it('rename preserves physical identity and download; untrusted metadata cannot redirect the backend',async()=>{
  const record=db().doc('driveFiles/'+id);await record.update({name:'renamed.pdf'});const r=await request('member');assert.equal(r.status,200);assert.match(r.headers.get('content-disposition')!,/renamed.pdf/);
  await record.update({path:`drive/${other}/${users.other.uid}/${id}/guide.pdf`});assert.equal((await request('member')).status,409);await record.update({path});
});
it('legacy token rewrite actually denies the old anonymous Firebase URL and preserves bytes/path',async()=>{
  const legacy=`drive/${tenant}/${users.coach.uid}/legacy-${randomUUID()}/report.pdf`,object=bucket().file(legacy),token='legacy-test-token-'+randomUUID();
  await object.save(bytes,{resumable:false,metadata:{contentType:'application/pdf',metadata:{firebaseStorageDownloadTokens:token,keep:'unchanged'}}});
  const url=`http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket().name}/o/${encodeURIComponent(legacy)}?alt=media&token=${token}`;
  assert.equal((await fetch(url)).status,200);
  const [before]=await object.getMetadata();await revokeDriveObject(bucket(),describeDriveObject(before));
  assert.notEqual((await fetch(url)).status,200);const [after]=await object.getMetadata();assert.equal(after.metadata?.keep,'unchanged');assert.deepEqual((await object.download())[0],bytes);
  assert.equal((await revokeDriveObject(bucket(),describeDriveObject(before))).alreadyPrivate,true);
});
it('deleting a published object removes legitimate backend downloads too',async()=>{
  await bucket().file(path).delete();await db().doc('driveFiles/'+id).delete();assert.equal((await request('owner')).status,404);
});
