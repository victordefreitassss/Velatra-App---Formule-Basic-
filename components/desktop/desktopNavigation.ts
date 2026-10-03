import type { ContextNavItem } from '../appShellHelpers';

/** Reorders the already authorized catalog. Every existing destination is retained once. */
export function desktopNavigation(items: ContextNavItem[], manager: boolean, employee = false) {
  const primary = manager ? ['home','users','crm_pipeline','calendar','team','chat','drive'] : employee ? ['home','users','calendar','coaching','chat','drive'] : ['home','users','crm_pipeline','calendar','coaching','chat','drive'];
  const label: Record<string,string> = {home:'Tableau de bord',users:manager?'Membres':employee?'Mes clients':'Clients',crm_pipeline:'Prospects',calendar:'Planning',team:'Équipe',chat:'Messages',drive:'Drive',coaching:'Coaching',settings:'Paramètres'};
  const main = primary.flatMap(id=>{const item=items.find(item=>item.id===id);return item?[{...item,label:label[id]||item.label}]:[];});
  const remaining = items.filter(item=>!primary.includes(item.id));
  return { main, secondary: remaining.filter(i=>i.id!=='settings'), settings:remaining.filter(i=>i.id==='settings'), secondaryLabel:manager?'Gestion du club':'Gestion' };
}
export function desktopContextItems(items: ContextNavItem[], page: string): ContextNavItem[] {
  const groups: Record<string,string[]> = {
    clients:['users','onboarding','retention','pulse'], coaching:['coaching','presets','exercises','nutrition'],
    prospects:['crm_pipeline','crm_tasks'], team:['team'], planning:['calendar'], finance:['crm_finances'],
  };
  const ids=Object.values(groups).find(ids=>ids.includes(page));
  const labels:Record<string,string>={users:'Tous',onboarding:'Suivi',retention:'Retain',pulse:'Actions',coaching:'Séances',presets:'Programmes',exercises:'Exercices',nutrition:'Nutrition',crm_pipeline:'Prospects',crm_tasks:'Tâches et relances'};
  return ids?ids.flatMap(id=>{const item=items.find(i=>i.id===id);return item?[{...item,label:labels[id]||item.label}]:[];}):[];
}
