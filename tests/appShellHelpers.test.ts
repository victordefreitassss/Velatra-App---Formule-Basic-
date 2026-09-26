import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countTodayUpcomingSessions,
  getAllContextItems,
  getAppHubForPage,
  getContextItemsForHub,
  getContextPageLabel,
  getHubDefaultPage,
  getMobileMoreGroups,
  getMobileTabForPage,
  getPrimaryHubsForRole,
} from '../components/appShellHelpers';

test('coach pages map to the five navigation hubs and contextual destinations', () => {
  const expected: Record<string, string> = {
    home: 'home', users: 'clients', chat: 'clients', calendar: 'clients',
    coaching: 'coaching', presets: 'coaching', nutrition: 'coaching', drive: 'coaching', exercises: 'coaching', history: 'coaching',
    crm_pipeline: 'business', crm_finances: 'business', marketing: 'business', crm_tasks: 'business',
    about: 'plus', guide: 'plus', settings: 'plus',
  };
  for (const [page, hub] of Object.entries(expected)) assert.equal(getAppHubForPage(page, 'coach'), hub, page);
  assert.deepEqual(getContextItemsForHub('clients', 'coach').map(item => item.id), ['users', 'chat', 'calendar']);
  assert.deepEqual(getContextItemsForHub('coaching', 'coach').map(item => item.id), ['coaching', 'presets', 'nutrition', 'drive', 'exercises', 'history']);
  assert.deepEqual(getContextItemsForHub('business', 'coach').map(item => item.id), ['crm_pipeline', 'crm_finances', 'marketing', 'crm_tasks']);
  assert.deepEqual(getContextItemsForHub('plus', 'coach').map(item => item.id), ['about', 'guide', 'settings']);
  assert.ok(getAllContextItems('coach').some(item => item.id === 'home'));
  assert.ok(getAllContextItems('coach').some(item => item.id === 'crm_tasks'));
  assert.deepEqual(getPrimaryHubsForRole('coach').map(hub => hub.id), ['home', 'clients', 'coaching', 'business', 'plus']);
  assert.equal(getContextPageLabel('exercises', 'coach'), 'Bibliothèque d’exercices');
  assert.equal(getContextPageLabel('crm_tasks', 'coach'), 'Tâches');
  assert.deepEqual(getMobileMoreGroups('coach').map(group => [group.label, group.items.map(item => item.id)]), [
    ['Clients', ['chat', 'calendar']],
    ['Coaching', ['presets', 'nutrition', 'drive', 'exercises', 'history']],
    ['Business', ['crm_finances', 'marketing', 'crm_tasks']],
    ['Plus', ['about', 'guide', 'settings']],
  ]);
  assert.equal(getHubDefaultPage('clients', 'coach'), 'users');
  assert.equal(getHubDefaultPage('coaching', 'coach'), 'coaching');
  assert.equal(getHubDefaultPage('business', 'coach'), 'crm_pipeline');
  assert.equal(getHubDefaultPage('plus', 'coach'), 'about');
  assert.deepEqual(getContextItemsForHub('clients', 'coach', false).map(item => item.id), ['users', 'chat']);
});

test('member pages map to sessions, progression, nutrition and plus without losing destinations', () => {
  const expected: Record<string, string> = {
    home: 'home', calendar: 'sessions', planning: 'sessions', performances: 'progression',
    evolution: 'progression', nutrition: 'nutrition', supplements: 'nutrition',
    ai_coach: 'plus', drive: 'plus', profile: 'plus', about: 'plus', messages: 'plus', history: 'plus',
  };
  for (const [page, hub] of Object.entries(expected)) assert.equal(getAppHubForPage(page, 'member'), hub, page);
  assert.deepEqual(getContextItemsForHub('sessions', 'member').map(item => item.id), ['calendar', 'planning']);
  assert.deepEqual(getContextItemsForHub('progression', 'member').map(item => item.id), ['performances', 'evolution']);
  assert.deepEqual(getContextItemsForHub('nutrition', 'member').map(item => item.id), ['nutrition', 'supplements']);
  assert.deepEqual(getContextItemsForHub('plus', 'member').map(item => item.id), ['ai_coach', 'drive', 'profile', 'about', 'messages', 'history']);
  assert.deepEqual(getMobileMoreGroups('member').map(group => [group.label, group.items.map(item => item.id)]), [
    ['Séances', ['planning']],
    ['Progression', ['evolution']],
    ['Nutrition', ['supplements']],
    ['Plus', ['ai_coach', 'drive', 'profile', 'about', 'messages', 'history']],
  ]);
  assert.deepEqual(getPrimaryHubsForRole('member').map(hub => hub.id), ['home', 'sessions', 'progression', 'nutrition', 'plus']);
  assert.equal(getContextPageLabel('messages', 'member'), 'Messages');
  assert.equal(getHubDefaultPage('sessions', 'member'), 'calendar');
  assert.equal(getHubDefaultPage('progression', 'member'), 'performances');
  assert.equal(getHubDefaultPage('nutrition', 'member'), 'nutrition');
  assert.equal(getHubDefaultPage('plus', 'member'), 'ai_coach');
  assert.deepEqual(getContextItemsForHub('sessions', 'member', false).map(item => item.id), ['calendar']);
});

test('superadmin retains its dedicated navigation instead of coach or member hubs', () => {
  assert.equal(getAppHubForPage('admin', 'superadmin'), 'admin');
  assert.deepEqual(getContextItemsForHub('admin', 'superadmin'), []);
  assert.equal(getHubDefaultPage('admin', 'superadmin'), 'admin');
});

test('mobile navigation maps every route to a single role-specific tab', () => {
  const coachTabs = ['home', 'users', 'coaching', 'crm_pipeline', 'plus'];
  const coachRoutes = ['home', 'users', 'chat', 'calendar', 'coaching', 'presets', 'nutrition', 'drive', 'exercises', 'history', 'crm_pipeline', 'crm_finances', 'marketing', 'crm_tasks', 'guide', 'about', 'settings'];
  for (const route of coachRoutes) assert.ok(coachTabs.includes(getMobileTabForPage(route, 'coach')), `coach route ${route}`);
  assert.equal(getMobileTabForPage('crm_pipeline', 'coach'), 'crm_pipeline');
  assert.equal(getMobileTabForPage('crm_finances', 'coach'), 'crm_pipeline');
  assert.equal(getMobileTabForPage('marketing', 'coach'), 'crm_pipeline');
  assert.equal(getMobileTabForPage('settings', 'coach'), 'plus');

  const memberTabs = ['home', 'calendar', 'performances', 'nutrition', 'plus'];
  const memberRoutes = ['home', 'calendar', 'planning', 'performances', 'evolution', 'nutrition', 'ai_coach', 'drive', 'profile', 'about', 'supplements', 'messages', 'history'];
  for (const route of memberRoutes) assert.ok(memberTabs.includes(getMobileTabForPage(route, 'member')), `member route ${route}`);
  assert.equal(getMobileTabForPage('planning', 'member'), 'calendar');
  assert.equal(getMobileTabForPage('ai_coach', 'member'), 'plus');
});

test('coach dashboard counts all confirmed future sessions today, not only the five-item agenda preview', () => {
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
