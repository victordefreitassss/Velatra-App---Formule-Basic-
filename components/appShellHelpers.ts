import type { Booking, Club, Role } from '../types';
import { getProductCapabilities, type Capability } from '../productCapabilities';

export type AppHub = 'home' | 'clients' | 'coaching' | 'planning' | 'business' | 'sessions' | 'progression' | 'nutrition' | 'plus' | 'admin';
export interface NavigationContext {
  role: Role;
  club: Club | null;
  trustedSuperAdmin?: boolean;
  planningEnabled?: boolean;
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
  { id: 'crm_tasks', label: 'Tâches et relances', hub: 'business', capability: 'crm' },
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
const createActions: CreateAction[] = [
  { id: 'add-member', label: 'Ajouter un adhérent', description: 'Ouvrir le formulaire adhérent', capability: 'clients' },
  { id: 'add-preset', label: 'Créer un modèle de programme', description: 'Ouvrir l’éditeur de programme', capability: 'programs' },
  { id: 'add-prospect', label: 'Ajouter un prospect', description: 'Ouvrir le formulaire prospect', capability: 'crm' },
  { id: 'invite-member', label: 'Inviter un adhérent', description: 'Copier le code de votre espace', capability: 'clients' },
];
const isStaff = (role: Role) => role === 'owner' || role === 'coach';
function canNavigate(capability: Capability | undefined, context: NavigationContext): boolean {
  if (!capability) return true;
  const club = context.club;
  if (!club) return false;
  const state = getProductCapabilities(club, {
    role: context.role, clubId: club.id, trustedSuperAdmin: context.trustedSuperAdmin,
  })[capability];
  // Legacy commercial inclusion is unknown: preserve its existing routes.
  return state.implemented && state.enabled && state.roleAllowed;
}
export function getAllContextItems(context: NavigationContext): ContextNavItem[] {
  if (context.role === 'superadmin') return [{ id: 'admin', label: 'Tableau de bord', hub: 'admin' }];
  const items = isStaff(context.role) ? coachItems : memberItems;
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
  const all = isStaff(context.role) ? coachItems : memberItems;
  if (page === 'marketing' && isStaff(context.role)) return 'business';
  return all.find(item => item.id === page)?.hub || 'plus';
}
export function getHubDefaultPage(hub: AppHub, context: NavigationContext): string {
  if (context.role === 'superadmin') return 'admin';
  return getContextItemsForHub(hub, context)[0]?.id || 'home';
}
export function getPrimaryHubsForRole(context: NavigationContext): PrimaryHubItem[] {
  if (context.role === 'superadmin') return [{ id: 'admin', label: 'Admin', page: 'admin' }];
  return (isStaff(context.role) ? coachHubs : memberHubs).map(hub => ({
    id: hub.id, label: hub.label,
    page: hub.id === 'home' || hub.id === 'plus' ? hub.page : getHubDefaultPage(hub.id, context),
  }));
}
export function getMobileMoreGroups(context: NavigationContext): MobileHubGroup[] {
  if (context.role === 'superadmin') return [{ label: 'Administration', hub: 'admin', items: getAllContextItems(context) }];
  if (!isStaff(context.role)) {
    const available = getContextItemsForHub('plus', context);
    return [
      { label: 'Mon coach', hub: 'plus' as const, ids: ['messages'] },
      { label: 'Mon compte', hub: 'plus' as const, ids: ['profile'] },
      { label: 'Mes informations', hub: 'plus' as const, ids: ['drive', 'about'] },
      { label: 'Outils', hub: 'plus' as const, ids: ['ai_coach'] },
    ].map(group => ({ label: group.label, hub: group.hub, items: available.filter(item => group.ids.includes(item.id)) }))
      .filter(group => group.items.length > 0);
  }
  const hubs: { id: AppHub; label: string }[] = isStaff(context.role)
    ? [...coachHubs.slice(1), { id: 'plus', label: 'Compte et aide' }]
    : [{ id: 'plus', label: 'Plus' }];
  return hubs.map(hub => ({
    label: hub.label, hub: hub.id,
    items: getContextItemsForHub(hub.id, context).filter(item =>
      hub.id === 'plus' || item.id !== getHubDefaultPage(hub.id, context),
    ),
  })).filter(group => group.items.length > 0);
}
export function getCreateActions(context: NavigationContext): CreateAction[] {
  if (!isStaff(context.role)) return [];
  return createActions.filter(action => canNavigate(action.capability, context) &&
    (action.id !== 'invite-member' || !!context.club?.id));
}
export function getHubLabel(hub: AppHub, context: NavigationContext): string {
  if (hub === 'admin') return 'Administration';
  if (hub === 'plus') return 'Plus';
  return (isStaff(context.role) ? coachHubs : memberHubs).find(item => item.id === hub)?.label || 'Accueil';
}
export function getContextPageLabel(page: string, context: NavigationContext): string {
  return getAllContextItems(context).find(item => item.id === page)?.label || page;
}
export function getMobileTabForPage(page: string, context: NavigationContext): string {
  if (context.role === 'superadmin') return page === 'admin' ? 'admin' : 'plus';
  const hub = getAppHubForPage(page, context);
  if (hub === 'home') return 'home';
  if (hub === 'plus' || hub === 'admin') return 'plus';
  return getHubDefaultPage(hub, context);
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
