import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITY_DEFINITIONS, canManageClub, canShowStaffCreation, getProductCapabilities, readClubDocument, resolveAccountType } from '../productCapabilities.ts';
import { parseRegistrationAccountType } from '../server/clubRegistration.ts';
import type { Club, Role } from '../types.ts';

const club = (accountType?: 'solo' | 'studio') => ({ id: 'test-club', accountType, canAddStaff: true } as Club);

for (const [role, type] of [
  ['owner', 'solo'], ['owner', 'studio'], ['coach', 'studio'], ['member', 'solo'], ['member', 'studio'],
] as const) {
  it(`resolves ${role} / ${type} without viewport-dependent privileges`, () => {
    const actor = { role, clubId: 'test-club' };
    const caps = getProductCapabilities(club(type), actor);
    assert.equal(caps.programs.usable, true);
    assert.equal(caps.clients.usable, role !== 'member');
    assert.equal(caps.clubManagement.usable, role === 'owner');
    assert.equal(caps.teamManagement.usable, role === 'owner' && type === 'studio');
    assert.equal(caps.coachAssignments.usable, role === 'owner' && type === 'studio');
    for (const width of [320, 360, 375, 390, 430, 768, 820, 1024, 1180, 1280, 1366, 1440, 1600, 1728, 1920, 2560]) {
      // Extra presentation fields cannot change policy, even in untyped callers.
      assert.deepEqual(getProductCapabilities(club(type), { ...actor, width } as typeof actor), caps);
    }
  });
}

it('does not infer a legacy type or remove historical management permissions', () => {
  for (const plan of ['basic', 'classic', 'premium'] as const) {
    const legacy = { ...club(), plan, name: 'Studio', description: 'Coach Indépendant', canAddStaff: false };
    assert.equal(resolveAccountType(legacy), 'legacy');
    const actor = { role: 'owner' as const, clubId: legacy.id };
    const caps = getProductCapabilities(legacy, actor);
    assert.equal(caps.teamManagement.available, null);
    assert.equal(caps.teamManagement.enabled, false);
    assert.equal(caps.clients.usable, true);
    assert.equal(canManageClub(actor, legacy.id), true);
    assert.equal(canShowStaffCreation(legacy, actor), false);
  }
});

it('never turns placeholders into available features, including for a verified superadmin', () => {
  const caps = getProductCapabilities(club('studio'), { role: 'superadmin', trustedSuperAdmin: true });
  for (const key of ['cashRegister', 'inventory', 'accessControl', 'multiLocation', 'advancedPermissions', 'marketingCampaigns', 'healthIntegrations'] as const) {
    assert.equal(caps[key].implemented, false);
    assert.equal(caps[key].available, false);
    assert.equal(caps[key].usable, false);
  }
  assert.equal(caps.teamManagement.usable, true);
  assert.ok(Object.keys(CAPABILITY_DEFINITIONS).length >= 20);
});

it('requires trusted superadmin and matching club for ordinary roles', () => {
  assert.equal(canManageClub({ role: 'superadmin', trustedSuperAdmin: false }, 'test-club'), false);
  assert.equal(canManageClub({ role: 'superadmin', trustedSuperAdmin: true }, 'test-club'), true);
  for (const role of ['owner', 'coach', 'member'] as Role[]) {
    assert.equal(canManageClub({ role, clubId: 'other' }, 'test-club'), false);
  }
  assert.equal(canManageClub({ role: 'coach', clubId: 'test-club' }, 'test-club'), false);
  assert.equal(canShowStaffCreation(club('studio'), { role: 'coach', clubId: 'test-club' }), false);
  assert.equal(getProductCapabilities(null, { role: 'owner', clubId: 'test-club' }).clients.usable, false);
});

it('rejects invalid signup types but explicitly supports the old signup payload', () => {
  assert.equal(parseRegistrationAccountType('solo'), 'solo');
  assert.equal(parseRegistrationAccountType('studio'), 'studio');
  assert.equal(parseRegistrationAccountType('coach'), 'solo');
  assert.equal(parseRegistrationAccountType('club'), 'studio');
  for (const value of [undefined, null, '', 'legacy', 'premium', 'SOLO', {}, ['studio']]) {
    assert.equal(parseRegistrationAccountType(value), null);
    assert.equal(resolveAccountType({ accountType: value }), 'legacy');
  }
});

it('loads known and legacy clubs without writing, trusting embedded ids or copying accountType to a user', () => {
  const raw = { id: 'forged', name: 'Existing', accountType: 'invalid', plan: 'premium', settings: { booking: { enabled: true } } };
  const loaded = readClubDocument('canonical', raw);
  assert.equal(loaded.id, 'canonical');
  assert.equal(loaded.accountType, undefined);
  assert.equal(loaded.plan, 'premium');
  assert.deepEqual(loaded.settings, raw.settings);
  assert.equal(raw.accountType, 'invalid');
  assert.equal(readClubDocument('known', { accountType: 'studio' }).accountType, 'studio');
  assert.equal(resolveAccountType(readClubDocument('old', { name: 'Solo' })), 'legacy');
});
