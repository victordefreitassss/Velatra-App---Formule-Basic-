import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { assertTestEmulators } from '../scripts/assert-test-emulators.mjs';
import { advanceOrganizationPurge, getOrganizationPurge, type PurgeServices } from '../server/organizationPurge';
import { updateOrganizationAuthority } from '../server/organizationAuthority';
import { processBillingStripeEvent } from '../server/stripePayments';
import { notificationHash } from '../server/notifications';
const suffix=randomUUID(),identity={uid:'purge-admin-'+suffix,email:'victor.defreitas.pro@gmail.com',email_verified:true};
let services:PurgeServices, databases:ReturnType<typeof getFirestore>[], bucket:ReturnType<ReturnType<typeof getStorage>['bucket']>;
const created:string[]=[]; let fixtureNumber = 1_000_000_000_000;
before(async()=>{
 assertTestEmulators(process.env);process.env.NODE_ENV='production';process.env.VERCEL='1';await import('../server.ts');
 databases=[getFirestore('purge-primary-'+suffix),getFirestore('purge-secondary-'+suffix)];bucket=getStorage().bucket('demo-velatra.appspot.com');
 services={databases,auth:getAuth(),bucket:()=>bucket,batchSize:100};
 await databases[0].doc('users/'+identity.uid).set({role:'superadmin',clubId:'platform'});
});
after(async()=>{for(const uid of created)try{await getAuth().deleteUser(uid);}catch(e:any){if(e.code!=='auth/user-not-found')throw e;}});
async function fixture(){
 const club='purge-'+randomUUID(),other=club+'-neighbor',memberId=++fixtureNumber;
 const user=await getAuth().createUser({uid:'user-'+randomUUID(),email:randomUUID()+'@example.test'});created.push(user.uid);
 for(const db of databases){await db.doc('clubs/'+club).set({id:club,isActive:true,ownerId:user.uid});await db.doc('clubs/'+other).set({id:other,isActive:true});}
 await databases[0].doc('users/'+user.uid).set({id:memberId,clubId:club,firebaseUid:user.uid,role:'owner'});
 await databases[0].doc('programs/'+club).set({clubId:club});
 await databases[0].doc('programs/'+club+'/history/nested').set({note:'tenant child'});
 await databases[1].doc('bookings/'+club).set({tenantId:club});
 await databases[0].doc('logs/'+other).set({clubId:other,untouched:true});
 const path=`drive/${club}/${user.uid}/file/private.pdf`;await bucket.file(path).save(Buffer.from('private'),{resumable:false,metadata:{contentType:'application/pdf'}});
 const neighborPath=`drive/${other}/neighbor/file/neighbor.pdf`;await bucket.file(neighborPath).save(Buffer.from('neighbor'),{resumable:false});
 const box=notificationHash(club,user.uid);
 await databases[0].doc(`pushDevices/${box}/devices/one`).set({clubId:club,uid:user.uid}); // parent intentionally missing
 await databases[0].doc('pushTokenOwners/'+club).set({path:`pushDevices/${box}/devices/one`});
 await databases[0].doc(`notificationPreferences/${box}`).set({pushEnabled:false});
 return {club,other,uid:user.uid,path,neighborPath,memberId};
}
const advance=(club:string,s=services)=>advanceOrganizationPurge(s,identity,club,{confirmClubId:club});
async function complete(club:string,s=services){let r=await advance(club,s);for(let i=0;i<30&&r.state!=='completed'&&r.state!=='failed';i++)r=await advance(club,s);return r;}
it('complete purge verifies both databases, nested/missing parents, Storage and exclusive Auth; neighbor unchanged',async()=>{
 const f=await fixture();const result=await complete(f.club);assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(result.remaining,0);
 for(const db of databases)assert.equal((await db.doc('clubs/'+f.club).get()).exists,false);
 assert.equal((await databases[0].doc('programs/'+f.club+'/history/nested').get()).exists,false);
 assert.equal((await databases[0].doc('users/'+f.uid).get()).exists,false);
 assert.equal((await databases[0].doc('pushTokenOwners/'+f.club).get()).exists,false);
 assert.equal((await bucket.file(f.path).exists())[0],false);await assert.rejects(getAuth().getUser(f.uid),{code:'auth/user-not-found'});
 assert.deepEqual((await databases[0].doc('logs/'+f.other).get()).data(),{clubId:f.other,untouched:true});assert.equal((await bucket.file(f.neighborPath).exists())[0],true);
 const job=databases[0].doc('organizationPurgeJobs/'+f.club);assert.equal((await job.get()).data()?.state,'completed');assert.ok((await job.collection('events').get()).docs.some(d=>d.data().action==='COMPLETED'));
 assert.equal((await advance(f.club)).state,'completed','same request is idempotent');
});
it('intermediate Firestore failure keeps club and logs resource; partial retry succeeds',async()=>{
 const f=await fixture();let failed=false;
 const original=databases[0],proxy=new Proxy(original,{get(target,key){if(key==='runTransaction')return(fn:any)=>target.runTransaction(tx=>fn(new Proxy(tx,{get(t,k){if(k==='delete')return(ref:any)=>{if(ref.path===`programs/${f.club}`&&!failed){failed=true;throw Object.assign(new Error('injected'),{code:'firestore/injected'});}return t.delete(ref);};const value=Reflect.get(t,k,t);return typeof value==='function'?value.bind(t):value;}})));const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const r=await complete(f.club,{...services,databases:[proxy,databases[1]]});assert.equal(r.state,'failed');assert.equal(r.error.resource,`programs/${f.club}`);
 assert.equal((await original.doc('clubs/'+f.club).get()).data()?.isActive,false);assert.equal((await bucket.file(f.path).exists())[0],true);
 assert.equal((await complete(f.club)).state,'completed');
});
it('Storage error never deletes club or claims completion; retry tolerates deleted objects',async()=>{
 const f=await fixture();const bad=new Proxy(bucket,{get(target,key){if(key==='file')return(...args:any[])=>{const file=(target.file as any)(...args);return new Proxy(file,{get(t,k){if(k==='request')return()=>{throw Object.assign(new Error('injected'),{code:503});};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}});};const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
 const result=await complete(f.club,{...services,bucket:()=>bad});assert.equal(result.state,'failed');assert.equal(result.error.resource,f.path);assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);
 await bucket.file(f.path).delete();assert.equal((await complete(f.club)).state,'completed');
});
it('Auth failure occurs after profile removal but retains club and durable UID; retry deletes exclusive Auth',async()=>{
 const f=await fixture();const bad=new Proxy(getAuth(),{get(target,key){if(key==='deleteUser')return()=>{throw Object.assign(new Error('injected'),{code:'auth/internal-error'});};const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
 const result=await complete(f.club,{...services,auth:bad});assert.equal(result.state,'failed');assert.equal(result.error.resource,f.uid);assert.equal((await databases[0].doc('users/'+f.uid).get()).exists,false);
 assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);assert.ok(await getAuth().getUser(f.uid));assert.equal((await complete(f.club)).state,'completed');
});
it('shared Auth and global personal objects remain; only target memberships are unlinked',async()=>{
 const f=await fixture();await databases[1].doc('users/'+f.uid).set({firebaseUid:f.uid,clubId:f.other,role:'member',keep:'neighbor profile'});
 await getAuth().setCustomUserClaims(f.uid,{clubIds:[f.club,f.other],custom:'keep'});
 const avatar=`avatars/${f.uid}/avatar.png`;await bucket.file(avatar).save(Buffer.from('shared'),{resumable:false});
 const result=await complete(f.club);assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(result.sharedAccountsPreserved,1);
 assert.deepEqual((await getAuth().getUser(f.uid)).customClaims,{clubIds:[f.other],custom:'keep'});
 assert.equal((await databases[0].doc('users/'+f.uid).get()).data()?.clubId,undefined);
 assert.deepEqual((await databases[1].doc('users/'+f.uid).get()).data(),{firebaseUid:f.uid,clubId:f.other,role:'member',keep:'neighbor profile'});
 assert.equal((await bucket.file(avatar).exists())[0],true);
});
it('cross-tenant child fails inventory before deletes and preserves both organizations',async()=>{
 const f=await fixture();await databases[0].doc(`programs/${f.club}/history/foreign`).set({clubId:f.other});
 const result=await complete(f.club);assert.equal(result.state,'failed');assert.equal(result.phase,'inventory');assert.equal((await databases[0].doc('programs/'+f.club).get()).exists,true);assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);
});
it('stale document inventory refuses reassigned neighbor data and preserves club',async()=>{
 const f=await fixture();await advance(f.club);
 const r=await advance(f.club,{...services,batchSize:1});assert.equal(r.state,'running');
 await databases[0].doc('programs/'+f.club).update({clubId:f.other});
 const failed=await complete(f.club);assert.equal(failed.state,'failed');assert.equal((await databases[0].doc('programs/'+f.club).get()).data()?.clubId,f.other);assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);
});
it('running lease prevents overlapping workers and pending/running purge blocks SaaS reactivation and billing writers',async()=>{
 const f=await fixture();assert.equal((await advance(f.club)).state,'pending');
 await assert.rejects(updateOrganizationAuthority(databases[0],identity,f.club,{isActive:true}),{status:409});
 await assert.rejects(processBillingStripeEvent(databases[0],f.club,{id:'evt_purge',type:'customer.created',data:{object:{}}}),/purge blocks/);
 const ref=databases[0].doc('organizationPurgeJobs/'+f.club);await ref.update({state:'running',leaseUntil:Date.now()+120000,leaseOwner:'another-worker'});
 const result=await advance(f.club);assert.equal(result.state,'running');assert.equal((await ref.get()).data()?.leaseOwner,'another-worker');
});
it('completed tombstone refuses an organization ID reused later',async()=>{
 const f=await fixture();assert.equal((await complete(f.club)).state,'completed');await databases[0].doc('clubs/'+f.club).set({isActive:true,newOrganization:true});
 await assert.rejects(advance(f.club),{status:409});assert.equal((await databases[0].doc('clubs/'+f.club).get()).data()?.newOrganization,true);
});
it('forged identity, wrong confirmation and client-controlled scope cannot request a purge',async()=>{
 const f=await fixture();await assert.rejects(advanceOrganizationPurge(services,{...identity,email_verified:false},f.club,{confirmClubId:f.club}),{status:403});
 await assert.rejects(advanceOrganizationPurge(services,identity,f.club,{confirmClubId:f.other}),{status:400});
 await assert.rejects(advanceOrganizationPurge(services,identity,f.club,{confirmClubId:f.club,uid:identity.uid,bucket:'other'}),{status:400});
 assert.equal((await databases[0].doc('clubs/'+f.club).get()).data()?.isActive,true);
 await assert.rejects(getOrganizationPurge(services,{...identity,uid:f.uid},f.club),{status:403});
});
it('final club deletion failure records failure and keeps primary club until a safe retry',async()=>{
 const f=await fixture();const original=databases[0],proxy=new Proxy(original,{get(target,key){if(key==='runTransaction')return(fn:any)=>target.runTransaction(tx=>fn(new Proxy(tx,{get(t,k){if(k==='delete')return(ref:any)=>{if(ref.path===`clubs/${f.club}`)throw Object.assign(new Error('injected'),{code:'firestore/final-root'});return t.delete(ref);};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}})));const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
 const failed=await complete(f.club,{...services,databases:[proxy,databases[1]]});assert.equal(failed.state,'failed');assert.equal(failed.error.resource,`clubs/${f.club}`);assert.equal((await original.doc('clubs/'+f.club).get()).exists,true);
 assert.equal((await complete(f.club)).state,'completed');
});
it('lost resource receipt cannot fabricate completion; retry handles already-deleted child',async()=>{
 const f=await fixture();let failed=false;const original=databases[0],proxy=new Proxy(original,{get(target,key){if(key==='runTransaction')return(fn:any)=>target.runTransaction(tx=>fn(new Proxy(tx,{get(t,k){if(k==='update')return(ref:any,...args:any[])=>{if(ref.path.startsWith(`organizationPurgeJobs/${f.club}/items/`)&&!failed){failed=true;throw Object.assign(new Error('injected'),{code:'journal/injected'});}return (t.update as any)(ref,...args);};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}})));const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
 assert.equal((await complete(f.club,{...services,databases:[proxy,databases[1]]})).state,'failed');assert.equal((await original.doc('clubs/'+f.club).get()).exists,true);assert.equal((await complete(f.club)).state,'completed');
});
it('late tenant resources found by verification are inventoried and deleted before completion',async()=>{
 const f=await fixture();let injected=false;const auth=new Proxy(getAuth(),{get(target,key){if(key==='deleteUser')return async(uid:string)=>{await target.deleteUser(uid);if(uid===f.uid&&!injected){injected=true;await databases[1].doc('lateLegacy/'+f.club).set({organizationId:f.club});}};const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;}});
 const result=await complete(f.club,{...services,auth});assert.equal(result.state,'completed',JSON.stringify(result));assert.equal((await databases[1].doc('lateLegacy/'+f.club).get()).exists,false);
 const events=await databases[0].doc('organizationPurgeJobs/'+f.club).collection('events').get();assert.ok(events.docs.some(d=>d.data().action==='ADDITIONAL_RESOURCES'));
});
it('unique numeric legacy references and scoped prospect booking locks do not survive profile deletion',async()=>{
 const f=await fixture();const memberId=Date.now();await databases[0].doc('users/'+f.uid).update({id:memberId});
 await databases[0].doc('legacyBody/'+f.club).set({memberId,metric:'synthetic'});await databases[0].doc('prospects/'+f.club).set({clubId:f.club});
 const lock=`bookingLocks/${f.club}_prospect_${f.club}_2026-10-03`;await databases[0].doc(lock).set({version:1});
 assert.equal((await complete(f.club)).state,'completed');assert.equal((await databases[0].doc('legacyBody/'+f.club).get()).exists,false);assert.equal((await databases[0].doc(lock).get()).exists,false);
});
it('ambiguous numeric reference aborts before deletion instead of touching neighbor data',async()=>{
 const f=await fixture();await databases[0].doc('users/neighbor-'+f.club).set({id:f.memberId,clubId:f.other,role:'member'});await databases[0].doc('legacyBody/'+f.club).set({memberId:f.memberId});
 const result=await complete(f.club);assert.equal(result.state,'failed');assert.equal(result.phase,'inventory');assert.equal((await databases[0].doc('legacyBody/'+f.club).get()).exists,true);
});

it('recreated primary organization never inherits a pending purge',async()=>{
 const f=await fixture();await advance(f.club);await databases[0].doc('clubs/'+f.club).delete();await databases[0].doc('clubs/'+f.club).set({ownerId:f.uid,isActive:true,recreated:true});
 await assert.rejects(advance(f.club),{status:409});assert.equal((await databases[0].doc('clubs/'+f.club).get()).data()?.isActive,true);assert.equal((await bucket.file(f.path).exists())[0],true);
});
it('conflicting secondary organization ID refuses inventory and leaves its owner untouched',async()=>{
 const f=await fixture();await databases[1].doc('clubs/'+f.club).update({ownerId:'foreign-owner'});
 const r=await complete(f.club);assert.equal(r.state,'failed');assert.equal((await databases[1].doc('clubs/'+f.club).get()).data()?.isActive,true);assert.equal((await databases[0].doc('programs/'+f.club).get()).exists,true);
});
it('Auth identity recreated after inventory is preserved and prevents completion',async()=>{
 const f=await fixture();await advance(f.club);await advance(f.club);
 await new Promise(resolve=>setTimeout(resolve,1100));await getAuth().deleteUser(f.uid);await getAuth().createUser({uid:f.uid,email:randomUUID()+'@example.test'});
 const r=await complete(f.club);assert.equal(r.state,'failed');assert.ok(await getAuth().getUser(f.uid));assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);
});
it('numeric legacy tenant IDs are explicit affiliations and protect shared Auth',async()=>{
 const f=await fixture();await databases[1].doc('users/'+f.uid).set({clubId:876543,role:'member'});await getAuth().setCustomUserClaims(f.uid,{clubId:876543});
 const r=await complete(f.club);assert.equal(r.state,'completed',JSON.stringify(r));assert.equal((await getAuth().getUser(f.uid)).customClaims?.clubId,876543);assert.equal((await databases[1].doc('users/'+f.uid).get()).data()?.clubId,876543);
});
it('unknown Storage namespace with target metadata is retained and refuses completion',async()=>{
 const f=await fixture();const path='unknown/'+f.club+'/private';await bucket.file(path).save(Buffer.from('private'),{resumable:false,metadata:{metadata:{clubId:f.club}}});
 const r=await complete(f.club);assert.equal(r.state,'failed');assert.equal(r.phase,'inventory');assert.equal((await bucket.file(path).exists())[0],true);assert.equal((await databases[0].doc('clubs/'+f.club).get()).exists,true);
});
