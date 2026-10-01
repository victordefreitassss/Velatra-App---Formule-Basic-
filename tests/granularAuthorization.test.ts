import { isLiveExperienceRole } from '../productCapabilities.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizationActor, canManageTeam, canAssignMembers, canManageClubSettings, canManageBilling, canManageStripe, canPerformDestructiveClubActions, canDeleteUser, canChangeUserRole, canOperateStudio } from '../server/authorization.ts';
const actor = (role: string, accountType: string | null = 'studio', clubId = 'a', trusted = false) => authorizationActor({ role, clubId }, { accountType }, trusted);
const admins = [canManageTeam, canAssignMembers, canManageClubSettings, canManageBilling, canManageStripe, canPerformDestructiveClubActions];
test('Owner retains team, assignment, settings, billing, Stripe and existing user deletion', () => {
  for (const type of ['studio', 'solo', null]) for (const permission of admins) assert.equal(permission(actor('owner', type), 'a'), true);
  assert.equal(canPerformDestructiveClubActions(actor('owner'), 'a', 'delete-club'), false);
});
test('Manager has Studio operations, team and assignment, with no owner powers', () => {
  assert.equal(canManageTeam(actor('manager'), 'a'), true);
  assert.equal(canAssignMembers(actor('manager'), 'a'), true);
  assert.equal(canOperateStudio(actor('manager'), 'a'), true);
  for (const permission of [canManageClubSettings, canManageBilling, canManageStripe, canPerformDestructiveClubActions, canChangeUserRole]) assert.equal(permission(actor('manager'), 'a'), false);
  for (const role of ['owner', 'manager', 'coach', 'member']) assert.equal(canDeleteUser(actor('manager'), { role, clubId: 'a' }), false);
});
test('Manager cannot use a Solo, absent or forged type and cannot act cross-club', () => {
  for (const type of ['solo', 'legacy', null, 'Studio']) {
    assert.equal(canManageTeam(actor('manager', type), 'a'), false);
    assert.equal(canOperateStudio(actor('manager', type), 'a'), false);
  }
  for (const role of ['owner', 'manager', 'coach', 'member']) for (const permission of admins) assert.equal(permission(actor(role), 'b'), false);
});
test('Coach and Member receive no global administrative permission', () => {
  for (const role of ['coach', 'member', 'unknown']) for (const permission of admins) assert.equal(permission(actor(role), 'a'), false);
  assert.equal(canOperateStudio(actor('coach'), 'a'), true);
  assert.equal(canOperateStudio(actor('member'), 'a'), false);
});
test('verified Superadmin preserves platform exceptions without gaining Billing V2 access', () => {
  for (const permission of [canManageTeam, canAssignMembers, canManageClubSettings, canManageStripe, canPerformDestructiveClubActions, canChangeUserRole]) {
    assert.equal(permission(actor('superadmin', 'studio', 'platform', true), 'b'), true);
    assert.equal(permission(actor('superadmin'), 'a'), false);
    assert.equal(permission(actor('member', 'studio', 'a', true), 'a'), false);
  }
  assert.equal(canManageBilling(actor('superadmin', 'studio', 'platform', true), 'b'), false);
  assert.equal(canDeleteUser(actor('owner'), { role: 'owner', clubId: 'a' }), false);
});

test('Manager is a live role; Studio validation is a separate profile boundary', () => {
  assert.equal(isLiveExperienceRole('manager'), true);
  assert.equal(isLiveExperienceRole('unknown'), false);
  for (const role of ['owner', 'coach', 'member', 'superadmin']) assert.equal(isLiveExperienceRole(role), true);
});
