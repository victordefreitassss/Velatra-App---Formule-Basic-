import test from 'node:test';
import assert from 'node:assert/strict';
import type { Club, User } from '../types.ts';
import { isLiveProfileAllowed, canLoadLiveCollection, getProductCapabilities, canShowStaffCreation } from '../productCapabilities.ts';
import { resolveExperienceCapabilities } from '../productExperience.ts';
import { getAllContextItems, getPrimaryHubsForRole } from '../components/appShellHelpers.ts';
import { getClient360AdminSections, getClient360CoachingContact } from '../components/client360.ts';
import { authorizationActor, canProvisionManager, canManageTeam } from '../server/authorization.ts';
const club = { id: 'studio', accountType: 'studio', ownerId: 'owner', canAddStaff: false } as Club;
const manager = { role: 'manager', clubId: club.id, firebaseUid: 'manager' } as User;

test('Manager profile requires an explicit authoritative Studio, matching tenant and active account', () => {
  assert.equal(isLiveProfileAllowed(manager, club), true);
  for (const candidate of [null, { ...club, accountType: 'solo' }, { ...club, accountType: undefined }, { ...club, id: 'other' }])
    assert.equal(isLiveProfileAllowed(manager, candidate as Club), false);
  assert.equal(isLiveProfileAllowed({ ...manager, isSuspended: true }, club), false);
  assert.equal(isLiveProfileAllowed({ ...manager, role: 'unknown' }, club), false);
});
test('Studio provisioning is Owner-only and suspended actors have no administrative permission', () => {
  for (const role of ['owner', 'manager', 'coach', 'member', 'superadmin']) {
    const actor = authorizationActor({ role, clubId: club.id }, club, true);
    assert.equal(canProvisionManager(actor, club.id), role === 'owner');
    assert.equal(canManageTeam({ ...actor, isSuspended: true }, club.id), false);
  }
  assert.equal(canProvisionManager(authorizationActor({ role: 'owner', clubId: club.id }, { ...club, accountType: 'solo' }), club.id), false);
  assert.equal(canShowStaffCreation(club, manager), true);
});
test('Manager runtime/navigation uses entitlements and keeps operational routes without sensitive surfaces', () => {
  for (const tenant of [club, { ...club, saasPlanId: 'studio' }]) {
    const caps = resolveExperienceCapabilities(tenant, manager);
    for (const key of ['clients', 'crm', 'planning', 'teamManagement', 'coachAssignments', 'retention'] as const) assert.equal(caps[key].runtimeUsable, true, key);
    const context = { role: manager.role, club: tenant };
    const pages = getAllContextItems(context).map(item => item.id);
    for (const page of ['users', 'crm_pipeline', 'calendar', 'team', 'profile']) assert.ok(pages.includes(page), page);
    for (const page of ['crm_finances', 'settings', 'coaching']) assert.ok(!pages.includes(page), page);
    assert.deepEqual(getPrimaryHubsForRole(context).map(item => item.id), ['home', 'clients', 'coaching', 'planning', 'business']);
  }
  assert.equal(resolveExperienceCapabilities({ ...club, saasPlanId: 'unknown' }, manager).clients.runtimeUsable, false);
  assert.deepEqual(getAllContextItems({ role: 'manager', club: { ...club, accountType: 'solo' } }), []);
});
test('Manager listeners exclude financial records; Client360 preserves actual coach responsibility', () => {
  for (const name of ['plans', 'payments', 'subscriptions', 'invoices', 'expenses', 'fixedCosts', 'manualStats']) assert.equal(canLoadLiveCollection(name, club, manager), false);
  for (const name of ['users', 'programs', 'bookings', 'prospects', 'tasks']) assert.equal(canLoadLiveCollection(name, club, manager), true);
  assert.deepEqual(getClient360AdminSections(club, manager).map(item => item.id), ['profile', 'documents']);
  const coach = { role: 'coach', clubId: club.id, firebaseUid: 'coach' } as User;
  const member = { role: 'member', clubId: club.id, assignedCoachUid: 'coach' } as User;
  assert.equal(getClient360CoachingContact(member, club, [manager, coach]), coach);
});
test('Studio Coach loses global finance/team/settings while Solo Owner and legacy Coach remain compatible', () => {
  const coach = { role: 'coach' as const, clubId: club.id };
  for (const key of ['finances', 'analytics', 'teamManagement', 'stripeConnection', 'clubManagement'] as const) assert.equal(getProductCapabilities(club, coach)[key].usable, false);
  assert.equal(canLoadLiveCollection('expenses', club, coach), false);
  assert.equal(canLoadLiveCollection('expenses', { ...club, accountType: undefined }, coach), true);
  assert.equal(getProductCapabilities({ ...club, accountType: undefined }, coach).finances.usable, true);
  const solo = { ...club, accountType: 'solo' as const };
  const owner = { role: 'owner' as const, clubId: club.id };
  for (const key of ['clients', 'crm', 'coaching', 'planning', 'finances', 'messages'] as const) assert.equal(getProductCapabilities(solo, owner)[key].usable, true);
});
