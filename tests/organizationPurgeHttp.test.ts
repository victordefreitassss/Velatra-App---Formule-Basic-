import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { assertTestEmulators } from '../scripts/assert-test-emulators.mjs';
let server:any,base:string;const tenant='purge-http-'+randomUUID(),people:Record<string,{uid:string;token:string}>={};
async function person(role:string,email:string,verified=true){
 let u;try{u=await getAuth().getUserByEmail(email);await getAuth().updateUser(u.uid,{password:'Local-purge-test!',emailVerified:verified});}catch(e:any){if(e.code!=='auth/user-not-found')throw e;u=await getAuth().createUser({email,password:'Local-purge-test!',emailVerified:verified});}
 await getFirestore().doc('users/'+u.uid).set({role:role==='unverified'?'superadmin':role,clubId:'purge-http-platform',firebaseUid:u.uid});
 const r=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Local-purge-test!',returnSecureToken:true})});assert.equal(r.status,200);people[role]={uid:u.uid,token:(await r.json()).idToken};
}
before(async()=>{assertTestEmulators(process.env);process.env.NODE_ENV='production';process.env.VERCEL='1';const{default:app}=await import('../server.ts');server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;await getFirestore().doc('clubs/purge-http-platform').set({isActive:true,accountType:'studio'});await getFirestore().doc('clubs/'+tenant).set({isActive:true});for(const role of ['owner','manager','coach','member'])await person(role,role+'-'+randomUUID()+'@example.test');await person('unverified','victor.defreitas.pro@gmail.com',false);});
after(async()=>new Promise<void>(r=>server.close(r)));
const request=(role?:string,body:any={confirmClubId:tenant},method='POST')=>fetch(`${base}/api/admin/clubs/${tenant}/purge`,{method,headers:{...(role?{Authorization:'Bearer '+people[role].token}:{}),'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
it('unauthenticated and all ordinary roles cannot invoke or read the purge command',async()=>{
 assert.equal((await request()).status,401);for(const role of ['owner','manager','coach','member']){assert.equal((await request(role,{confirmClubId:tenant,trustedSuperAdmin:true})).status,403);assert.equal((await request(role,undefined,'GET')).status,403);}
 assert.equal((await getFirestore().doc('clubs/'+tenant).get()).data()?.isActive,true);
});
it('unverified platform identity is rejected; verified session needs exact ID confirmation and starts a durable pending job',async()=>{
 assert.equal((await request('unverified')).status,403);await person('superadmin','victor.defreitas.pro@gmail.com',true);
 assert.equal((await request('superadmin',{confirmClubId:'other'})).status,400);const r=await request('superadmin');assert.equal(r.status,202);assert.equal((await r.json()).state,'pending');assert.equal((await getFirestore().doc('clubs/'+tenant).get()).data()?.isActive,false);
 const read=await request('superadmin',undefined,'GET');assert.equal(read.status,200);assert.equal((await read.json()).state,'pending');
});
