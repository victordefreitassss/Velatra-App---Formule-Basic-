import assert from 'node:assert/strict';
import test from 'node:test';
import type { Club, Role } from '../types';
import {
  countTodayUpcomingSessions, getAllContextItems, getAppHubForPage,
  getContextItemsForHub, getContextPageLabel, getCreateActions,
  getHubDefaultPage, getMobileMoreGroups, getMobileTabForPage,
  getPrimaryHubsForRole, type NavigationContext,
} from '../components/appShellHelpers';

const club = (accountType?: 'solo' | 'studio', canAddStaff = false) =>
  ({ id: 'club-1', accountType, canAddStaff } as Club);
const context = (role: Role, accountType?: 'solo' | 'studio', planningEnabled = true): NavigationContext =>
  ({ role, club: club(accountType), planningEnabled });
const ids = (ctx: NavigationContext) => getAllContextItems(ctx).map(item => item.id);
const hubs = (ctx: NavigationContext) => getPrimaryHubsForRole(ctx).map(item => item.label);

test('Solo owner and Studio owner have the same five coach spaces with Planning primary', () => {
  for (const type of ['solo', 'studio'] as const) {
    const ctx = context('owner', type);
    assert.deepEqual(hubs(ctx), ['Accueil', 'Clients', 'Coaching', 'Planning', 'Business']);
    assert.equal(getAppHubForPage('calendar', ctx), 'planning');
    assert.equal(getHubDefaultPage('planning', ctx), 'calendar');
    assert.deepEqual(getContextItemsForHub('clients', ctx).map(item => item.id), ['users', 'chat']);
    assert.ok(ids(ctx).includes('exercises'));
    assert.ok(ids(ctx).includes('crm_finances'));
    assert.ok(!ids(ctx).includes('marketing'));
    assert.ok(!getPrimaryHubsForRole(ctx).some(item => item.id === 'plus'));
    assert.ok(getPrimaryHubsForRole(ctx).length <= 5);
  }
});

test('Studio coach sees operational spaces and no owner-only creation or administration action', () => {
  const ctx = context('coach', 'studio');
  assert.deepEqual(hubs(ctx), ['Accueil', 'Clients', 'Coaching', 'Planning', 'Business']);
  assert.deepEqual(getCreateActions(ctx).map(action => action.id), ['add-member', 'add-preset', 'add-prospect', 'invite-member']);
  assert.ok(!ids(ctx).includes('marketing'));
  assert.ok(!ids(ctx).includes('cashRegister'));
  assert.ok(getMobileMoreGroups(ctx).some(group => group.hub === 'plus'));
  assert.equal(getAppHubForPage('settings', ctx), 'plus');
  assert.equal(getMobileTabForPage('settings', ctx), 'plus');
});

test('Member has five member spaces and no coach navigation or creation menu', () => {
  for (const type of ['solo', 'studio'] as const) {
    const ctx = context('member', type);
    assert.deepEqual(hubs(ctx), ['Accueil', 'Séances', 'Progression', 'Nutrition', 'Plus']);
    assert.deepEqual(getCreateActions(ctx), []);
    assert.ok(!ids(ctx).includes('crm_pipeline'));
    assert.ok(!ids(ctx).includes('settings'));
    assert.deepEqual(getContextItemsForHub('sessions', ctx).map(item => item.id), ['calendar', 'planning', 'history']);
    assert.deepEqual(getContextItemsForHub('plus', ctx).map(item => item.id),
      ['profile', 'messages', 'drive', 'about', 'ai_coach']);
    assert.deepEqual(getMobileMoreGroups(ctx).map(group => group.hub), ['plus']);
    assert.equal(getAppHubForPage('history', ctx), 'sessions');
  }
});

test('Unimplemented member shop stays out of navigation despite available nutrition capability', () => {
  const ctx = context('member', 'studio');

  assert.ok(ids(ctx).includes('nutrition'));
  assert.ok(!ids(ctx).includes('supplements'));
  assert.equal(getAppHubForPage('supplements', ctx), 'plus');
});

test('Legacy clubs retain available historical secondary pages without inferring Solo', () => {
  const ctx = context('owner');
  assert.ok(ids(ctx).includes('drive'));
  assert.ok(ids(ctx).includes('crm_tasks'));
  assert.ok(ids(ctx).includes('about'));
  assert.deepEqual(hubs(ctx), ['Accueil', 'Clients', 'Coaching', 'Planning', 'Business']);
  assert.equal(getContextPageLabel('exercises', ctx), 'Bibliothèque d’exercices');
});

test('Search, mobile secondary menu and +Créer derive from the same capability-filtered catalog', () => {
  const ctx = context('owner', 'solo', false);
  const all = new Set(ids(ctx));
  const groups = getMobileMoreGroups(ctx);
  assert.ok(groups.every(group => group.items.every(item => all.has(item.id))));
  assert.ok(!all.has('marketing'));
  assert.ok(!all.has('planning'));
  assert.equal(getHubDefaultPage('planning', ctx), 'calendar');
  assert.equal(getMobileTabForPage('calendar', ctx), 'calendar');
  for (const action of getCreateActions(ctx)) assert.ok(['clients', 'programs', 'crm'].includes(action.capability));
  const withoutClub: NavigationContext = { role: 'owner', club: null };
  assert.deepEqual(getCreateActions(withoutClub), []);
});

test('Historical state.page values still map to their hub after moving out of the roots', () => {
  const ctx = context('owner', 'studio');
  for (const page of ['presets', 'exercises', 'drive', 'history', 'nutrition'])
    assert.equal(getAppHubForPage(page, ctx), 'coaching');
  for (const page of ['crm_pipeline', 'crm_finances', 'crm_tasks', 'marketing'])
    assert.equal(getAppHubForPage(page, ctx), 'business');
  for (const page of ['settings', 'guide', 'about'])
    assert.equal(getAppHubForPage(page, ctx), 'plus');
  assert.equal(getMobileTabForPage('crm_finances', ctx), 'crm_pipeline');
});

test('Superadmin retains its own console and no coach creation menu', () => {
  const ctx = context('superadmin', 'studio');
  assert.deepEqual(getPrimaryHubsForRole(ctx), [{ id: 'admin', label: 'Admin', page: 'admin' }]);
  assert.deepEqual(getCreateActions(ctx), []);
  assert.deepEqual(ids(ctx), ['admin']);
});

test('Coach dashboard counts all confirmed future sessions today', () => {
  const now = new Date('2026-09-26T12:00:00+02:00');
  const futureToday = Array.from({ length: 8 }, (_, index) => ({
    status: 'confirmed' as const,
    startTime: new Date(now.getTime() + (index + 1) * 60 * 60 * 1000).toISOString(),
  }));
  const bookings = [
    ...futureToday,
    { status: 'confirmed' as const, startTime: '2026-09-26T10:00:00+02:00' },
    { status: 'cancelled' as const, startTime: '2026-09-26T17:00:00+02:00' },
    { status: 'confirmed' as const, startTime: '2026-09-27T10:00:00+02:00' },
  ];
  assert.equal(countTodayUpcomingSessions(bookings, now), 8);
});
