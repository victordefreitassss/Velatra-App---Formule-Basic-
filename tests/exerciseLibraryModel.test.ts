import assert from 'node:assert/strict';
import test from 'node:test';
import { Exercise } from '../types.ts';
import { buildClubExercise, canManageExercise, createPerfId, duplicateExerciseForClub, filterExercises, getExerciseType, getSelectableExercises, isExerciseArchived, isExerciseReferenced, mergeExercises, updateClubExercise } from '../components/exerciseLibraryModel.ts';

const globalExercise: Exercise = { id: 1, clubId: 'global', name: 'Développé couché', cat: 'Poitrine', equip: 'Barre', photo: null, perfId: 'global-bench', primaryMuscles: ['Pectoraux'], tags: ['force'] };
const clubExercise: Exercise = { id: 2, clubId: 'club-a', name: 'Élévation latérale', cat: 'Épaules', equip: 'Haltères', photo: null, perfId: 'club-lateral', primaryMuscles: ['Épaules'], secondaryMuscles: ['Trapèzes'], difficulty: 'beginner', exerciseType: 'strength', tags: ['débutant'], createdAt: '2026-09-30T10:00:00.000Z' };
const archivedExercise: Exercise = { ...clubExercise, id: 3, name: 'Planche ancienne', isArchived: true, createdAt: '2026-09-29T10:00:00.000Z' };

test('merge preserves global and club exercises while allowing a persisted global override', () => {
  const merged = mergeExercises([globalExercise], [clubExercise, { ...globalExercise, name: 'Développé couché Velatra' }]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(item => item.id === 1)?.name, 'Développé couché Velatra');
});

test('archived exercises are absent from new pickers but remain selectable for an existing entry', () => {
  assert.deepEqual(getSelectableExercises([clubExercise, archivedExercise]).map(item => item.id), [2]);
  assert.deepEqual(getSelectableExercises([clubExercise, archivedExercise], 3).map(item => item.id), [2, 3]);
});

test('global exercises are never manageable by a club and can only be duplicated', () => {
  assert.equal(canManageExercise(globalExercise, 'club-a'), false);
  assert.equal(canManageExercise(clubExercise, 'club-a'), true);
  const copy = duplicateExerciseForClub(globalExercise, { id: 20, clubId: 'club-a', createdByUid: 'coach-a', now: '2026-09-30T12:00:00.000Z' });
  assert.equal(copy.clubId, 'club-a');
  assert.equal(copy.name, 'Développé couché — copie');
  assert.equal(copy.isArchived, false);
  assert.equal(copy.createdByUid, 'coach-a');
  assert.notEqual(copy.perfId, globalExercise.perfId);
});

test('club duplication and creation produce a stable unique perfId', () => {
  const created = buildClubExercise({ name: 'Fente arrière', cat: 'Jambes', equip: 'Haltères', tags: ['unilatéral'] }, { id: 42, clubId: 'club-a', createdByUid: 'coach-a', now: '2026-09-30T12:00:00.000Z' });
  assert.equal(created.perfId, createPerfId('Fente arrière', 42));
  const copy = duplicateExerciseForClub(created, { id: 43, clubId: 'club-a', createdByUid: 'coach-a', now: '2026-09-30T12:01:00.000Z' });
  assert.notEqual(copy.perfId, created.perfId);
  assert.equal(copy.createdAt, '2026-09-30T12:01:00.000Z');
});

test('search is accent and case insensitive across all knowledge-base fields', () => {
  assert.deepEqual(filterExercises([clubExercise], { search: 'ELEVATION' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises([clubExercise], { search: 'déBUTant' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises([clubExercise], { search: 'trapèze' }).map(item => item.id), [2]);
});

test('filters cover category, muscle, equipment, difficulty, type, origin and archived status', () => {
  const all = [globalExercise, clubExercise, archivedExercise];
  assert.deepEqual(filterExercises(all, { category: 'Épaules' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises(all, { muscle: 'Trapèzes' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises(all, { equipment: 'haltères' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises(all, { difficulty: 'beginner' }).map(item => item.id), [2]);
  assert.deepEqual(filterExercises(all, { exerciseType: 'strength' }).map(item => item.id), [1, 2]);
  assert.deepEqual(filterExercises(all, { origin: 'global', clubId: 'club-a' }).map(item => item.id), [1]);
  assert.deepEqual(filterExercises(all, { origin: 'club', clubId: 'club-a', includeArchived: true }).map(item => item.id), [2, 3]);
});

test('archive and restore retain IDs and historical program resolution', () => {
  const archived = { ...updateClubExercise(clubExercise, { ...clubExercise, name: clubExercise.name }, { clubId: 'club-a', now: '2026-09-30T12:00:00.000Z' }), isArchived: true };
  const restored = { ...archived, isArchived: false };
  assert.equal(isExerciseArchived(archived), true);
  assert.deepEqual(getSelectableExercises([archived]), []);
  assert.equal(isExerciseArchived(restored), false);
  assert.equal(restored.id, clubExercise.id);
  assert.equal(isExerciseReferenced(2, [{ id: 1, clubId: 'club-a', name: 'Programme', nbDays: 1, memberId: 1, startDate: '2026-09-30', presetId: null, completedWeeks: [], currentDayIndex: 0, days: [{ name: 'Jour 1', isCoaching: false, exercises: [{ exId: 2, sets: 3, reps: '10', rest: '60', tempo: '', duration: '', notes: '', setGroup: null, setType: 'normal', setName: null }] }] }], []), true);
});

test('legacy exercises remain compatible with deterministic exercise type fallbacks', () => {
  assert.equal(getExerciseType({ cat: 'Cardio' }), 'cardio');
  assert.equal(getExerciseType({ cat: 'Mobilité' }), 'mobility');
  assert.equal(getExerciseType({ cat: 'Poitrine' }), 'strength');
});
