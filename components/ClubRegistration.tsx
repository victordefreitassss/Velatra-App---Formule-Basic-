import React, { useState } from 'react';
import { ArrowLeft, Check, Info, UserRound, Users } from 'lucide-react';
import { Button, Input } from './UI';
import { apiFetch, auth, createUserWithEmailAndPassword } from '../firebase';

interface ClubRegistrationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const labelClass = 'mb-2 block text-sm font-semibold text-[#24392c]';
const inputClass = '!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15';

const BrandMark = () => (
  <div className="flex items-center gap-3" aria-label="Velatra">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#dfe5dd] md:h-12 md:w-12">
      <img src="/brand/velatra-mark.png" alt="" width="48" height="48" className="h-full w-full object-contain" />
    </span>
    <span className="font-display text-2xl font-bold leading-none tracking-tight text-[#14251b] md:text-white">
      VELA<span className="text-[#286b4b] md:text-emerald-200">TRA</span>
    </span>
  </div>
);

export const ClubRegistration: React.FC<ClubRegistrationProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<'coach' | 'club'>('coach');
  const [showBetaInfo, setShowBetaInfo] = useState(false);
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdClubId, setCreatedClubId] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clubName.trim() || !email.trim() || !password || !ownerName.trim() || !inviteCode.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Keep the new session if server-side invitation validation fails so the
      // user can correct the code and retry without creating an orphan account.
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email?.toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error('Un autre compte est déjà connecté. Déconnectez-vous avant de créer cet espace.');
      }
      if (!currentUser) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      }

      // The server assigns roles and creates both records after verifying this session.
      const response = await apiFetch('/api/register-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubName: clubName.trim(), ownerName: ownerName.trim(), accountType, inviteCode: inviteCode.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'La création de l’espace a échoué.');
      setCreatedClubId(result.clubId);
    } catch (registrationError: any) {
      console.error('Registration Error:', registrationError);
      if (registrationError.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée par un autre compte.');
      } else {
        setError(registrationError.message || 'Une erreur est survenue lors de l’inscription.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isCoach = accountType === 'coach';
  const spaceName = isCoach ? 'Espace coach' : 'Espace club';

  if (createdClubId) {
    return (
      <main style={{ '--app-green-dark': '#1d573c' } as React.CSSProperties} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#f4f5ef] px-4 py-16 text-[#15241c] sm:px-6 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-[#dce5db] sm:right-[8%] sm:top-[-9rem] sm:h-[30rem] sm:w-[30rem]" />
        <button type="button" onClick={onSuccess} className="group absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#34473b] transition hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b] focus-visible:ring-offset-2 sm:left-8 sm:top-6">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Accéder à mon espace
        </button>

        <section className="relative z-[1] my-auto w-full max-w-[900px] overflow-hidden rounded-[28px] border border-[#dfe5dd] bg-white shadow-[0_28px_90px_-45px_rgba(19,48,34,0.32)] md:grid md:min-h-[500px] md:grid-cols-[0.82fr_1.18fr]" aria-labelledby="registration-success-title">
          <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#173f2e] p-9 text-white md:flex lg:p-11">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/10" />
            <div className="relative z-[1]"><BrandMark /></div>
            <div className="relative z-[1]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8ddce]">Votre inscription est terminée</p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-white">Votre espace est prêt.</h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-[#e1ebe3]">Conservez votre code pour permettre à vos adhérents de rejoindre votre espace.</p>
            </div>
            <p className="relative z-[1] text-xs font-medium tracking-wide text-[#d4e2d7]">VELATRA · COACHING &amp; SUIVI</p>
          </aside>

          <div className="flex items-center justify-center px-5 py-9 sm:px-9 sm:py-10 lg:px-14">
            <div className="w-full max-w-[500px] text-center">
              <div className="mb-6 flex justify-center md:hidden"><BrandMark /></div>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f2e9] text-[#1d573c]">
                <Check aria-hidden="true" className="h-7 w-7" />
              </span>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#286b4b]">Inscription terminée</p>
              <h1 id="registration-success-title" className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-[#14251b] sm:text-[2rem]">Votre espace est créé.</h1>
              <p className="mt-3 text-[15px] leading-6 text-[#48594e]">Partagez ce code avec les personnes que vous accompagnez pour qu’elles puissent vous rejoindre.</p>

              <div className="mt-7 rounded-2xl border border-[#c8d9cc] bg-[#f1f6f1] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#205b3f]">Code d’accès {isCoach ? 'coach' : 'club'}</p>
                <p className="mt-3 break-all font-display text-3xl font-bold tracking-[0.12em] text-[#14251b] sm:text-4xl">{createdClubId}</p>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#48594e]">
                {isCoach
                  ? 'Gardez ce code en lieu sûr : vos adhérents en auront besoin pour créer leur compte et vous rejoindre.'
                  : 'Gardez ce code en lieu sûr : vos adhérents en auront besoin pour créer leur compte et rejoindre votre club.'}
              </p>
              <Button fullWidth onClick={onSuccess} className="!mt-7 !min-h-[52px] !rounded-xl !bg-[#1d573c] !py-3 !text-[15px] shadow-[0_8px_18px_-10px_rgba(17,66,43,0.65)] hover:!bg-[#16472f]">
                Accéder à mon espace
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ '--app-green-dark': '#1d573c' } as React.CSSProperties} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#f4f5ef] px-4 py-16 text-[#15241c] sm:px-6 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full border border-[#dce5db] sm:right-[7%] sm:top-[-11rem] sm:h-[32rem] sm:w-[32rem]" />
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border border-[#e3e9e0] sm:right-[10%] sm:top-[-7rem] sm:h-[25rem] sm:w-[25rem]" />
      </div>

      <button type="button" onClick={onCancel} className="group absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#34473b] transition hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b] focus-visible:ring-offset-2 sm:left-8 sm:top-6">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Retour au choix du compte
      </button>

      <section className="relative z-[1] my-auto w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-[#dfe5dd] bg-white shadow-[0_28px_90px_-45px_rgba(19,48,34,0.32)] md:grid md:min-h-[650px] md:grid-cols-[0.82fr_1.18fr]" aria-labelledby="club-registration-title">
        <aside className="relative hidden flex-col overflow-hidden bg-[#173f2e] p-9 text-white md:flex lg:p-11">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="relative z-[1]"><BrandMark /></div>
          <div className="relative z-[1] mt-auto">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8ddce]">Inscription professionnelle</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-white">Votre activité, dans un seul espace.</h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#e1ebe3]">Créez l’espace qui correspond à votre activité et invitez vos adhérents à vous rejoindre.</p>

            <div className="mt-9 space-y-3" aria-label="Étapes pour démarrer">
              <div className="flex min-h-14 items-center gap-3 rounded-xl bg-white/10 px-3 ring-1 ring-white/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#173f2e]">
                  {isCoach ? <UserRound aria-hidden="true" className="h-4 w-4" /> : <Users aria-hidden="true" className="h-4 w-4" />}
                </span>
                <span className="text-sm font-semibold text-white">{isCoach ? 'Espace coach' : 'Espace club ou association'}</span>
              </div>
              <div className="flex min-h-14 items-center gap-3 rounded-xl px-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 text-white"><Info aria-hidden="true" className="h-4 w-4" /></span>
                <span className="text-sm font-semibold text-[#d4e2d7]">Code bêta requis</span>
              </div>
            </div>
          </div>
          <p className="relative z-[1] mt-8 text-xs font-medium tracking-wide text-[#d4e2d7]">VELATRA · COACHING &amp; SUIVI</p>
        </aside>

        <div className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-9 sm:py-10 lg:px-14">
          <div className="w-full max-w-[520px]">
            <div className="mb-7 flex items-center gap-3 md:hidden"><BrandMark /></div>

            <header className="mb-6">
              <p className="hidden text-xs font-bold uppercase tracking-[0.16em] text-[#286b4b] md:block">Création d’espace</p>
              <h1 id="club-registration-title" className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-[#14251b] sm:text-[2rem]">Créer votre {spaceName.toLowerCase()}</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#48594e]">Configurez votre accès professionnel en quelques instants.</p>
            </header>

            <div className="mb-5 rounded-xl border border-[#c8d9cc] bg-[#f1f6f1] p-3.5 text-sm leading-5 text-[#284a35]">
              <p className="font-semibold">Inscription réservée aux coachs et aux clubs.</p>
              <p className="mt-1">Les adhérents créent leur compte avec le code transmis par leur coach.</p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-[#dfe5dd] bg-[#f6f8f4] p-1.5" role="group" aria-label="Type d’espace à créer">
              <button type="button" aria-pressed={isCoach} onClick={() => { setAccountType('coach'); setError(''); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/20 ${isCoach ? 'bg-[#173f2e] text-white shadow-sm' : 'text-[#34473b] hover:bg-white'}`}>
                <UserRound aria-hidden="true" className="h-4 w-4" /> Coach
              </button>
              <button type="button" aria-pressed={!isCoach} onClick={() => { setAccountType('club'); setError(''); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/20 ${!isCoach ? 'bg-[#173f2e] text-white shadow-sm' : 'text-[#34473b] hover:bg-white'}`}>
                <Users aria-hidden="true" className="h-4 w-4" /> Club / Association
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="coach-registration-space-name" className={labelClass}>{isCoach ? 'Nom de votre activité de coaching' : 'Nom du club, studio ou association'}</label>
                <Input id="coach-registration-space-name" name="organization" autoComplete="organization" placeholder={isCoach ? 'Ex. Pierre L. Coaching' : 'Ex. Elite Fitness Studio'} value={clubName} onChange={event => setClubName(event.target.value)} required className={inputClass} />
              </div>

              <div>
                <label htmlFor="coach-registration-owner" className={labelClass}>Nom du responsable</label>
                <Input id="coach-registration-owner" name="name" autoComplete="name" placeholder="Votre nom complet" value={ownerName} onChange={event => setOwnerName(event.target.value)} required className={inputClass} />
              </div>

              <div>
                <label htmlFor="coach-registration-email" className={labelClass}>Adresse email</label>
                <Input id="coach-registration-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.com" value={email} onChange={event => setEmail(event.target.value)} required className={inputClass} />
              </div>

              <div>
                <label htmlFor="coach-registration-password" className={labelClass}>Mot de passe</label>
                <Input id="coach-registration-password" name="new-password" type="password" autoComplete="new-password" placeholder="6 caractères minimum" minLength={6} value={password} onChange={event => setPassword(event.target.value)} required className={inputClass} />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="coach-registration-invite-code" className="text-sm font-semibold text-[#24392c]">Code d’invitation bêta</label>
                  <button type="button" aria-expanded={showBetaInfo} aria-controls="coach-beta-info" onClick={() => setShowBetaInfo(value => !value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#205b3f] underline decoration-[#8ca994] underline-offset-4 hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b]">
                    <Info aria-hidden="true" className="h-4 w-4" />
                    {showBetaInfo ? 'Masquer l’aide' : 'À quoi sert ce code ?'}
                  </button>
                </div>
                <Input id="coach-registration-invite-code" name="invite-code" autoComplete="off" placeholder="Saisissez votre code d’invitation" value={inviteCode} onChange={event => setInviteCode(event.target.value)} required className={inputClass} />
                {showBetaInfo && (
                  <p id="coach-beta-info" className="mt-2 rounded-xl border border-[#c8d9cc] bg-[#f1f6f1] p-3 text-sm leading-5 text-[#284a35]">
                    Un code est nécessaire pour créer un espace pendant la bêta. Contactez l’équipe Velatra si vous n’en avez pas.
                  </p>
                )}
              </div>

              {error && <p role="alert" className="rounded-xl border border-[#e7c4be] bg-[#fff6f4] px-4 py-3 text-sm font-medium leading-5 text-[#8b2f24]">{error}</p>}

              <div className="flex flex-col-reverse gap-3 border-t border-[#e1e7df] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-5 text-[#56675b]">Un code d’invitation valide est nécessaire.</p>
                <Button type="submit" fullWidth disabled={loading} className="!min-h-[52px] !rounded-xl !bg-[#1d573c] !px-5 !py-3 !text-[15px] shadow-[0_8px_18px_-10px_rgba(17,66,43,0.65)] hover:!bg-[#16472f] sm:!w-auto sm:!min-w-44">
                  {loading ? 'Création en cours…' : 'Créer mon espace'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};
