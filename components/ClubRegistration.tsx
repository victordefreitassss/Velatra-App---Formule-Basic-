import React, { useRef, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { apiFetch, auth, createUserWithEmailAndPassword, db, doc, getDocFromServer } from '../firebase';
import { trackProductEventOnce } from './productEvents';
import { AuthBack, AuthField, AuthHeading, AuthSubmit, GoogleButton } from './auth/AuthLayout';
import { authErrorMessage, registrationErrorMessage } from './auth/authErrors';

interface ClubRegistrationProps {
  accountType: 'solo' | 'studio';
  identity: FirebaseUser | null;
  onSuccess: () => void;
  onCancel: () => void;
  onGoogle: () => void;
  googleBusy: boolean;
  disabled: boolean;
}

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({ accountType, identity, onSuccess, onCancel, onGoogle, googleBusy, disabled }) => {
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [clubName, setClubName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [created, setCreated] = useState(false);
  const googleName = identity?.providerData?.some(p => p.providerId === 'google.com') ? identity.displayName?.trim() : '';
  const locked = loading || disabled;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || disabled) return;
    if (!identity && password !== confirmation) { setError('Les mots de passe ne correspondent pas.'); return; }
    const ownerName = googleName || `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!ownerName || !inviteCode.trim() || accountType === 'studio' && !clubName.trim()) { setError('Veuillez remplir les champs demandés.'); return; }
    inFlight.current = true; setLoading(true); setError('');
    try {
      // Recover a previously created Auth identity after a failed invite/server request.
      let user = auth.currentUser;
      if (user && user.uid !== identity?.uid && user.email?.toLowerCase() !== email.trim().toLowerCase()) {
        setError('Un autre compte est connecté. Revenez au choix du compte pour vous déconnecter.'); return;
      }
      if (!user) user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
      const existing = await getDocFromServer(doc(db, 'users', user.uid));
      if (existing.exists()) { setError(registrationErrorMessage(409)); return; }
      // Same protected endpoint and invitation gate. No role, plan or entitlement in this payload.
      const response = await apiFetch('/api/register-club', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType, ownerName, clubName: accountType === 'solo' ? ownerName : clubName.trim(), inviteCode: inviteCode.trim() })
      });
      if (!response.ok) { setError(registrationErrorMessage(response.status)); return; }
      trackProductEventOnce('coach_signup_completed', user.uid);
      setCreated(true);
    } catch (err) { setError(authErrorMessage(err)); }
    finally { inFlight.current = false; setLoading(false); }
  };
  if (created) return <><AuthHeading title="Votre espace est prêt">Bienvenue dans Velatra. Retrouvez maintenant votre parcours de démarrage.</AuthHeading><button className="va-auth-submit" type="button" onClick={onSuccess}>Accéder à mon espace</button></>;
  return <>
    <AuthBack onClick={onCancel} disabled={locked}>Changer de type de compte</AuthBack>
    <AuthHeading title={identity ? 'Finaliser mon inscription' : 'Créer votre espace Velatra'}>{accountType === 'solo' ? 'Votre quotidien de coach, dans un seul espace.' : 'Un espace pour votre salle, votre équipe et vos membres.'}</AuthHeading>
    <p className="va-auth-account-label">{accountType === 'solo' ? 'Coach indépendant' : 'Salle ou Studio'}</p>
    {identity && <p className="va-auth-identity">{googleName && <strong>{googleName}<br /></strong>}{identity.email}</p>}
    <form className="va-auth-form" onSubmit={submit}>
      {!googleName && <div className="va-auth-name-grid">
        <AuthField id="signup-first-name" label="Prénom" autoComplete="given-name" maxLength={90} value={firstName} onChange={e => setFirstName(e.target.value)} required disabled={locked} />
        <AuthField id="signup-last-name" label="Nom" autoComplete="family-name" maxLength={90} value={lastName} onChange={e => setLastName(e.target.value)} required disabled={locked} />
      </div>}
      {accountType === 'studio' && <AuthField id="signup-studio" label="Nom de la salle ou du studio" autoComplete="organization" maxLength={200} value={clubName} onChange={e => setClubName(e.target.value)} required disabled={locked} />}
      {!identity && <>
        <AuthField id="signup-email" label="Adresse e-mail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={locked} />
        <AuthField id="signup-password" label="Mot de passe" type="password" autoComplete="new-password" minLength={6} placeholder="6 caractères minimum" value={password} onChange={e => setPassword(e.target.value)} required disabled={locked} />
        <AuthField id="signup-confirmation" label="Confirmer le mot de passe" type="password" autoComplete="new-password" minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} required disabled={locked} />
      </>}
      <AuthField id="signup-invite" label="Code d’invitation bêta" autoComplete="off" aria-describedby="invite-help" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required disabled={locked} />
      <p id="invite-help" className="va-auth-help">L’accès à la bêta nécessite le code transmis par l’équipe Velatra.</p>
      {error && <p className="va-auth-error" role="alert">{error}</p>}
      <AuthSubmit busy={loading} disabled={locked}>{loading ? 'Création en cours…' : 'Créer mon espace'}</AuthSubmit>
    </form>
    {!identity && <><div className="va-auth-divider">Ou continuer avec</div><GoogleButton onClick={onGoogle} busy={googleBusy} disabled={locked} /></>}
  </>;
};
