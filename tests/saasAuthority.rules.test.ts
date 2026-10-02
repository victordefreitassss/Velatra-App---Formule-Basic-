import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { isOrganizationActive } from '../organizationAccess.ts';
import { getProductCapabilities, canLoadLiveCollection, readClubDocument } from '../productCapabilities.ts';
import { resolveExperienceCapabilities } from '../productExperience.ts';
const tenant = 'saas-authority';
let env: RulesTestEnvironment;
const fixture = (path: string, data: any) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), path), data));
const club = (patch = {}) => ({ id: tenant, ownerId: 'saas-owner', accountType: 'studio', plan: 'basic', isActive: true, canAddStaff: false, settings: { payment: { stripeConnected: false } }, ...patch });
const client = (role: string) => env.authenticatedContext(`saas-${role}`).firestore();
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-velatra', firestore: { rules: await readFile('firestore.rules', 'utf8') } });
  await fixture(`clubs/${tenant}`, club());
  for (const [index, role] of ['owner', 'manager', 'coach', 'member'].entries())
    await fixture(`users/saas-${role}`, { id: 9900 + index, clubId: tenant, role, firebaseUid: `saas-${role}` });
  await fixture('users/saas-superadmin', { id: 9910, clubId: tenant, role: 'superadmin' });
});
after(() => env?.cleanup());
const sensitive = {
  plan: 'premium', saasPlanId: 'studio_pro', accountType: 'solo', canAddStaff: true,
  planId: 'premium', subscription: { status: 'active' }, subscriptionStatus: 'active', billingStatus: 'paid',
  entitlement: 'premium', entitlements: ['aiAssistance'], features: ['multipleCoaches'],
  suspended: false, suspensionStatus: 'none', active: true, organizationStatus: 'active',
  isActive: false, ownerId: 'forged', 'settings.canAddStaff': true, 'settings.plan': 'premium',
  'settings.entitlements': ['premium'], 'settings.billingStatus': 'paid',
  'settings.payment.stripeConnected': true, 'settings.payment.stripeAccountId': 'forged',
};
for (const role of ['owner', 'manager', 'coach', 'member']) {
  for (const [field, value] of Object.entries(sensitive)) it(`${role} cannot write SaaS authority / alias ${field}`, async () => {
    await assertFails(updateDoc(doc(client(role), `clubs/${tenant}`), { [field]: value }));
  });
  it(`${role} cannot delete, replace, merge or combine commercial grants with public edits`, async () => {
    const ref = doc(client(role), `clubs/${tenant}`);
    await assertFails(updateDoc(ref, { plan: deleteField(), isActive: deleteField() }));
    await assertFails(setDoc(ref, { isActive: true, plan: 'premium' }, { merge: true }));
    await assertFails(setDoc(ref, { ownerId: 'saas-owner', name: 'Replacement' }));
    await assertFails(updateDoc(ref, { name: 'Public', plan: 'premium' }));
    await assertFails(deleteDoc(ref));
  });
}
it('even the verified platform browser must use the server command for SaaS authority', async () => {
  const db = env.authenticatedContext('saas-superadmin', { email: 'victor.defreitas.pro@gmail.com', email_verified: true }).firestore();
  await assertFails(updateDoc(doc(db, `clubs/${tenant}`), { plan: 'premium', isActive: false }));
  await assertSucceeds(updateDoc(doc(db, `clubs/${tenant}`), { name: 'Platform branding' }));
});
it('Owner retains public information, branding and supported business settings; authority is unchanged', async () => {
  const ref = doc(client('owner'), `clubs/${tenant}`);
  await assertSucceeds(updateDoc(ref, { name: 'Studio', logo: 'https://example.test/logo.png', primaryColor: '#123456',
    email: 'public@example.test', phone: '0100000000', address: 'Adresse', description: 'Public', horaires: '9h–18h',
    mapsLink: 'https://example.test/map', googleReview: 'https://example.test/review', coaches: [],
    'settings.booking.enabled': true, 'settings.booking.schedule': [], 'settings.defaultProgramDuration': 8,
    'settings.payment.acceptedMethods': ['cash'], 'settings.payment.autoCollection': false,
    'settings.onboarding.requireInitialAssessment': true, 'settings.loyalty.pointsPerWorkout': 5,
    'settings.finances.monthlyGoal': 1000,
  }));
  await assertSucceeds(setDoc(ref, { settings: { booking: { minCancellationHours: 24 } } }, { merge: true }));
  const data = (await getDoc(ref)).data()!;
  assert.equal(data.plan, 'basic'); assert.equal(data.isActive, true); assert.equal(data.canAddStaff, false);
});
it('legacy commercial fields stay server-owned on clubs without a modern plan/type', async () => {
  const legacy: any = club(); delete legacy.accountType;
  await fixture(`clubs/${tenant}`, legacy);
  await assertFails(updateDoc(doc(client('owner'), `clubs/${tenant}`), { plan: 'premium' }));
  await assertFails(updateDoc(doc(client('owner'), `clubs/${tenant}`), { canAddStaff: true }));
  await assertSucceeds(updateDoc(doc(client('owner'), `clubs/${tenant}`), { name: 'Legacy public edit' }));
  await fixture(`clubs/${tenant}`, club());
});
it('authorized suspension persists after all tenant attempts; UI, capabilities and tenant reads remain blocked', async () => {
  await fixture(`clubs/${tenant}`, club());
  await fixture('tasks/saas-authority-task', { clubId: tenant, title: 'Tenant data' });
  await assertSucceeds(getDoc(doc(client('owner'), 'tasks/saas-authority-task')));
  // Trusted Admin SDK writes are simulated with disabled rules, never a client exception.
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), `clubs/${tenant}`), { isActive: false }));
  for (const role of ['owner', 'manager', 'coach', 'member'] as const) {
    const db = client(role), ref = doc(db, `clubs/${tenant}`);
    for (const patch of [{ isActive: true }, { active: true }, { suspended: false }, { isActive: deleteField() }, { plan: 'premium', name: 'Bypass' }])
      await assertFails(setDoc(ref, patch, { merge: true }));
    const data = (await assertSucceeds(getDoc(ref))).data()!;
    const authoritative = readClubDocument(tenant, data), actor = { role, clubId: tenant };
    assert.equal(isOrganizationActive(authoritative), false);
    assert.equal(canLoadLiveCollection('programs', authoritative, actor), false);
    assert.ok(Object.values(getProductCapabilities(authoritative, actor)).every(c => !c.usable));
    assert.ok(Object.values(resolveExperienceCapabilities(authoritative, actor)).every(c => !c.runtimeUsable));
    await assertFails(getDoc(doc(db, 'tasks/saas-authority-task')));
    await assertFails(updateDoc(ref, { name: 'Suspended mutation' }));
  }
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), `clubs/${tenant}`), { isActive: true }));
  await assertSucceeds(getDoc(doc(client('owner'), 'tasks/saas-authority-task')));
});
it('missing/malformed activation never gains privileges from a legacy alias or cached entitlement', async () => {
  for (const value of [undefined, null, 'true', 1, false]) {
    const data: any = club({ active: true, suspended: false, entitlements: ['premium'], canAddStaff: true, saasPlanId: 'studio' });
    if (value === undefined) delete data.isActive; else data.isActive = value;
    await fixture(`clubs/${tenant}`, data);
    await assertFails(getDoc(doc(client('owner'), 'tasks/saas-authority-task')));
    await assertFails(updateDoc(doc(client('owner'), `clubs/${tenant}`), { isActive: true }));
    assert.equal(isOrganizationActive(data), false);
    for (const role of ['owner', 'manager', 'coach', 'member'] as const) {
      const actor = { role, clubId: tenant };
      assert.ok(Object.values(getProductCapabilities(data, actor)).every(c => !c.usable));
      assert.ok(Object.values(resolveExperienceCapabilities(data, actor)).every(c => !c.runtimeUsable));
    }
  }
  await fixture(`clubs/${tenant}`, club());
});
