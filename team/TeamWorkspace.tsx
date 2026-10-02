import React, { useEffect, useRef, useState } from 'react';
import type { AppState } from '../types';
import { apiFetch } from '../firebase';
import { Card, Button, Input } from '../components/UI';
import { useHomeDestination } from '../components/useHomeDestination';
import { useRetention } from '../retention/useRetention';
import { retentionLabels } from '../retention/retentionModel';
import { authorizationActor, canManageTeam, canViewOwnTeam } from '../server/authorization';
import { useTeam } from './useTeam';
import { coachWorkload, teamMetrics, workloadLabels, type TeamCoach, type TeamMember, type AvailabilityWindow } from './teamModel';
type Props={state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>;showToast:(message:string,type?:'success'|'error')=>void;staffPanel:React.ReactNode};
const days=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const field='min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900';
const date=(value:string|null)=>value?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(value)):'Non renseignée';
export function TeamWorkspace({state,setState,showToast,staffPanel}:Props) {
  const actor=authorizationActor(state.user,state.currentClub);
  const manager=canManageTeam(actor,state.currentClub?.id),allowed=(manager||canViewOwnTeam(actor,state.currentClub?.id))&&state.currentClub?.isActive!==false&&(state.user?.role!=='owner'||state.currentClub?.ownerId===state.user.firebaseUid);
  const feed=useTeam(state,allowed),open=useHomeDestination(state,setState);
  const [selected,setSelected]=useState<string|null>(null),[view,setView]=useState<'coaches'|'capacity'>('coaches');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[availability,setAvailability]=useState('all'),[sort,setSort]=useState('name');
  const [assignment,setAssignment]=useState<{member:TeamMember;coachUid:string|null}|null>(null),[busy,setBusy]=useState(false),[actionError,setActionError]=useState<string|null>(null);
  const actorScope=`${state.user?.firebaseUid}:${state.user?.clubId}:${state.user?.role}`,currentScope=useRef(actorScope);currentScope.current=actorScope;
  useEffect(()=>{setSelected(null);setAssignment(null);setActionError(null);setBusy(false);},[state.user?.firebaseUid,state.user?.clubId,state.user?.role]);
  if(!allowed)return <p role="alert">Cet espace équipe n’est pas accessible.</p>;
  const result=feed.result,metrics=result?teamMetrics(result.coaches,result.members):null;
  const chosen=result?.coaches.find(coach=>coach.uid===(manager?selected:state.user?.firebaseUid));
  const coaches=(result?.coaches||[]).filter(coach=>(coach.name+' '+coach.settings.specialties.join(' ')).toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))&&
    (status==='all'||(status==='active'?coachWorkload(coach).active:!coachWorkload(coach).active))&&
    (availability==='all'||(availability==='available'?coachWorkload(coach).canReceive:coachWorkload(coach).state==='unavailable')))
    .sort((a,b)=>sort==='load'?(coachWorkload(b).ratio??-1)-(coachWorkload(a).ratio??-1)||a.name.localeCompare(b.name,'fr'):sort==='capacity'?coachWorkload(b).remaining-coachWorkload(a).remaining:a.name.localeCompare(b.name,'fr'));
  async function assign() {
    if(!assignment||busy||!manager)return;
    setBusy(true);setActionError(null);
    try {
      const response=await apiFetch('/api/assign-member-coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberUid:assignment.member.uid,coachUid:assignment.coachUid,expectedCoachUid:assignment.member.assignedCoachUid})});
      const value=await response.json();if(!response.ok)throw Error(value.error||'Affectation impossible.');
      if(currentScope.current!==actorScope)return;
      setAssignment(null);showToast('Affectation enregistrée.','success');await feed.refresh();
    }catch(error:unknown){if(currentScope.current===actorScope)setActionError((error as Error).message);}finally{setBusy(false);}
  }
  return <div data-team-workspace className="min-w-0 space-y-5 pb-24">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-semibold">{manager?'Équipe du Studio':'Ma charge et mes disponibilités'}</h1><p className="mt-1 text-sm text-zinc-600">{manager?'Répartir les suivis et connaître la capacité de votre équipe.':'Vos clients et vos disponibilités opérationnelles.'}</p></div><Button variant="secondary" onClick={()=>void feed.refresh()} disabled={feed.loading||busy}>Actualiser</Button></header>
    {feed.loading&&<p role="status">Chargement de l’équipe…</p>}
    {feed.error&&<Card><p role="alert">{feed.error}</p><Button className="mt-3" onClick={()=>void feed.refresh()}>Réessayer</Button></Card>}
    {manager&&metrics&&<>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5" aria-label="Indicateurs équipe">
        {[['Coachs actifs',metrics.activeCoaches],['Clients suivis',metrics.followedClients],['Clients / coach actif',metrics.average===null?'—':metrics.average.toFixed(1)],['Proches de la capacité',metrics.nearCapacity],['Coachs disponibles',metrics.availableCoaches]].map(([label,value])=><Card key={label} className="min-w-0 !p-4"><p className="text-xs text-zinc-600">{label}</p><strong className="text-2xl">{value}</strong></Card>)}
      </div><p className="text-sm text-zinc-600">{metrics.remainingCapacity} place(s) de suivi sur les capacités renseignées · {metrics.undefinedCapacity} capacité(s) non définie(s) · {metrics.unassignedClients} client(s) sans coach valide. Les clients en pause restent comptés dans les affectations.</p>
    </>}
    {result&&!result.coaches.length&&<Card><h2 className="font-semibold">Aucun coach configuré</h2><p className="mt-2 text-sm">Ajoutez un coach pour organiser les suivis de votre Studio. Les clients sans coach restent accessibles ci-dessous.</p></Card>}
    {manager&&result&&<>
      <nav className="flex flex-wrap gap-2" aria-label="Vues équipe"><Button variant={view==='coaches'?'primary':'secondary'} aria-pressed={view==='coaches'} onClick={()=>setView('coaches')}>Coachs</Button><Button variant={view==='capacity'?'primary':'secondary'} aria-pressed={view==='capacity'} onClick={()=>setView('capacity')}>Charge et capacité</Button></nav>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Rechercher un coach<Input aria-label="Rechercher un coach" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)}/></label>
        <label className="text-sm">Statut<select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">En pause / suspendus</option></select></label>
        <label className="text-sm">Disponibilité<select className={field} value={availability} onChange={e=>setAvailability(e.target.value)}><option value="all">Toutes</option><option value="available">Capacité disponible</option><option value="unavailable">Indisponibles</option></select></label>
        <label className="text-sm">Trier<select className={field} value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Nom</option><option value="load">Charge décroissante</option><option value="capacity">Places disponibles</option></select></label>
      </div>
      {!!result.coaches.length&&!coaches.length&&<p>Aucun coach ne correspond à ces filtres.</p>}
      <ul className={view==='capacity'?'space-y-3':'grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3'} aria-label="Coachs du Studio">{coaches.map(coach=><li key={coach.uid} className="min-w-0"><Card className="min-w-0 space-y-3"><div className="flex min-w-0 items-center gap-3"><Avatar coach={coach}/><div className="min-w-0"><h2 className="break-words font-semibold">{coach.name}</h2><p className="text-xs">Coach · {coach.isSuspended?'Suspendu':coach.status==='paused'?'En pause':'Actif'}</p></div></div><Workload coach={coach}/>{view==='coaches'&&<><p className="break-words text-sm text-zinc-600">{coach.settings.specialties.join(' · ')||'Spécialités non renseignées'}</p><p className="break-words text-xs">Prochaine plage déclarée : {coach.nextAvailability||'Non renseignée'}</p></>}<Button variant="secondary" className="w-full" onClick={()=>setSelected(coach.uid)}>Voir {coach.name}</Button></Card></li>)}</ul>
    </>}
    {chosen&&result&&<CoachDetail key={`${chosen.uid}:${chosen.settings.revision}`} coach={chosen} members={result.members.filter(member=>member.assignedCoachUid===chosen.uid)} state={state} manager={manager} busy={busy} onSaved={()=>void feed.refresh()} showToast={showToast} onOpen={member=>{const matches=state.users.filter(user=>user.role==='member'&&user.clubId===state.user?.clubId&&user.id===member.id);if(matches.length!==1||matches[0].firebaseUid!==member.uid){showToast('Le profil client doit être actualisé avant ouverture.','error');return;}open({page:'users',memberId:member.id});}} onAssignment={(member,coachUid)=>{setAssignment({member,coachUid});setActionError(null);}} coaches={result.coaches}/>}
    {manager&&result&&<Card className="min-w-0 space-y-3"><h2 className="text-lg font-semibold">Affecter ou rééquilibrer un suivi</h2>{!result.members.length?<p>Aucun client dans cette organisation.</p>:<AssignmentPicker members={result.members} coaches={result.coaches} busy={busy} onSelect={(member,coachUid)=>{setAssignment({member,coachUid});setActionError(null);}}/>}</Card>}
    {manager&&assignment&&result&&<Card className="min-w-0 space-y-3" ><div role="dialog" aria-modal="false" aria-labelledby="team-confirm"><h2 id="team-confirm" className="font-semibold">Confirmer l’affectation</h2><p className="my-3 break-words">{assignment.member.name} : {result.coaches.find(c=>c.uid===assignment.member.assignedCoachUid)?.name||'Sans coach valide'} → {result.coaches.find(c=>c.uid===assignment.coachUid)?.name||'Sans coach'}.</p>{assignment.coachUid&&result.coaches.find(c=>c.uid===assignment.coachUid)?.settings.capacity===null&&<p className="mb-3 text-sm">La capacité de ce coach n’est pas renseignée. Vérifiez sa charge avant de confirmer.</p>}{actionError&&<p role="alert" className="mb-3">{actionError}</p>}<div className="flex flex-wrap gap-2"><Button onClick={()=>void assign()} disabled={busy}>{busy?'Enregistrement…':'Confirmer l’affectation'}</Button><Button variant="secondary" disabled={busy} onClick={()=>setAssignment(null)}>Annuler</Button></div></div></Card>}
    {manager&&staffPanel}
  </div>;
}
function Avatar({coach}:{coach:TeamCoach}) {
  return /^https:\/\//.test(coach.avatar)?<img className="h-11 w-11 shrink-0 rounded-full object-cover" src={coach.avatar} alt="" referrerPolicy="no-referrer"/>:<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-900" aria-hidden="true">{coach.avatar.slice(0,3)||coach.name.slice(0,2)}</span>;
}
function Workload({coach}:{coach:TeamCoach}) {
  const load=coachWorkload(coach),percent=load.ratio===null?null:Math.round(load.ratio*100);
  return <div className="space-y-2"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{coach.assignedClients} / {coach.settings.capacity??'—'} clients</strong><span>{percent===null?'Taux non calculable':`${percent} %`}</span></div><progress className="h-2 w-full accent-emerald-700" value={percent===null?0:Math.min(percent,100)} max={100} aria-label={`Charge de ${coach.name}`}/><p className={`text-sm font-medium ${['full','overloaded','near'].includes(load.state)?'text-amber-800':'text-zinc-700'}`}>{workloadLabels[load.state]}</p></div>;
}
function AssignmentPicker({members,coaches,busy,onSelect}:{members:TeamMember[];coaches:TeamCoach[];busy:boolean;onSelect:(member:TeamMember,coachUid:string|null)=>void}) {
  const [memberUid,setMember]=useState(''),[coachUid,setCoach]=useState(''),[query,setQuery]=useState('');
  const member=members.find(m=>m.uid===memberUid);
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="text-sm">Rechercher un client<Input value={query} maxLength={100} onChange={e=>setQuery(e.target.value)}/></label><label className="text-sm">Client<select aria-label="Client à affecter" className={field} value={memberUid} onChange={e=>{setMember(e.target.value);setCoach('');}}><option value="">Choisir un client</option>{members.filter(m=>m.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).map(m=><option key={m.uid} value={m.uid}>{m.name}{!m.assignedCoachUid?' · sans coach':''}</option>)}</select></label><label className="text-sm">Coach<select aria-label="Coach pour l’affectation" className={field} value={coachUid} onChange={e=>setCoach(e.target.value)}><option value="">Choisir un coach</option><option value="none">Retirer le coach</option>{coaches.map(c=>{const load=coachWorkload(c);return <option key={c.uid} value={c.uid} disabled={load.state==='unavailable'||c.settings.capacity!==null&&!load.canReceive&&member?.assignedCoachUid!==c.uid}>{c.name} · {c.assignedClients}/{c.settings.capacity??'—'} · {workloadLabels[load.state]}{c.settings.specialties.length?' · '+c.settings.specialties.join(', '):''}</option>;})}</select></label><Button className="self-end" disabled={busy||!member||!coachUid} onClick={()=>member&&onSelect(member,coachUid==='none'?null:coachUid)}>Préparer l’affectation</Button></div>;
}
function CoachDetail({coach,members,state,manager,busy,onSaved,showToast,onOpen,onAssignment,coaches}:{coach:TeamCoach;members:TeamMember[];state:AppState;manager:boolean;busy:boolean;onSaved:()=>void;showToast:Props['showToast'];onOpen:(member:TeamMember)=>void;onAssignment:(member:TeamMember,coachUid:string|null)=>void;coaches:TeamCoach[]}) {
  const retain=useRetention(state,{state:'all',signal:'all',coach:manager?coach.uid:'all',search:''});
  const [limit,setLimit]=useState(20);
  return <section aria-label={`Fiche coach ${coach.name}`} className="min-w-0 space-y-4"><Card className="space-y-4"><div className="flex items-center gap-3"><Avatar coach={coach}/><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{coach.name}</h2><p className="text-sm">Coach · {coach.isSuspended?'Suspendu':coach.status==='paused'?'En pause':'Actif'}</p></div></div><Workload coach={coach}/><CoachSettingsEditor coach={coach} manager={manager} onSaved={onSaved} showToast={showToast}/></Card>
    <Card className="min-w-0 space-y-3"><h3 className="font-semibold">Clients affectés · {members.length}</h3>{!members.length&&<p>Ce coach n’a aucun client affecté.</p>}{retain.error&&<p role="status">Le contexte Retain est indisponible. Les affectations restent visibles.</p>}
      <ul className="space-y-3">{members.slice(0,limit).map(member=>{const risk=retain.result?.assessments.find(a=>a.memberUid===member.uid);return <li key={member.uid} className="min-w-0 space-y-2 rounded-xl border p-3"><h4 className="break-words font-semibold">{member.name}</h4><p className="text-xs">{member.isSuspended?'Suspendu':member.status==='paused'?'En pause':'Actif'} · Dernière séance : {date(member.lastWorkoutDate)} · Dernier bilan : {date(member.lastCheckInDate)}</p><p className="text-sm">Retain : {risk?retentionLabels[risk.state]:retain.loading?'Chargement…':'Non disponible dans les données chargées'}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>onOpen(member)}>Ouvrir le client</Button>{manager&&<Button variant="ghost" disabled={busy} onClick={()=>onAssignment(member,null)}>Retirer l’affectation</Button>}</div></li>;})}</ul>
      {members.length>limit&&<Button variant="secondary" onClick={()=>setLimit(limit+20)}>Voir 20 clients suivants</Button>}{retain.result?.nextCursor&&<Button variant="ghost" disabled={retain.loading} onClick={()=>void retain.loadMore()}>Charger les niveaux Retain suivants</Button>}
      {manager&&!!members.length&&<AssignmentPicker members={members} coaches={coaches} busy={busy} onSelect={onAssignment}/>}</Card>
  </section>;
}
function CoachSettingsEditor({coach,manager,onSaved,showToast}:{coach:TeamCoach;manager:boolean;onSaved:()=>void;showToast:Props['showToast']}) {
  const [capacity,setCapacity]=useState(coach.settings.capacity===null?'':String(coach.settings.capacity));
  const [available,setAvailable]=useState(coach.settings.available),[specialties,setSpecialties]=useState(coach.settings.specialties.join(', '));
  const [windows,setWindows]=useState<AvailabilityWindow[]>(coach.settings.weeklyAvailability),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [status,setStatus]=useState(coach.isSuspended?'suspended':coach.status);
  const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function save(event:React.FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError(null);try{
    const response=await apiFetch(`/api/team/coaches/${encodeURIComponent(coach.uid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:coach.settings.revision,available,weeklyAvailability:windows,...(manager?{capacity:capacity===''?null:Number(capacity),specialties:specialties.split(',').map(s=>s.trim()).filter(Boolean),isSuspended:status==='suspended',status:status==='paused'?'paused':'active'}:{})})});
    const value=await response.json();if(!response.ok)throw Error(value.error||'Enregistrement impossible.');if(!mounted.current)return;showToast('Profil équipe enregistré.','success');onSaved();
  }catch(error:unknown){setError((error as Error).message);}finally{setBusy(false);}}
  return <form onSubmit={save} className="min-w-0 space-y-4"><h3 className="font-semibold">{manager?'Capacité et disponibilités':'Mes disponibilités'}</h3>
    {manager&&<div className="grid min-w-0 gap-3 sm:grid-cols-3"><label className="text-sm">Capacité maximale<Input type="number" min={0} max={1000} step={1} value={capacity} placeholder="Non définie" onChange={e=>setCapacity(e.target.value)}/></label><label className="text-sm">Spécialités<Input maxLength={480} value={specialties} placeholder="Force, mobilité…" onChange={e=>setSpecialties(e.target.value)}/></label><label className="text-sm">Statut du coach<select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Actif</option><option value="paused">En pause</option><option value="suspended">Suspendu</option></select></label></div>}
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/>Disponible pour de nouvelles affectations</label>
    <p className="text-xs text-zinc-600">Plages opérationnelles en heure de Paris. Elles ne créent ni séance ni créneau réservable dans le Planning.</p>
    <ul className="space-y-3">{windows.map((window,index)=><li key={index} className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4"><label className="col-span-2 text-xs sm:col-span-1">Jour<select aria-label={`Jour de disponibilité ${index+1}`} className={field} value={window.day} onChange={e=>setWindows(windows.map((w,i)=>i===index?{...w,day:Number(e.target.value)}:w))}>{days.map((day,i)=><option key={day} value={i}>{day}</option>)}</select></label><label className="text-xs">Début<input aria-label={`Début de disponibilité ${index+1}`} type="time" className={field} required value={window.start} onChange={e=>setWindows(windows.map((w,i)=>i===index?{...w,start:e.target.value}:w))}/></label><label className="text-xs">Fin<input aria-label={`Fin de disponibilité ${index+1}`} type="time" className={field} required value={window.end} onChange={e=>setWindows(windows.map((w,i)=>i===index?{...w,end:e.target.value}:w))}/></label><Button variant="ghost" type="button" className="col-span-2 sm:col-span-1" onClick={()=>setWindows(windows.filter((_,i)=>i!==index))}>Retirer la plage {index+1}</Button></li>)}</ul>
    {error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-2"><Button variant="secondary" type="button" disabled={busy||windows.length>=28} onClick={()=>setWindows([...windows,{day:1,start:'09:00',end:'17:00'}])}>Ajouter une plage</Button><Button type="submit" disabled={busy}>{busy?'Enregistrement…':'Enregistrer le profil équipe'}</Button></div>
  </form>;
}
