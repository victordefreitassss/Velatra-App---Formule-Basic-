import {before,after,it} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Server} from 'node:http';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
let server:Server,base:string;
const clubId='team-'+randomUUID(),other='team-other-'+randomUUID(),solo='team-solo-'+randomUUID();
const people:Record<string,{uid:string;token:string;id:number}>={};
const db=()=>getFirestore();
async function person(name:string,role:string,club=clubId,id=9500){
  const email=`team-${randomUUID()}@example.test`,password='Local-Team-2026!';
  const account=await getAuth().createUser({email,password});
  await db().doc(`users/${account.uid}`).set({id,role,clubId:club,name,firebaseUid:account.uid,assignedMemberIds:[999999],email,injuries:'private-health',notes:'private-note',stripeCustomerId:'private-stripe'});
  const login=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
  assert.equal(login.status,200);people[name]={uid:account.uid,token:(await login.json()).idToken,id};
}
const api=(path:string,name:string,method='GET',body?:unknown)=>fetch(base+path,{method,headers:{Authorization:`Bearer ${people[name].token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
before(async()=>{
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST&&process.env.FIREBASE_AUTH_EMULATOR_HOST);
  process.env.NODE_ENV='production';process.env.VERCEL='1';
  const {default:app}=await import('../server.ts');server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+(server.address() as {port:number}).port;
  for(const [name,role,club,id] of [['owner','owner',clubId,9501],['manager','manager',clubId,9502],['coach','coach',clubId,9503],['second','coach',clubId,9504],['member','member',clubId,9505],['unassigned','member',clubId,9506],['another','member',clubId,9507],['foreign','coach',other,9510],['foreignMember','member',other,9511],['soloManager','manager',solo,9512]] as const)await person(name,role,club,id);
  await db().doc(`clubs/${clubId}`).set({id:clubId,accountType:'studio',ownerId:people.owner.uid,isActive:true});
  await db().doc(`clubs/${other}`).set({accountType:'studio',isActive:true});await db().doc(`clubs/${solo}`).set({accountType:'solo'});
  await db().doc(`users/${people.member.uid}`).update({assignedCoachUid:people.coach.uid});
});
after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
it('Manager gets coherent tenant workload from canonical relationships with no private profile fields',async()=>{
  const response=await api('/api/team','manager');assert.equal(response.status,200);const result=await response.json();
  assert.equal(result.scope,'tenant');assert.equal(result.coaches.length,2);assert.equal(result.members.length,3);
  assert.equal(result.coaches.find((c:any)=>c.uid===people.coach.uid).assignedClients,1);
  assert.equal(result.coaches.find((c:any)=>c.uid===people.second.uid).settings.capacity,null);
  assert.ok(!JSON.stringify(result).includes('private-'));assert.ok(!JSON.stringify(result).includes('@example.test'));
  assert.ok(!result.coaches.some((c:any)=>c.uid===people.foreign.uid));
});
it('Coach sees only self and own members; tenant overrides, anonymous and Members are denied',async()=>{
  const result=await (await api('/api/team','coach')).json();assert.equal(result.scope,'self');
  assert.deepEqual(result.coaches.map((c:any)=>c.uid),[people.coach.uid]);assert.deepEqual(result.members.map((m:any)=>m.uid),[people.member.uid]);
  assert.equal((await api('/api/team?clubId='+other,'manager')).status,400);
  assert.equal((await api('/api/team','member')).status,403);assert.equal((await api('/api/team','soloManager')).status,403);
  assert.equal((await fetch(base+'/api/team')).status,401);
});
it('Manager sets capacity and operational metadata; Coach changes own availability only',async()=>{
  const uid=people.coach.uid;
  const response=await api('/api/team/coaches/'+uid,'manager','PATCH',{expectedRevision:0,capacity:25,specialties:['Force'],available:true,weeklyAvailability:[{day:1,start:'09:00',end:'12:00'}]});
  assert.equal(response.status,200);
  assert.equal((await api('/api/team/coaches/'+uid,'coach','PATCH',{expectedRevision:1,capacity:99})).status,403);
  assert.equal((await api('/api/team/coaches/'+people.second.uid,'coach','PATCH',{expectedRevision:0,available:false})).status,403);
  assert.equal((await api('/api/team/coaches/'+uid,'coach','PATCH',{expectedRevision:1,available:false,weeklyAvailability:[]})).status,200);
  const profile=(await db().doc(`users/${uid}`).get()).data()!;assert.equal(profile.teamSettings.capacity,25);assert.equal(profile.teamSettings.available,false);assert.equal(profile.role,'coach');
  assert.equal((await api('/api/team/coaches/'+people.foreign.uid,'manager','PATCH',{expectedRevision:0,capacity:1})).status,404);
  assert.equal((await api('/api/team/coaches/'+people.owner.uid,'manager','PATCH',{expectedRevision:0,capacity:1})).status,404);
  assert.equal((await api('/api/team/coaches/'+uid,'manager','PATCH',{expectedRevision:2,role:'owner'})).status,400);
});
it('invalid and overlapping windows, fractional capacity and stale edits cannot mutate the coach',async()=>{
  const path='/api/team/coaches/'+people.coach.uid;
  for(const extras of [{capacity:-1},{capacity:1.5},{capacity:'25'},{capacity:1001},{weeklyAvailability:[{day:1,start:'12:00',end:'09:00'}]},{weeklyAvailability:[{day:1,start:'09:00',end:'12:00'},{day:1,start:'11:00',end:'13:00'}]}])assert.equal((await api(path,'manager','PATCH',{expectedRevision:2,...extras})).status,400);
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:0,capacity:1})).status,409);
  const responses=await Promise.all([api(path,'manager','PATCH',{expectedRevision:2,capacity:2}),api(path,'owner','PATCH',{expectedRevision:2,capacity:3})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
});
it('assignment enforces availability, active status and exact real capacity even with poisoned cached IDs',async()=>{
  const target=people.second.uid,path='/api/team/coaches/'+target;
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:0,capacity:0})).status,200);
  const assignment={memberUid:people.unassigned.uid,coachUid:target,expectedCoachUid:null};
  assert.equal((await api('/api/assign-member-coach','manager','POST',assignment)).status,409);
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:1,capacity:1,available:false})).status,200);
  assert.equal((await api('/api/assign-member-coach','manager','POST',assignment)).status,409);
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:2,available:true,status:'paused'})).status,200);
  assert.equal((await api('/api/assign-member-coach','manager','POST',assignment)).status,409);
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:3,status:'active'})).status,200);
  const responses=await Promise.all([api('/api/assign-member-coach','manager','POST',assignment),api('/api/assign-member-coach','owner','POST',{...assignment,memberUid:people.another.uid})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const actual=await db().collection('users').where('clubId','==',clubId).where('assignedCoachUid','==',target).get();assert.equal(actual.size,1);
  const email='team-full-'+randomUUID()+'@example.test';
  assert.equal((await api('/api/create-member','manager','POST',{requestId:randomUUID(),coachUid:target,profile:{name:'Full capacity',email}})).status,409);
  await assert.rejects(getAuth().getUserByEmail(email),(error:any)=>error.code==='auth/user-not-found');
  const memberUid=actual.docs[0].id;
  // Retrying the same assignment is harmless even at full capacity.
  assert.equal((await api('/api/assign-member-coach','manager','POST',{memberUid,coachUid:target,expectedCoachUid:target})).status,200);
  assert.equal((await api('/api/assign-member-coach','manager','POST',{memberUid,coachUid:null,expectedCoachUid:null})).status,409);
  assert.equal((await api('/api/assign-member-coach','coach','POST',{memberUid,coachUid:null})).status,403);
  assert.equal((await api('/api/assign-member-coach','manager','POST',{memberUid:people.foreignMember.uid,coachUid:target})).status,404);
  await db().doc('programs/team-preserved').set({clubId,memberId:actual.docs[0].data().id,assignedCoachUid:target,history:'retained'});
  assert.equal((await api('/api/assign-member-coach','manager','POST',{memberUid,coachUid:null,expectedCoachUid:target})).status,200);
  const record=(await db().doc('programs/team-preserved').get()).data()!;assert.equal(record.assignedCoachUid,undefined);assert.equal(record.history,'retained');
});
it('suspension revokes existing Coach sessions and studio/actor changes revoke team authority',async()=>{
  const path='/api/team/coaches/'+people.second.uid;
  assert.equal((await api(path,'manager','PATCH',{expectedRevision:4,isSuspended:true})).status,200);
  assert.equal((await api('/api/team','second')).status,403);
  assert.equal((await api(path,'owner','PATCH',{expectedRevision:5,isSuspended:false})).status,200);
  assert.equal((await api('/api/team','second')).status,200);
  await db().doc(`users/${people.manager.uid}`).update({role:'member'});assert.equal((await api('/api/team','manager')).status,403);
  await db().doc(`users/${people.manager.uid}`).update({role:'manager'});
  await db().doc(`clubs/${clubId}`).update({isActive:false});assert.equal((await api('/api/team','manager')).status,403);
  await db().doc(`clubs/${clubId}`).update({isActive:true,accountType:'solo'});assert.equal((await api('/api/team','coach')).status,403);
  await db().doc(`clubs/${clubId}`).update({accountType:'studio'});
});
