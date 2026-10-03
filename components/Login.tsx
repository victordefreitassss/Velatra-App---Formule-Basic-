import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { ArrowRight, Check, Dumbbell, Building2 } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import { ClubRegistration } from './ClubRegistration';
import { AuthBack, AuthField, AuthHeading, AuthLayout, AuthSubmit, GoogleButton } from './auth/AuthLayout';
import { authErrorMessage, resetSuccessMessage } from './auth/authErrors';
import { auth, db, doc, getDocFromServer, signOut, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, googleProvider, onAuthStateChanged } from '../firebase';

type LoginMode = 'login' | 'choose_account' | 'register' | 'club_register' | 'forgot_password';
type Busy = '' | 'email' | 'google' | 'reset';

export const Login: React.FC<{ initialMode?: LoginMode; sessionError?: string }> = ({ initialMode = 'login', sessionError = '' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const modeRef = useRef(mode); modeRef.current = mode;
  const [accountType, setAccountType] = useState<'solo' | 'studio'>('solo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [identity, setIdentity] = useState<FirebaseUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [profileReadFailed, setProfileReadFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => { setMode(initialMode); setError(''); setSuccess(''); }, [initialMode]);
  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      setChecking(true); setProfileReadFailed(false); setIdentity(null);
      if (!user) { setChecking(false); return; }
      try {
        // Read authoritative profile existence, never infer tenant or role from Google.
        const profile = await getDocFromServer(doc(db, 'users', user.uid));
        if (current !== generation || auth.currentUser?.uid !== user.uid) return;
        if (!profile.exists()) {
          setIdentity(user);
          if (modeRef.current === 'login') { setMode('choose_account'); navigate('/register', { replace: true }); }
        }
      } catch {
        if (current !== generation) return;
        setProfileReadFailed(true);
        setError('Impossible de vérifier votre espace. Vérifiez votre connexion et réessayez.');
      } finally { if (current === generation) setChecking(false); }
    });
    return () => { ++generation; unsubscribe(); };
  }, [navigate, retry]);

  const run = async (kind: Busy, action: () => Promise<void>) => {
    if (inFlight.current || checking) return;
    inFlight.current = true; setBusy(kind); setError(''); setSuccess('');
    try { await action(); } catch (err) { setError(authErrorMessage(err)); }
    finally { inFlight.current = false; setBusy(''); }
  };
  const google = () => run('google', async () => { await signInWithPopup(auth, googleProvider); });
  const disabled = !!busy || checking || profileReadFailed;
  const choose = (type: 'solo' | 'studio') => { setAccountType(type); setMode('club_register'); setError(''); };
  const login = () => { setMode('login'); setError(''); setSuccess(''); navigate('/login'); };
  const errorMessage = error || sessionError;
  const notice = <>{errorMessage && <p className="va-auth-error" role="alert">{errorMessage}</p>}{success && <p className="va-auth-success" role="status"><Check size={20} aria-hidden="true" />{success}</p>}{profileReadFailed && <button className="va-auth-link" onClick={() => setRetry(v => v + 1)}>Réessayer la vérification</button>}</>;

  // The existing invitation-only member flow is preserved, outside public account types.
  if (mode === 'register') return <RegistrationForm onRegister={login} onCancel={() => setMode('choose_account')} />;
  if (mode === 'club_register') return <AuthLayout><ClubRegistration accountType={accountType} identity={identity} onSuccess={login} onCancel={() => setMode('choose_account')} onGoogle={google} googleBusy={busy === 'google'} disabled={disabled} />{notice}</AuthLayout>;

  return <AuthLayout>
    {mode === 'choose_account' ? <>
      <AuthHeading title={identity ? 'Finaliser mon inscription' : 'Créer votre espace Velatra'}>Commencez par choisir l’expérience adaptée à votre activité.</AuthHeading>
      {identity && <p className="va-auth-identity">Connecté avec <strong>{identity.email}</strong></p>}
      <div className="va-auth-choices">
        {([['solo', Dumbbell, 'Coach indépendant', 'Gérez vos clients, votre coaching et le développement de votre activité depuis un seul espace.', ['Clients', 'Coaching', 'Planning', 'Prospects'], 'Je suis coach indépendant'], ['studio', Building2, 'Salle ou Studio', 'Pilotez vos membres, votre équipe et la croissance de votre établissement.', ['Membres', 'Équipe', 'Planning', 'Prospects'], 'Je gère une salle ou un studio']] as const).map(([type, Icon, title, description, tags, cta]) => <button type="button" className="va-auth-choice" aria-label={cta} key={type} onClick={() => choose(type)} disabled={disabled}>
          <span className="va-auth-choice-title"><span className="va-auth-choice-icon"><Icon size={23} aria-hidden="true" /></span><strong>{title}</strong><ArrowRight size={19} aria-hidden="true" /></span>
          <span className="va-auth-choice-description">{description}</span>
          <span className="va-auth-choice-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</span><span className="va-auth-choice-cta">{cta}</span>
        </button>)}
      </div>
      {notice}
      {!identity && <><div className="va-auth-divider">Ou continuer avec</div><GoogleButton onClick={google} busy={busy === 'google'} disabled={disabled} /></>}
      <div className="va-auth-footer">{identity ? <button type="button" className="va-auth-link" disabled={disabled} onClick={() => run('email', async () => { await signOut(auth); login(); })}>Utiliser un autre compte</button> : <Link to="/login">Déjà un compte ? Se connecter</Link>}</div>
      {!identity && <div className="va-auth-invitation"><span>Vous avez un code d’invitation adhérent ?</span><button type="button" className="va-auth-link" onClick={() => setMode('register')} disabled={disabled}>Rejoindre mon coach</button></div>}
    </> : mode === 'forgot_password' ? <>
      <AuthBack onClick={login} disabled={!!busy} />
      <AuthHeading title="Réinitialiser votre mot de passe">Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</AuthHeading>
      <form className="va-auth-form" onSubmit={event => { event.preventDefault(); void run('reset', async () => {
        try { await sendPasswordResetEmail(auth, email.trim()); } catch (err) { if ((err as { code?: string }).code !== 'auth/user-not-found') throw err; }
        setSuccess(resetSuccessMessage);
      }); }}>
        <AuthField id="reset-email" label="Adresse e-mail" type="email" autoComplete="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={disabled} />
        {notice}<AuthSubmit busy={!!busy || checking} disabled={disabled}>{busy ? 'Envoi en cours…' : 'Recevoir le lien'}</AuthSubmit>
      </form>
    </> : <>
      <AuthHeading title="Connexion à Velatra">Retrouvez votre espace et continuez à faire bouger les choses.</AuthHeading>
      <form className="va-auth-form" onSubmit={event => { event.preventDefault(); void run('email', async () => { await signInWithEmailAndPassword(auth, email.trim(), password); }); }}>
        <AuthField id="login-email" label="Adresse e-mail" type="email" autoComplete="email" inputMode="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={disabled} />
        <AuthField id="login-password" label="Mot de passe" type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} required disabled={disabled} />
        <Link className="va-auth-forgot" to="/forgot-password" aria-disabled={!!busy} onClick={event => { if (busy) event.preventDefault(); }}>Mot de passe oublié ?</Link>
        {notice}<AuthSubmit busy={!!busy || checking} disabled={disabled}>{busy === 'email' ? 'Connexion en cours…' : 'Se connecter'}</AuthSubmit>
      </form>
      <div className="va-auth-divider">Ou continuer avec</div><GoogleButton onClick={google} busy={busy === 'google'} disabled={disabled} />
      <p className="va-auth-footer">Pas encore de compte ? <Link to="/register" aria-disabled={!!busy} onClick={event => { if (busy) event.preventDefault(); }}>Créer un compte</Link></p>
    </>}
  </AuthLayout>;
};
