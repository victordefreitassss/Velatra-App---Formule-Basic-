import React from 'react';
import { Home, Users, Target, Dumbbell, CalendarDays, Bell, FolderOpen, History, Settings, UserRound, ChevronDown, Sparkles, CircleHelp } from 'lucide-react';
import type { ContextNavItem } from '../appShellHelpers';
import { UpgradeCard } from './DesktopUI';

/** Receives the existing permission-filtered catalog. Never grants a route. */
export function DesktopSidebar({ items, activePage, onNavigate, onSearch, manager, notifications }: {
  items: ContextNavItem[]; activePage: string; onNavigate: (page: string) => void; onSearch: () => void; manager: boolean; notifications: number;
}) {
  const catalog = [
    ['home', 'Tableau de bord', Home], ['users', manager ? 'Membres' : 'Clients', Users], ['crm_pipeline', 'Prospects', Target],
    ['team', 'Équipe', Users], ['coaching', 'Coaching', Dumbbell], ['calendar', 'Planning', CalendarDays],
    ['notifications', 'Notifications', Bell], ['drive', 'Drive', FolderOpen], ['history', 'Historique', History],
    ['settings', 'Paramètres', Settings], ['profile', 'Mon profil', UserRound],
  ] as const;
  const main = catalog.filter(([id]) => id === 'notifications' || items.some(item => item.id === id));
  const more = items.filter(item => !main.some(([id]) => id === item.id));
  return <>
    <div className="vd-sidebar-brand"><img src="/brand/desktop/velatra-logo.png" alt="" width="42" height="42" /><div><strong>Velatra</strong><small>Propulsez vos ambitions.</small></div></div>
    <span className="vd-nav-caption">VOTRE ESPACE</span>
    <nav className="vd-sidebar-navigation" aria-label="Espaces principaux">
      {main.map(([id, label, Icon]) => <button type="button" key={id} className={activePage === id ? 'is-active' : ''} aria-current={activePage === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon size={19} aria-hidden="true" /><span>{label}</span>{id === 'notifications' && notifications > 0 && <span className="vd-nav-count">{notifications > 99 ? '99+' : notifications}</span>}</button>)}
      {more.length > 0 && <details className="vd-sidebar-more" key={more.some(item => item.id === activePage) ? activePage : 'other-tools'} open={more.some(item => item.id === activePage) || undefined}><summary><Sparkles size={18} aria-hidden="true" />Autres outils<ChevronDown size={15} aria-hidden="true" /></summary><div>{more.map(item => <button type="button" key={item.id} aria-current={activePage === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}><CircleHelp size={16} aria-hidden="true" /><span>{item.label}</span></button>)}</div></details>}
    </nav>
    <UpgradeCard onExplore={onSearch} />
  </>;
}
