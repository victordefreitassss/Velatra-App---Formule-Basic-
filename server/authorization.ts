/** Only verified profile/club documents and verified identity claims may construct this actor. */
export interface AuthorizationActor {
  role?: unknown;
  clubId?: unknown;
  accountType?: unknown;
  trustedSuperAdmin?: boolean;
}
export const authorizationActor = (profile: any, club?: any, trustedSuperAdmin = false): AuthorizationActor => ({
  role: profile?.role, clubId: profile?.clubId, accountType: club?.accountType, trustedSuperAdmin,
});
const platformAdmin = (actor: AuthorizationActor) => actor.role === 'superadmin' && actor.trustedSuperAdmin === true;
const validClub = (clubId: unknown) => typeof clubId === 'string' && clubId.length > 0;
const sameClub = (actor: AuthorizationActor, clubId: unknown) => typeof clubId === 'string' && clubId.length > 0 && actor.clubId === clubId;
const owner = (actor: AuthorizationActor, clubId: unknown) => sameClub(actor, clubId) && actor.role === 'owner';
const manager = (actor: AuthorizationActor, clubId: unknown) => sameClub(actor, clubId) && actor.role === 'manager' && actor.accountType === 'studio';
export const canManageTeam = (actor: AuthorizationActor, clubId: unknown) => validClub(clubId) && (platformAdmin(actor) || owner(actor, clubId) || manager(actor, clubId));
export const canAssignMembers = (actor: AuthorizationActor, clubId: unknown) => canManageTeam(actor, clubId);
export const canManageClubSettings = (actor: AuthorizationActor, clubId: unknown) => validClub(clubId) && (platformAdmin(actor) || owner(actor, clubId));
export const canManageStripe = (actor: AuthorizationActor, clubId: unknown) => canManageClubSettings(actor, clubId);
/** Sensitive billing keeps its historical owner-only policy (no new Superadmin access). */
export const canManageBilling = (actor: AuthorizationActor, clubId: unknown) => owner(actor, clubId);
/** Routine member/CRM/planning/follow-up operations. Coach assignment checks remain mandatory. */
export const canOperateStudio = (actor: AuthorizationActor, clubId: unknown) => owner(actor, clubId) || manager(actor, clubId) || sameClub(actor, clubId) && actor.role === 'coach';
export const canPerformDestructiveClubActions = (actor: AuthorizationActor, clubId: unknown, operation: 'delete-user' | 'delete-club' = 'delete-user') =>
  validClub(clubId) && (platformAdmin(actor) || operation === 'delete-user' && owner(actor, clubId));
export const canDeleteUser = (actor: AuthorizationActor, target: { clubId?: unknown; role?: unknown }) =>
  canPerformDestructiveClubActions(actor, target.clubId) && (target.role !== 'owner' || platformAdmin(actor));
/** No ordinary owner/manager may grant roles; preserve the existing verified platform console. */
export const canChangeUserRole = (actor: AuthorizationActor, clubId: unknown) => validClub(clubId) && platformAdmin(actor);

export const canUseBilling = (actor: AuthorizationActor, clubId: unknown) => sameClub(actor, clubId) && (actor.role === 'owner' || actor.role === 'coach');
export const canReadStripeStatus = (actor: AuthorizationActor, clubId: unknown) => canManageStripe(actor, clubId) || sameClub(actor, clubId) && (actor.role === 'coach' || actor.role === 'member');
