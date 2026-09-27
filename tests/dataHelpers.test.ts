import { it } from 'node:test';
import assert from 'node:assert/strict';
import { localDateKey, createNumericId, sameUserDataScope } from '../components/dataHelpers';

it('uses local calendar boundaries for tasks and program start dates', () => {
  const date = new Date(2026, 8, 27, 0, 15);
  assert.equal(localDateKey(date), '2026-09-27');
  const midnight = new Date(2026, 2, 29, 0, 5);
  assert.equal(localDateKey(midnight), '2026-03-29');
});
it('preserves loaded data on profile-only updates and resets for another account', () => {
  const profile = { firebaseUid: 'coach-a', clubId: '123456', role: 'owner' };
  assert.equal(sameUserDataScope(profile, { ...profile, onboardingCompleted: true } as typeof profile), true);
  assert.equal(sameUserDataScope(profile, { ...profile, firebaseUid: 'coach-b' }), false);
  assert.equal(sameUserDataScope(profile, { ...profile, clubId: '654321' }), false);
});
it('allocates safe numeric IDs independently of the clock', () => {
  const values = Array.from({ length: 1000 }, createNumericId);
  assert.ok(values.every(value => Number.isSafeInteger(value) && value > 0));
  assert.equal(new Set(values).size, values.length);
});
