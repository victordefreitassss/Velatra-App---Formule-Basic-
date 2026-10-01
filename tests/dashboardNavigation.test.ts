import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '../types';
import {
  createClient360LocationState,
  createDashboardLocationState,
  createPlanningLocationState,
  getClient360MemberId,
  getPlanningMemberId,
  resolveClient360Member,
  resolvePlanningMember,
} from '../components/dashboardNavigation';

const lucas = 901;
const soloOwner = { id: 10, role: 'owner', clubId: 'solo', firebaseUid: 'solo-owner' } as User;
const studioOwner = { id: 20, role: 'owner', clubId: 'studio', firebaseUid: 'studio-owner' } as User;
const studioCoach = { id: 21, role: 'coach', clubId: 'studio', firebaseUid: 'studio-coach' } as User;
const member = { id: lucas, role: 'member', clubId: 'studio', firebaseUid: 'lucas', assignedCoachUid: 'studio-coach', name: 'Lucas' } as User;

it('Client 360 → Planifier carries only Lucas’s numeric ID on the Planning history entry', () => {
  const planning = createPlanningLocationState(lucas);
  assert.equal(getPlanningMemberId(planning), lucas);
  assert.equal(getClient360MemberId(planning), null);
  assert.equal('name' in planning, false);
  assert.equal('firebaseUid' in planning, false);
});

it('Planning → Retour au dossier carries Lucas back to Client 360', () => {
  const dossier = createClient360LocationState(lucas);
  assert.equal(getClient360MemberId(dossier), lucas);
  assert.equal(getPlanningMemberId(dossier), null);
  assert.equal(resolveClient360Member([member], 'studio', dossier), member);
});

it('global Business navigation replaces the temporary context with a clean route state', () => {
  const business = createDashboardLocationState('crm_pipeline');
  assert.equal(getPlanningMemberId(business), null);
  assert.equal(getClient360MemberId(business), null);
});

it('a later normal Planning visit is neutral and clears an earlier booking selection', () => {
  const planning = createDashboardLocationState('calendar');
  assert.equal(getPlanningMemberId(planning), null);
  assert.equal(resolvePlanningMember([member], studioOwner, planning), null);
});

it('normal Clients navigation does not reopen a previous dossier', () => {
  const clients = createDashboardLocationState('users');
  assert.equal(getClient360MemberId(clients), null);
  assert.equal(resolveClient360Member([member], 'studio', clients), null);
});

it('Back/Forward restores only the context attached to each history entry', () => {
  const history = [
    createClient360LocationState(lucas),
    createPlanningLocationState(lucas),
    createDashboardLocationState('crm_pipeline'),
    createDashboardLocationState('calendar'),
  ];
  let index = 2;
  index -= 1;
  assert.equal(resolvePlanningMember([member], studioOwner, history[index]), member);
  index += 1;
  assert.equal(resolvePlanningMember([member], studioOwner, history[index]), null);
  index += 1;
  assert.equal(resolvePlanningMember([member], studioOwner, history[index]), null);
  index -= 1;
  assert.equal(resolvePlanningMember([member], studioOwner, history[index]), null);
});

it('resolves the current authorised member for a Solo owner, Studio owner and assigned coach', () => {
  const soloLucas = { ...member, clubId: 'solo' } as User;
  assert.equal(resolvePlanningMember([soloLucas], soloOwner, createPlanningLocationState(lucas)), soloLucas);
  assert.equal(resolvePlanningMember([member], studioOwner, createPlanningLocationState(lucas)), member);
  assert.equal(resolvePlanningMember([member], studioCoach, createPlanningLocationState(lucas)), member);
  assert.equal(resolvePlanningMember([member], { ...studioCoach, clubId: 'other' }, createPlanningLocationState(lucas)), null);
  assert.equal(resolvePlanningMember([member], { ...studioCoach, role: 'member' }, createPlanningLocationState(lucas)), null);
});

it('ignores stale member IDs, invalid IDs, other clubs and non-members', () => {
  assert.equal(getPlanningMemberId({ velatraPage: 'users', planningMemberId: lucas }), null);
  assert.equal(getPlanningMemberId({ velatraPage: 'calendar', planningMemberId: -1 }), null);
  assert.equal(resolvePlanningMember([{ ...member, clubId: 'other' } as User], studioOwner, createPlanningLocationState(lucas)), null);
  assert.equal(resolvePlanningMember([{ ...member, role: 'coach' } as User], studioOwner, createPlanningLocationState(lucas)), null);
  assert.equal(resolveClient360Member([member], 'other', createClient360LocationState(lucas)), null);
});
