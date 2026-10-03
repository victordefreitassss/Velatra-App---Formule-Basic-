import React from 'react';
import { Users, ChartNoAxesCombined, Heart, Zap, ArrowLeft, LoaderCircle, ArrowRight, Mail, LockKeyhole, Eye, EyeOff } from 'lucide-react';
import './auth-theme.css';

const benefits = [
  [Users, 'Gestion tout-en-un', 'Membres, cours, paiements, communications.'],
  [ChartNoAxesCombined, 'Des clubs plus performants', 'Des outils puissants pour grandir sereinement.'],
  [Heart, 'Une expérience humaine', 'Parce que derrière chaque club, il y a des gens.'],
  [Zap, 'Toujours à vos côtés', 'Une solution pensée par et pour les professionnels du sport.'],
] as const;

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="va-auth">
    <aside className="va-auth-story" style={{ backgroundImage: "linear-gradient(90deg,rgba(12,17,57,.36),transparent 72%),url('/brand/auth/pitou-gym.webp')" }}>
      <a href="https://velatra.fr" className="va-auth-brand" aria-label="Velatra — retour au site vitrine"><img src="/brand/desktop/velatra-logo.png" alt="" width="72" height="72" /><span>Velatra</span></a>
      <div className="va-auth-pitch">
        <h2>Le cockpit des coachs<br />et des clubs <span>ambitieux.</span></h2>
        <p>Tout ce dont vous avez besoin pour gérer, développer et faire rayonner votre activité. Plus simple. Plus humain. Plus loin, ensemble.</p>
      </div>
      <ul className="va-auth-benefits">{benefits.map(([Icon, title, description]) => <li key={title}><span className="va-auth-benefit-icon"><Icon aria-hidden="true" /></span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul>
    </aside>
    <section className="va-auth-side" aria-labelledby="auth-title">
      <div className="va-auth-card">{children}</div>
    </section>
  </main>;
}
export function AuthHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return <header className="va-auth-heading"><h1 id="auth-title" tabIndex={-1}>{title}</h1><p>{children}</p></header>;
}
export function AuthBack({ onClick, children = 'Retour à la connexion', disabled = false }: { onClick: () => void; children?: React.ReactNode; disabled?: boolean }) {
  return <button type="button" className="va-auth-back" onClick={onClick} disabled={disabled}><ArrowLeft size={16} aria-hidden="true" />{children}</button>;
}
export function AuthSubmit({ busy, disabled = busy, children }: { busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return <button type="submit" className="va-auth-submit" disabled={disabled} aria-busy={busy}>{busy ? <LoaderCircle className="va-auth-spinner" size={20} aria-hidden="true" /> : null}{children}{!busy && <ArrowRight size={20} aria-hidden="true" />}</button>;
}
export function GoogleButton({ onClick, busy, disabled }: { onClick: () => void; busy: boolean; disabled: boolean }) {
  return <button type="button" className="va-auth-google" onClick={onClick} disabled={disabled} aria-busy={busy}>
    {busy ? <LoaderCircle size={20} className="va-auth-spinner" aria-hidden="true" /> : <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>}
    Continuer avec Google
  </button>;
}
export function AuthField({ label, id, type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  const [visible, setVisible] = React.useState(false);
  const password = type === 'password';
  return <div className="va-auth-field"><label htmlFor={id}>{label}</label><div className={`va-auth-input ${type === 'email' || password ? 'has-icon' : ''}`}>
    {type === 'email' ? <Mail size={19} aria-hidden="true" /> : password ? <LockKeyhole size={19} aria-hidden="true" /> : null}
    <input id={id} name={id} type={password && visible ? 'text' : type} {...props} />
    {password && <button type="button" aria-label={`${visible ? 'Masquer' : 'Afficher'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button>}
  </div></div>;
}
