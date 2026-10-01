import { canManageClubSettings, canManageTeam, authorizationActor } from './server/authorization.ts';
import type { AccountType, Club, Role } from './types.ts';

export type ResolvedAccountType = AccountType | 'legacy';

/** Live browser experiences are deliberately unchanged until the 12A activation review. */
export function isLiveExperienceRole(value: unknown): value is Role {
  return ['superadmin', 'owner', 'coach', 'member'].includes(value as string);
}

export function isAccountType(value: unknown): value is AccountType {
  return value === 'solo' || value === 'studio';
}

export function resolveAccountType(club: { accountType?: unknown } | null | undefined): ResolvedAccountType {
  return isAccountType(club?.accountType) ? club.accountType : 'legacy';
}

/** Read boundary only: never writes a migration or guesses from other fields. */
export function readClubDocument(id: string, data: Record<string, unknown>): Club {
  const club: Record<string, unknown> = { ...data, id };
  if (!isAccountType(club.accountType)) delete club.accountType;
  return club as unknown as Club;
}

const staff: readonly Role[] = ['owner', 'coach', 'superadmin'];
const everyone: readonly Role[] = [...staff, 'member'];
const managers: readonly Role[] = ['owner', 'superadmin'];
type Definition = {
  implemented: boolean;
  studioOnly?: boolean;
  activation?: 'staff';
  roles: readonly Role[];
  note?: string;
};

/** Product readiness, not a replacement for record-level Firestore/API authorization. */
export const CAPABILITY_DEFINITIONS = {
  clients: { implemented: true, roles: staff },
  coaching: { implemented: true, roles: staff },
  programs: { implemented: true, roles: everyone },
  exercises: { implemented: true, roles: everyone },
  nutrition: { implemented: true, roles: everyone },
  progress: { implemented: true, roles: everyone },
  planning: { implemented: true, roles: everyone },
  crm: { implemented: true, roles: staff },
  billing: { implemented: true, roles: everyone, note: 'Member: own billing only; Stripe availability is separate.' },
  finances: { implemented: true, roles: staff },
  analytics: { implemented: true, roles: staff },
  messages: { implemented: true, roles: everyone },
  retention: { implemented: true, roles: staff, note: 'Existing follow-up and action surfaces; no Retain product.' },
  tasks: { implemented: true, roles: staff },
  studioManagement: { implemented: true, studioOnly: true, roles: managers },
  documents: { implemented: true, roles: everyone },
  aiAssistance: { implemented: true, roles: everyone, note: 'Requires server Gemini configuration; coach validates programming.' },
  clubManagement: { implemented: true, roles: managers },
  bookingSettings: { implemented: true, roles: managers },
  stripeConnection: { implemented: true, roles: managers },
  teamManagement: { implemented: true, studioOnly: true, activation: 'staff', roles: managers, note: 'Staff creation, not configurable permissions.' },
  multipleCoaches: { implemented: true, studioOnly: true, activation: 'staff', roles: everyone },
  coachAssignments: { implemented: true, studioOnly: true, roles: managers },
  sharedPlanning: { implemented: true, studioOnly: true, roles: everyone },
  groupClasses: { implemented: true, studioOnly: true, roles: everyone, note: 'Booking capacity maxParticipants only, not a full class management suite.' },
  advancedPermissions: { implemented: false, studioOnly: true, roles: managers },
  cashRegister: { implemented: false, studioOnly: true, roles: staff },
  inventory: { implemented: false, studioOnly: true, roles: staff },
  accessControl: { implemented: false, studioOnly: true, roles: staff },
  multiLocation: { implemented: false, studioOnly: true, roles: managers },
  marketingCampaigns: { implemented: false, roles: staff },
  healthIntegrations: { implemented: false, roles: everyone },
} as const satisfies Record<string, Definition>;

export type Capability = keyof typeof CAPABILITY_DEFINITIONS;
export type CapabilityActor = { role?: Role; clubId?: string; trustedSuperAdmin?: boolean };
export interface CapabilityState {
  implemented: boolean;
  /** null = legacy club: commercial inclusion is unknown, not implicitly solo. */
  available: boolean | null;
  enabled: boolean;
  roleAllowed: boolean;
  /** Target product gating for the next architecture pass; not yet wired to navigation. */
  usable: boolean;
}

function roleAllowed(definition: Definition, actor: CapabilityActor, clubId: string | undefined): boolean {
  if (!actor.role || !definition.roles.includes(actor.role)) return false;
  if (actor.role === 'superadmin') return actor.trustedSuperAdmin === true;
  return !!clubId && actor.clubId === clubId;
}

export function getProductCapabilities(club: Club | null | undefined, actor: CapabilityActor): Record<Capability, CapabilityState> {
  const accountType = resolveAccountType(club);
  return Object.fromEntries(Object.entries(CAPABILITY_DEFINITIONS).map(([key, value]) => {
    const definition: Definition = value;
    const available = !definition.implemented ? false : !definition.studioOnly ? true
      : accountType === 'legacy' ? null : accountType === 'studio';
    const enabled = !!club && definition.implemented && available !== false &&
      (definition.activation !== 'staff' || club.canAddStaff === true);
    const allowed = roleAllowed(definition, actor, club?.id);
    return [key, { implemented: definition.implemented, available, enabled, roleAllowed: allowed, usable: enabled && allowed }];
  })) as Record<Capability, CapabilityState>;
}

/** Current authorization policy, intentionally independent of future Solo/Studio gating.
 * Preserves legacy API access. Callers must supply the verified role/club, never request.body.
 */
export function canManageClub(actor: CapabilityActor, clubId: string | null | undefined): boolean {
  return canManageClubSettings(actor, clubId);
}

/** Compatibility with the existing beta UI flag; not a new commercial entitlement. */
export function canShowStaffCreation(club: Club | null | undefined, actor: CapabilityActor): boolean {
  return canManageTeam(authorizationActor(actor, club, actor.trustedSuperAdmin), club?.id) && (club?.canAddStaff === true || (actor.role === 'superadmin' && actor.trustedSuperAdmin === true));
}
