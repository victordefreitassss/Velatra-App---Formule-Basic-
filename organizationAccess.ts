/** Only the canonical server-owned boolean activates a tenant. Legacy aliases
 * and missing/malformed documents must never grant access. */
export function isOrganizationActive(club: { isActive?: unknown; purgeJobId?: unknown } | null | undefined): boolean {
  return club?.isActive === true && !club.purgeJobId;
}
