import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCheckInReward, parseDailyCheckInInput } from '../server/memberDailyCheckIn';

test('daily check-in accepts bounded habit values and normalizes tenths', () => {
  assert.deepEqual(parseDailyCheckInInput({
    waterLitres: 2.36,
    sleepHours: 7.25,
    proteinTargetMet: true,
    mood: 4
  }), {
    waterLitres: 2.4,
    sleepHours: 7.3,
    proteinTargetMet: true,
    mood: 4
  });
});

test('daily check-in rejects invalid values and omitted habits', () => {
  assert.equal(parseDailyCheckInInput({ waterLitres: 11, sleepHours: 7, proteinTargetMet: true, mood: 4 }), null);
  assert.equal(parseDailyCheckInInput({ waterLitres: 2, sleepHours: 25, proteinTargetMet: true, mood: 4 }), null);
  assert.equal(parseDailyCheckInInput({ waterLitres: 2, sleepHours: 7, proteinTargetMet: 1, mood: 4 }), null);
  assert.equal(parseDailyCheckInInput({ waterLitres: 2, sleepHours: 7, proteinTargetMet: true, mood: 5.5 }), null);
  assert.equal(parseDailyCheckInInput(null), null);
});

test('daily reward increments a consecutive streak and restarts a broken streak', () => {
  assert.deepEqual(calculateCheckInReward({ xp: 100, streak: 3, lastCheckInDate: '2026-09-24' }, '2026-09-25'), {
    xp: 150,
    streak: 4,
    lastCheckInDate: '2026-09-25'
  });
  assert.equal(calculateCheckInReward({ xp: 100, streak: 30, lastCheckInDate: '2026-09-20' }, '2026-09-25').streak, 1);
});
