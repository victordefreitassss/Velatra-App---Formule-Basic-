import type { Booking } from '../types';

export type AppHub = 'home' | 'clients' | 'coaching' | 'business' | 'plus' | 'sessions' | 'progression' | 'nutrition' | 'admin';

export interface ContextNavItem {
  id: string;
  label: string;
  hub: AppHub;
}

export interface PrimaryHubItem {
  id: AppHub;
  label: string;
  page: string;
}

export interface MobileHubGroup {
  label: string;
  hub: AppHub;
  items: ContextNavItem[];
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
    { id: 'exercises', label: 'Bibliothèque d’exercices', hub: 'coaching' },
    { id: 'history', label: 'Historique', hub: 'coaching' },
  ],
  business: [
    { id: 'crm_pipeline', label: 'Prospects', hub: 'business' },
    { id: 'crm_finances', label: 'Finances', hub: 'business' },
    { id: 'marketing', label: 'Campagnes', hub: 'business' },
    { id: 'crm_tasks', label: 'Tâches', hub: 'business' },
  ],
  plus: [
    { id: 'about', label: 'Fiche du club', hub: 'plus' },
    { id: 'guide', label: 'Guides', hub: 'plus' },
    { id: 'settings', label: 'Paramètres', hub: 'plus' },
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
  if (page === 'home') return 'home';
  const isCoach = role === 'coach' || role === 'owner';
  const pages = Object.values(isCoach ? coachContext : memberContext).flat();
  return pages.find(item => item.id === page)?.hub || 'plus';
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
  return getContextItemsForHub(hub, role)[0]?.id || 'home';
};

export const getPrimaryHubsForRole = (role: string): PrimaryHubItem[] => {
  if (role === 'superadmin') return [{ id: 'admin', label: 'Admin', page: 'admin' }];
  if (role === 'coach' || role === 'owner') return [
    { id: 'home', label: 'Accueil', page: 'home' },
    { id: 'clients', label: 'Clients', page: getHubDefaultPage('clients', role) },
    { id: 'coaching', label: 'Coaching', page: getHubDefaultPage('coaching', role) },
    { id: 'business', label: 'Business', page: getHubDefaultPage('business', role) },
    { id: 'plus', label: 'Plus', page: getHubDefaultPage('plus', role) },
  ];
  return [
    { id: 'home', label: 'Accueil', page: 'home' },
    { id: 'sessions', label: 'Séances', page: getHubDefaultPage('sessions', role) },
    { id: 'progression', label: 'Progression', page: getHubDefaultPage('progression', role) },
    { id: 'nutrition', label: 'Nutrition', page: getHubDefaultPage('nutrition', role) },
    { id: 'plus', label: 'Plus', page: getHubDefaultPage('plus', role) },
  ];
};

export const getMobileMoreGroups = (role: string, planningEnabled = true): MobileHubGroup[] => {
  if (role === 'superadmin') return [{
    label: 'Administration', hub: 'admin',
    items: [{ id: 'admin', label: 'Tableau de bord', hub: 'admin' }],
  }];
  const isCoach = role === 'coach' || role === 'owner';
  const hubs: { label: string; hub: AppHub }[] = isCoach ? [
    { label: 'Clients', hub: 'clients' },
    { label: 'Coaching', hub: 'coaching' },
    { label: 'Business', hub: 'business' },
    { label: 'Plus', hub: 'plus' },
  ] : [
    { label: 'Séances', hub: 'sessions' },
    { label: 'Progression', hub: 'progression' },
    { label: 'Nutrition', hub: 'nutrition' },
    { label: 'Plus', hub: 'plus' },
  ];
  return hubs.map(group => ({
    ...group,
    items: getContextItemsForHub(group.hub, role, planningEnabled)
      .filter(item => group.hub === 'plus' || item.id !== getHubDefaultPage(group.hub, role)),
  }));
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
  const hub = getAppHubForPage(page, role);
  if (hub === 'home') return 'home';
  if (hub === 'plus' || hub === 'admin') return 'plus';
  return getHubDefaultPage(hub, role);
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
