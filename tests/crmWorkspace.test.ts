import { it } from 'node:test';
import assert from 'node:assert/strict';
import { filterProspects, initialFilters, scopedProspects, prospectTimeline, reminderGroup } from '../components/crm/crmModel';
import { crmProfilePatch } from '../server/crmProspect';
import { desktopNavigation, desktopContextItems } from '../components/desktop/desktopNavigation';
import { getAllContextItems } from '../components/appShellHelpers';
import type { Prospect, User, Club } from '../types';
const now=Date.parse('2026-10-03T12:00:00Z');
const p=(patch:Partial<Prospect>={}):Prospect=>({id:1,firebaseUid:'p1',clubId:'one',name:'Émilie Martin',email:'e@example.test',phone:'0600000000',date:'2026-09-01T12:00:00Z',status:'pending',answers:{},...patch});
const actor={clubId:'one',role:'owner'} as User;
it('CRM filters are accent-insensitive, composable, stable and do not mutate loaded records',()=>{
 const rows=[p({source:'Web',tags:['VIP'],proposedOffer:'Coaching',assignedCoachUid:'coach',nextReminderDate:'2026-10-01T12:00:00Z'}),p({id:2,firebaseUid:'p2',name:'Alex',status:'lost'})];
 const before=JSON.stringify(rows);
 assert.equal(filterProspects(rows,{...initialFilters,search:'emilie',stage:'lead',owner:'coach',source:'Web',tag:'VIP',from:'2026-09-01',to:'2026-09-30',segment:'overdue'},now).length,1);
 assert.equal(filterProspects(rows,{...initialFilters,source:'Unknown'},now).length,0);
 assert.deepEqual(filterProspects(rows,{...initialFilters,sort:'name'},now).map(v=>v.name),['Alex','Émilie Martin']);
 assert.equal(JSON.stringify(rows),before);
});
it('CRM rendering filters foreign tenants and never expands Coach or Member access',()=>{
 const rows=[p(),p({clubId:'two',firebaseUid:'foreign'})];
 assert.equal(scopedProspects(rows,actor,'one').length,1);
 for(const role of ['coach','member','superadmin'])assert.equal(scopedProspects(rows,{...actor,role} as User,'one').length,0);
 assert.equal(scopedProspects(rows,actor,'two').length,0);
});
it('reminder groups use Paris days and exclude closed contacts without inventing task completion',()=>{
 assert.equal(reminderGroup(p({nextReminderDate:'2026-10-02T22:30:00Z'}),new Date(now)),'today');
 assert.equal(reminderGroup(p({nextReminderDate:'2026-10-01T12:00:00Z'}),new Date(now)),'overdue');
 assert.equal(reminderGroup(p({nextReminderDate:'2026-10-04T12:00:00Z'}),new Date(now)),'upcoming');
 assert.equal(reminderGroup(p({status:'won',nextReminderDate:'2026-10-01T12:00:00Z'}),new Date(now)),'none');
 assert.equal(reminderGroup(p({nextReminderDate:'invalid'}),new Date(now)),'none');
 assert.equal(filterProspects([p({nextReminderDate:'2026-10-02T22:30:00Z'})],{...initialFilters,segment:'overdue'},now).length,0);
});
it('quiet segment uses actual notes/activity, never a link click or a fabricated contact date',()=>{
 assert.equal(filterProspects([p()],{...initialFilters,segment:'quiet'},now).length,1);
 assert.equal(filterProspects([p({date:'unknown'})],{...initialFilters,segment:'quiet'},now).length,0);
 assert.equal(filterProspects([p({notesHistory:[{id:'n',date:'2026-10-02T12:00:00Z',content:'Context'}]})],{...initialFilters,segment:'quiet'},now).length,0);
});
it('timeline merges the existing note journal once with its event, keeps legacy notes and sorts chronologically',()=>{
 const rows=prospectTimeline(p({notesHistory:[{id:'n',date:'2026-10-02T12:00:00Z',content:'A note'}],activityHistory:[{id:'n',noteId:'n',date:'2026-10-02T12:00:00Z',label:'Note CRM ajoutée',kind:'note'}]}));
 assert.equal(rows.length,2);assert.equal(rows[0].content,'A note');assert.equal(rows[1].label,'Prospect créé');
 assert.equal(prospectTimeline(p({notes:'Undated legacy context'})).length,1);
});
it('CRM metadata validation refuses authority fields, links, overlong tags and invalid structures',()=>{
 for(const body of [{constructor:'invalid'},{toString:'invalid'},{clubId:'other'},{status:'won'},{convertedMemberUid:'u'},{assignedCoachUid:'u'},{plan:'premium'},{name:''},{tags:['x'.repeat(41)]},{tags:Array(13).fill('x')},{tags:[2]},{email:'wrong'},[],null,{}])assert.throws(()=>crmProfilePatch(body));
 assert.deepEqual(crmProfilePatch({tags:['VIP','VIP'],email:' E@Example.test ',source:' Web '}),{tags:['VIP'],email:'e@example.test',source:'Web'});
});
it('desktop navigation retains the authorized catalog for Solo, Owner, Manager and employee',()=>{
 for(const [role,type] of [['owner','solo'],['owner','studio'],['manager','studio'],['coach','studio']] as const){
  const club={id:'one',accountType:type,isActive:true,ownerId:'owner'} as Club;
  const items=getAllContextItems({role,club,format:'desktop'});
  const menu=desktopNavigation(items,role==='manager'||role==='owner'&&type==='studio',role==='coach');
  const all=[...menu.main,...menu.secondary,...menu.settings].map(i=>i.id);
  assert.equal(new Set(all).size,all.length);assert.deepEqual([...all].sort(),items.map(i=>i.id).sort());
  assert.ok(menu.main.some(i=>i.id==='chat'));
  assert.ok(!menu.main.some(i=>i.id==='crm_finances'));
  const finances=items.find(i=>i.id==='crm_finances');
  assert.deepEqual(menu.secondary.find(i=>i.id==='crm_finances'),finances);
  if(finances)assert.equal(finances.label,'Finances');
  assert.ok(![...menu.main,...menu.secondary].some(i=>i.label==='Ventes'));
  if(type==='studio'&&role!=='coach')assert.equal(menu.secondaryLabel,'Gestion du club');
  if(role==='coach')assert.ok(!all.includes('crm_pipeline'));
  assert.ok(desktopContextItems(items,'users').every(i=>all.includes(i.id)));
 }
});
