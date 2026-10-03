import React from 'react';
import { Home, Users, Target, Dumbbell, CalendarDays, Bell, FolderOpen, History, Settings, UserRound, ChevronDown, Sparkles, CircleHelp, MessageSquare, ChartNoAxesCombined } from 'lucide-react';
import type { ContextNavItem } from '../appShellHelpers';
import { UpgradeCard } from './DesktopUI';
import { desktopNavigation } from './desktopNavigation';

/** Receives the existing permission-filtered catalog. Never grants a route. */
export function DesktopSidebar({ items, activePage, onNavigate, onSearch, manager, employee = false, notifications }: {
  items: ContextNavItem[]; activePage: string; onNavigate: (page: string) => void; onSearch: () => void; manager: boolean; employee?: boolean; notifications: number;
}) {
  const {main,secondary,settings,secondaryLabel}=desktopNavigation(items,manager,employee);
  const icons: Record<string, typeof Home> = {home:Home,users:Users,crm_pipeline:Target,team:Users,coaching:Dumbbell,calendar:CalendarDays,notifications:Bell,drive:FolderOpen,history:History,settings:Settings,profile:UserRound,chat:MessageSquare,crm_finances:ChartNoAxesCombined};
  const render = (item: Pick<ContextNavItem,'id'|'label'>) => {const Icon=icons[item.id]||CircleHelp;return <button type="button" key={item.id} className={activePage===item.id?'is-active':''} aria-current={activePage===item.id?'page':undefined} onClick={()=>onNavigate(item.id)}><Icon size={19} aria-hidden="true"/><span>{item.label}</span>{item.id==='notifications'&&notifications>0&&<span className="vd-nav-count">{notifications>99?'99+':notifications}</span>}</button>;};
  return <>
    <div className="vd-sidebar-brand"><img src="/brand/desktop/velatra-logo.png" alt="" width="42" height="42"/><div><strong>Velatra</strong><small>Propulsez vos ambitions.</small></div></div>
    <span className="vd-nav-caption">VOTRE ESPACE</span>
    <nav className="vd-sidebar-navigation" aria-label="Espaces principaux">
      {main.map(render)}
      {render({id:'notifications',label:'Notifications'})}
      {secondary.length>0&&<details className="vd-sidebar-more" key={secondary.some(item=>item.id===activePage)?activePage:'management'} open={secondary.some(item=>item.id===activePage)||undefined}><summary><Sparkles size={18} aria-hidden="true"/>{secondaryLabel}<ChevronDown size={15} aria-hidden="true"/></summary><div>{secondary.filter(i=>i.id!=='notifications').map(render)}</div></details>}
      {settings.map(render)}
    </nav>
    <UpgradeCard onExplore={onSearch}/>
  </>;
}
