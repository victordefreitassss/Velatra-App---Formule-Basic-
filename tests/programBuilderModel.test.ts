import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExerciseEntry } from '../types';
import { appendPresetExercises, copyExerciseToDay, createGroupWithExercises, duplicateExercise, normalizeExerciseGroups, setExerciseGroupType, togglePreviousExerciseLink } from '../components/programBuilderModel.ts';

const entry = (exId: number, extra: Partial<ExerciseEntry> = {}): ExerciseEntry => ({ exId, sets: 3, reps: '8-12', rest: '90', tempo: '', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null, ...extra });

test('grouping requires explicitly selected exercises and preserves their order', () => {
  const original = [entry(1), entry(2), entry(3), entry(4)];
  const grouped = createGroupWithExercises(original, 0, [3], 'superset')!;
  assert.deepEqual(grouped.map(item => item.exId), [1, 4, 2, 3]);
  assert.deepEqual(grouped.map(item => item.setGroup), [1, 1, null, null]);
  assert.equal(createGroupWithExercises(original, 0, [], 'superset'), null);
  assert.equal(setExerciseGroupType([entry(1)], 0, 'superset'), null);
  assert.equal(original[0].setGroup, null);
});

test('duplicate and cross-day copy are independent of the source group', () => {
  const pair = [entry(1, { setGroup: 1, setType: 'superset' }), entry(2, { setGroup: 1, setType: 'superset' })];
  const duplicated = duplicateExercise(pair, 0);
  assert.deepEqual(duplicated.map(item => item.setGroup), [1, 1, null]);
  assert.equal(copyExerciseToDay(pair[0]).setGroup, null);
  assert.equal(pair[0].setGroup, 1);
});

test('deleting or unlinking one side clears orphan groups', () => {
  const pair = [entry(1, { setGroup: 1, setType: 'superset' }), entry(2, { setGroup: 1, setType: 'superset' })];
  assert.deepEqual(normalizeExerciseGroups(pair.slice(1)).map(item => item.setGroup), [null]);
  assert.deepEqual(togglePreviousExerciseLink(pair, 1).map(item => item.setGroup), [null, null]);
  assert.deepEqual(togglePreviousExerciseLink([entry(1), entry(2)], 1).map(item => item.setGroup), [1, 1]);
});

test('appending preset remaps group IDs and old entries remain readable', () => {
  const existing = [entry(1, { setGroup: 1, setType: 'superset' }), entry(2, { setGroup: 1, setType: 'superset' })];
  const appended = appendPresetExercises(existing, existing);
  assert.deepEqual(appended.map(item => item.setGroup), [1, 1, 2, 2]);
  assert.equal(normalizeExerciseGroups([entry(3, { reps: 'MAX' })])[0].reps, 'MAX');
});

test('normalization removes orphan links after reordering and splits reused legacy IDs', () => {
  const linked = (id: number) => entry(id, { setGroup: 1, setType: 'superset' });
  assert.deepEqual(normalizeExerciseGroups([linked(1), entry(9), linked(2)]).map(item => item.setGroup), [null, null, null]);
  assert.deepEqual(normalizeExerciseGroups([linked(1), linked(2), entry(9), linked(3), linked(4)]).map(item => item.setGroup), [1, 1, null, 2, 2]);
});
