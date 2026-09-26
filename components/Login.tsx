import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Card, Input, Button } from './UI';
import { RegistrationForm } from './RegistrationForm';
import { ClubRegistration } from './ClubRegistration';
import { DiscoverySessionForm } from './DiscoverySessionForm';
import { VelatraMascot, type VelatraMascotState } from './VelatraMascot';
import {
  auth,
  db,
  doc,
  getDoc,
  signOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from '../firebase';

type LoginMode = 'login' | 'register' | 'club_register' | 'forgot_password' | 'discovery';

const AppLogo = () => (
  <div className="flex items-center justify-center gap-3 lg:justify-start" aria-label="Velatra">
    <img
      className="h-12 w-12 rounded-xl object-contain sm:h-14 sm:w-14"
      src="/brand/velatra-mark.png"
      alt=""
      width="56"
      height="56"
    />
    <span className="font-display text-[1.85rem] font-bold leading-none tracking-tight text-zinc-900 sm:text-4xl">
      VELA<span className="text-emerald-700">TRA</span>
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

export const Login: React.FC<{ initialMode?: 'login' | 'register' | 'club_register' }> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mascotState = useMemo<VelatraMascotState>(() => {
    if (loading) return 'thinking';
    if (error) return 'error';
    if (successMsg) return 'success';
    return 'idle';
  }, [loading, error, successMsg]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !pwd) return;

    setLoading(true);
    setError('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        setError('Ce compte ne dispose plus d’un espace actif. Contactez votre coach.');
      }
    } catch (authError: any) {
      console.error('Échec de la connexion Firebase.', { code: authError?.code || 'unknown' });
      setError(getLoginErrorMessage(authError));
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
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (resetError: any) {
      if (resetError?.code !== 'auth/user-not-found') {
        console.error('Échec de l’envoi du lien de réinitialisation.', { code: resetError?.code || 'unknown' });
        setError('Impossible d’envoyer le lien pour le moment. Vérifiez votre adresse et réessayez.');
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
    setSuccessMsg('Si cette adresse est associée à un compte, un lien de réinitialisation vient de vous être envoyé.');
  };

  if (mode === 'register') {
    return <RegistrationForm onRegister={() => setMode('login')} onCancel={() => setMode('login')} />;
  }

  if (mode === 'discovery') {
    return <DiscoverySessionForm onSuccess={() => setMode('login')} onCancel={() => setMode('login')} />;
  }

  if (mode === 'club_register') {
    return <ClubRegistration onSuccess={() => setMode('login')} onCancel={() => setMode('login')} />;
  }

  const isResetMode = mode === 'forgot_password';
  const clearMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#f6f7f2] px-4 py-24 text-zinc-900 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(29,111,78,0.08),transparent_58%)]" />

      <Link
        to="/"
        className="group absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 text-sm font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:left-8"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 text-emerald-800 transition-transform group-hover:-translate-x-0.5" />
        Retour au site
      </Link>

      <section className="relative z-[1] grid w-full max-w-[980px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12" aria-labelledby="login-title">
        <aside className="order-2 hidden min-h-[520px] items-center justify-center lg:order-1 lg:flex" aria-label="Assistant Velatra">
          <div className="relative flex max-w-[430px] flex-col items-center text-center">
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-20 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-900/[0.06] blur-3xl" />
            <VelatraMascot state={mascotState} autoWave={!isResetMode} size={300} className="relative z-10" />
            <div className="relative z-10 -mt-4 max-w-[320px] rounded-2xl border border-white/95 bg-white/65 px-5 py-4 text-sm leading-6 text-zinc-700 shadow-sm backdrop-blur-xl">
              {mascotState === 'thinking' && (isResetMode ? 'J’envoie votre lien de réinitialisation…' : 'Connexion en cours…')}
              {mascotState === 'error' && 'Vérifiez les informations indiquées puis réessayez.'}
              {mascotState === 'success' && 'C’est envoyé. Consultez votre boîte mail.'}
              {mascotState === 'idle' && (isResetMode ? 'On remet votre accès en ordre.' : 'Votre espace Velatra vous attend.')}
            </div>
          </div>
        </aside>

        <div className="order-1 mx-auto w-full max-w-[420px] lg:order-2">
          <header className="mb-6 text-center lg:text-left sm:mb-8">
            <AppLogo />
            <div className="mx-auto mt-5 flex justify-center lg:hidden" aria-hidden="true">
              <VelatraMascot state={mascotState} autoWave={!isResetMode} size={108} interactive={false} />
            </div>
            <h1 id="login-title" className="mt-5 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-zinc-950 sm:text-4xl lg:mt-8">
              {isResetMode ? 'Réinitialiser votre mot de passe' : 'Connexion à Velatra'}
            </h1>
            <p className="mx-auto mt-3 max-w-[34ch] text-sm leading-6 text-zinc-700 sm:text-base lg:mx-0">
              {isResetMode ? 'Entrez l’adresse email associée à votre compte.' : 'Retrouvez votre espace coach ou adhérent.'}
            </p>
          </header>

          <Card className="!rounded-3xl !border !border-white/90 !bg-white/90 !p-6 shadow-[0_18px_55px_-32px_rgba(18,47,35,0.38)] backdrop-blur-xl sm:!p-8">
            <form onSubmit={isResetMode ? handleResetPassword : handleEmailLogin} className="space-y-5" noValidate={false}>
              <div className="space-y-2">
                <label htmlFor="login-email" className="block text-sm font-medium text-zinc-800">Email</label>
                <Input
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
                  className="!min-h-12 !rounded-xl !border-zinc-300 !bg-white !px-4 !text-base placeholder:!text-zinc-500 focus:!border-emerald-700 focus:!ring-emerald-700/15"
                />
              </div>

              {!isResetMode && (
                <div className="space-y-2">
                  <div className="flex min-h-11 items-center justify-between gap-3">
                    <label htmlFor="login-password" className="text-sm font-medium text-zinc-800">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot_password'); clearMessages(); }}
                      className="min-h-11 rounded-lg px-2 text-sm font-medium text-emerald-800 underline-offset-4 transition hover:text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Votre mot de passe"
                      value={pwd}
                      onChange={event => setPwd(event.target.value)}
                      required
                      disabled={loading}
                      className="!min-h-12 !rounded-xl !border-zinc-300 !bg-white !px-4 !pr-14 !text-base placeholder:!text-zinc-500 focus:!border-emerald-700 focus:!ring-emerald-700/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-900">
                  {error}
                </p>
              )}
              {successMsg && (
                <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-950">
                  {successMsg}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="!min-h-12 !rounded-xl !bg-emerald-800 !text-sm !font-semibold !text-white hover:!bg-emerald-900 focus-visible:!outline-none focus-visible:!ring-2 focus-visible:!ring-emerald-800 focus-visible:!ring-offset-2 disabled:!opacity-60"
              >
                {loading ? (isResetMode ? 'Envoi en cours…' : 'Connexion en cours…') : (isResetMode ? 'Envoyer le lien' : 'Se connecter')}
              </Button>
            </form>

            {isResetMode ? (
              <div className="mt-5 border-t border-zinc-200 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); clearMessages(); }}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-700 underline-offset-4 transition hover:text-zinc-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <div className="mt-6 border-t border-zinc-200 pt-5 text-center">
                <p className="text-sm text-zinc-700">
                  Vous découvrez Velatra ?{' '}
                  <Link to="/" className="font-semibold text-emerald-800 underline underline-offset-4 transition hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                    Découvrir Velatra
                  </Link>
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
};