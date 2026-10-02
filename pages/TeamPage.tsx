import React, { useState } from 'react';
import type { AppState, User } from '../types';
import { Card, Button, Input } from '../components/UI';
import { apiFetch, auth, db, doc, updateDoc } from '../firebase';
import { canShowStaffCreation } from '../productCapabilities';
import { authorizationActor, canManageTeam, canProvisionManager } from '../server/authorization';
import { TeamWorkspace } from '../team/TeamWorkspace';

type TeamPageProps = { state: AppState; setState?: React.Dispatch<React.SetStateAction<AppState>>; showToast: (message: string, type?: 'success' | 'error') => void };
export function TeamPage({state,setState=()=>{},showToast}:TeamPageProps) {
  if(state.currentClub?.accountType==='studio')return <TeamWorkspace state={state} setState={setState} showToast={showToast} staffPanel={<StaffAdministration state={state} showToast={showToast} embedded/>}/>;
  return <StaffAdministration state={state} showToast={showToast}/>;
}
function StaffAdministration({ state, showToast, embedded=false }: TeamPageProps & {embedded?:boolean}) {
  const actor = authorizationActor(state.user, state.currentClub, auth.currentUser?.emailVerified === true && auth.currentUser?.email === 'victor.defreitas.pro@gmail.com');
  const allowed = canManageTeam(actor, state.currentClub?.id);
  const canCreateManager = canProvisionManager(actor, state.currentClub?.id);
  const canCreate = canShowStaffCreation(state.currentClub, { ...state.user, trustedSuperAdmin: actor.trustedSuperAdmin });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'coach' | 'manager'>('coach');
  const [busy, setBusy] = useState(false);
  const collaborators = state.users.filter(user => user.clubId === state.currentClub?.id && (embedded ? ['owner','manager'] : ['owner', 'manager', 'coach']).includes(user.role));
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!allowed || !canCreate || !state.currentClub || busy) return;
    setBusy(true);
    try {
      const response = await apiFetch(canCreateManager && staffRole === 'manager' ? '/api/create-manager' : '/api/create-staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, clubId: state.currentClub.id }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Création impossible.');
      setName(''); setEmail(''); setPassword('');
      showToast('Collaborateur créé. Il peut se connecter avec ces identifiants.', 'success');
    } catch (error: any) { showToast(error.message, 'error'); }
    finally { setBusy(false); }
  }
  async function toggleSuspension(user: User) {
    if (!allowed || !user.firebaseUid || user.role === 'owner' || user.firebaseUid === state.user?.firebaseUid ||
        (state.user?.role === 'manager' && user.role !== 'coach')) return;
    try { await updateDoc(doc(db, 'users', user.firebaseUid), { isSuspended: user.isSuspended !== true }); }
    catch (error: any) { showToast(error.message, 'error'); }
  }
  if (!allowed) return <p role="alert">Cet espace équipe n’est pas accessible.</p>;
  return <div className="space-y-6 pb-20">
    {!embedded && <h1 className="text-2xl font-semibold">Équipe du Studio</h1>}
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">{embedded?'Direction et accès':'Collaborateurs'}</h2>
      <ul className="space-y-3">{collaborators.map(user => <li key={user.firebaseUid || user.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <span className="min-w-0 break-words"><strong>{user.name}</strong> · {user.role === 'owner' ? 'Owner' : user.role === 'manager' ? 'Manager' : 'Coach'}{user.isSuspended && ' · Suspendu'}</span>
        {user.role !== 'owner' && user.firebaseUid !== state.user?.firebaseUid && (state.user?.role === 'owner' || user.role === 'coach') && <Button variant="secondary" onClick={() => toggleSuspension(user)}>{user.isSuspended ? 'Réactiver' : 'Suspendre'}</Button>}
      </li>)}</ul>
    </Card>
    {canCreate && <Card className="max-w-xl space-y-4 p-5"><h2 className="text-lg font-semibold">Ajouter un collaborateur</h2>
      <form onSubmit={create} className="space-y-4">
        <label className="block">Rôle<select aria-label="Rôle du collaborateur" className="mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white p-3" value={canCreateManager ? staffRole : 'coach'} onChange={event => setStaffRole(event.target.value as 'coach' | 'manager')}><option value="coach">Coach</option>{canCreateManager && <option value="manager">Manager</option>}</select></label>
        <label className="block">Nom<Input value={name} onChange={event => setName(event.target.value)} required /></label>
        <label className="block">Email<Input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="block">Mot de passe temporaire<Input type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} required /></label>
        <Button type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le collaborateur'}</Button>
      </form>
    </Card>}
  </div>;
}
