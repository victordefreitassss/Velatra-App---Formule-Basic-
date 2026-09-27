import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { AppState, SessionLog } from '../types';
import { formatSet, memberLogs, isBodyweightExercise, comparableLoadGain, displayNumber } from './workoutSession';

export const sessionSeries = (log: SessionLog) => log.exercises?.reduce((total, exercise) => total + exercise.sets.length, 0) || 0;
export const SessionRows: React.FC<{state: AppState; logs: SessionLog[]}> = ({state, logs}) => <div className="va-member-timeline">{logs.map(log => <details key={log.id} className="va-member-session">
  <summary><span><small>{new Date(log.date).toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</small><strong>{log.dayName || 'Séance enregistrée'}</strong><small>{sessionSeries(log)} séries{log.duration ? ` · ${Math.floor(log.duration / 60)} min ${Math.round(log.duration % 60)} s` : ''}</small></span><ChevronDown aria-hidden="true" /></summary>
  <div className="va-member-session-content">{log.exercises?.map((exercise,index) => <div key={`${exercise.exId}-${index}`}><h3>{exercise.name}</h3><ul>{exercise.sets.map((set,setIndex) => <li key={setIndex}>Série {setIndex+1} · {formatSet(set,isBodyweightExercise(state.exercises.find(item=>item.id===exercise.exId)),!!set.duration && /^\d+(?:[.,]\d+)? s$/.test(set.duration) && state.exercises.find(item=>item.id===exercise.exId)?.cat !== 'Cardio')}</li>)}</ul></div>)}{!log.exercises?.length && <p>Le détail de cette ancienne séance n’est pas disponible.</p>}</div>
</details>)}</div>;

export const MemberTrainingProgress: React.FC<{state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; compact?: boolean}> = ({state,setState,compact=false}) => {
  const user=state.user!, logs=memberLogs(state.logs,user);
  const from=new Date();from.setDate(from.getDate()-6);from.setHours(0,0,0,0);
  const recent=logs.filter(log=>new Date(`${log.date.slice(0,10)}T12:00:00`)>=from);
  const activeDays=new Set(recent.map(log=>log.date.slice(0,10))).size;
  const compared=new Set<number>();
  const comparisons=logs.flatMap(log=>(log.exercises||[]).flatMap(ex=>{
    if(compared.has(ex.exId))return [];compared.add(ex.exId);
    const references=logs.filter(item=>item.exercises?.some(e=>e.exId===ex.exId));
    const prior=references[1]?.exercises?.find(e=>e.exId===ex.exId);
    if(!prior?.sets.length||!ex.sets.length)return [];
    const definition=state.exercises.find(e=>e.id===ex.exId),timed=ex.sets.some(s=>!!s.duration),bodyweight=isBodyweightExercise(definition);
    const gain=comparableLoadGain(ex.sets,prior.sets,timed,definition?.cat==='Cardio');
    return [{ex,prior,gain,bodyweight,timed:timed&&definition?.cat!=='Cardio',date:log.date,previousDate:references[1].date}];
  })).slice(0,4);
  return <section aria-labelledby={compact?'home-training-progress':'training-progress'} className="va-member-progress">
    <div className="va-member-section-heading"><h2 id={compact?'home-training-progress':'training-progress'}>{compact?'Vos 7 derniers jours':'Votre régularité'}</h2>{compact&&<button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'performances'}))}>Voir ma progression <span aria-hidden="true">→</span></button>}</div>
    {logs.length?<>
      <dl className="va-member-metrics"><div><dd>{recent.length}</dd><dt>séances sur 7 jours</dt></div><div><dd>{activeDays}</dd><dt>jours d’entraînement</dt></div><div><dd>{recent.reduce((sum,log)=>sum+sessionSeries(log),0)}</dd><dt>séries réalisées</dt></div></dl>
      {!compact&&comparisons.length>0&&<div className="va-member-comparisons space-y-3"><h2>Vos repères par exercice</h2>{comparisons.map(({ex,prior,gain,bodyweight,timed,date,previousDate})=><article key={ex.exId} className="va-member-comparison"><h3>{ex.name}</h3><dl><div><dt>Précédente · {new Date(previousDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</dt><dd>{formatSet(prior.sets[0],bodyweight,timed)}</dd></div><div><dt>Dernière · {new Date(date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</dt><dd>{formatSet(ex.sets[0],bodyweight,timed)}</dd></div></dl><p>{gain!==null?`Meilleure charge : +${displayNumber(gain)} kg à répétitions égales.`:'Première série de chaque séance · comparez avec votre coach.'}</p></article>)}</div>}
      {!compact&&<section className="va-member-coach-row"><div><p className="text-sm text-zinc-700">Votre objectif</p><strong>{user.objectifs?.[0]||'À définir avec votre coach'}</strong></div><button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'profile'}))}>Voir mes objectifs →</button></section>}
      {!compact&&<div><div className="va-member-section-heading"><h2>Dernières séances</h2><button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'history'}))}>Tout voir →</button></div><SessionRows state={state} logs={logs.slice(0,3)}/></div>}
    </>:<div className="va-member-empty"><p>Vos séances et vos progrès apparaîtront ici après votre premier entraînement enregistré.</p><button className="va-member-primary" onClick={()=>setState(p=>({...p,page:'calendar'}))}>Aller à mes séances</button></div>}
  </section>;
};
