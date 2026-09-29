import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let server: Server;
let url: string;
const previous = { NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL };
before(async () => {
  process.env.NODE_ENV = 'production'; process.env.VERCEL = '1';
  const { default: app } = await import('../server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  for (const [key,value] of Object.entries(previous)) { if(value===undefined) delete process.env[key]; else process.env[key]=value; }
});

async function identity(role: 'owner'|'coach'|'member', clubId: string, id: number) {
  const email=`member-access-${randomUUID()}@example.test`;
  const user=await getAuth().createUser({email,password:'Local-member-access-test!'});
  await getFirestore().doc(`users/${user.uid}`).set({id,role,clubId,firebaseUid:user.uid,name:role});
  return {uid:user.uid,token:await login(email)};
}
async function login(email:string) {
  const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Local-member-access-test!',returnSecureToken:true})
  });
  assert.equal(response.status,200);
  return (await response.json()).idToken as string;
}
function api(path:string,token:string,body?:unknown) {
  return fetch(url+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
function creation(email:string,coachUid?:string) {
  return {requestId:randomUUID(),profile:{name:'Membre recette',email},...(coachUid?{coachUid}:{})};
}

it('Solo creates a member, resolves owner contact, and never writes a fake assignment',async()=>{
  const clubId=`solo-${randomUUID()}`;
  const owner=await identity('owner',clubId,401);
  await getFirestore().doc(`clubs/${clubId}`).set({id:clubId,accountType:'solo',ownerId:owner.uid});
  const email=`solo-member-${randomUUID()}@example.test`;
  const created=await api('/api/create-member',owner.token,creation(email));
  assert.equal(created.status,200);
  const result=await created.json();
  assert.equal(result.member.assignedCoachUid,undefined);
  await getAuth().updateUser(result.uid,{password:'Local-member-access-test!'});
  const contact=await api('/api/member/assigned-coach',await login(email));
  assert.equal(contact.status,200);
  assert.deepEqual((await contact.json()).coach.role,'owner');
});

it('Studio owner chooses a coach or defers, while coach-created members self-assign',async()=>{
  const clubId=`studio-${randomUUID()}`;
  const owner=await identity('owner',clubId,501);
  const coach=await identity('coach',clubId,502);
  await getFirestore().doc(`clubs/${clubId}`).set({id:clubId,accountType:'studio',ownerId:owner.uid});
  const selected=await api('/api/create-member',owner.token,creation(`selected-${randomUUID()}@example.test`,coach.uid));
  assert.equal(selected.status,200);
  const assigned=await selected.json();
  assert.equal(assigned.member.assignedCoachUid,coach.uid);
  assert.ok((await getFirestore().doc(`users/${coach.uid}`).get()).data()?.assignedMemberIds.includes(assigned.memberId));
  const deferredEmail=`deferred-${randomUUID()}@example.test`;
  const deferred=await api('/api/create-member',owner.token,creation(deferredEmail));
  assert.equal(deferred.status,200);
  const unassigned=await deferred.json();
  assert.equal(unassigned.member.assignedCoachUid,undefined);
  await getAuth().updateUser(unassigned.uid,{password:'Local-member-access-test!'});
  const memberToken=await login(deferredEmail);
  assert.deepEqual(await (await api('/api/member/assigned-coach',memberToken)).json(),{coach:null});
  const assignedLater=await api('/api/assign-member-coach',owner.token,{memberUid:unassigned.uid,coachUid:coach.uid});
  assert.equal(assignedLater.status,200);
  assert.equal((await (await api('/api/member/assigned-coach',memberToken)).json()).coach.firebaseUid,coach.uid);
  assert.ok((await getFirestore().doc(`users/${coach.uid}`).get()).data()?.assignedMemberIds.includes(unassigned.memberId));
  const own=await api('/api/create-member',coach.token,creation(`coach-${randomUUID()}@example.test`));
  assert.equal(own.status,200);
  assert.equal((await own.json()).member.assignedCoachUid,coach.uid);
  const rejected=await api('/api/create-member',coach.token,creation(`forged-${randomUUID()}@example.test`,owner.uid));
  assert.equal(rejected.status,400);
});
