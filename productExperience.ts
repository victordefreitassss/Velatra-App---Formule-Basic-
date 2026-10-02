import { isOrganizationActive } from './organizationAccess.ts';
import type { Club, ProductRole, SaasPlanId } from './types.ts';
import { CAPABILITY_DEFINITIONS, getProductCapabilities, resolveAccountType, type Capability, type CapabilityActor } from './productCapabilities.ts';

/** Draft offers, not billing products or a migration from Basic/Classic/Premium. */
export interface SaasPlan {
  id: SaasPlanId;
  label: string;
  entitlements: readonly Capability[];
}
const commonEntitlements = (Object.keys(CAPABILITY_DEFINITIONS) as Capability[]).filter(feature => {
  const definition = CAPABILITY_DEFINITIONS[feature];
  return definition.implemented && !('studioOnly' in definition && definition.studioOnly);
});
export const SAAS_PLAN_CATALOG: Readonly<Record<string, SaasPlan>> = {
  coach: { id: 'coach', label: 'Velatra Coach', entitlements: commonEntitlements },
  studio: {
    id: 'studio', label: 'Velatra Studio',
    entitlements: (Object.keys(CAPABILITY_DEFINITIONS) as Capability[]).filter(feature => CAPABILITY_DEFINITIONS[feature].implemented),
  },
};
export type ResolvedSaasPlan =
  | { kind: 'legacy'; plan: null }
  | { kind: 'unknown'; plan: null; requestedId: unknown }
  | { kind: 'known'; plan: SaasPlan };
export function resolveSaasPlan(club: Pick<Club, 'saasPlanId'> | null | undefined): ResolvedSaasPlan {
  const id: unknown = club?.saasPlanId;
  if (id === undefined) return { kind: 'legacy', plan: null };
  if (typeof id !== 'string' || !Object.hasOwn(SAAS_PLAN_CATALOG, id)) return { kind: 'unknown', plan: null, requestedId: id };
  return { kind: 'known', plan: SAAS_PLAN_CATALOG[id] };
}
export function resolveProductRole(value: unknown): ProductRole | null {
  return ['superadmin', 'owner', 'manager', 'coach', 'member'].includes(value as string) ? value as ProductRole : null;
}
export type ProductExperience = 'SUPERADMIN' | 'SOLO_OWNER' | 'STUDIO_OWNER' | 'STUDIO_MANAGER' | 'STUDIO_COACH' | 'MEMBER' | 'LEGACY_OWNER' | 'LEGACY_COACH' | 'UNSUPPORTED';
export type ProductActor = Omit<CapabilityActor, 'role'> & { role?: ProductRole };
export function resolveProductExperience(club: Club | null | undefined, actor: ProductActor): ProductExperience {
  const role = resolveProductRole(actor.role);
  if (role === 'superadmin') return actor.trustedSuperAdmin === true ? 'SUPERADMIN' : 'UNSUPPORTED';
  if (!club || !actor.clubId || actor.clubId !== club.id) return 'UNSUPPORTED';
  if (role === 'member') return 'MEMBER';
  const accountType = resolveAccountType(club);
  if (role === 'owner') return accountType === 'solo' ? 'SOLO_OWNER' : accountType === 'studio' ? 'STUDIO_OWNER' : 'LEGACY_OWNER';
  if (role === 'coach') return accountType === 'studio' ? 'STUDIO_COACH' : accountType === 'legacy' ? 'LEGACY_COACH' : 'UNSUPPORTED';
  return role === 'manager' && accountType === 'studio' ? 'STUDIO_MANAGER' : 'UNSUPPORTED';
}

/** Target permission scope. Record identity and assignment still require server/rules checks. */
export type PermissionScope = 'none' | 'self' | 'assigned' | 'tenant' | 'platform';
const ownerOnly: readonly Capability[] = ['clubManagement', 'bookingSettings', 'stripeConnection'];
const operational: readonly Capability[] = ['clients', 'coaching', 'programs', 'exercises', 'nutrition', 'progress', 'planning', 'messages', 'documents', 'tasks'];
const managerFeatures: readonly Capability[] = [...operational, 'crm', 'retention', 'analytics', 'teamManagement', 'sharedPlanning', 'multipleCoaches', 'groupClasses', 'studioManagement', 'coachAssignments'];
export function resolveRolePermission(feature: Capability, club: Club | null | undefined, actor: ProductActor): PermissionScope {
  const experience = resolveProductExperience(club, actor);
  if (experience === 'UNSUPPORTED') return 'none';
  if (experience === 'SUPERADMIN') return 'platform';
  if (experience === 'MEMBER') return (CAPABILITY_DEFINITIONS[feature].roles as readonly string[]).includes('member') ? 'self' : 'none';
  if (experience === 'STUDIO_MANAGER') return !ownerOnly.includes(feature) && managerFeatures.includes(feature) ? 'tenant' : 'none';
  if (experience === 'STUDIO_COACH') return (operational.includes(feature) || feature === 'aiAssistance') ? 'assigned' : 'none';
  return (CAPABILITY_DEFINITIONS[feature].roles as readonly string[]).includes(actor.role || '') ? 'tenant' : 'none';
}
export function resolveEntitlement(feature: Capability, club: Club | null | undefined): boolean | null {
  if (!club || !CAPABILITY_DEFINITIONS[feature].implemented) return false;
  const resolved = resolveSaasPlan(club);
  if (resolved.kind === 'unknown') return false;
  if (resolved.kind === 'legacy') return null;
  const definition = CAPABILITY_DEFINITIONS[feature];
  return resolved.plan.entitlements.includes(feature) &&
    (!('studioOnly' in definition && definition.studioOnly) || resolveAccountType(club) === 'studio');
}
export interface ExperienceCapability {
  entitlement: boolean | null;
  scope: PermissionScope;
  /** Target product access, never a substitute for deployed authorization. */
  targetUsable: boolean;
  /** Runtime permission plus entitlement; API and rules still enforce every action. */
  runtimeUsable: boolean;
}
export function resolveExperienceCapabilities(club: Club | null | undefined, actor: ProductActor): Record<Capability, ExperienceCapability> {
  const legacy = getProductCapabilities(club, actor);
  return Object.fromEntries((Object.keys(CAPABILITY_DEFINITIONS) as Capability[]).map(feature => {
    const entitlement = resolveEntitlement(feature, club);
    const scope = resolveRolePermission(feature, club, actor);
    const targetUsable = isOrganizationActive(club) && CAPABILITY_DEFINITIONS[feature].implemented && scope !== 'none' &&
      (entitlement === null ? legacy[feature].enabled : entitlement);
    // No SaaS plan is provisioned by this mission. Explicit plans remain preview-only
    // until server and deployed rules enforce commercial inclusion and target scopes.
    const runtimeUsable = actor.role === 'manager' ? targetUsable && legacy[feature].roleAllowed : resolveSaasPlan(club).kind === 'legacy' && legacy[feature].usable;
    return [feature, { entitlement, scope, targetUsable, runtimeUsable }];
  })) as Record<Capability, ExperienceCapability>;
}

export type ProductFormat = 'phone' | 'tablet' | 'desktop' | 'largeDesktop';
export type HomeSection = 'agenda' | 'actions' | 'clients' | 'sales' | 'business' | 'coaching' | 'messages' | 'tasks' | 'team' | 'shortcuts';
export function resolveProductFormat(width: number): ProductFormat {
  if (!Number.isFinite(width) || width < 0) return 'desktop';
  return width < 768 ? 'phone' : width < 1024 ? 'tablet' : width < 1600 ? 'desktop' : 'largeDesktop';
}
export function resolvePresentationStrategy(experience: ProductExperience, format: ProductFormat) {
  const field = format === 'phone';
  const sections: HomeSection[] = experience === 'SOLO_OWNER'
    ? field ? ['agenda', 'actions', 'messages', 'clients', 'sales', 'shortcuts', 'business']
      : ['actions', 'clients', 'sales', 'business', 'agenda', 'coaching', 'messages', 'shortcuts']
    : experience === 'STUDIO_COACH'
      ? field ? ['agenda', 'actions', 'messages', 'tasks', 'clients', 'shortcuts']
        : format === 'tablet' ? ['agenda', 'clients', 'actions', 'coaching', 'messages', 'tasks', 'shortcuts']
          : ['clients', 'actions', 'agenda', 'coaching', 'messages', 'tasks', 'shortcuts']
      : experience === 'STUDIO_MANAGER' || experience === 'STUDIO_OWNER'
        ? [...(field ? ['actions', 'agenda', 'team', 'sales', 'clients', 'shortcuts'] : ['agenda', 'actions', 'clients', 'sales', 'team', 'shortcuts']) as HomeSection[],
          ...(experience === 'STUDIO_OWNER' ? ['business'] as HomeSection[] : [])]
        : [];
  const priorities = experience === 'MEMBER' ? ['session', 'progress', 'nutrition']
    : experience === 'SUPERADMIN' ? ['platform']
    : field ? ['nextAction', 'nextClient', 'messages', 'nextSession', 'notes', 'checkIns', 'planning', 'urgentTasks']
    : ['clientPortfolio', 'programBuilder', 'progressAnalysis', 'weeklyPlanning', 'crm', 'retention',
      ...(experience === 'SOLO_OWNER' || experience === 'STUDIO_OWNER' || experience === 'STUDIO_MANAGER' ? ['business'] : [])];
  return { format, density: field ? 'compact' : format === 'tablet' ? 'comfortable' : 'expanded', priorities: sections.length ? sections : priorities, sections } as const;
}
