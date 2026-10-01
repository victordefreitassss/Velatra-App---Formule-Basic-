import assert from 'node:assert/strict';
import test from 'node:test';
import type { Club, ProductRole } from '../types.ts';
import { resolveAccountType, canManageClub, CAPABILITY_DEFINITIONS } from '../productCapabilities.ts';
import { resolveSaasPlan, resolveProductRole, resolveProductExperience, resolveRolePermission, resolveEntitlement, resolveExperienceCapabilities, resolveProductFormat, resolvePresentationStrategy } from '../productExperience.ts';
import { resolveExperienceNavigation, getAllContextItems, getPrimaryHubsForRole } from '../components/appShellHelpers.ts';
const club = (accountType?: 'solo' | 'studio', saasPlanId?: string) => ({ id: 'tenant', accountType, saasPlanId, canAddStaff: true } as Club);
const actor = (role: ProductRole) => ({ role, clubId: 'tenant' });

for (const [role, type, expected] of [
  ['owner', 'solo', 'SOLO_OWNER'], ['owner', 'studio', 'STUDIO_OWNER'], ['manager', 'studio', 'STUDIO_MANAGER'],
  ['coach', 'studio', 'STUDIO_COACH'], ['member', 'studio', 'MEMBER'],
  ['owner', undefined, 'LEGACY_OWNER'], ['coach', undefined, 'LEGACY_COACH'],
] as const) {
  test(`experience ${expected}: permissions are identical on phone and desktop`, () => {
    const tenant = club(type, type === 'solo' ? 'coach' : type === 'studio' ? 'studio' : undefined);
    assert.equal(resolveProductExperience(tenant, actor(role)), expected);
    const caps = resolveExperienceCapabilities(tenant, actor(role));
    for (const format of ['phone', 'tablet', 'desktop', 'largeDesktop'] as const) {
      assert.deepEqual(resolveExperienceCapabilities(tenant, { ...actor(role), format } as ReturnType<typeof actor>), caps);
      assert.equal(resolvePresentationStrategy(expected, format).format, format);
    }
    if (role !== 'member') assert.notDeepEqual(resolvePresentationStrategy(expected, 'phone').priorities, resolvePresentationStrategy(expected, 'desktop').priorities);
  });
}
test('SaaS selection is explicit, unknown values fail closed, legacy fields never select an offer or account type', () => {
  assert.equal(resolveSaasPlan(club('solo', 'coach')).kind, 'known');
  assert.equal(resolveSaasPlan(club('studio', 'studio')).kind, 'known');
  for (const id of ['premium', '', 'unknown', 'toString', '__proto__', null, 42]) {
    const tenant = { ...club('studio'), saasPlanId: id } as Club;
    assert.equal(resolveSaasPlan(tenant).kind, 'unknown');
    assert.equal(resolveEntitlement('clients', tenant), false);
    assert.equal(resolveExperienceCapabilities(tenant, actor('owner')).clients.targetUsable, false);
  }
  for (const plan of ['basic', 'classic', 'premium'] as const) {
    const tenant = { ...club(), plan, canAddStaff: true, coaches: Array(5).fill({}) };
    assert.equal(resolveSaasPlan(tenant).kind, 'legacy');
    assert.equal(resolveAccountType(tenant), 'legacy');
    assert.equal(resolveEntitlement('clients', tenant), null);
  }
});
test('role parsing, tenant boundaries and verified Superadmin', () => {
  assert.equal(resolveProductRole('manager'), 'manager');
  for (const value of ['commercial', 'OWNER', '', {}, null]) assert.equal(resolveProductRole(value), null);
  assert.equal(resolveProductExperience(club('studio'), { role: 'owner', clubId: 'other' }), 'UNSUPPORTED');
  assert.equal(resolveProductExperience(null, actor('member')), 'UNSUPPORTED');
  assert.equal(resolveProductExperience(club('solo'), actor('manager')), 'UNSUPPORTED');
  assert.equal(resolveProductExperience(club('solo'), actor('coach')), 'UNSUPPORTED');
  assert.equal(resolveProductExperience(null, { role: 'superadmin' }), 'UNSUPPORTED');
  assert.equal(resolveProductExperience(null, { role: 'superadmin', trustedSuperAdmin: true }), 'SUPERADMIN');
});
test('commercial entitlements and role permission are separate', () => {
  const tenant = club('studio', 'studio');
  assert.equal(resolveEntitlement('finances', tenant), true);
  assert.equal(resolveRolePermission('finances', tenant, actor('coach')), 'none');
  assert.equal(resolveExperienceCapabilities(tenant, actor('coach')).finances.targetUsable, false);
  assert.equal(resolveRolePermission('clients', tenant, actor('coach')), 'assigned');
  assert.equal(resolveRolePermission('clients', tenant, actor('member')), 'none');
  assert.equal(resolveRolePermission('billing', tenant, actor('member')), 'self');
  assert.equal(resolveEntitlement('teamManagement', club('solo', 'coach')), false);
  assert.equal(resolveEntitlement('teamManagement', club('studio', 'coach')), false);
  assert.equal(resolveEntitlement('teamManagement', club('solo', 'studio')), false);
  assert.equal(resolveEntitlement('accessControl', tenant), false);
});
test('manager target operations exclude Stripe, finances, owner settings; runtime is active', () => {
  const tenant = club('studio', 'studio');
  for (const feature of ['clients', 'crm', 'planning', 'retention', 'analytics', 'teamManagement', 'coachAssignments'] as const)
    assert.equal(resolveExperienceCapabilities(tenant, actor('manager'))[feature].targetUsable, true);
  for (const feature of ['stripeConnection', 'finances', 'clubManagement', 'bookingSettings'] as const)
    assert.equal(resolveRolePermission(feature, tenant, actor('manager')), 'none');
  assert.equal(resolveExperienceCapabilities(tenant, actor('manager')).clients.runtimeUsable, true);
  assert.equal(resolveExperienceCapabilities(tenant, actor('manager')).finances.runtimeUsable, false);
  assert.equal(canManageClub({ role: 'manager' } as never, tenant.id), false);
});
test('known offers are preview only; legacy runtime capability stays compatible', () => {
  const known = resolveExperienceCapabilities(club('studio', 'studio'), actor('owner'));
  assert.equal(known.clients.targetUsable, true);
  assert.equal(known.clients.runtimeUsable, false);
  const legacy = resolveExperienceCapabilities(club('studio'), actor('coach'));
  assert.equal(legacy.finances.runtimeUsable, false);
  assert.equal(legacy.finances.targetUsable, false);
  assert.equal(Object.keys(known).length, Object.keys(CAPABILITY_DEFINITIONS).length);
});
test('format thresholds and field vs preparation priorities', () => {
  for (const [width, expected] of [[320, 'phone'], [767, 'phone'], [768, 'tablet'], [1023, 'tablet'], [1024, 'desktop'], [1599, 'desktop'], [1600, 'largeDesktop'], [-1, 'desktop'], [NaN, 'desktop']] as const)
    assert.equal(resolveProductFormat(width), expected);
  assert.ok(resolvePresentationStrategy('SOLO_OWNER', 'desktop').priorities.includes('business'));
  assert.ok(!resolvePresentationStrategy('STUDIO_COACH', 'desktop').priorities.includes('business'));
});
test('target navigation: unified Solo, business-first Studio, operational coach, unchanged five Member roots', () => {
  const nav = (role: ProductRole, type: 'solo' | 'studio') => resolveExperienceNavigation({ role, club: club(type, type === 'solo' ? 'coach' : 'studio') });
  const solo = nav('owner', 'solo');
  for (const id of ['users', 'coaching', 'presets', 'calendar', 'crm_pipeline', 'crm_finances', 'chat']) assert.ok(solo.items.some(item => item.id === id));
  for (const role of ['owner', 'manager'] as const) assert.equal(nav(role, 'studio').hubs[1].id, 'business');
  const coach = nav('coach', 'studio');
  for (const id of ['crm_finances', 'crm_pipeline', 'settings']) assert.ok(!coach.items.some(item => item.id === id));
  assert.ok(coach.items.some(item => item.id === 'crm_tasks' && item.hub === 'planning'));
  assert.ok(coach.items.some(item => item.id === 'chat'));
  assert.deepEqual(nav('member', 'studio').hubs.map(hub => hub.label), ['Accueil', 'Séances', 'Progression', 'Nutrition', 'Plus']);
  assert.deepEqual(resolveExperienceNavigation({ role: 'owner', club: club('studio'), actorClubId: 'other' }).items, []);
  assert.deepEqual(resolveExperienceNavigation({ role: 'superadmin', club: null, trustedSuperAdmin: true }).hubs.map(hub => hub.id), ['admin']);
});
test('live navigation preserves Owner surfaces and restricts Studio Coach finance', () => {
  for (const role of ['owner', 'coach'] as const) {
    const context = { role, club: club('studio') };
    assert.deepEqual(getPrimaryHubsForRole(context).map(hub => hub.id), ['home', 'clients', 'coaching', 'planning', 'business']);
    assert.equal(getAllContextItems(context).some(item => item.id === 'crm_finances'), role === 'owner');
  }
});
