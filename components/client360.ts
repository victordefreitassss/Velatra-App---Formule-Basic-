import type { AppState, Booking, Club, Program, Role, Subscription, User } from '../types';
import { canManageClub, getProductCapabilities, resolveAccountType, type Capability } from '../productCapabilities';

export type Client360SectionId = 'onboarding' | 'retention' | 'overview' | 'coaching' | 'progress' | 'followup' | 'nutrition' | 'calendar' | 'administrative' | 'communication';
export type Client360AdminSectionId = 'profile' | 'billing' | 'documents';
export interface Client360Section {
  id: Client360SectionId;
  label: string;
  capability?: Capability;
}

const sections: readonly Client360Section[] = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'onboarding', label: 'Onboarding', capability: 'clients' },
  { id: 'coaching', label: 'Coaching', capability: 'programs' },
  { id: 'progress', label: 'Progression', capability: 'progress' },
  { id: 'followup', label: 'Suivi', capability: 'clients' },
  { id: 'retention', label: 'Rétention', capability: 'retention' },
  { id: 'nutrition', label: 'Nutrition', capability: 'nutrition' },
  { id: 'calendar', label: 'Calendrier', capability: 'planning' },
  { id: 'administrative', label: 'Administratif', capability: 'clients' },
  { id: 'communication', label: 'Communication', capability: 'messages' },
];

const adminSections: readonly { id: Client360AdminSectionId; label: string; capability?: Capability }[] = [
  { id: 'profile', label: 'Profil' },
  { id: 'billing', label: 'Facturation', capability: 'billing' },
  { id: 'documents', label: 'Documents', capability: 'documents' },
];

export function getClient360Sections(club: Club | null, actor: { role?: Role; clubId?: string; trustedSuperAdmin?: boolean }): Client360Section[] {
  const capabilities = getProductCapabilities(club, actor);
  if (!capabilities.clients.usable) return [];
  return sections.filter(section => (section.id !== 'onboarding' || ['owner', 'manager', 'coach'].includes(actor.role || '') && ['solo', 'studio'].includes(club?.accountType || '')) && (!section.capability || capabilities[section.capability].usable));
}

export function getClient360AdminSections(club: Club | null, actor: { role?: Role; clubId?: string; trustedSuperAdmin?: boolean }) {
  const capabilities = getProductCapabilities(club, actor);
  if (!capabilities.clients.usable) return [];
  return adminSections.filter(section => !section.capability || capabilities[section.capability].usable);
}

export function canShowClient360AccountActions(club: Club | null, actor: { role?: Role; clubId?: string; trustedSuperAdmin?: boolean }): boolean {
  return canManageClub(actor, club?.id);
}

export function getClient360CoachingContact(member: User, club: Club | null, users: User[]): User | null {
  if (!club || member.clubId !== club.id) return null;
  if (resolveAccountType(club) === 'solo') {
    const owner = users.find(user => user.role === 'owner' && user.clubId === club.id && user.firebaseUid === club.ownerId);
    if (owner) return owner;
  }
  return users.find(user => user.role === 'coach' && user.clubId === club.id &&
    user.firebaseUid === member.assignedCoachUid) || null;
}

export function getClient360QuickActions(visibleSections: Client360Section[]): Array<'message' | 'program' | 'plan' | 'note'> {
  const visible = new Set(visibleSections.map(section => section.id));
  return ([['message', 'communication'], ['program', 'coaching'], ['plan', 'calendar'], ['note', 'followup']] as const)
    .filter(([, section]) => visible.has(section))
    .map(([action]) => action);
}

export interface Client360Facts {
  nextBooking: Booking | null;
  lastActivity: AppState['logs'][number] | null;
  lastBodyRecord: AppState['bodyData'][number] | null;
  activeSubscription: Subscription | null;
  lastNote: NonNullable<User['coachingNotesHistory']>[number] | null;
  activeProgram: Program | null;
}

export function getClient360Facts(member: User, state: Pick<AppState, 'bookings' | 'logs' | 'bodyData' | 'subscriptions' | 'programs'>, now = Date.now()): Client360Facts {
  const memberId = Number(member.id);
  const own = (record: { clubId: string; memberId?: number }) => !!member.clubId && record.clubId === member.clubId && Number(record.memberId) === memberId;
  const latest = <T,>(items: T[], date: (item: T) => string) =>
    [...items].sort((a, b) => new Date(date(b)).getTime() - new Date(date(a)).getTime())[0] || null;
  const nextBooking = [...state.bookings]
    .filter(booking => own(booking) && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  return {
    nextBooking,
    lastActivity: latest(state.logs.filter(log => own(log)), log => log.date),
    lastBodyRecord: latest(state.bodyData.filter(record => own(record)), record => record.date),
    activeSubscription: state.subscriptions.find(subscription => own(subscription) && subscription.status === 'active') || null,
    lastNote: latest(member.coachingNotesHistory || [], note => note.date),
    activeProgram: state.programs.find(program => own(program) && !program.isPlannedSession) || null,
  };
}
