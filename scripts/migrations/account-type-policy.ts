import { createHash } from 'node:crypto';

export type RecordRow = { key: string; data: Record<string, any> };
export type MigrationRow = {
  clubId: string; name: unknown; previousAccountType: { present: false } | { present: true; value: unknown };
  ownerId: unknown; isActive: unknown; counts: { owner: number; manager: number; coach: number; member: number };
  classification: 'SAFE_TO_MIGRATE' | 'NEEDS_REVIEW'; nextAccountType: 'solo' | 'studio' | null;
  reason: string; anomalies: string[]; warnings: string[]; change: boolean;
};
export const CLUB_FIELDS = ['id', 'name', 'accountType', 'ownerId', 'isActive', 'coaches', 'plan', 'saasPlanId'];
export const USER_FIELDS = ['id', 'role', 'clubId', 'assignedCoachUid'];
export function projectFields(data: Record<string, any>, fields: string[]) {
  return Object.fromEntries(fields.filter(field => Object.hasOwn(data, field)).map(field => [field, data[field]]));
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function classifyAccounts(clubs: RecordRow[], users: RecordRow[]) {
  const byUid = new Map(users.map(user => [user.key, user]));
  const clubIds = new Set(clubs.map(club => club.key));
  const accountAnomalies = users.flatMap(user => {
    if (!user.data.clubId) return [{ userUid: user.key, reason: user.data.role === 'superadmin' ? 'PLATFORM_ACCOUNT_WITHOUT_CLUB' : 'ACCOUNT_WITHOUT_CLUB' }];
    return clubIds.has(user.data.clubId) ? [] : [{ userUid: user.key, reason: 'USER_LINKED_TO_NONEXISTENT_CLUB' }];
  });
  const rows: MigrationRow[] = clubs.map(({ key: clubId, data: club }) => {
    const internal = users.filter(user => user.data.clubId === clubId);
    const counts = Object.fromEntries(['owner', 'manager', 'coach', 'member'].map(role => [role, internal.filter(user => user.data.role === role).length])) as MigrationRow['counts'];
    const anomalies: string[] = [], warnings: string[] = [];
    const present = Object.hasOwn(club, 'accountType');
    const modern = club.accountType === 'solo' || club.accountType === 'studio';
    if (present && !modern) anomalies.push('INVALID_ACCOUNT_TYPE');
    if (!club.ownerId || typeof club.ownerId !== 'string') anomalies.push('MISSING_OWNER_ID');
    const owner = byUid.get(club.ownerId);
    if (club.ownerId && (!owner || owner.data.role !== 'owner' || owner.data.clubId !== clubId)) anomalies.push('OWNER_ID_NOT_MATCHING_INTERNAL_OWNER');
    if (counts.owner > 1) anomalies.push('MULTIPLE_OWNERS');
    if (club.id !== undefined && club.id !== clubId) anomalies.push('CLUB_ID_MISMATCH');
    if (!present && counts.manager) warnings.push('MANAGER_WITHOUT_ACCOUNT_TYPE');
    if (club.accountType === 'solo' && (counts.coach || counts.manager)) warnings.push('EXPLICIT_SOLO_WITH_STAFF_PRESERVED');
    for (const user of internal) {
      const assigned = user.data.assignedCoachUid;
      if (assigned) {
        const coach = byUid.get(assigned);
        if (!coach || coach.data.clubId !== clubId || !['coach', 'owner'].includes(coach.data.role)) anomalies.push('INVALID_OR_CROSS_CLUB_ASSIGNED_COACH');
      }
    }
    if (Array.isArray(club.coaches)) for (const coach of club.coaches) {
      const matching = users.filter(user => user.data.id !== undefined && user.data.id === coach?.id && user.data.role === 'coach');
      if ((coach?.clubId && coach.clubId !== clubId) || matching.some(user => user.data.clubId !== clubId)) anomalies.push('CROSS_CLUB_COACH_REFERENCE');
    }
    const nextAccountType = modern ? club.accountType : present ? null : counts.coach + counts.manager > 0 ? 'studio' : 'solo';
    const reason = modern ? 'Explicit accountType preserved' : present ? 'Invalid existing accountType; manual review required' : counts.coach + counts.manager > 0 ? `${counts.coach} internal coaches, ${counts.manager} internal managers` : 'No internal coach or manager';
    return { clubId, name: club.name ?? null, ownerId: club.ownerId ?? null, isActive: club.isActive ?? null,
      previousAccountType: present ? { present: true, value: club.accountType } : { present: false },
      counts, classification: anomalies.length ? 'NEEDS_REVIEW' : 'SAFE_TO_MIGRATE', nextAccountType, reason,
      anomalies: [...new Set(anomalies)], warnings, change: !present && !anomalies.length };
  });
  const summary = {
    totalClubs: rows.length, alreadySolo: rows.filter(row => row.previousAccountType.present && row.previousAccountType.value === 'solo').length,
    alreadyStudio: rows.filter(row => row.previousAccountType.present && row.previousAccountType.value === 'studio').length,
    legacy: rows.filter(row => !row.previousAccountType.present).length,
    toSolo: rows.filter(row => row.change && row.nextAccountType === 'solo').length,
    toStudio: rows.filter(row => row.change && row.nextAccountType === 'studio').length,
    needsReview: rows.filter(row => row.classification === 'NEEDS_REVIEW').length,
    healthyLegacy: rows.filter(row => row.change).length,
    accountsWithoutClub: accountAnomalies.filter(row => row.reason === 'ACCOUNT_WITHOUT_CLUB').length,
    usersLinkedToNonexistentClub: accountAnomalies.filter(row => row.reason === 'USER_LINKED_TO_NONEXISTENT_CLUB').length,
    platformAccountsWithoutClub: accountAnomalies.filter(row => row.reason === 'PLATFORM_ACCOUNT_WITHOUT_CLUB').length,
  };
  return { rows, summary, accountAnomalies };
}
