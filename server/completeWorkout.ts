import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { MemberCreationError } from './createMember.ts';

const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const numericId = (value: string) => parseInt(createHash('sha256').update(value).digest('hex').slice(0, 12), 16);

export async function completeWorkout(db: Firestore, uid: string, input: any) {
  const requestId = input?.requestId;
  const programId = String(input?.programId || '');
  const expectedIndex = input?.dayIndex;
  const submitted = input?.log;
  const performances = input?.performances || [];
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId) || !programId || programId.includes('/') || programId.length > 100 ||
      !Number.isInteger(expectedIndex) || expectedIndex < 0 || !submitted || !Array.isArray(submitted.exercises) || submitted.exercises.length > 100 ||
      !Array.isArray(performances) || performances.length > 100 || JSON.stringify(input).length > 100000) fail(400, 'La séance est invalide ou trop volumineuse.');
  // Only reported exercise measurements are accepted; identity and rewards come from the server.
  const exercises = submitted.exercises.map((exercise: any) => {
    if (!Number.isFinite(exercise?.exId) || typeof exercise.name !== 'string' || !Array.isArray(exercise.sets) || exercise.sets.length > 50) fail(400, 'Vérifiez les exercices de la séance.');
    return { exId: exercise.exId, name: exercise.name.slice(0, 160), sets: exercise.sets.map((set: any) => {
      const result: Record<string, string> = {};
      for (const field of ['weight', 'reps', 'duration']) {
        if (typeof set?.[field] !== 'string' || set[field].length > 30) fail(400, 'Vérifiez les séries de la séance.');
        result[field] = set[field];
      }
      return result;
    }) };
  });
  const cleanPerfs = performances.map((perf: any) => {
    if (typeof perf?.exId !== 'string' || perf.exId.length > 120 || !Number.isFinite(perf.weight) || perf.weight < 0 || perf.weight > 2000 || !Number.isFinite(perf.reps) || perf.reps < 0 || perf.reps > 10000) fail(400, 'Vérifiez les performances de la séance.');
    return { exId: perf.exId, weight: perf.weight, reps: perf.reps, duration: typeof perf.duration === 'string' ? perf.duration.slice(0, 30) : '' };
  });
  const id = numericId(`${uid}:${requestId}`);
  const logRef = db.doc(`logs/${id}`);
  const callerRef = db.doc(`users/${uid}`);
  const initialCaller = (await callerRef.get()).data();
  if (!initialCaller?.clubId) fail(403, 'Votre espace est introuvable.');
  const memberId = initialCaller!.role === 'member' ? initialCaller!.id : submitted.memberId;
  const members = await db.collection('users').where('clubId', '==', initialCaller!.clubId).where('id', '==', memberId).where('role', '==', 'member').limit(1).get();
  if (members.empty) fail(403, 'Cet adhérent est introuvable dans votre espace.');
  const memberRef = members.docs[0].ref;
  const programRef = db.doc(`programs/${programId}`);
  return db.runTransaction(async tx => {
    const [callerDoc, memberDoc, previous, programDoc, clubDoc] = await Promise.all([
      tx.get(callerRef), tx.get(memberRef), tx.get(logRef), tx.get(programRef), tx.get(db.doc(`clubs/${initialCaller!.clubId}`))
    ]);
    const caller = callerDoc.data(), member = memberDoc.data(), program = programDoc.data();
    if (!caller || !member || caller.clubId !== member.clubId || caller.clubId !== initialCaller!.clubId ||
        !(caller.role === 'owner' || caller.role === 'member' && uid === memberRef.id || caller.role === 'coach' && member.assignedCoachUid === uid)) fail(403, 'Vous ne pouvez pas enregistrer une séance pour cet adhérent.');
    if (previous.exists) return { success: true, alreadyCompleted: true, log: previous.data(), performances: [] };
    const isMember = caller!.role === 'member';
    if (program && (program.memberId !== member!.id || program.clubId !== member!.clubId) || isMember && !program) fail(403, 'Ce programme ne vous est pas accessible.');
    if (program && program.currentDayIndex !== expectedIndex) fail(409, 'Cette séance a déjà été enregistrée ou le programme a changé. Rechargez votre espace.');
    if (program && (!Number.isInteger(program.nbDays) || program.nbDays < 1 || !Array.isArray(program.days))) fail(409, 'La structure du programme doit être corrigée par le coach.');
    const day = program?.days?.[expectedIndex % program.nbDays];
    if (isMember && (!day || exercises.length !== day.exercises?.length || exercises.some((ex: any, index: number) => ex.exId !== day.exercises[index].exId))) fail(409, 'Les exercices du programme ont changé. Rechargez votre espace.');
    const today = dayKey(new Date());
    const identity = { clubId: member!.clubId, memberId: member!.id, ...(member!.assignedCoachUid ? { assignedCoachUid: member!.assignedCoachUid } : {}) };
    const exerciseData = Object.fromEntries(exercises.flatMap((ex: any, exIndex: number) => ex.sets.flatMap((set: any, setIndex: number) => Object.entries(set).map(([key, value]) => [`${exIndex}-${setIndex}-${key}`, value]))));
    const totalVolume = exercises.reduce((total: number, ex: any) => total + ex.sets.reduce((sum: number, set: any) => sum + Math.max(0, Math.min(2000, parseFloat(set.weight) || 0)) * Math.max(0, Math.min(10000, parseFloat(set.reps) || 0)), 0), 0);
    const log = { ...identity, id, date: today, week: program ? Math.floor(expectedIndex / program.nbDays) + 1 : 1,
      isCoaching: !isMember, dayName: String(day?.name || submitted.dayName || 'Séance').slice(0, 160), exercises, exerciseData, totalVolume,
      ...(Number.isFinite(submitted.rpe) ? { rpe: Math.min(10, Math.max(0, submitted.rpe)) } : {}),
      ...(Number.isFinite(submitted.score) ? { score: Math.min(100, Math.max(0, submitted.score)) } : {}),
      notes: typeof submitted.notes === 'string' ? submitted.notes.slice(0, 2000) : '',
      ...(isMember ? {} : { coachId: caller!.id }),
      ...(Number.isFinite(submitted.duration) ? { duration: Math.min(Math.max(submitted.duration, 0), 86400) } : {}) };
    const perfs = cleanPerfs.map((perf: any, index: number) => ({ ...perf, ...identity, id: numericId(`${uid}:${requestId}:perf:${index}`), date: today, fromCoaching: !isMember }));
    const bookingRef = program?.bookingId ? db.doc(`bookings/${program.bookingId}`) : null;
    const booking = bookingRef ? await tx.get(bookingRef) : null;
    if (booking?.exists && (booking.data()?.memberId !== member!.id || booking.data()?.clubId !== member!.clubId)) fail(409, 'La réservation liée à cette séance doit être vérifiée.');
    const reminderTasks = await tx.get(db.collection('tasks').where('clubId', '==', member!.clubId).where('relatedMemberId', '==', member!.id));
    const yesterday = new Date(`${today}T12:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const reward = isMember ? exercises.length * 25 + exercises.length * (exercises.length - 1) * 2.5 + Math.min(1000, Math.max(0, Number(clubDoc.data()?.settings?.loyalty?.pointsPerWorkout) || 100)) : 0;
    const streak = member!.lastWorkoutDate === today ? (member!.streak || 1) : member!.lastWorkoutDate === dayKey(yesterday) ? (member!.streak || 0) + 1 : 1;
    for (const task of reminderTasks.docs) {
      const data = task.data();
      if (data.status === 'todo' && typeof data.title === 'string' && data.title.includes('Relance')) tx.update(task.ref, { status: 'done' });
    }
    tx.create(logRef, log);
    for (const perf of perfs) tx.create(db.doc(`performances/${perf.id}`), perf);
    tx.update(memberRef, { lastWorkoutDate: today, ...(isMember ? { xp: Math.max(0, Number(member!.xp) || 0) + reward, streak } : {}) });
    const nextIndex = expectedIndex + 1;
    const completed = program && (isMember || input.advanceProgram === true || program.isPlannedSession) && (program.isPlannedSession || program.durationWeeks > 0 && nextIndex >= program.nbDays * program.durationWeeks);
    if (completed) {
      tx.set(db.doc(`archivedPrograms/${programId}`), { ...program, ...identity, currentDayIndex: nextIndex, endDate: today, memberName: member!.name, status: 'completed' });
      tx.delete(programRef);
    } else if (program && (isMember || input.advanceProgram === true)) tx.update(programRef, { currentDayIndex: nextIndex });
    if (bookingRef && booking?.exists && booking.data()?.status === 'confirmed') tx.update(bookingRef, { status: 'completed' });
    return { success: true, alreadyCompleted: false, log, performances: perfs, programCompleted: Boolean(completed) };
  });
}
