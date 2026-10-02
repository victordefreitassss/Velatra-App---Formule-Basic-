export interface AvailabilityWindow { day: number; start: string; end: string }
export interface CoachTeamSettings {
  capacity: number | null;
  available: boolean;
  specialties: string[];
  weeklyAvailability: AvailabilityWindow[];
  revision: number;
}
export interface TeamCoach {
  uid: string; id: number; name: string; avatar: string;
  isSuspended: boolean; status: 'active' | 'paused';
  settings: CoachTeamSettings; assignedClients: number;
  nextAvailability: string | null;
}
export interface TeamMember {
  uid: string; id: number; name: string; status: 'active' | 'paused';
  isSuspended: boolean; assignedCoachUid: string | null;
  lastWorkoutDate: string | null; lastCheckInDate: string | null;
}
export interface TeamResult {
  clubId: string; scope: 'tenant' | 'self'; coaches: TeamCoach[]; members: TeamMember[];
  evaluatedAt: string;
}
export const workloadLabels = {
  available: 'Disponible', normal: 'Charge normale', near: 'Presque complet',
  full: 'Complet', overloaded: 'Surchargé', unavailable: 'Indisponible', unknown: 'Capacité non définie',
};
export function coachWorkload(coach: Pick<TeamCoach, 'settings' | 'assignedClients' | 'isSuspended' | 'status'>) {
  const { capacity } = coach.settings;
  const ratio = capacity !== null && capacity > 0 ? coach.assignedClients / capacity : null;
  const active = !coach.isSuspended && coach.status !== 'paused';
  const state: keyof typeof workloadLabels = !active || !coach.settings.available ? 'unavailable'
    : capacity === null ? 'unknown' : capacity === 0 ? (coach.assignedClients > 0 ? 'overloaded' : 'full')
      : ratio! > 1 ? 'overloaded' : ratio! >= 1 ? 'full' : ratio! >= .85 ? 'near' : ratio! >= .5 ? 'normal' : 'available';
  return { ratio, state, active, canReceive: active && coach.settings.available && capacity !== null && coach.assignedClients < capacity,
    remaining: active && coach.settings.available && capacity !== null ? Math.max(0, capacity - coach.assignedClients) : 0 };
}
export function teamMetrics(coaches: TeamCoach[], members: TeamMember[]) {
  const active = coaches.filter(coach => coachWorkload(coach).active);
  const followed = members.filter(member => member.assignedCoachUid && coaches.some(coach => coach.uid === member.assignedCoachUid));
  return { activeCoaches: active.length, followedClients: followed.length,
    average: active.length ? active.reduce((total, coach) => total + coach.assignedClients, 0) / active.length : null,
    nearCapacity: active.filter(coach => ['near', 'full', 'overloaded'].includes(coachWorkload(coach).state)).length,
    availableCoaches: active.filter(coach => coachWorkload(coach).canReceive).length,
    remainingCapacity: active.reduce((total, coach) => total + coachWorkload(coach).remaining, 0),
    undefinedCapacity: active.filter(coach => coach.settings.capacity === null).length,
    unassignedClients: members.filter(member => !member.assignedCoachUid || !coaches.some(coach => coach.uid === member.assignedCoachUid)).length };
}
