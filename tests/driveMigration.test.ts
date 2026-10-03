import { it } from 'node:test';
import assert from 'node:assert/strict';
import { describeDriveObject, parseDriveMigrationArgs, revokeDriveObject } from '../scripts/migrations/revoke-drive-tokens.ts';
it('migration is read only by default and requires exact explicit selection/receipt for apply',()=>{
  assert.equal(parseDriveMigrationArgs(['--manifest','/tmp/audit.json']).apply,false);
  for(const args of [[],['--manifest','/tmp/a','--apply'],['--manifest','/tmp/a','--project','other'],['--manifest','/tmp/a','--manifest','/tmp/b'],['--token','secret']])assert.throws(()=>parseDriveMigrationArgs(args));
  assert.throws(()=>describeDriveObject({name:'avatars/uid/photo.png'}));
});
it('migration reports no usable token and refuses changed objects before any rewrite',async()=>{
  const metadata={name:'drive/a/uid/file/f.pdf',generation:'1',metageneration:'1',size:'2',crc32c:'hash',metadata:{firebaseStorageDownloadTokens:'test-only-not-a-secret'}};
  const approved=describeDriveObject(metadata);assert.ok(!JSON.stringify(approved).includes('test-only-not-a-secret'));
  let writes=0;const bucket={file:()=>({getMetadata:async()=>[{...metadata,metageneration:'2'}],request:()=>{writes++;}})};
  await assert.rejects(revokeDriveObject(bucket,approved),/CHANGED/);assert.equal(writes,0);
});
it('rewrite pins source/destination generation and metageneration, strips only the token and disables caching',async()=>{
  let metadata:any={name:'drive/a/uid/file/f.pdf',generation:'123',metageneration:'4',size:'2',crc32c:'hash',metadata:{firebaseStorageDownloadTokens:'test-only',keep:'ok'}};
  const approved=describeDriveObject(metadata);
  const object={getMetadata:async()=>[metadata],request:async(options:any)=>{
    assert.deepEqual(options.qs,{sourceGeneration:'123',ifSourceGenerationMatch:'123',ifSourceMetagenerationMatch:'4',ifGenerationMatch:'123',ifMetagenerationMatch:'4'});
    assert.deepEqual(options.json,{metadata:{firebaseStorageDownloadTokens:'',keep:'ok'},cacheControl:'private, no-store'});
    metadata={...metadata,generation:'124',metadata:options.json.metadata,cacheControl:options.json.cacheControl};return [{done:true},{}];
  }};
  await revokeDriveObject({name:'fixture',file:()=>object},approved);assert.equal(metadata.metadata.keep,'ok');
});
