import React, { createContext, useContext } from 'react';
import { ArrowUpRight, ArrowRight, Search, Sparkles, Target } from 'lucide-react';

/** Presentation-only bridge to the existing shell command palette. */
export const DesktopShellActions = createContext<(() => void) | undefined>(undefined);
export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return <header className="vd-page-header"><div><p className="vd-eyebrow">{subtitle}</p><h1>{title}</h1></div>{children}</header>;
}
export function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="vd-status-badge">{children}</span>;
}
export function SectionHeader({ title, id, action, icon }: { title: string; id?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return <header className="vd-section-header flex flex-wrap items-center justify-between gap-2"><div className="vd-section-title"><span className="vd-section-icon" aria-hidden="true">{icon}</span><h2 id={id} className="font-semibold">{title}</h2></div>{action}</header>;
}
export function DashboardCard({ title, icon, children, action, className = '' }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <section className={`vd-dashboard-card ${className}`}><SectionHeader title={title} icon={icon} action={action} />{children}</section>;
}
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="vd-empty-state">{children}</p>;
}
export function ActionPill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="vd-action-pill" onClick={onClick}>{children}<ArrowUpRight size={15} aria-hidden="true" /></button>;
}
export function SearchBar({ onClick, label = 'Rechercher une page, un outil…' }: { onClick: () => void; label?: string }) {
  return <button type="button" className="vd-search-bar" onClick={onClick} aria-label="Ouvrir la recherche de pages et d’outils"><Search size={20} aria-hidden="true" /><span>{label}</span><span className="vd-search-go"><ArrowRight size={19} aria-hidden="true" /></span></button>;
}
export function HeroAssistantCard({ name, manager, actions }: { name: string; manager: boolean; actions: React.ReactNode }) {
  const openSearch = useContext(DesktopShellActions);
  return <section className="vd-assistant-hero" aria-label="Pitou, votre copilote">
    <div className="vd-hero-copy"><StatusBadge><Sparkles size={14} aria-hidden="true" /> Pitou, votre copilote</StatusBadge>
      <h2>Bonjour {name.split(' ')[0]},<br /><span>{manager ? 'votre club a de belles choses à vivre.' : 'chaque progrès commence avec vous.'}</span></h2>
      <p>{manager ? 'L’activité, l’équipe, les priorités. Gardez une vue claire sur votre club.' : 'Vos clients, vos séances, vos priorités. Tout pour une journée bien accompagnée.'}</p>
      {openSearch && <SearchBar onClick={openSearch} />}
      <div className="vd-hero-actions">{actions}</div>
    </div>
    <div className="vd-hero-art" aria-hidden="true"><span className="vd-hero-orbit" /><img src="/brand/desktop/pitou-copilot.png" alt="" width="544" height="544" fetchPriority="high" /><span className="vd-pitou-caption"><span /> À vos côtés, au quotidien</span></div>
  </section>;
}
export function KpiCard({ label, value, detail, icon, tone = 'blue' }: { label: string; value: number | string; detail: string; icon: React.ReactNode; tone?: 'blue' | 'violet' | 'rose' | 'indigo' }) {
  return <article className={`vd-kpi vd-tone-${tone}`}><div className="vd-kpi-top"><span>{label}</span><span className="vd-kpi-icon" aria-hidden="true">{icon}</span></div><strong>{value}</strong><p>{detail}</p></article>;
}
export function InsightCard({ manager }: { manager: boolean }) {
  return <DashboardCard title="Le mot de Pitou" icon={<Sparkles size={19} />} className="vd-insight-card"><div className="vd-insight-content"><img src="/brand/desktop/pitou-copilot.png" alt="Pitou, le compagnon Velatra" width="96" height="96" loading="lazy" /><div><p>{manager ? 'Un club qui avance, c’est une équipe qui se sent accompagnée.' : 'Un petit message au bon moment peut faire une grande différence.'}</p><span>Le conseil du jour</span></div></div></DashboardCard>;
}
export function MonthlyFocusCard({ manager }: { manager: boolean }) {
  return <DashboardCard title="Objectif du mois" icon={<Target size={19} />} className="vd-focus-card"><StatusBadge>Une intention pour avancer</StatusBadge><h3>{manager ? 'Cultiver le lien, ensemble.' : 'Faire de la régularité une force.'}</h3><p>{manager ? 'Prenez un temps avec votre équipe pour partager les priorités de suivi.' : 'Gardez un temps dans votre semaine pour accompagner les clients qui en ont besoin.'}</p><span className="vd-focus-caption">Une suggestion de Pitou pour votre quotidien.</span></DashboardCard>;
}
export function ProfileSummary({ name, role }: { name: string; role: string }) {
  return <span className="vd-profile-summary"><strong>{name}</strong><small>{role}</small></span>;
}
export function UpgradeCard({ onExplore }: { onExplore: () => void }) {
  return <div className="vd-sidebar-card"><Sparkles size={19} aria-hidden="true" /><strong>Passez au niveau supérieur</strong><p>Plus de possibilités pour accompagner encore plus de clients.</p><button type="button" onClick={onExplore}>Découvrir <ArrowUpRight size={16} aria-hidden="true" /></button></div>;
}
