import React, { useState } from 'react';
import type { AppState, Prospect } from '../../types';
import { PROSPECT_STAGES, prospectStage } from '../prospectCrm';
import { EmptyState, PageHeader, Pagination, StatusBadge, ViewTabs } from '../internal/InternalUI';
import { crmDate, filterProspects, initialFilters, initials, reminderGroup, scopedProspects, prospectTimeline, validStamp } from './crmModel';
import './crm.css';

export type CrmView = 'pipeline' | 'list' | 'reminders' | 'activity' | 'trials' | 'performance';
export const crmViews = [['pipeline','Pipeline'],['list','Liste'],['reminders','Relances'],['activity','Activité'],['trials','Essais'],['performance','Performance']] as const;
export function ProspectWorkspace({ state, view, onView, onOpen, onAdd, onStage, onComplete, onTasks, children }: {
  state: AppState; view: CrmView; onView: (view: CrmView) => void; onOpen: (p: Prospect) => void; onAdd: () => void;
  onStage: (id: number, stage: string) => void; onComplete: (p: Prospect) => void; onTasks: () => void; children?: React.ReactNode;
}) {
  const [filters,setFilters] = useState(initialFilters), [page,setPage] = useState(0), [group,setGroup] = useState('today');
  const [columnLimit,setColumnLimit] = useState(30);
  const clubId = state.currentClub?.id || state.user?.clubId;
  const prospects = scopedProspects(state.prospects,state.user,clubId);
  const people = state.users.filter(u=>u.clubId===clubId);
  const rows = filterProspects(prospects,filters);
  const change = (key: keyof typeof filters,value: string) => { setFilters(f=>({...f,[key]:value}));setPage(0); };
  const reset = () => { setFilters(initialFilters);setPage(0); };
  const owner = (p: Prospect) => state.currentClub?.accountType === 'solo' ? state.user?.name || 'Coach indépendant' : people.find(u=>u.firebaseUid===p.assignedCoachUid)?.name || 'Non attribué';
  const stageBadge = (p: Prospect) => <StatusBadge tone={prospectStage(p)}>{PROSPECT_STAGES.find(s=>s.id===prospectStage(p))?.label || 'À vérifier'}</StatusBadge>;
  const rowIdentity = (p: Prospect) => <button type="button" className="crm-identity" aria-label={`Ouvrir ${p.name}`} onClick={()=>onOpen(p)}><span className="crm-avatar">{initials(p.name)}</span><span><strong>{p.name}</strong><small>{p.email || p.phone || 'Coordonnées à compléter'}</small></span></button>;
  const due = prospects.filter(p=>reminderGroup(p)==='overdue').length;
  const activeFilters = Object.entries(filters).filter(([key,value])=>key!=='sort' && value);
  const paged = (values: Prospect[]) => { const current = Math.min(page, Math.max(0,Math.ceil(values.length/20)-1)); return {current,items:values.slice(current*20,current*20+20)}; };
  const list = paged(rows);
  const reminderRows = rows.filter(p=>reminderGroup(p)===group), reminders = paged(reminderRows);
  const activities = rows.flatMap(p=>prospectTimeline(p).map(event=>({...event,prospect:p}))).sort((a,b)=>validStamp(b.date)-validStamp(a.date));
  const activityPage = Math.min(page,Math.max(0,Math.ceil(activities.length/20)-1));
  return <div className="crm-workspace" data-crm-workspace>
    <PageHeader eyebrow={state.currentClub?.accountType==='solo'?'Développer mon activité':'Développement commercial'} title="Prospects" description="Chaque rencontre, une relation à construire. Gardez la prochaine action en vue." actions={<><button className="vi-button" onClick={onTasks}>Toutes les tâches</button><button className="vi-button vi-button-primary" onClick={onAdd}>+ Ajouter un prospect</button></>} />
    <div className="crm-summary"><span><strong>{prospects.filter(p=>!['won','lost'].includes(p.status)).length}</strong> prospects actifs</span><button onClick={()=>{onView('reminders');setGroup('overdue');setPage(0);}}><strong>{due}</strong> relances en retard</button><button aria-label="Consulter les conversions dans Performance" style={{minHeight:44}} onClick={()=>onView('performance')}>Voir Performance</button></div>
    <ViewTabs label="Vues CRM" items={crmViews} active={view} onChange={v=>{onView(v);setPage(0);}} />
    {['trials','performance'].includes(view) ? children : <>
      <div className="vi-filters">
        <label className="vi-field crm-search">Recherche<input type="search" aria-label="Rechercher un prospect" placeholder="Nom, email, téléphone, offre…" value={filters.search} onChange={e=>change('search',e.target.value)} /></label>
        <label className="vi-field">Étape<select aria-label="Filtrer par étape" value={filters.stage} onChange={e=>change('stage',e.target.value)}><option value="">Toutes les étapes</option>{PROSPECT_STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        {state.currentClub?.accountType==='studio' && <label className="vi-field">Responsable<select value={filters.owner} onChange={e=>change('owner',e.target.value)}><option value="">Tous les responsables</option><option value="unassigned">Non attribué</option>{people.filter(u=>u.role==='coach').map(u=><option value={u.firebaseUid} key={u.firebaseUid}>{u.name}</option>)}</select></label>}
        <label className="vi-field">Segment<select value={filters.segment} onChange={e=>change('segment',e.target.value)}><option value="">Tous les prospects</option><option value="untouched">Nouveaux sans contact consigné</option><option value="overdue">Relance en retard</option><option value="quiet">Sans activité depuis 14 jours</option></select></label>
        <details className="crm-more-filters"><summary>Plus de filtres</summary><div className="vi-filters">
          <label className="vi-field">Source<select value={filters.source} onChange={e=>change('source',e.target.value)}><option value="">Toutes les sources</option>{[...new Set(prospects.map(p=>p.source).filter(Boolean))].sort().map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="vi-field">Tag<select value={filters.tag} onChange={e=>change('tag',e.target.value)}><option value="">Tous les tags</option>{[...new Set(prospects.flatMap(p=>p.tags||[]))].sort().map(t=><option key={t}>{t}</option>)}</select></label>
          <label className="vi-field">Créé à partir du<input type="date" value={filters.from} onChange={e=>change('from',e.target.value)} /></label><label className="vi-field">Créé jusqu’au<input type="date" value={filters.to} onChange={e=>change('to',e.target.value)} /></label>
        </div></details>
        <label className="vi-field">Trier<select value={filters.sort} onChange={e=>change('sort',e.target.value)}><option value="priority">Prochaine action</option><option value="newest">Plus récents</option><option value="oldest">Plus anciens</option><option value="name">Nom A–Z</option></select></label>
      </div>
      <div className="vi-filter-chips"><span>{rows.length} / {prospects.length} prospects</span>{activeFilters.map(([key,value])=><button key={key} aria-label={`Retirer le filtre ${key}`} onClick={()=>change(key as keyof typeof filters,'')}>{key==='owner'? people.find(u=>u.firebaseUid===value)?.name || 'Non attribué':key==='stage'?PROSPECT_STAGES.find(s=>s.id===value)?.label:value} ×</button>)}{!!activeFilters.length && <button onClick={reset}>Réinitialiser</button>}</div>
      {!rows.length ? <EmptyState title={prospects.length?'Aucun prospect ne correspond':'Aucun prospect pour le moment'} action={<button className="vi-button vi-button-primary" onClick={prospects.length?reset:onAdd}>{prospects.length?'Réinitialiser les filtres':'Ajouter un prospect'}</button>}>{prospects.length?'Ajustez les filtres pour retrouver vos contacts.':'Ajoutez votre premier prospect pour commencer à construire votre pipeline.'}</EmptyState> : <>
        {view==='pipeline' && <div className="crm-board" aria-label="Pipeline commercial">{PROSPECT_STAGES.filter(s=>!filters.stage || filters.stage===s.id).map(stage=>{
          const items=rows.filter(p=>prospectStage(p)===stage.id);
          return <section key={stage.id} className="crm-column" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const uid=e.dataTransfer.getData('text/velatra-prospect');const p=prospects.find(p=>p.firebaseUid===uid);if(p)onStage(p.id,stage.id);}}>
            <header><StatusBadge tone={stage.id}>{stage.label}</StatusBadge><span>{items.length}</span></header>
            {items.slice(0,columnLimit).map(p=><article className="crm-card" key={p.firebaseUid||p.id} draggable={!p.convertedMemberUid && p.status!=='won'} onDragStart={e=>e.dataTransfer.setData('text/velatra-prospect',p.firebaseUid||'')}>
              {rowIdentity(p)}<p className="crm-card-source">{p.source || 'Source non renseignée'}</p>{p.proposedOffer && <p className="crm-card-offer">{p.proposedOffer}</p>}
              <div className="crm-card-tags">{(p.tags||[]).slice(0,2).map(t=><StatusBadge key={t}>{t}</StatusBadge>)}</div>
              <footer><span>{owner(p)}</span><span data-due={reminderGroup(p)}>{p.nextReminderDate?crmDate(p.nextReminderDate):'Aucune relance'}</span></footer>
            </article>)}
            {!items.length && <p className="crm-column-empty">Aucun prospect</p>}{items.length>columnLimit && <button className="vi-button" onClick={()=>setColumnLimit(n=>n+30)}>Afficher la suite ({items.length-columnLimit})</button>}
          </section>;
        })}</div>}
        {view==='list' && <><div className="vi-table-wrap"><table className="vi-table" aria-label="Liste prospects"><thead><tr>{['Prospect','Étape','Responsable / source','Offre','Dernier contact','Prochaine action','Ancienneté'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{list.items.map(p=><tr key={p.firebaseUid||p.id}><td>{rowIdentity(p)}</td><td>{stageBadge(p)}</td><td>{owner(p)}<small>{p.source||'Source non renseignée'}</small></td><td>{p.proposedOffer||'À définir'}</td><td>{p.lastContactAt?crmDate(p.lastContactAt):'Non consigné'}</td><td>{p.nextAction|| (p.nextReminderDate?'Relancer':'À définir')}<small>{p.nextReminderDate?crmDate(p.nextReminderDate):'Sans échéance'}</small></td><td>{validStamp(p.date)?`${Math.max(0,Math.floor((Date.now()-validStamp(p.date))/86400000))} j`:'Inconnue'}</td></tr>)}</tbody></table></div><Pagination page={list.current} total={rows.length} size={20} onChange={setPage}/></>}
        {view==='reminders' && <><ViewTabs label="Échéances de relance" items={[['today',"Aujourd’hui"],['overdue','En retard'],['upcoming','À venir'],['none','Sans relance planifiée']]} active={group} onChange={v=>{setGroup(v);setPage(0);}} />{!reminderRows.length?<EmptyState title="Aucune relance dans cette catégorie">Vos prochaines relances apparaîtront ici.</EmptyState>:<div className="crm-followups">{reminders.items.map(p=><article key={p.firebaseUid||p.id}>{rowIdentity(p)}<div><strong>{p.nextAction||'Relancer le prospect'}</strong><small>{p.nextReminderDate?crmDate(p.nextReminderDate):'Sans échéance'}</small></div>{stageBadge(p)}{!['won','lost'].includes(p.status) && <div className="vi-actions"><button className="vi-button" onClick={()=>onStage(p.id,'call_pending')}>{p.nextReminderDate?'Reporter':'Planifier'}</button>{p.nextReminderDate&&<button className="vi-button vi-button-primary" onClick={()=>onComplete(p)}>Terminer</button>}</div>}</article>)}</div>}<Pagination page={reminders.current} total={reminderRows.length} size={20} onChange={setPage}/></>}
        {view==='activity' && <><p className="crm-muted">Activités conservées dans les dossiers CRM. Les journaux historiques sont limités à 80 événements et 100 notes par prospect.</p><ol className="crm-timeline">{activities.slice(activityPage*20,activityPage*20+20).map(e=><li key={e.prospect.firebaseUid+':'+e.id}><time>{crmDate(e.date)}</time><div><button onClick={()=>onOpen(e.prospect)}>{e.prospect.name}</button><strong>{e.label}</strong>{e.content&&<p>{e.content}</p>}</div></li>)}</ol><Pagination page={activityPage} total={activities.length} size={20} onChange={setPage}/></>}
      </>}
    </>}
  </div>;
}
