import React from 'react';
import type { AppState } from '../types';
import { MemberWorkoutEntry } from '../components/MemberWorkoutEntry';
import { SessionRows } from '../components/MemberTrainingProgress';
import { memberLogs } from '../components/workoutSession';

export const CalendarPage: React.FC<{ state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }> = ({ state, setState }) => {
  const user = state.user!;
  const program = state.programs.find(item => item.clubId === user.clubId && Number(item.memberId) === Number(user.id) && !item.isPlannedSession);
  const logs = memberLogs(state.logs, user);
  const bookings = state.bookings.filter(item => Number(item.memberId) === Number(user.id) && item.status === 'confirmed' && new Date(item.startTime).getTime() > Date.now()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const sessionTypes = state.currentClub?.settings?.booking?.sessionTypes || [];
  const canBook = state.currentClub?.settings?.booking?.enabled !== false;
  return <div className="va-member-page">
    <header><h1>Mes séances</h1><p>Votre entraînement, votre programme et vos réservations.</p></header>
    <MemberWorkoutEntry state={state} setState={setState} showProgramLink={false} />
    <section aria-labelledby="upcoming-bookings-title"><div className="va-member-section-heading"><h2 id="upcoming-bookings-title">À venir</h2>{canBook && <button type="button" className="va-member-text-link" onClick={() => setState(previous => ({ ...previous, page: 'planning' }))}>Réserver une séance →</button>}</div>
      {bookings.length ? bookings.slice(0, 3).map(booking => {
        const coach = state.users.find(item => item.firebaseUid === booking.coachId || String(item.id) === booking.coachId);
        const type = sessionTypes.find(item => item.id === booking.sessionTypeId)?.name || (booking.type === 'trial' ? 'Séance d’essai' : 'Coaching');
        return <button type="button" key={booking.id} className="va-member-file w-full text-left" onClick={() => setState(previous => ({ ...previous, page: 'planning' }))}><span><strong>{type} · {new Date(booking.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</strong><small>{new Date(booking.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{coach?.name ? ` · ${coach.name}` : ''} · Confirmée</small></span><span aria-hidden="true">→</span></button>;
      }) : <p className="va-member-muted">{canBook ? 'Aucune réservation à venir. Consultez le planning pour choisir un créneau disponible.' : 'Les réservations sont momentanément indisponibles.'}</p>}
      {bookings.length > 3 && <button type="button" className="va-member-text-link" onClick={() => setState(previous => ({ ...previous, page: 'planning' }))}>Voir toutes mes réservations →</button>}
    </section>
    {program && <section aria-labelledby="member-program-title"><div className="va-member-section-heading"><h2 id="member-program-title">Mon programme</h2><span className="va-member-muted">{program.durationWeeks ? `${program.durationWeeks} semaines` : 'Programme continu'}</span></div><p className="va-member-muted">{program.name} · {program.days.length} séance{program.days.length === 1 ? '' : 's'} · {program.currentDayIndex} terminée{program.currentDayIndex === 1 ? '' : 's'}</p>
      {program.days.map((day, index) => <details key={index} className="va-member-session"><summary><span><strong>{day.name}</strong><small>{day.exercises.length} exercices{index === program.currentDayIndex % Math.max(program.days.length, 1) ? ' · prochaine séance' : ''}</small></span><span aria-hidden="true">⌄</span></summary><ul className="va-member-session-content">{day.exercises.map((entry, exerciseIndex) => <li key={exerciseIndex}><strong>{state.exercises.find(exercise => exercise.id === entry.exId)?.name || `Exercice du programme · ${entry.exId}`}</strong><p>{entry.sets} séries · {entry.reps || entry.duration || 'Selon consignes'}{entry.rest ? ` · repos ${entry.rest}` : ''}{entry.targetRpe ? ` · RPE cible ${entry.targetRpe}` : ''}</p>{entry.notes && <p>{entry.notes}</p>}</li>)}</ul></details>)}
    </section>}
    <section aria-labelledby="completed-sessions-title"><div className="va-member-section-heading"><h2 id="completed-sessions-title">Historique</h2><button type="button" className="va-member-text-link" onClick={() => setState(previous => ({ ...previous, page: 'history' }))}>Tout voir →</button></div>{logs.length ? <SessionRows state={state} logs={logs.slice(0, 3)} /> : <p className="va-member-muted">Votre première séance enregistrée apparaîtra ici.</p>}</section>
  </div>;
};
