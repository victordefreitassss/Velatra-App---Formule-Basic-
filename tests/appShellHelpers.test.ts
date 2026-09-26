import assert from 'node:assert/strict';
import test from 'node:test';
import { countTodayUpcomingSessions, getMobileTabForPage } from '../components/appShellHelpers';

test('mobile navigation maps every route to a single role-specific tab', () => {
  const coachTabs = ['home', 'users', 'coaching', 'crm_pipeline', 'plus'];
  const coachRoutes = ['home', 'users', 'chat', 'calendar', 'coaching', 'presets', 'nutrition', 'drive', 'crm_pipeline', 'crm_finances', 'marketing', 'guide', 'about', 'settings'];
  for (const route of coachRoutes) assert.ok(coachTabs.includes(getMobileTabForPage(route, 'coach')), `coach route ${route}`);
  assert.equal(getMobileTabForPage('crm_pipeline', 'coach'), 'crm_pipeline');
  assert.equal(getMobileTabForPage('crm_finances', 'coach'), 'crm_pipeline');
  assert.equal(getMobileTabForPage('settings', 'coach'), 'plus');

  const memberTabs = ['home', 'calendar', 'performances', 'nutrition', 'plus'];
  const memberRoutes = ['home', 'calendar', 'planning', 'performances', 'evolution', 'nutrition', 'ai_coach', 'drive', 'profile', 'about', 'supplements'];
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
