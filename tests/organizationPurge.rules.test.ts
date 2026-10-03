import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
let env:RulesTestEnvironment;
const tenant='purge-rules-tenant';
const admin=()=>env.authenticatedContext('purge-rules-admin',{email:'victor.defreitas.pro@gmail.com',email_verified:true});
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-velatra',firestore:{rules:await readFile('firestore.rules','utf8')},storage:{rules:await readFile('storage.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'users/purge-rules-admin'),{role:'superadmin',clubId:'purge-rules-platform'});
  await setDoc(doc(c.firestore(),'clubs/'+tenant),{id:tenant,isActive:true,ownerId:'purge-rules-owner'});
  for(const role of ['owner','manager','coach','member'])await setDoc(doc(c.firestore(),'users/purge-rules-'+role),{role,clubId:tenant,firebaseUid:'purge-rules-'+role,id:7});
 });
});after(()=>env?.cleanup());
it('even verified Super Admin cannot bypass the coordinator by deleting club or forging progress/completion logs',async()=>{
 const db=admin().firestore();await assertFails(deleteDoc(doc(db,'clubs/'+tenant)));
 await assertFails(setDoc(doc(db,'organizationPurgeJobs/'+tenant),{state:'completed'}));
 await assertFails(setDoc(doc(db,'organizationPurgeJobs/'+tenant+'/items/000000'),{outcome:'deleted'}));
 await assertFails(setDoc(doc(db,'admin_audit_logs/purge-rules-fake'),{actionType:'CLUB_PURGE_COMPLETED'}));
 await assertSucceeds(setDoc(doc(db,'admin_audit_logs/purge-rules-ordinary'),{actionType:'ORDINARY_ACTION'}));
});
it('journal is readable only by trusted live Super Admin and completed audit is immutable in browser',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  await setDoc(doc(c.firestore(),'organizationPurgeJobs/'+tenant),{state:'failed',clubId:tenant});
  await setDoc(doc(c.firestore(),'admin_audit_logs/purge-rules-real'),{actionType:'CLUB_PURGE_COMPLETED'});
 });
 await assertSucceeds(getDoc(doc(admin().firestore(),'organizationPurgeJobs/'+tenant)));
 await assertFails(getDoc(doc(env.authenticatedContext('purge-rules-owner').firestore(),'organizationPurgeJobs/'+tenant)));
 await assertFails(updateDoc(doc(admin().firestore(),'admin_audit_logs/purge-rules-real'),{details:'fake'}));await assertFails(deleteDoc(doc(admin().firestore(),'admin_audit_logs/purge-rules-real')));
});
it('purge lock blocks self-profile mutation and new Storage writes, including verified platform browser',async()=>{
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'clubs/'+tenant),{id:tenant,isActive:false,purgeJobId:tenant}));
 await assertFails(updateDoc(doc(env.authenticatedContext('purge-rules-member').firestore(),'users/purge-rules-member'),{name:'new'}));
 for(const context of [env.authenticatedContext('purge-rules-owner'),admin()]){
  await assertFails(uploadBytes(ref(context.storage(),'clubs/'+tenant+'/late.png'),new Uint8Array([1]),{contentType:'image/png'}));
  await assertFails(uploadBytes(ref(context.storage(),`driveUploads/${tenant}/purge-rules-owner/new/new.pdf`),new Uint8Array([1]),{contentType:'application/pdf'}));
 }
 await assertFails(updateDoc(doc(admin().firestore(),'clubs/'+tenant),{name:'changed during purge'}));
});
