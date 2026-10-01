import type { Booking, Club, Role, ProductRole } from '../types';
import { resolveProductExperience, resolveExperienceCapabilities, type ProductFormat } from '../productExperience';
import { getProductCapabilities, type Capability } from '../productCapabilities';

export type AppHub = 'home' | 'clients' | 'coaching' | 'planning' | 'business' | 'crm' | 'team' | 'messages' | 'sessions' | 'progression' | 'nutrition' | 'plus' | 'admin';
export interface NavigationContext {
  role: Role;
  club: Club | null;
  trustedSuperAdmin?: boolean;
  planningEnabled?: boolean;
  format?: ProductFormat;
}
export interface ContextNavItem {
  id: string;
  label: string;
  hub: AppHub;
  capability?: Capability;
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
export type CreateActionId = 'add-member' | 'add-preset' | 'add-prospect' | 'invite-member';
export interface CreateAction {
  id: CreateActionId;
  label: string;
  description: string;
  capability: Capability;
}

// state.page stays stable when a destination moves to another space.
const coachItems: ContextNavItem[] = [
  { id: 'users', label: 'Adhérents', hub: 'clients', capability: 'clients' },
  { id: 'chat', label: 'Messages', hub: 'clients', capability: 'messages' },
  { id: 'coaching', label: 'Séance coach', hub: 'coaching', capability: 'coaching' },
  { id: 'presets', label: 'Programmes', hub: 'coaching', capability: 'programs' },
  { id: 'nutrition', label: 'Nutrition', hub: 'coaching', capability: 'nutrition' },
  { id: 'drive', label: 'Documents', hub: 'coaching', capability: 'documents' },
  { id: 'exercises', label: 'Bibliothèque d’exercices', hub: 'coaching', capability: 'exercises' },
  { id: 'history', label: 'Historique', hub: 'coaching', capability: 'progress' },
  { id: 'calendar', label: 'Calendrier et réservations', hub: 'planning', capability: 'planning' },
  { id: 'crm_pipeline', label: 'Prospects', hub: 'business', capability: 'crm' },
  { id: 'team', label: 'Équipe', hub: 'business', capability: 'teamManagement' },
  { id: 'crm_tasks', label: 'Tâches et relances', hub: 'business', capability: 'tasks' },
  { id: 'crm_finances', label: 'Finances', hub: 'business', capability: 'finances' },
  { id: 'about', label: 'Fiche du club', hub: 'plus' },
  { id: 'settings', label: 'Paramètres', hub: 'plus' },
  { id: 'guide', label: 'Guides', hub: 'plus' },
];
const memberItems: ContextNavItem[] = [
  { id: 'calendar', label: 'Mes séances', hub: 'sessions', capability: 'programs' },
  { id: 'planning', label: 'Réserver un cours', hub: 'sessions', capability: 'planning' },
  { id: 'history', label: 'Historique des séances', hub: 'sessions', capability: 'progress' },
  { id: 'performances', label: 'Performances', hub: 'progression', capability: 'progress' },
  { id: 'evolution', label: 'Évolution et photos', hub: 'progression', capability: 'progress' },
  { id: 'nutrition', label: 'Mon alimentation', hub: 'nutrition', capability: 'nutrition' },
  { id: 'profile', label: 'Mon profil et objectifs', hub: 'plus' },
  { id: 'messages', label: 'Messages', hub: 'plus', capability: 'messages' },
  { id: 'drive', label: 'Documents', hub: 'plus', capability: 'documents' },
  { id: 'about', label: 'Infos du club', hub: 'plus' },
  { id: 'ai_coach', label: 'Velatra AI', hub: 'plus', capability: 'aiAssistance' },
];
const coachHubs: { id: AppHub; label: string; page: string }[] = [
  { id: 'home', label: 'Accueil', page: 'home' },
  { id: 'clients', label: 'Clients', page: 'users' },
  { id: 'coaching', label: 'Coaching', page: 'coaching' },
  { id: 'planning', label: 'Planning', page: 'calendar' },
  { id: 'business', label: 'Business', page: 'crm_pipeline' },
];
const memberHubs: { id: AppHub; label: string; page: string }[] = [
  { id: 'home', label: 'Accueil', page: 'home' },
  { id: 'sessions', label: 'Séances', page: 'calendar' },
  { id: 'progression', label: 'Progression', page: 'performances' },
  { id: 'nutrition', label: 'Nutrition', page: 'nutrition' },
  { id: 'plus', label: 'Plus', page: 'profile' },
];
const staffHubCatalog: PrimaryHubItem[] = [...coachHubs,
  { id: 'crm', label: 'CRM', page: 'crm_pipeline' },
  { id: 'team', label: 'Équipe', page: 'team' },
  { id: 'messages', label: 'Messages', page: 'chat' },
  { id: 'plus', label: 'Plus', page: 'profile' },
];
const experienceOf = (context: NavigationContext) => resolveProductExperience(context.club, {
  role: context.role, clubId: context.club?.id, trustedSuperAdmin: context.trustedSuperAdmin,
});
function staffItems(context: NavigationContext): ContextNavItem[] {
  const experience = experienceOf(context);
  const modern = ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH'].includes(experience);
  if (!modern) return coachItems;
  return [...coachItems, { id: 'pulse', label: 'Pulse · Actions', hub: 'plus', capability: 'tasks' } as ContextNavItem].filter(item => experience !== 'STUDIO_COACH' || !['crm_pipeline', 'crm_finances', 'team', 'settings'].includes(item.id)).map<ContextNavItem>(item => {
    if (item.id === 'crm_tasks') return { ...item, label: experience === 'STUDIO_COACH' ? 'Mes tâches' : 'Tâches et relances', hub: experience === 'STUDIO_MANAGER' ? 'business' : 'planning' };
    if (item.id === 'crm_pipeline') return { ...item, hub: 'crm' };
    if (item.id === 'team') return { ...item, hub: 'team' };
    if (item.id === 'chat' && experience !== 'STUDIO_MANAGER') return { ...item, hub: 'messages' };
    return { ...item };
  });
}
function staffHubOrder(context: NavigationContext): AppHub[] {
  const experience = experienceOf(context);
  if (context.format === 'phone') {
    if (experience === 'STUDIO_MANAGER' || experience === 'STUDIO_OWNER') return ['home', 'clients', 'planning', 'crm', 'plus'];
    if (experience === 'STUDIO_COACH') return ['home', 'clients', 'coaching', 'planning', 'messages'];
    if (experience === 'SOLO_OWNER') return ['home', 'clients', 'coaching', 'planning', 'plus'];
  }
  if (experience === 'SOLO_OWNER') return ['home', 'clients', 'coaching', 'crm', 'planning', 'business', 'messages'];
  if (experience === 'STUDIO_MANAGER') return ['home', 'clients', 'crm', 'planning', 'team', 'business'];
  if (experience === 'STUDIO_COACH') return ['home', 'clients', 'coaching', 'planning', 'messages'];
  if (experience === 'STUDIO_OWNER') return ['home', 'clients', 'crm', 'planning', 'team', 'business', 'coaching', 'messages'];
  return coachHubs.map(item => item.id);
}
const createActions: CreateAction[] = [
  { id: 'add-member', label: 'Ajouter un adhérent', description: 'Ouvrir le formulaire adhérent', capability: 'clients' },
  { id: 'add-preset', label: 'Créer un modèle de programme', description: 'Ouvrir l’éditeur de programme', capability: 'programs' },
  { id: 'add-prospect', label: 'Ajouter un prospect', description: 'Ouvrir le formulaire prospect', capability: 'crm' },
  { id: 'invite-member', label: 'Inviter un adhérent', description: 'Copier le code de votre espace', capability: 'clients' },
];
const isStaffExperience = (context: NavigationContext) => {
  const experience = resolveProductExperience(context.club, {
    role: context.role, clubId: context.club?.id, trustedSuperAdmin: context.trustedSuperAdmin,
  });
  // Keep historical routes while club data loads and for old unsupported combinations.
  if (experience === 'UNSUPPORTED') return context.role === 'owner' || context.role === 'coach';
  return ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH', 'LEGACY_OWNER', 'LEGACY_COACH'].includes(experience);
};
function canNavigate(capability: Capability | undefined, context: NavigationContext): boolean {
  if (!capability) return true;
  const club = context.club;
  if (!club) return false;
  if (context.role === 'manager') return resolveExperienceCapabilities(club, { role: context.role, clubId: club.id })[capability].runtimeUsable;
  const state = getProductCapabilities(club, {
    role: context.role, clubId: club.id, trustedSuperAdmin: context.trustedSuperAdmin,
  })[capability];
  // Legacy commercial inclusion is unknown: preserve its existing routes.
  return state.implemented && state.enabled && state.roleAllowed;
}
export function getAllContextItems(context: NavigationContext): ContextNavItem[] {
  if (context.role === 'superadmin') return [{ id: 'admin', label: 'Tableau de bord', hub: 'admin' }];
  if (context.role === 'manager' && resolveProductExperience(context.club, { role: context.role, clubId: context.club?.id }) !== 'STUDIO_MANAGER') return [];
  const restricted = context.role === 'manager' || context.role === 'coach' && context.club?.accountType === 'studio';
  const items = (isStaffExperience(context) ? staffItems(context) : memberItems).filter(item => !(restricted && item.id === 'settings') && !(context.role === 'manager' && item.id === 'coaching'));
  if (restricted) items.push({ id: 'profile', label: 'Mon profil', hub: 'plus' });
  const home: ContextNavItem = { id: 'home', label: 'Accueil', hub: 'home' };
  return [home, ...items.filter(item =>
    (context.planningEnabled !== false || item.id !== 'planning') && canNavigate(item.capability, context),
  )];
}
export function getContextItemsForHub(hub: AppHub, context: NavigationContext): ContextNavItem[] {
  if (hub === 'home' || hub === 'admin') return [];
  return getAllContextItems(context).filter(item => item.hub === hub);
}
export function getAppHubForPage(page: string, context: NavigationContext): AppHub {
  if (context.role === 'superadmin') return 'admin';
  if (page === 'home') return 'home';
  const all = isStaffExperience(context) ? staffItems(context) : memberItems;
  if (page === 'marketing' && isStaffExperience(context)) return 'business';
  return all.find(item => item.id === page)?.hub || 'plus';
}
export function getHubDefaultPage(hub: AppHub, context: NavigationContext): string {
  if (context.role === 'superadmin') return 'admin';
  return getContextItemsForHub(hub, context)[0]?.id || 'home';
}
export function getPrimaryHubsForRole(context: NavigationContext): PrimaryHubItem[] {
  if (context.role === 'superadmin') return [{ id: 'admin', label: 'Admin', page: 'admin' }];
  if (context.role === 'manager' && !isStaffExperience(context)) return [];
  const base = isStaffExperience(context) ? staffHubOrder(context).flatMap(id => {
    const hub = staffHubCatalog.find(candidate => candidate.id === id);
    return hub && (id === 'home' || id === 'plus' || getContextItemsForHub(id, context).length) ? [hub] : [];
  }) : memberHubs;
  return base.map(hub => ({
    id: hub.id, label: hub.label,
    page: hub.id === 'home' || hub.id === 'plus' ? hub.page : getHubDefaultPage(hub.id, context),
  }));
}
export function getMobileMoreGroups(context: NavigationContext): MobileHubGroup[] {
  if (context.role === 'superadmin') return [{ label: 'Administration', hub: 'admin', items: getAllContextItems(context) }];
  if (!isStaffExperience(context)) {
    const available = getContextItemsForHub('plus', context);
    return [
      { label: 'Mon coach', hub: 'plus' as const, ids: ['messages'] },
      { label: 'Mon compte', hub: 'plus' as const, ids: ['profile'] },
      { label: 'Mes informations', hub: 'plus' as const, ids: ['drive', 'about'] },
      { label: 'Outils', hub: 'plus' as const, ids: ['ai_coach'] },
    ].map(group => ({ label: group.label, hub: group.hub, items: available.filter(item => group.ids.includes(item.id)) }))
      .filter(group => group.items.length > 0);
  }
  const modern = ['SOLO_OWNER', 'STUDIO_OWNER', 'STUDIO_MANAGER', 'STUDIO_COACH'].includes(experienceOf(context));
  const mobilePages = new Set(getPrimaryHubsForRole({ ...context, format: 'phone' }).filter(hub => hub.id !== 'plus').map(hub => hub.page));
  const hubs: { id: AppHub; label: string }[] = (modern ? staffHubCatalog : [...coachHubs, { id: 'plus' as AppHub, label: 'Compte et aide' }]).filter(hub => hub.id !== 'home');
  return hubs.map(hub => ({
    label: hub.label, hub: hub.id,
    items: getContextItemsForHub(hub.id, context).filter(item =>
      hub.id === 'plus' || (modern ? !mobilePages.has(item.id) : item.id !== getHubDefaultPage(hub.id, context)),
    ),
  })).filter(group => group.items.length > 0);
}
export function getCreateActions(context: NavigationContext): CreateAction[] {
  if (!isStaffExperience(context)) return [];
  return createActions.filter(action => canNavigate(action.capability, context) &&
    (experienceOf(context) !== 'STUDIO_COACH' || action.id === 'add-preset') &&
    (action.id !== 'invite-member' || !!context.club?.id));
}
export function getHubLabel(hub: AppHub, context: NavigationContext): string {
  if (hub === 'admin') return 'Administration';
  if (hub === 'plus') return 'Plus';
  return (isStaffExperience(context) ? staffHubCatalog : memberHubs).find(item => item.id === hub)?.label || 'Accueil';
}
export function getContextPageLabel(page: string, context: NavigationContext): string {
  return getAllContextItems(context).find(item => item.id === page)?.label || page;
}
export function getMobileTabForPage(page: string, context: NavigationContext): string {
  if (context.role === 'superadmin') return page === 'admin' ? 'admin' : 'plus';
  const hub = getAppHubForPage(page, context);
  if (hub === 'home') return 'home';
  if (hub === 'plus' || hub === 'admin') return 'plus';
  return getPrimaryHubsForRole({ ...context, format: 'phone' }).find(item => item.id === hub)?.page || 'plus';
}
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

/** Preview navigation for explicit SaaS offers. Do not use it to authorize writes. */
export function resolveExperienceNavigation(context: Omit<NavigationContext, 'role'> & { role: ProductRole; actorClubId?: string }) {
  const actor = { role: context.role, clubId: context.actorClubId ?? context.club?.id, trustedSuperAdmin: context.trustedSuperAdmin };
  const experience = resolveProductExperience(context.club, actor);
  if (experience === 'UNSUPPORTED') return { experience, hubs: [] as PrimaryHubItem[], items: [] as ContextNavItem[] };
  if (experience === 'SUPERADMIN') return { experience, hubs: [{ id: 'admin', label: 'Admin', page: 'admin' }] as PrimaryHubItem[], items: [{ id: 'admin', label: 'Tableau de bord', hub: 'admin' }] as ContextNavItem[] };
  const caps = resolveExperienceCapabilities(context.club, actor);
  const member = experience === 'MEMBER';
  const operational = experience === 'STUDIO_COACH';
  const source = member ? memberItems : staffItems(context);
  const items: ContextNavItem[] = [{ id: 'home', label: 'Accueil', hub: 'home' }, ...source.filter(item =>
    (item.id !== 'settings' || caps.clubManagement.targetUsable) && (item.id !== 'coaching' || experience !== 'STUDIO_MANAGER') &&
    (context.planningEnabled !== false || item.id !== 'planning') &&
    (!item.capability || caps[item.capability].targetUsable),
  ).map(item => operational && item.id === 'crm_tasks' ? { ...item, hub: 'planning' as AppHub } : { ...item })];
  const base = member ? memberHubs : staffHubCatalog;
  const order: AppHub[] = member ? memberHubs.map(hub => hub.id) : staffHubOrder(context);
  const hubs = order.flatMap(id => {
    const hub = base.find(candidate => candidate.id === id);
    if (!hub || (id !== 'home' && !items.some(item => item.hub === id))) return [];
    return [{ ...hub, page: id === 'home' || id === 'plus' ? hub.page : items.find(item => item.hub === id)!.id }];
  });
  return { experience, hubs, items };
}
