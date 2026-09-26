import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Dumbbell, Eye, EyeOff, UserRound } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import { ClubRegistration } from './ClubRegistration';
import { VelatraMascot } from './VelatraMascot';
import type { VelatraMascotState } from './VelatraMascot';
import {
  auth,
  db,
  doc,
  getDoc,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from '../firebase';

type LoginMode = 'login' | 'choose_account' | 'register' | 'club_register' | 'forgot_password';

const AppLogo = ({ inverse = false }: { inverse?: boolean }) => (
  <div className="flex items-center gap-3" aria-label="Velatra">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-[2px] sm:h-14 sm:w-14">
      <img
        className="h-full w-full object-contain"
        src="/brand/velatra-mark.png"
        alt=""
        width="56"
        height="56"
      />
    </span>
    <span className={`font-display text-[1.85rem] font-bold leading-none tracking-tight sm:text-4xl ${inverse ? 'text-white' : 'text-zinc-950'}`}>
      VELA<span className={inverse ? 'text-emerald-200' : 'text-emerald-800'}>TRA</span>
    </span>
  </div>
);

const getLoginErrorMessage = (error: any) => {
  const code = error?.code as string | undefined;
  if (code === 'auth/operation-not-allowed') return 'Le service de connexion est temporairement indisponible.';
  if (code === 'auth/user-disabled') return 'Ce compte n’est plus actif. Contactez votre coach.';
  if (code === 'auth/invalid-email') return 'Vérifiez le format de votre adresse email.';
  if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return 'Email ou mot de passe incorrect.';
  }
  return 'Impossible de se connecter pour le moment. Réessayez dans quelques instants.';
};

export const Login: React.FC<{ initialMode?: 'login' | 'choose_account' | 'register' | 'club_register' }> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mascotState, setMascotState] = useState<VelatraMascotState>('wave');

  React.useEffect(() => {
    if (mascotState === 'idle' || mascotState === 'thinking') return;
    const timer = window.setTimeout(() => setMascotState('idle'), 1300);
    return () => window.clearTimeout(timer);
  }, [mascotState]);

  const chooseMode = (nextMode: LoginMode) => {
    setError('');
    setSuccessMsg('');
    setMode(nextMode);
    setMascotState('idle');
  };

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !pwd) return;

    setLoading(true);
    setError('');
    setMascotState('thinking');
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        setError('Ce compte ne dispose plus d’un espace actif. Contactez votre coach.');
        setMascotState('error');
      } else {
        setMascotState('success');
      }
    } catch (authError: any) {
      console.error('Échec de la connexion Firebase.', { code: authError?.code || 'unknown' });
      setError(getLoginErrorMessage(authError));
      setMascotState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Saisissez l’adresse email associée à votre compte.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setMascotState('thinking');
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (resetError: any) {
      // Keep the response generic so the form does not reveal whether an email has an account.
      if (resetError?.code !== 'auth/user-not-found') {
        console.error('Échec de l’envoi du lien de réinitialisation.', { code: resetError?.code || 'unknown' });
        setError('Impossible d’envoyer le lien pour le moment. Vérifiez votre adresse et réessayez.');
        setMascotState('error');
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
    setSuccessMsg('Si cette adresse est associée à un compte, un lien de réinitialisation vient de vous être envoyé.');
    setMascotState('success');
  };

  if (mode === 'register') {
    return <RegistrationForm onRegister={() => chooseMode('login')} onCancel={() => chooseMode('choose_account')} />;
  }

  if (mode === 'club_register') {
    return <ClubRegistration onSuccess={() => chooseMode('login')} onCancel={() => chooseMode('choose_account')} />;
  }

  const isResetMode = mode === 'forgot_password';
  const isAccountChoice = mode === 'choose_account';

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center bg-[#f4f5ef] px-4 pb-8 pt-20 text-[#15241c] sm:px-6 sm:pb-12 sm:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#dce5db] sm:right-[8%] sm:top-[-9rem] sm:h-[30rem] sm:w-[30rem]" />
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-[#e3e9e0] sm:right-[11%] sm:top-[-6rem] sm:h-[24rem] sm:w-[24rem]" />
      </div>

      <Link
        to="/"
        className="group absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#34473b] transition hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b] focus-visible:ring-offset-2 sm:left-8 sm:top-6"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Retour au site
      </Link>

      <section className="relative z-[1] my-auto w-full max-w-[960px] overflow-hidden rounded-[28px] border border-[#dfe5dd] bg-white shadow-[0_28px_90px_-45px_rgba(19,48,34,0.32)] md:grid md:min-h-[570px] md:grid-cols-[0.88fr_1.12fr]" aria-labelledby="login-title">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#173f2e] p-10 text-white md:flex lg:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-60 w-60 rounded-full border border-white/10" />
          <div className="relative z-[1]"><AppLogo inverse /></div>
          <div className="relative z-[1] flex flex-col items-center pb-4 text-center">
            <VelatraMascot state={mascotState} size={190} interactive ariaLabel="Mascotte Velatra" autoWave={false} className="mb-2" />
            <p className="max-w-[19rem] font-display text-2xl font-semibold leading-tight tracking-tight text-white lg:text-[1.8rem]">
              Votre espace de coaching, simplement.
            </p>
            <p className="mt-3 max-w-[18rem] text-sm leading-6 text-[#e1ebe3]">
              Un espace dédié aux coachs et à leurs adhérents.
            </p>
          </div>
          <p className="relative z-[1] text-xs font-medium tracking-wide text-[#d4e2d7]">VELATRA · COACHING &amp; SUIVI</p>
        </aside>

        <div className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-10 md:px-10 lg:px-[4.25rem]">
          <div className="w-full max-w-[390px]">
            <div className="mb-5 flex items-center justify-between gap-3 md:hidden">
              <AppLogo />
              <VelatraMascot state={mascotState} size={90} interactive={false} ariaLabel="Mascotte Velatra" autoWave={false} />
            </div>

            <header className="mb-7">
              <h1 id="login-title" className="font-display text-[1.8rem] font-semibold leading-tight tracking-tight text-[#14251b] sm:text-[2.1rem]">
                {isAccountChoice ? 'Créer votre espace' : isResetMode ? 'Réinitialiser votre mot de passe' : 'Connexion à Velatra'}
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-[#48594e]">
                {isAccountChoice ? 'Choisissez votre profil pour continuer.' : isResetMode ? 'Entrez l’adresse email associée à votre compte.' : 'Retrouvez votre espace coach ou adhérent.'}
              </p>
            </header>

            {isAccountChoice ? (
              <div className="space-y-3" aria-label="Choisissez le type de compte à créer">
                <button
                  type="button"
                  onClick={() => chooseMode('club_register')}
                  className="group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-[#d5dfd5] bg-white p-4 text-left transition hover:border-[#789982] hover:bg-[#f8faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/20"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf1eb] text-[#205b3f]">
                    <Dumbbell aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-[#193425]">Je suis coach</span>
                    <span className="mt-1 block text-sm leading-5 text-[#4b5e51]">Gérez vos adhérents, vos programmes et votre activité.</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#486956] transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => chooseMode('register')}
                  className="group flex min-h-[92px] w-full items-center gap-4 rounded-2xl border border-[#d5dfd5] bg-white p-4 text-left transition hover:border-[#789982] hover:bg-[#f8faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/20"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf1eb] text-[#205b3f]">
                    <UserRound aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-[#193425]">Je suis adhérent</span>
                    <span className="mt-1 block text-sm leading-5 text-[#4b5e51]">Retrouvez vos séances, votre programme et votre suivi.</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-[#486956] transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => chooseMode('login')}
                  className="mt-2 min-h-11 rounded-lg px-2 text-sm font-semibold text-[#34473b] underline-offset-4 transition hover:text-[#153f2e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : <form onSubmit={isResetMode ? handleResetPassword : handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-semibold text-[#24392c]">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  className="min-h-[52px] w-full rounded-xl border border-[#bdc9be] bg-[#fbfcfa] px-4 text-base text-[#17271d] outline-none transition placeholder:text-[#66766b] hover:border-[#879d8c] focus:border-[#286b4b] focus:bg-white focus:ring-4 focus:ring-[#286b4b]/15 disabled:cursor-not-allowed disabled:bg-[#f0f2ef] disabled:text-[#47574c]"
                />
              </div>

              {!isResetMode && (
                <div className="space-y-2">
                  <div className="flex min-h-11 items-center justify-between gap-2">
                    <label htmlFor="login-password" className="text-sm font-semibold text-[#24392c]">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => chooseMode('forgot_password')}
                      className="min-h-11 rounded-lg px-1 text-sm font-semibold text-[#205b3f] underline-offset-4 transition hover:text-[#123c29] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      value={pwd}
                      onChange={event => setPwd(event.target.value)}
                      required
                      disabled={loading}
                      className="min-h-[52px] w-full rounded-xl border border-[#bdc9be] bg-[#fbfcfa] px-4 pr-14 text-base text-[#17271d] outline-none transition placeholder:text-[#66766b] hover:border-[#879d8c] focus:border-[#286b4b] focus:bg-white focus:ring-4 focus:ring-[#286b4b]/15 disabled:cursor-not-allowed disabled:bg-[#f0f2ef] disabled:text-[#47574c]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#405348] transition hover:bg-[#eef2ed] hover:text-[#15241c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-[#e8b9b4] bg-[#fff5f3] px-4 py-3 text-sm font-medium leading-5 text-[#842e27]">
                  {error}
                </p>
              )}
              {successMsg && (
                <p role="status" className="rounded-xl border border-[#b8d4c0] bg-[#eef7f0] px-4 py-3 text-sm font-medium leading-5 text-[#194b31]">
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#1d573c] px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(17,66,43,0.65)] transition hover:bg-[#16472f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/25 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#557461]"
              >
                {loading ? (isResetMode ? 'Envoi en cours…' : 'Connexion en cours…') : (isResetMode ? 'Envoyer le lien' : 'Se connecter')}
              </button>
            </form>}

            {isAccountChoice ? null : isResetMode ? (
              <div className="mt-6 border-t border-[#e0e6df] pt-4 text-center">
                <button
                  type="button"
                  onClick={() => chooseMode('login')}
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold text-[#34473b] underline-offset-4 transition hover:text-[#153f2e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : !isAccountChoice ? (
              <div className="mt-7 border-t border-[#e0e6df] pt-5 text-center">
                <p className="text-sm leading-6 text-[#48594e]">
                  Pas encore de compte ?{' '}
                  <button type="button" onClick={() => chooseMode('choose_account')} className="min-h-11 rounded-sm px-1 font-semibold text-[#205b3f] underline underline-offset-4 transition hover:text-[#123c29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]">
                    Créer un compte
                  </button>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
};
