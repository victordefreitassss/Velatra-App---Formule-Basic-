import React, { useState } from 'react';
import { ArrowLeft, Check, Dumbbell, Info, Target, UserRound } from 'lucide-react';
import { Input, Button } from './UI';
import { Goal, Gender } from '../types';
import { GOALS } from '../constants';
import { apiFetch, auth, createUserWithEmailAndPassword } from '../firebase';

interface RegistrationFormProps {
  onRegister: () => void;
  onCancel: () => void;
}

const steps = [
  { label: 'Compte', title: 'Créez votre accès', description: 'Saisissez vos coordonnées et le code transmis par votre coach.', icon: UserRound },
  { label: 'Profil', title: 'Quelques repères personnels', description: 'Ces informations aident votre coach à adapter votre accompagnement.', icon: Info },
  { label: 'Objectifs', title: 'Vos objectifs et votre santé', description: 'Choisissez ce que vous souhaitez atteindre et les informations utiles à partager.', icon: Target },
  { label: 'Entraînement', title: 'Votre pratique sportive', description: 'Indiquez votre expérience, votre rythme et le matériel à votre disposition.', icon: Dumbbell }
];

const fieldLabel = 'mb-2 block text-sm font-semibold text-[#24392c]';
const choiceBase = 'min-w-0 min-h-12 whitespace-normal rounded-xl border px-3 py-2.5 text-center text-sm font-semibold leading-5 break-words transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/20';
const choiceSelected = 'border-[#1d573c] bg-[#eaf1eb] text-[#173f2e]';
const choiceIdle = 'border-[#bdc9be] bg-white text-[#34473b] hover:border-[#789982] hover:bg-[#f8faf7]';

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    clubId: '',
    age: 25,
    weight: 70,
    height: 175,
    gender: 'M' as Gender,
    objectifs: [] as Goal[],
    notes: '',
    experienceLevel: 'Débutant' as 'Débutant' | 'Intermédiaire' | 'Avancé',
    trainingDays: 3,
    sessionDuration: 60,
    equipment: 'Salle complète' as 'Salle complète' | 'Haltères/Kettlebells' | 'Poids du corps' | 'Élastiques',
    injuries: ''
  });

  const goNext = () => {
    if (step === 1) {
      if (!formData.name.trim()) return setError('Saisissez votre nom complet.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return setError('Saisissez une adresse email valide.');
      if (formData.password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
      if (!/^\d{6}$/.test(formData.clubId)) return setError('Le code de votre club doit contenir 6 chiffres.');
    }
    setError('');
    setStep(current => Math.min(4, current + 1));
  };

  const goBack = () => {
    setError('');
    if (step === 1) onCancel();
    else setStep(current => Math.max(1, current - 1));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      // Create the Auth account first, then let the trusted server validate the
      // club and create a profile with a server-controlled member ID.
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email?.toLowerCase() !== formData.email.trim().toLowerCase()) {
        throw new Error('Un autre compte est déjà connecté. Déconnectez-vous avant de vous inscrire.');
      }
      if (!currentUser) {
        await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      }
      const response = await apiFetch('/api/register-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: formData.clubId,
          name: formData.name,
          age: formData.age,
          weight: formData.weight,
          height: formData.height,
          gender: formData.gender,
          objectifs: formData.objectifs,
          notes: formData.notes,
          experienceLevel: formData.experienceLevel,
          trainingDays: formData.trainingDays,
          sessionDuration: formData.sessionDuration,
          equipment: formData.equipment,
          injuries: formData.injuries
        })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'L’inscription n’a pas pu être finalisée.');
      }
      onRegister();
    } catch (submitError: any) {
      if (submitError.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.');
      } else {
        setError(submitError.message || 'Une erreur est survenue lors de la création du compte.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = (goal: Goal) => {
    setFormData(previous => ({
      ...previous,
      objectifs: previous.objectifs.includes(goal)
        ? previous.objectifs.filter(item => item !== goal)
        : [...previous.objectifs, goal]
    }));
  };

  const currentStep = steps[step - 1];

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#f4f5ef] px-4 py-16 text-[#15241c] sm:px-6 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full border border-[#dce5db] sm:right-[7%] sm:top-[-11rem] sm:h-[32rem] sm:w-[32rem]" />
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border border-[#e3e9e0] sm:right-[10%] sm:top-[-7rem] sm:h-[25rem] sm:w-[25rem]" />
      </div>

      <button
        type="button"
        onClick={goBack}
        className="group absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-10 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#34473b] transition hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b] focus-visible:ring-offset-2 sm:left-8 sm:top-6"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        {step === 1 ? 'Retour au choix du compte' : 'Étape précédente'}
      </button>

      <section className="relative z-[1] my-auto w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-[#dfe5dd] bg-white shadow-[0_28px_90px_-45px_rgba(19,48,34,0.32)] md:grid md:min-h-[640px] md:grid-cols-[0.82fr_1.18fr]" aria-labelledby="registration-title">
        <aside className="relative hidden flex-col overflow-hidden bg-[#173f2e] p-9 text-white md:flex lg:p-11">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-white/10" />
          <div className="relative z-[1] flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
              <img src="/brand/velatra-mark.png" alt="" width="48" height="48" className="h-full w-full object-contain" />
            </span>
            <span className="font-display text-3xl font-bold tracking-tight text-white">VELA<span className="text-emerald-200">TRA</span></span>
          </div>

          <div className="relative z-[1] mt-auto">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c8ddce]">Votre espace adhérent</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-white">Quelques étapes pour commencer.</h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[#e1ebe3]">Votre coach retrouvera les informations nécessaires pour préparer votre suivi.</p>

            <ol className="mt-9 space-y-2" aria-label="Étapes de création du compte">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const completed = step > index + 1;
                const active = step === index + 1;
                return (
                  <li key={item.label} aria-current={active ? 'step' : undefined} className={`flex min-h-14 items-center gap-3 rounded-xl px-3 ${active ? 'bg-white/12 ring-1 ring-white/20' : ''}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${completed ? 'bg-[#cbe5d2] text-[#173f2e]' : active ? 'bg-white text-[#173f2e]' : 'border border-white/35 text-white'}`}>
                      {completed ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icon aria-hidden="true" className="h-4 w-4" />}
                    </span>
                    <span className={`text-sm font-semibold ${active || completed ? 'text-white' : 'text-[#d4e2d7]'}`}>{item.label}</span>
                    {active && <span className="ml-auto text-xs font-medium text-[#d4e2d7]">Étape {index + 1}</span>}
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="relative z-[1] mt-8 text-xs font-medium tracking-wide text-[#d4e2d7]">VELATRA · COACHING &amp; SUIVI</p>
        </aside>

        <div className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-9 sm:py-10 lg:px-14">
          <div className="w-full max-w-[500px]">
            <div className="mb-7 flex items-center gap-3 md:hidden">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#dfe5dd]">
                <img src="/brand/velatra-mark.png" alt="" width="44" height="44" className="h-full w-full object-contain" />
              </span>
              <span className="font-display text-2xl font-bold tracking-tight text-[#14251b]">VELA<span className="text-[#286b4b]">TRA</span></span>
            </div>

            <div className="mb-7 md:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#24392c]">Étape {step} <span className="font-normal text-[#56675b]">sur 4</span></p>
                <p className="text-sm font-semibold text-[#205b3f]">{currentStep.label}</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2" aria-label={`Progression : étape ${step} sur 4`}>
                {steps.map((item, index) => (
                  <span key={item.label} className={`h-1.5 rounded-full ${step >= index + 1 ? 'bg-[#1d573c]' : 'bg-[#dfe5dd]'}`} />
                ))}
              </div>
            </div>

            <header className="mb-7">
              <p className="hidden text-xs font-bold uppercase tracking-[0.16em] text-[#286b4b] md:block">Création de compte · {step} sur 4</p>
              <h1 id="registration-title" className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-[#14251b] sm:text-[2rem]">{currentStep.title}</h1>
              <p className="mt-2 text-[15px] leading-6 text-[#48594e]">{currentStep.description}</p>
            </header>

            <div className="space-y-5">
              {step === 1 && (
                <div className="space-y-4" key="step-account">
                  <div>
                    <label htmlFor="registration-name" className={fieldLabel}>Nom complet</label>
                    <Input id="registration-name" name="name" autoComplete="name" placeholder="Ex. Jean Dupont" value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                  </div>
                  <div>
                    <label htmlFor="registration-email" className={fieldLabel}>Adresse email</label>
                    <Input id="registration-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.com" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                  </div>
                  <div>
                    <label htmlFor="registration-password" className={fieldLabel}>Mot de passe</label>
                    <Input id="registration-password" name="new-password" type="password" autoComplete="new-password" placeholder="6 caractères minimum" value={formData.password} onChange={event => setFormData({ ...formData, password: event.target.value })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                  </div>
                  <div>
                    <label htmlFor="registration-club-code" className={fieldLabel}>Code de votre club <span className="font-normal text-[#56675b]">(6 chiffres)</span></label>
                    <Input id="registration-club-code" name="club-code" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Ex. 482910" value={formData.clubId} onChange={event => setFormData({ ...formData, clubId: event.target.value.replace(/\D/g, '').slice(0, 6) })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base tracking-[0.12em] focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    <p className="mt-2 text-sm leading-5 text-[#56675b]">Demandez ce code à votre coach ou à l’accueil de votre club.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5" key="step-profile">
                  <div className="rounded-xl border border-[#c8d9cc] bg-[#f1f6f1] p-4 text-sm leading-5 text-[#284a35]">
                    <p className="font-semibold">Des repères pour votre accompagnement</p>
                    <p className="mt-1">Votre âge, votre genre, votre poids et votre taille peuvent aider votre coach à adapter le suivi.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="registration-age" className={fieldLabel}>Âge <span className="font-normal text-[#56675b]">(ans)</span></label>
                      <Input id="registration-age" type="number" min="15" max="100" inputMode="numeric" value={formData.age || ''} onChange={event => setFormData({ ...formData, age: parseInt(event.target.value) || 0 })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    </div>
                    <fieldset className="col-span-2 sm:col-span-1">
                      <legend className={fieldLabel}>Genre</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {([['M', 'Homme'], ['F', 'Femme']] as const).map(([value, label]) => (
                          <button key={value} type="button" aria-pressed={formData.gender === value} onClick={() => setFormData({ ...formData, gender: value })} className={`${choiceBase} ${formData.gender === value ? choiceSelected : choiceIdle}`}>{label}</button>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="registration-weight" className={fieldLabel}>Poids <span className="font-normal text-[#56675b]">(kg)</span></label>
                      <Input id="registration-weight" type="number" min="25" max="350" step="0.1" inputMode="decimal" value={formData.weight || ''} onChange={event => setFormData({ ...formData, weight: parseFloat(event.target.value) || 0 })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    </div>
                    <div>
                      <label htmlFor="registration-height" className={fieldLabel}>Taille <span className="font-normal text-[#56675b]">(cm)</span></label>
                      <Input id="registration-height" type="number" min="100" max="250" inputMode="numeric" value={formData.height || ''} onChange={event => setFormData({ ...formData, height: parseInt(event.target.value) || 0 })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5" key="step-goals">
                  <fieldset>
                    <legend className={`${fieldLabel} mb-3`}>Quel est votre objectif ? <span className="font-normal text-[#56675b]">(plusieurs choix possibles)</span></legend>
                    <div className="flex flex-wrap gap-2">
                      {GOALS.map(goal => {
                        const selected = formData.objectifs.includes(goal);
                        return <button key={goal} type="button" aria-pressed={selected} onClick={() => toggleGoal(goal)} className={`${choiceBase} ${selected ? choiceSelected : choiceIdle}`}>{goal}</button>;
                      })}
                    </div>
                  </fieldset>
                  <div>
                    <label htmlFor="registration-health" className={fieldLabel}>Informations de santé à partager <span className="font-normal text-[#56675b]">(facultatif)</span></label>
                    <textarea id="registration-health" maxLength={1000} className="min-h-[132px] w-full resize-y rounded-xl border border-[#bdc9be] bg-[#fbfcfa] px-4 py-3 text-base leading-6 text-[#17271d] outline-none transition placeholder:text-[#66766b] hover:border-[#879d8c] focus:border-[#286b4b] focus:bg-white focus:ring-4 focus:ring-[#286b4b]/15" value={formData.notes} onChange={event => setFormData({ ...formData, notes: event.target.value })} placeholder="Ex. une blessure ancienne ou une information utile à votre coach" />
                    <p className="mt-2 text-sm leading-5 text-[#56675b]">Ne partagez que les informations utiles à votre accompagnement.</p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5" key="step-training">
                  <fieldset>
                    <legend className={fieldLabel}>Votre expérience</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Débutant', 'Intermédiaire', 'Avancé'] as const).map(level => (
                        <button key={level} type="button" aria-pressed={formData.experienceLevel === level} onClick={() => setFormData({ ...formData, experienceLevel: level })} className={`${choiceBase} whitespace-nowrap px-1.5 !text-xs sm:!text-sm ${formData.experienceLevel === level ? choiceSelected : choiceIdle}`}>{level}</button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="registration-days" className={fieldLabel}>Jours par semaine</label>
                      <Input id="registration-days" type="number" min="1" max="7" inputMode="numeric" value={formData.trainingDays || ''} onChange={event => setFormData({ ...formData, trainingDays: parseInt(event.target.value) || 0 })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    </div>
                    <div>
                      <label htmlFor="registration-duration" className={fieldLabel}>Durée d’une séance <span className="font-normal text-[#56675b]">(min)</span></label>
                      <Input id="registration-duration" type="number" min="15" max="240" step="15" inputMode="numeric" value={formData.sessionDuration || ''} onChange={event => setFormData({ ...formData, sessionDuration: parseInt(event.target.value) || 0 })} className="!min-h-[52px] !rounded-xl !border-[#bdc9be] !bg-[#fbfcfa] !px-4 !text-base focus:!border-[#286b4b] focus:!ring-[#286b4b]/15" />
                    </div>
                  </div>

                  <fieldset>
                    <legend className={fieldLabel}>Équipement à votre disposition</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Salle complète', 'Haltères/Kettlebells', 'Poids du corps', 'Élastiques'] as const).map(equipment => (
                        <button key={equipment} type="button" aria-pressed={formData.equipment === equipment} onClick={() => setFormData({ ...formData, equipment })} className={`${choiceBase} text-left ${formData.equipment === equipment ? choiceSelected : choiceIdle}`}>{equipment === 'Haltères/Kettlebells' ? <>Haltères/<wbr />Kettlebells</> : equipment}</button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="registration-injuries" className={fieldLabel}>Blessures ou douleurs à signaler <span className="font-normal text-[#56675b]">(facultatif)</span></label>
                    <textarea id="registration-injuries" maxLength={1000} className="min-h-[96px] w-full resize-y rounded-xl border border-[#bdc9be] bg-[#fbfcfa] px-4 py-3 text-base leading-6 text-[#17271d] outline-none transition placeholder:text-[#66766b] hover:border-[#879d8c] focus:border-[#286b4b] focus:bg-white focus:ring-4 focus:ring-[#286b4b]/15" value={formData.injuries} onChange={event => setFormData({ ...formData, injuries: event.target.value })} placeholder="Ex. douleur à l’épaule droite" />
                  </div>
                </div>
              )}

              {error && <p role="alert" className="rounded-xl border border-[#e8b9b4] bg-[#fff5f3] px-4 py-3 text-sm font-medium leading-5 text-[#842e27]">{error}</p>}

              <div className="flex flex-col-reverse gap-3 border-t border-[#e0e6df] pt-5 sm:flex-row sm:items-center sm:justify-between">
                {step > 1 ? (
                  <button type="button" onClick={goBack} disabled={loading} className="min-h-12 rounded-xl px-4 text-sm font-semibold text-[#34473b] transition hover:bg-[#f3f6f2] hover:text-[#153f2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#286b4b] disabled:cursor-not-allowed disabled:opacity-60">Précédent</button>
                ) : <span className="hidden text-sm leading-5 text-[#56675b] sm:block">Vos données sont utilisées pour créer votre espace adhérent.</span>}
                {step < 4 ? (
                  <button type="button" onClick={goNext} className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#1d573c] px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(17,66,43,0.65)] transition hover:bg-[#16472f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/25 focus-visible:ring-offset-2 active:translate-y-px sm:w-auto sm:min-w-36">Continuer</button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={loading} className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#1d573c] px-5 text-[15px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(17,66,43,0.65)] transition hover:bg-[#16472f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#286b4b]/25 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#557461] sm:w-auto sm:min-w-48">{loading ? 'Création en cours…' : 'Créer mon compte'}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
