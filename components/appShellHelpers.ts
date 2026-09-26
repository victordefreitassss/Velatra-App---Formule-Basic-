import type { Booking } from '../types';

export type AppHub = 'home' | 'clients' | 'coaching' | 'business' | 'plus' | 'sessions' | 'progression' | 'nutrition' | 'admin';

export interface ContextNavItem {
  id: string;
  label: string;
  hub: AppHub;
}

const coachContext: Record<Exclude<AppHub, 'home' | 'sessions' | 'progression' | 'nutrition' | 'admin'>, ContextNavItem[]> = {
  clients: [
    { id: 'users', label: 'Membres', hub: 'clients' },
    { id: 'chat', label: 'Messages', hub: 'clients' },
    { id: 'calendar', label: 'Planning', hub: 'clients' },
  ],
  coaching: [
    { id: 'coaching', label: 'Vue d’ensemble', hub: 'coaching' },
    { id: 'presets', label: 'Programmes', hub: 'coaching' },
    { id: 'nutrition', label: 'Nutrition', hub: 'coaching' },
    { id: 'drive', label: 'Documents', hub: 'coaching' },
  ],
  business: [
    { id: 'crm_pipeline', label: 'Prospects', hub: 'business' },
    { id: 'crm_finances', label: 'Finances', hub: 'business' },
    { id: 'marketing', label: 'Campagnes', hub: 'business' },
  ],
  plus: [
    { id: 'about', label: 'Fiche du club', hub: 'plus' },
    { id: 'guide', label: 'Guides', hub: 'plus' },
    { id: 'settings', label: 'Paramètres', hub: 'plus' },
    { id: 'exercises', label: 'Bibliothèque d’exercices', hub: 'plus' },
    { id: 'history', label: 'Historique', hub: 'plus' },
    { id: 'crm_tasks', label: 'Tâches', hub: 'plus' },
  ],
};

const memberContext: Record<'sessions' | 'progression' | 'nutrition' | 'plus', ContextNavItem[]> = {
  sessions: [
    { id: 'calendar', label: 'Mes séances', hub: 'sessions' },
    { id: 'planning', label: 'Réserver un cours', hub: 'sessions' },
  ],
  progression: [
    { id: 'performances', label: 'Performances', hub: 'progression' },
    { id: 'evolution', label: 'Évolution', hub: 'progression' },
  ],
  nutrition: [
    { id: 'nutrition', label: 'Nutrition', hub: 'nutrition' },
    { id: 'supplements', label: 'Boutique', hub: 'nutrition' },
  ],
  plus: [
    { id: 'ai_coach', label: 'Velatra AI', hub: 'plus' },
    { id: 'drive', label: 'Documents', hub: 'plus' },
    { id: 'profile', label: 'Mes objectifs', hub: 'plus' },
    { id: 'about', label: 'Infos du club', hub: 'plus' },
    { id: 'messages', label: 'Messages', hub: 'plus' },
    { id: 'history', label: 'Historique', hub: 'plus' },
  ],
};

export const getAppHubForPage = (page: string, role: string): AppHub => {
  if (role === 'superadmin') return 'admin';
  if (role === 'coach' || role === 'owner') {
    if (page === 'home') return 'home';
    if (['users', 'chat', 'calendar'].includes(page)) return 'clients';
    if (['coaching', 'presets', 'nutrition', 'drive'].includes(page)) return 'coaching';
    if (['crm_pipeline', 'crm_finances', 'marketing'].includes(page)) return 'business';
    return 'plus';
  }
  if (page === 'home') return 'home';
  if (['calendar', 'planning'].includes(page)) return 'sessions';
  if (['performances', 'evolution'].includes(page)) return 'progression';
  if (page === 'nutrition' || page === 'supplements') return 'nutrition';
  return 'plus';
};

export const getContextItemsForHub = (hub: AppHub, role: string, planningEnabled = true): ContextNavItem[] => {
  if (role === 'superadmin') return [];
  const isCoach = role === 'coach' || role === 'owner';
  if (isCoach && hub in coachContext) {
    return coachContext[hub as keyof typeof coachContext].filter(item => planningEnabled || item.id !== 'calendar');
  }
  if (!isCoach && hub in memberContext) {
    return memberContext[hub as keyof typeof memberContext].filter(item => planningEnabled || item.id !== 'planning');
  }
  return [];
};

export const getAllContextItems = (role: string, planningEnabled = true): ContextNavItem[] => {
  if (role === 'superadmin') return [{ id: 'admin', label: 'Tableau de bord', hub: 'admin' }];
  const hubs: AppHub[] = role === 'coach' || role === 'owner'
    ? ['home', 'clients', 'coaching', 'business', 'plus']
    : ['home', 'sessions', 'progression', 'nutrition', 'plus'];
  const home: ContextNavItem = { id: 'home', label: role === 'coach' || role === 'owner' ? 'Accueil' : 'Mon espace', hub: 'home' };
  return [home, ...hubs.flatMap(hub => getContextItemsForHub(hub, role, planningEnabled))];
};

export const getHubDefaultPage = (hub: AppHub, role: string): string => {
  if (role === 'superadmin') return 'admin';
  const defaults: Record<string, string> = {
    home: 'home', clients: 'users', coaching: 'coaching', business: 'crm_pipeline',
    sessions: 'calendar', progression: 'performances', nutrition: 'nutrition',
    plus: role === 'coach' || role === 'owner' ? 'about' : 'ai_coach', admin: 'admin',
  };
  return defaults[hub] || 'home';
};

export const getHubLabel = (hub: AppHub, role: string): string => {
  if (hub === 'admin') return 'Administration';
  if (hub === 'home') return role === 'coach' || role === 'owner' ? 'Accueil' : 'Mon espace';
  if (hub === 'clients') return 'Clients';
  if (hub === 'coaching') return 'Coaching';
  if (hub === 'business') return 'Business';
  if (hub === 'sessions') return 'Séances';
  if (hub === 'progression') return 'Progression';
  if (hub === 'nutrition') return 'Nutrition';
  return 'Plus';
};

export const getContextPageLabel = (page: string, role: string): string =>
  getAllContextItems(role).find(item => item.id === page)?.label || ({
    home: role === 'coach' || role === 'owner' ? 'Accueil' : 'Mon espace',
    admin: 'Tableau de bord', crm_tasks: 'Tâches', exercises: 'Exercices',
    trophy: 'Trophées', profile: 'Mes objectifs', notifications: 'Notifications',
  } as Record<string, string>)[page] || page;

export const getMobileTabForPage = (page: string, role: string) => {
  if (role === 'superadmin') return page === 'admin' ? 'admin' : 'plus';
  if (role === 'coach' || role === 'owner') {
    if (page === 'home') return 'home';
    if (['users', 'chat', 'calendar'].includes(page)) return 'users';
    if (['coaching', 'presets', 'nutrition', 'drive'].includes(page)) return 'coaching';
    if (['crm_pipeline', 'crm_finances', 'marketing'].includes(page)) return 'crm_pipeline';
    return 'plus';
  }
  if (page === 'home') return 'home';
  if (['calendar', 'planning'].includes(page)) return 'calendar';
  if (['performances', 'evolution'].includes(page)) return 'performances';
  if (page === 'nutrition') return 'nutrition';
  return 'plus';
};

export const countTodayUpcomingSessions = (bookings: Pick<Booking, 'startTime' | 'status'>[], now = new Date()) => {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const nowTimestamp = now.getTime();

  return bookings.filter(booking => {
    const sessionTime = new Date(booking.startTime).getTime();
    return booking.status === 'confirmed' && sessionTime >= nowTimestamp && sessionTime < startOfTomorrow.getTime();
  }).length;
};
