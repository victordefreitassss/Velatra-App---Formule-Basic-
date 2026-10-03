import React from 'react';
import type { HomeSection, ProductFormat, ProductExperience } from '../../productExperience';
import { CalendarDays } from 'lucide-react';
import { HeroAssistantCard, PageHeader, InsightCard, MonthlyFocusCard } from './DesktopUI';

export function DesktopDashboard({ name, manager, experience, format, sections, order, kpis, actions, documents, date }: {
  name: string; manager: boolean; experience: ProductExperience; format: ProductFormat;
  sections: Partial<Record<HomeSection, React.ReactNode>>; order: readonly HomeSection[];
  kpis: React.ReactNode; actions: React.ReactNode; documents?: React.ReactNode; date: string;
}) {
  const sideKeys: HomeSection[] = ['team', 'messages', 'shortcuts'];
  const keys = order.filter(key => sections[key]);
  const workOrder: HomeSection[] = manager ? ['coaching', 'clients', 'business', 'sales', 'agenda', 'actions', 'tasks'] : ['agenda', 'clients', 'coaching', 'actions', 'tasks', 'sales', 'business'];
  const workKeys = workOrder.filter(key => keys.includes(key) || manager && key === 'coaching' && sections[key]);
  const documentsAfter = manager && workKeys.includes('sales') ? 'sales' : 'coaching';
  return <div className="va-experience-home vd-dashboard" data-experience={experience} data-format={format} data-density="expanded" data-desktop-dashboard={manager ? 'manager' : 'coach'}>
    <PageHeader title={manager ? "Vue d’ensemble" : "Votre journée"} subtitle={manager ? 'VOTRE CLUB, EN MOUVEMENT' : 'VOTRE QUOTIDIEN, PLUS SEREIN'}><span className="vd-today"><CalendarDays size={17} aria-hidden="true" />{date}</span></PageHeader>
    <HeroAssistantCard name={name} manager={manager} actions={actions} />
    <div className="vd-kpi-grid" aria-label={manager ? 'Indicateurs du club' : 'Mes indicateurs'}>{kpis}</div>
    <div className="vd-dashboard-grid">
      <div className="vd-dashboard-column vd-work-grid" data-home-zone="work">{workKeys.map(key => <React.Fragment key={key}>{sections[key]}{key === documentsAfter && documents}</React.Fragment>)}{!workKeys.includes(documentsAfter) && documents}</div>
      <aside className="vd-dashboard-column" data-home-zone="agenda" aria-label={manager ? 'Équipe et repères du club' : 'Repères du jour'}>{manager && keys.includes('team') && sections.team}<InsightCard manager={manager} /><MonthlyFocusCard manager={manager} />{keys.filter(key => sideKeys.includes(key) && key !== 'team').map(key => <React.Fragment key={key}>{sections[key]}</React.Fragment>)}</aside>
    </div>
    <p className="vd-dashboard-signature">Velatra · Le progrès se construit ensemble.</p>
  </div>;
}
