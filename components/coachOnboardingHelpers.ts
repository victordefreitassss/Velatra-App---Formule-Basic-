import type { Booking, Club, ClubInfo, Program, Role, User } from '../types';

export type CoachDashboardStage = 'onboarding' | 'early' | 'mature' | 'not-coach';
export type MemberActivationStatus = 'programme-a-creer' | 'pret' | 'actif' | 'a-relancer';

export interface CoachOnboardingChecklist {
  spaceComplete: boolean;
  firstMemberAdded: boolean;
  firstProgramAssigned: boolean;
  firstSessionPlanned: boolean;
  clientFollowUpViewed: boolean;
}

export const hasAssignedProgram = (members: User[], programs: Program[]): boolean => {
  const memberIds = new Set(members.map(member => Number(member.id)));
  return programs.some(program =>
    !program.isPlannedSession &&
    memberIds.has(Number(program.memberId)) &&
    Boolean(program.name?.trim()) &&
    (program.days || []).some(day => day.isCoaching || (day.exercises || []).length > 0)
  );
};

export const getCoachDashboardStage = (input: {
  role: Role | string;
  memberCount: number;
  onboardingCompleted?: boolean;
  firstValueReached: boolean;
}): CoachDashboardStage => {
  if (input.role !== 'coach' && input.role !== 'owner') return 'not-coach';
  if (input.memberCount <= 0) return 'onboarding';
  if (!input.onboardingCompleted) return 'onboarding';
  return input.memberCount < 4 ? 'early' : 'mature';
};

export const isClubProfileComplete = (club: Club | null, aboutInfo: ClubInfo): boolean => {
  const name = club?.name?.trim();
  const email = (aboutInfo.email || club?.email || '').trim();
  const phone = (aboutInfo.phone || club?.phone || '').trim();
  return Boolean(name && email && phone);
};

export const getOnboardingProgress = (
  checklist: CoachOnboardingChecklist,
  planningEnabled: boolean,
): { completed: number; total: number } => {
  const steps = [
    checklist.spaceComplete,
    checklist.firstMemberAdded,
    checklist.firstProgramAssigned,
    ...(planningEnabled ? [checklist.firstSessionPlanned] : []),
    checklist.clientFollowUpViewed,
  ];
  return { completed: steps.filter(Boolean).length, total: steps.length };
};

export const getMemberActivationStatus = (
  hasProgram: boolean,
  lastActivity: string | undefined,
  now = Date.now(),
): MemberActivationStatus => {
  if (!hasProgram) return 'programme-a-creer';
  if (!lastActivity) return 'pret';
  const activityTime = new Date(lastActivity).getTime();
  if (!Number.isFinite(activityTime)) return 'pret';
  const age = now - activityTime;
  return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000 ? 'actif' : 'a-relancer';
};

export const hasPlannedCoachSession = (bookings: Booking[], clubId: string): boolean =>
  bookings.some(booking =>
    booking.clubId === clubId &&
    (booking.status === 'confirmed' || booking.status === 'completed')
  );

export const getNextIncompleteCoachStep = (
  checklist: CoachOnboardingChecklist,
  planningEnabled: boolean,
): keyof CoachOnboardingChecklist | null => {
  if (!checklist.spaceComplete) return 'spaceComplete';
  if (!checklist.firstMemberAdded) return 'firstMemberAdded';
  if (!checklist.firstProgramAssigned) return 'firstProgramAssigned';
  if (planningEnabled && !checklist.firstSessionPlanned) return 'firstSessionPlanned';
  if (!checklist.clientFollowUpViewed) return 'clientFollowUpViewed';
  return null;
};
