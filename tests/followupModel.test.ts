import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dueDateFor, dueStatus, normalizePhases, parseFrequency, parseQuestions, shiftDay, validDay, validateAnswers, weekRate } from '../server/followupModel';

it('calculates daily, weekly, interval and one-off deadlines without UTC/local mixing', () => {
  assert.equal(dueDateFor({ kind: 'daily' }, '2026-09-01', '2026-09-08'), '2026-09-08');
  assert.equal(dueDateFor({ kind: 'weekly' }, '2026-09-01', '2026-09-08'), '2026-09-08');
  assert.equal(dueDateFor({ kind: 'weekly' }, '2026-09-01', '2026-09-07'), '2026-09-01');
  assert.equal(dueDateFor({ kind: 'everyWeeks', intervalWeeks: 2 }, '2026-09-01', '2026-09-16'), '2026-09-15');
  assert.equal(dueDateFor({ kind: 'once' }, '2026-09-01', '2026-09-16'), '2026-09-01');
  assert.equal(dueDateFor({ kind: 'manual' }, '2026-09-01', '2026-09-16'), null);
  assert.equal(dueDateFor({ kind: 'daily' }, '2026-09-20', '2026-09-19'), null);
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(validDay('2026-02-31'), false);
  assert.equal(validDay('2026-02-28'), true);
  assert.equal(parseFrequency({ kind: 'everyWeeks', intervalWeeks: 13 }), null);
  assert.deepEqual(parseFrequency({ kind: 'weekly' }), { kind: 'weekly' });
});

it('derives expected, received and late states from the canonical due date', () => {
  assert.equal(dueStatus(null, [], '2026-09-01'), 'none');
  assert.equal(dueStatus('2026-09-01', [], '2026-09-01'), 'expected');
  assert.equal(dueStatus('2026-09-01', [], '2026-09-02'), 'late');
  assert.equal(dueStatus('2026-09-01', ['2026-09-01'], '2026-09-02'), 'received');
});

it('allows configurable question types and strictly validates bounded answers', () => {
  const questions = parseQuestions([
    { id: 'fatigue', label: 'Fatigue', type: 'scale', required: true, min: 0, max: 10 },
    { id: 'pain', label: 'Douleur ?', type: 'boolean', required: true },
    { id: 'notes', label: 'Remarques', type: 'text', required: false },
    { id: 'choice', label: 'Choix', type: 'multiple', required: false, options: ['A', 'B'] },
  ]);
  assert.ok(questions);
  assert.deepEqual(validateAnswers(questions!, { fatigue: 8, pain: false, choice: ['A'] }), { fatigue: 8, pain: false, choice: ['A'] });
  assert.equal(validateAnswers(questions!, { fatigue: 11, pain: false }), null);
  assert.equal(validateAnswers(questions!, { fatigue: 8, pain: false, other: 1 }), null);
  assert.equal(validateAnswers(questions!, { fatigue: 8 }), null);
  assert.equal(validateAnswers(questions!, { fatigue: 8, pain: false, notes: 'x'.repeat(2001) }), null);
  assert.equal(parseQuestions([{ id: 'x', label: 'x', type: 'single', required: true, options: ['one'] }]), null);
});

it('accepts a configurable ordered journey with at most one active phase', () => {
  const base = { id: 'one', name: 'Évaluation', objective: 'Bilan', status: 'active', durationWeeks: 2,
    startDate: '2026-09-01', plannedEndDate: '2026-09-15', programId: null, checkInTemplateIds: [], notes: '' };
  const phases = normalizePhases([base, { ...base, id: 'two', name: 'Progression', status: 'planned' }]);
  assert.deepEqual(phases?.map(item => item.name), ['Évaluation', 'Progression']);
  assert.equal(normalizePhases([base, { ...base, id: 'two' }]), null);
  assert.equal(normalizePhases([base, { ...base, id: 'one', status: 'planned' }]), null);
  assert.equal(normalizePhases([base, { ...base, id: 'two', status: 'completed' }])?.[1].status, 'completed');
});

it('counts one logical habit completion per entry in the rolling week', () => {
  assert.deepEqual(weekRate([{ date: '2026-09-24', met: true }, { date: '2026-09-25', met: false }, { date: '2026-09-23', met: true }], '2026-09-30'), { completed: 1, expected: 7 });
});
