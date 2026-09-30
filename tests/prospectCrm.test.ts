import { it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProspectEmail, normalizeProspectPhone, probableProspectDuplicate, prospectPriority, prospectStage } from '../components/prospectCrm';
import { legacyProspectNumericId } from '../server/prospectIdentity';
import type { Prospect } from '../types';

const prospect = (overrides: Partial<Prospect> = {}): Prospect => ({
  id: 1, clubId: 'club', name: 'Camille', email: 'Camille@Example.test', phone: '06 12 34 56 78',
  date: '2026-09-30T12:00:00.000Z', status: 'lead', answers: {}, ...overrides
});
it('normalizes contact fields only for comparison and detects likely duplicates', () => {
  const entries = [prospect()];
  assert.equal(normalizeProspectEmail('  CAMILLE@example.test '), 'camille@example.test');
  assert.equal(normalizeProspectPhone('06-12-34-56-78'), '0612345678');
  assert.equal(probableProspectDuplicate(entries, ' CAMILLE@example.test ', '')?.id, 1);
  assert.equal(probableProspectDuplicate(entries, '', '06-12-34-56-78')?.id, 1);
  assert.equal(probableProspectDuplicate(entries, 'other@example.test', '0700000000'), undefined);
});
it('keeps public pending leads visible as new and prioritizes due reminders', () => {
  assert.equal(prospectStage(prospect({ status: 'pending' })), 'lead');
  const overdue = prospect({ nextReminderDate: '2026-09-29T12:00:00.000Z' });
  const future = prospect({ nextReminderDate: '2026-10-01T12:00:00.000Z' });
  assert.ok(prospectPriority(overdue, Date.parse('2026-09-30T12:00:00.000Z')) < prospectPriority(future, Date.parse('2026-09-30T12:00:00.000Z')));
});
it('derives a stable safe numeric identity for idless historical public prospects', () => {
  const id = legacyProspectNumericId('public-prospect-uid');
  assert.ok(Number.isSafeInteger(id) && id >= 3_000_000_000_000);
  assert.equal(id, legacyProspectNumericId('public-prospect-uid'));
  assert.notEqual(id, legacyProspectNumericId('other-public-prospect'));
});
