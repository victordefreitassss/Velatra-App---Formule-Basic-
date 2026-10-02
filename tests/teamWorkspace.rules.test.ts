import {before,after,it} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc} from 'firebase/firestore';
let env:RulesTestEnvironment;
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-velatra',firestore:{rules:await readFile('firestore.rules','utf8')}});
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();await setDoc(doc(db,'clubs/team-rules'),{accountType:'studio',ownerId:'team-rules-owner'});
    for(const [index,role] of ['owner','manager','coach','member'].entries())await setDoc(doc(db,'users/team-rules-'+role),{id:9600+index,role,clubId:'team-rules',firebaseUid:'team-rules-'+role});
  });
});
after(()=>env.cleanup());
it('ordinary SDK clients cannot bypass the server-owned capacity, availability or assignment checks',async()=>{
  for(const role of ['owner','manager','coach','member']){
    const db=env.authenticatedContext('team-rules-'+role).firestore();
    await assertFails(updateDoc(doc(db,'users/team-rules-coach'),{teamSettings:{capacity:999,available:true,revision:999}}));
    await assertFails(updateDoc(doc(db,'users/team-rules-member'),{assignedCoachUid:'team-rules-coach'}));
  }
  await assertFails(getDoc(doc(env.authenticatedContext('team-rules-coach').firestore(),'users/team-rules-manager')));
});
