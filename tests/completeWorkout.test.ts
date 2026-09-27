import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { completeWorkout } from '../server/completeWorkout';
const app = initializeApp({ projectId: 'demo-velatra' });
const db = getFirestore(app);
const exercises = [{ exId: 1, name: 'Squat', sets: [{ weight: '20', reps: '10', duration: '' }] }];
const input = () => ({ requestId: randomUUID(), programId: 'workout-program', dayIndex: 0, log: { memberId: 8001, exercises, rpe: 7, score: 80 }, performances: [{ exId: 'squat', weight: 20, reps: 10 }] });
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run with Firebase emulators');
  for (const collection of ['logs', 'performances', 'bookings', 'archivedPrograms']) {
    const previous = await db.collection(collection).where('clubId', '==', '876544').get();
    for (const document of previous.docs) await document.ref.delete();
  }
  await db.doc('tasks/workout-reminder').set({ clubId: '876544', relatedMemberId: 8001, title: 'Relance : QA', status: 'todo' });
  await db.doc('clubs/876544').set({ settings: {} });
  await db.doc('users/workout-member').set({ id: 8001, name: 'QA', role: 'member', clubId: '876544', xp: 0, assignedCoachUid: 'workout-coach' });
  await db.doc('users/workout-coach').set({ id: 8002, role: 'coach', clubId: '876544' });
  await db.doc('users/workout-outsider').set({ id: 8003, role: 'owner', clubId: '999999' });
  await db.doc('users/workout-other-coach').set({ id: 8004, role: 'coach', clubId: '876544' });
  await db.doc('programs/workout-program').set({ id: 'workout-program', memberId: 8001, clubId: '876544', nbDays: 1, currentDayIndex: 0, durationWeeks: 2, days: [{ name: 'Jour 1', exercises: [{ exId: 1 }] }] });
});
after(() => deleteApp(app));
it('rejects cross-club, unassigned coach, changed exercises and malformed measurements', async () => {
  await assert.rejects(completeWorkout(db, 'workout-outsider', input()), { status: 403 });
  await assert.rejects(completeWorkout(db, 'workout-other-coach', input()), { status: 403 });
  await assert.rejects(completeWorkout(db, 'workout-member', { ...input(), log: { exercises: [] } }), { status: 409 });
  await assert.rejects(completeWorkout(db, 'workout-member', { ...input(), performances: [{ exId: 'x', weight: Infinity, reps: 1 }] }), { status: 400 });
});
it('atomically saves once under concurrent retry, grants one reward and rejects a stale new submission', async () => {
  const data = input();
  const results = await Promise.all([completeWorkout(db, 'workout-member', data), completeWorkout(db, 'workout-member', data)]);
  assert.equal(results.filter(r => !r.alreadyCompleted).length, 1);
  assert.equal((await db.doc('users/workout-member').get()).data()?.xp, 125);
  assert.equal((await db.doc('programs/workout-program').get()).data()?.currentDayIndex, 1);
  const saved = (await db.doc(`logs/${results[0].log!.id}`).get()).data()!;
  assert.equal(saved.exerciseData['0-0-weight'], '20');
  assert.equal(saved.totalVolume, 200);
  assert.equal(saved.rpe, 7);
  assert.equal((await db.doc('tasks/workout-reminder').get()).data()?.status, 'done');
  assert.equal((await db.collection('performances').where('memberId', '==', 8001).get()).size, 1);
  await assert.rejects(completeWorkout(db, 'workout-member', input()), { status: 409 });
});
it('keeps the program for an ad hoc coach session then archives the final member session and completes its booking', async () => {
  await completeWorkout(db, 'workout-coach', { ...input(), dayIndex: 1, advanceProgram: false });
  assert.equal((await db.doc('programs/workout-program').get()).data()?.currentDayIndex, 1);
  await db.doc('bookings/workout-booking').set({ clubId: '876544', memberId: 8001, status: 'confirmed' });
  await db.doc('programs/workout-program').update({ bookingId: 'workout-booking' });
  const data = { ...input(), dayIndex: 1 };
  const completed = await completeWorkout(db, 'workout-member', data);
  assert.equal(completed.programCompleted, true);
  assert.equal((await db.doc('programs/workout-program').get()).exists, false);
  assert.equal((await db.doc('archivedPrograms/workout-program').get()).data()?.status, 'completed');
  assert.equal((await db.doc('bookings/workout-booking').get()).data()?.status, 'completed');
  assert.equal((await completeWorkout(db, 'workout-member', data)).alreadyCompleted, true);
  assert.equal((await db.doc('users/workout-member').get()).data()?.xp, 250);
});
