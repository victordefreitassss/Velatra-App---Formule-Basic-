import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCoachDashboardStage,
  getMemberActivationStatus,
  getNextIncompleteCoachStep,
  getOnboardingProgress,
  hasAssignedProgram,
} from '../components/coachOnboardingHelpers';
import type { Program, User } from '../types';

const member = { id: 12, role: 'member', clubId: 'club-1' } as User;
const program = {
  id: 1,
  clubId: 'club-1',
  memberId: 12,
  name: 'Premier programme',
  days: [{ name: 'Jour 1', isCoaching: false, exercises: [{ exId: 1 }] }],
} as Program;

test('coach dashboard stage follows role, real member count and first-value state', () => {
  assert.equal(getCoachDashboardStage({ role: 'coach', memberCount: 0, onboardingCompleted: true, firstValueReached: false }), 'onboarding');
  assert.equal(getCoachDashboardStage({ role: 'coach', memberCount: 2, onboardingCompleted: false, firstValueReached: false }), 'onboarding');
  assert.equal(getCoachDashboardStage({ role: 'coach', memberCount: 1, onboardingCompleted: false, firstValueReached: true }), 'onboarding');
  assert.equal(getCoachDashboardStage({ role: 'owner', memberCount: 3, onboardingCompleted: true, firstValueReached: true }), 'early');
  assert.equal(getCoachDashboardStage({ role: 'coach', memberCount: 4, onboardingCompleted: true, firstValueReached: true }), 'mature');
  assert.equal(getCoachDashboardStage({ role: 'superadmin', memberCount: 4, onboardingCompleted: true, firstValueReached: true }), 'not-coach');
  assert.equal(getCoachDashboardStage({ role: 'member', memberCount: 1, firstValueReached: false }), 'not-coach');
});

test('first value requires a non-planned program with content assigned to a real member', () => {
  assert.equal(hasAssignedProgram([member], []), false);
  assert.equal(hasAssignedProgram([member], [{ ...program, days: [{ name: 'Jour 1', isCoaching: false, exercises: [] }] }]), false);
  assert.equal(hasAssignedProgram([member], [{ ...program, isPlannedSession: true }]), false);
  assert.equal(hasAssignedProgram([{ ...member, id: 13 }], [program]), false);
  assert.equal(hasAssignedProgram([member], [program]), true);
});

test('coach checklist skips disabled planning and recommends the first incomplete step', () => {
  const checklist = {
    spaceComplete: true,
    firstMemberAdded: true,
    firstProgramAssigned: true,
    firstSessionPlanned: false,
    clientFollowUpViewed: false,
  };
  assert.deepEqual(getOnboardingProgress(checklist, true), { completed: 3, total: 5 });
  assert.deepEqual(getOnboardingProgress(checklist, false), { completed: 3, total: 4 });
  assert.equal(getNextIncompleteCoachStep(checklist, true), 'firstSessionPlanned');
  assert.equal(getNextIncompleteCoachStep(checklist, false), 'clientFollowUpViewed');
});

test('member activation status uses program assignment and seven-day activity window', () => {
  const now = new Date('2026-09-27T12:00:00Z').getTime();
  assert.equal(getMemberActivationStatus(false, undefined, now), 'programme-a-creer');
  assert.equal(getMemberActivationStatus(true, undefined, now), 'pret');
  assert.equal(getMemberActivationStatus(true, '2026-09-21T12:00:00Z', now), 'actif');
  assert.equal(getMemberActivationStatus(true, '2026-09-19T12:00:00Z', now), 'a-relancer');
});
