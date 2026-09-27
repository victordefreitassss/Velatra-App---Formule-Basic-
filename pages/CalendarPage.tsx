import React from 'react';
import type { AppState } from '../types';
import { MemberWorkoutEntry } from '../components/MemberWorkoutEntry';
import { SessionRows } from '../components/MemberTrainingProgress';
import { memberLogs } from '../components/workoutSession';

export const CalendarPage: React.FC<{state:AppState;setState:React.Dispatch<React.SetStateAction<AppState>>}>=({state,setState})=>{
 const user=state.user!,program=state.programs.find(p=>p.clubId===user.clubId&&Number(p.memberId)===Number(user.id)&&!p.isPlannedSession);
 const logs=memberLogs(state.logs,user);
 const bookings=state.bookings.filter(b=>Number(b.memberId)===Number(user.id)&&b.status==='confirmed'&&new Date(b.startTime)>new Date()).sort((a,b)=>a.startTime.localeCompare(b.startTime));
 return <div className="va-member-page"><header><h1>Mes séances</h1><p>Votre entraînement, au bon moment.</p></header>
  <MemberWorkoutEntry state={state} setState={setState} showProgramLink={false}/>
  <section><div className="va-member-section-heading"><h2>À venir</h2><button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'planning'}))}>Réserver →</button></div>
   {bookings.length?bookings.slice(0,2).map(b=><button key={b.id} className="va-member-file w-full text-left" onClick={()=>setState(p=>({...p,page:'planning'}))}><span><strong>{new Date(b.startTime).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'})}</strong><small>{new Date(b.startTime).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · Réservation confirmée</small></span><span aria-hidden="true">→</span></button>):<p className="text-sm text-zinc-700 leading-6">{program ? 'Aucun cours réservé. Votre programme reste accessible ci-dessus.' : 'Aucun cours réservé. Consultez le planning pour choisir un créneau.'}</p>}
  </section>
  {program&&<details className="va-member-disclosure"><summary>Mon programme · {program.name}</summary><p className="text-sm text-zinc-700 mb-3">{program.currentDayIndex} séances terminées{program.durationWeeks?` · ${program.durationWeeks} semaines`:' · programme continu'}.</p>{program.days.map((day,i)=><details key={i} className="va-member-session"><summary><span><strong>{day.name}</strong><small>{day.exercises.length} exercices{i===program.currentDayIndex%program.nbDays?' · prochaine séance':''}</small></span><span aria-hidden="true">⌄</span></summary><ul className="va-member-session-content">{day.exercises.map((entry,j)=><li key={j}><strong>{state.exercises.find(ex=>ex.id===entry.exId)?.name||'Exercice'}</strong><p>{entry.sets} séries · {entry.reps||entry.duration||'Selon consignes'}</p>{entry.notes&&<p>{entry.notes}</p>}</li>)}</ul></details>)}</details>}
  <section><div className="va-member-section-heading"><h2>Terminées</h2><button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'history'}))}>Historique →</button></div>{logs.length?<SessionRows state={state} logs={logs.slice(0,3)}/>:<p className="text-sm text-zinc-700 leading-6">Votre première séance enregistrée apparaîtra ici.</p>}</section>
 </div>;
};
