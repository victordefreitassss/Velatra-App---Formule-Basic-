import type { AppState, Booking, Club, Program, Role, Subscription, User } from '../types';
import { canManageClub, getProductCapabilities, type Capability } from '../productCapabilities';

export type Client360SectionId = 'overview' | 'coaching' | 'progress' | 'followup' | 'nutrition' | 'calendar' | 'administrative' | 'communication';
export type Client360AdminSectionId = 'profile' | 'billing' | 'documents';
export interface Client360Section {
  id: Client360SectionId;
  label: string;
  capability?: Capability;
}

const sections: readonly Client360Section[] = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'coaching', label: 'Coaching', capability: 'programs' },
  { id: 'progress', label: 'Progression', capability: 'progress' },
  { id: 'followup', label: 'Suivi', capability: 'clients' },
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
  return sections.filter(section => !section.capability || capabilities[section.capability].usable);
}

export function getClient360AdminSections(club: Club | null, actor: { role?: Role; clubId?: string; trustedSuperAdmin?: boolean }) {
  const capabilities = getProductCapabilities(club, actor);
  if (!capabilities.clients.usable) return [];
  return adminSections.filter(section => !section.capability || capabilities[section.capability].usable);
}

export function canShowClient360AccountActions(club: Club | null, actor: { role?: Role; clubId?: string; trustedSuperAdmin?: boolean }): boolean {
  return canManageClub(actor, club?.id);
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
  const latest = <T,>(items: T[], date: (item: T) => string) =>
    [...items].sort((a, b) => new Date(date(b)).getTime() - new Date(date(a)).getTime())[0] || null;
  const nextBooking = [...state.bookings]
    .filter(booking => Number(booking.memberId) === memberId && booking.status === 'confirmed' && new Date(booking.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] || null;
  return {
    nextBooking,
    lastActivity: latest(state.logs.filter(log => Number(log.memberId) === memberId), log => log.date),
    lastBodyRecord: latest(state.bodyData.filter(record => Number(record.memberId) === memberId), record => record.date),
    activeSubscription: state.subscriptions.find(subscription => Number(subscription.memberId) === memberId && subscription.status === 'active') || null,
    lastNote: latest(member.coachingNotesHistory || [], note => note.date),
    activeProgram: state.programs.find(program => Number(program.memberId) === memberId && !program.isPlannedSession) || null,
  };
}
