import type { Day, Exercise, ExerciseEntry, Performance, Program, SessionLog, User } from '../types';

export type SetValues = { weight: string; reps: string; duration: string };
export type WorkoutStep = { exercise: number; set: number };
export type WorkoutPayload = { requestId: string; programId: number; dayIndex: number; advanceProgram: true; log: Partial<SessionLog>; performances: Partial<Performance>[] };
export type WorkoutReceipt = { log: SessionLog; performances: Performance[]; alreadyCompleted?: boolean };
export type WorkoutDraft = {
  version: 1; owner: string; program: Program; signature: string; startedAt: number;
  requestId: string; values: Record<string, SetValues>; confirmed: string[]; cursor: number;
  restUntil: number | null; status: 'active' | 'pending' | 'saved';
  payload?: WorkoutPayload; receipt?: WorkoutReceipt;
};
export const DRAFT_EVENT = 'velatra-workout-draft';
export const draftOwner = (user: Pick<User, 'id' | 'clubId' | 'firebaseUid'>) => `${user.clubId}:${user.firebaseUid || user.id}`;
export const draftKey = (owner: string) => `velatra_workout_v2:${owner}`;
export const stepKey = (step: WorkoutStep) => `${step.exercise}:${step.set}`;
export const setCount = (entry: ExerciseEntry) => Math.max(1, Math.min(50, parseInt(String(entry.sets), 10) || 1));
export const workoutDay = (program: Program) => program.days[program.currentDayIndex % program.nbDays];
export const programSignature = (program: Program) => JSON.stringify([program.id, program.clubId, program.memberId, program.currentDayIndex, program.nbDays, workoutDay(program)]);
export const matchesCurrentProgram = (draft: WorkoutDraft, programs: Program[]) => programs.some(p => programSignature(p) === draft.signature);
export const logTimestamp = (log: SessionLog) => new Date(log.completedAt || log.date).getTime();
export const memberLogs = (logs: SessionLog[], user: Pick<User, 'id' | 'clubId'>) => logs.filter(l => l.clubId === user.clubId && Number(l.memberId) === Number(user.id)).sort((a, b) => logTimestamp(b) - logTimestamp(a));
export const latestExerciseLog = (logs: SessionLog[], user: User, exId: number) => memberLogs(logs, user).find(log => log.exercises?.some(ex => ex.exId === exId));
export const isTimedExercise = (exercise: Exercise | undefined, entry: ExerciseEntry) => /gainage|planche|chaise/i.test(exercise?.name || '') || /^\s*\d+(?:[.,]\d+)?\s*(s|sec|secondes?)\s*$/i.test(entry.reps);
export const isBodyweightExercise = (exercise: Exercise | undefined) => /^poids du corps$/i.test(exercise?.equip?.trim() || '');
export const remainingRest = (until: number | null, now: number) => until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
export const extendRest = (until: number | null, now: number) => Math.max(until || now, now) + 30000;
export const displayNumber = (value: string | number) => String(value).replace('.', ',');
export function executionSteps(day: Day): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  for (let index = 0; index < day.exercises.length;) {
    const entry = day.exercises[index];
    const grouped = entry.setGroup && ['superset', 'biset', 'triset', 'giantset'].includes(entry.setType || '');
    let end = index + 1;
    if (grouped) while (end < day.exercises.length && day.exercises[end].setGroup === entry.setGroup) end++;
    for (let set = 0; set < Math.max(...day.exercises.slice(index, end).map(setCount)); set++) {
      for (let exercise = index; exercise < end; exercise++) if (set < setCount(day.exercises[exercise])) steps.push({ exercise, set });
    }
    index = end;
  }
  return steps;
}
export function restSeconds(value: string): number {
  const clean = String(value || '').trim().toLowerCase();
  const clock = clean.match(/^(\d+):(\d{2})$/);
  if (clock) return Math.min(1800, Number(clock[1]) * 60 + Number(clock[2]));
  const units = clean.match(/^(\d+(?:[.,]\d+)?)\s*(?:min(?:ute)?s?|m)(?:\s*(\d+)\s*s?)?$/);
  if (units) return Math.min(1800, Math.round(Number(units[1].replace(',', '.')) * 60 + Number(units[2] || 0)));
  return /^\d+(?:\s*(s|sec|secondes?))?$/.test(clean) ? Math.min(1800, parseInt(clean, 10)) : 0;
}
export function restAfter(day: Day, steps: WorkoutStep[], index: number): number {
  const current = steps[index], next = steps[index + 1];
  if (!next) return 0;
  const entry = day.exercises[current.exercise], nextEntry = day.exercises[next.exercise];
  if (entry.setGroup && entry.setGroup === nextEntry.setGroup && next.set === current.set) return 0;
  if (entry.setType === 'dropset' && current.exercise === next.exercise) return 0;
  return restSeconds(entry.rest);
}
const numberText = (value: string) => value.trim().replace(',', '.');
export function validSet(values: SetValues, cardio: boolean): boolean {
  if (cardio) {
    const duration = values.duration.trim();
    const clock = duration.match(/^(\d+):([0-5]\d)$/);
    if (clock) return Number(clock[1]) * 60 + Number(clock[2]) > 0;
    return /^\d+(?:[.,]\d+)?\s*(?:s|sec|secondes?|min|minutes?|h|km|m)?$/i.test(duration) && parseFloat(duration.replace(',', '.')) > 0;
  }
  const weight = numberText(values.weight), reps = numberText(values.reps);
  return /^\d+(?:\.\d+)?$/.test(weight) && Number(weight) <= 2000 && /^\d+$/.test(reps) && Number(reps) > 0 && Number(reps) <= 10000;
}
export const emptySet = (): SetValues => ({ weight: '', reps: '', duration: '' });
export function createWorkoutDraft(program: Program, user: User, logs: SessionLog[], exercises: Exercise[], now = Date.now(), requestId: string = crypto.randomUUID()): WorkoutDraft {
  const values: Record<string, SetValues> = {};
  const day = workoutDay(program);
  executionSteps(day).forEach(step => {
    const entry = day.exercises[step.exercise], exercise = exercises.find(ex => ex.id === entry.exId);
    const log = latestExerciseLog(logs, user, entry.exId);
    const previous = log?.exercises?.find(ex => ex.exId === entry.exId)?.sets[step.set];
    const target = String(entry.reps || '').split(',')[step.set] || String(entry.reps || '').split(',').at(-1) || '';
    // Only actual measurements or a single numeric prescription are proposed; a range is never a result.
    values[stepKey(step)] = {
      weight: previous?.weight || (isBodyweightExercise(exercise) ? '0' : ''),
      reps: previous?.reps || (/^\d+\s*(?:s|sec)?$/.test(target.trim()) ? String(parseInt(target, 10)) : ''),
      duration: previous?.duration || (exercise?.cat === 'Cardio' ? entry.duration || '' : ''),
    };
  });
  return { version: 1, owner: draftOwner(user), program: structuredClone(program), signature: programSignature(program), startedAt: now,
    requestId, values, confirmed: [], cursor: 0, restUntil: null, status: 'active' };
}
export function readWorkoutDraft(user: User, storage?: Pick<Storage, 'getItem'>): WorkoutDraft | null {
  try {
    const raw = (storage || localStorage).getItem(draftKey(draftOwner(user)));
    if (!raw || raw.length > 300000) return null;
    const draft = JSON.parse(raw) as WorkoutDraft;
    if (draft.version !== 1 || draft.owner !== draftOwner(user) || draft.program?.clubId !== user.clubId || Number(draft.program?.memberId) !== Number(user.id)
      || !draft.program?.nbDays || !Array.isArray(draft.program.days) || !workoutDay(draft.program)?.exercises?.length
      || !Array.isArray(draft.confirmed) || !draft.values || !Number.isInteger(draft.cursor) || draft.cursor < 0
      || !Number.isFinite(draft.startedAt) || typeof draft.requestId !== 'string' || !['active', 'pending', 'saved'].includes(draft.status)
      || (draft.status === 'pending' && !draft.payload) || (draft.status === 'saved' && !draft.receipt)) return null;
    const steps = executionSteps(workoutDay(draft.program));
    const keys = new Set(steps.map(stepKey));
    if (draft.cursor >= steps.length || draft.confirmed.some(key => !keys.has(key))
      || steps.some(step => { const value = draft.values[stepKey(step)]; return !value || ['weight', 'reps', 'duration'].some(field => typeof value[field as keyof SetValues] !== 'string'); })
      || (draft.restUntil !== null && !Number.isFinite(draft.restUntil))) return null;
    return draft;
  } catch { return null; }
}
export function writeWorkoutDraft(draft: WorkoutDraft, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage || localStorage).setItem(draftKey(draft.owner), JSON.stringify(draft)); return true; } catch { return false; }
}
export function completionPayload(draft: WorkoutDraft, user: User, exercises: Exercise[], now = Date.now()): WorkoutPayload {
  if (draft.payload) return draft.payload;
  const day = workoutDay(draft.program);
  const performed = day.exercises.map((entry, index) => ({ exId: entry.exId, name: exercises.find(ex => ex.id === entry.exId)?.name || String(entry.exId),
    sets: Array.from({ length: setCount(entry) }, (_, set) => {
      const values = draft.values[`${index}:${set}`] || emptySet();
      return { weight: numberText(values.weight), reps: numberText(values.reps), duration: isTimedExercise(exercises.find(ex => ex.id === entry.exId), entry) ? `${numberText(values.reps)} s` : values.duration.trim() };
    }) }));
  const performances: Partial<Performance>[] = [];
  performed.forEach((entry, index) => {
    const exercise = exercises.find(ex => ex.id === entry.exId);
    if (!exercise?.perfId) return;
    if (exercise.cat === 'Cardio') performances.push({ exId: exercise.perfId, weight: 0, reps: 0, duration: entry.sets.map(set => set.duration).join(' / ').slice(0, 30) });
    else if (!isTimedExercise(exercise, day.exercises[index])) {
      const best = [...entry.sets].sort((a, b) => Number(b.weight) - Number(a.weight) || Number(b.reps) - Number(a.reps))[0];
      if (best) performances.push({ exId: exercise.perfId, weight: Number(best.weight), reps: Number(best.reps) });
    }
  });
  return { requestId: draft.requestId, programId: draft.program.id, dayIndex: draft.program.currentDayIndex, advanceProgram: true,
    log: { memberId: Number(user.id), exercises: performed, duration: Math.min(86400, Math.max(0, Math.round((now - draft.startedAt) / 1000))) }, performances };
}
export const formatSet = (values: SetValues, bodyweight = false, timed = false) => {
  const load = values.weight === '' ? '—' : displayNumber(values.weight);
  const measure = values.duration || `${displayNumber(values.reps || '—')}${timed ? ' s' : ' reps'}`;
  if (values.duration && !timed) return displayNumber(values.duration);
  if (bodyweight && Number(values.weight.replace(',', '.')) === 0) return `Poids du corps · ${measure}`;
  return `${bodyweight ? '+' : ''}${load} kg · ${measure}`;
};

// Propose the just-performed set only where the next set still matches its initial
// suggestion. Keep manual changes, confirmed sets, dropsets and differing targets.
export function prepareFollowingSet(draft: WorkoutDraft, baseline: Record<string, SetValues>): Record<string, SetValues> {
  const day = workoutDay(draft.program), steps = executionSteps(day), current = steps[draft.cursor];
  const entry = day.exercises[current.exercise], key = stepKey(current), next = { exercise: current.exercise, set: current.set + 1 };
  const nextKey = stepKey(next);
  if (next.set >= setCount(entry) || entry.setType === 'dropset' || draft.confirmed.includes(nextKey)) return draft.values;
  const actual = draft.values[key], target = draft.values[nextKey], original = baseline[nextKey];
  if (!actual || !target || !original) return draft.values;
  const prescriptions = entry.reps.split(',').map(value => value.trim());
  const sameRepsTarget = prescriptions.length < 2 || prescriptions[current.set] === prescriptions[next.set];
  const copied = { ...target };
  for (const field of ['weight', 'reps', 'duration'] as const) {
    if (field === 'reps' && !sameRepsTarget) continue;
    if (target[field] === original[field]) copied[field] = actual[field];
  }
  return { ...draft.values, [nextKey]: copied };
}

export function updateSetValue(draft: WorkoutDraft, key: string, field: keyof SetValues, value: string): WorkoutDraft {
  if (draft.values[key]?.[field] === value) return draft;
  return { ...draft, values: { ...draft.values, [key]: { ...draft.values[key], [field]: value } }, confirmed: draft.confirmed.filter(item => item !== key) };
}

export function comparableLoadGain(current: SetValues[], prior: SetValues[] | undefined, timed: boolean, cardio: boolean): number | null {
  if (timed || cardio || !prior?.length || !current.length || [...current, ...prior].some(set => set.duration || !validSet(set, false))) return null;
  const best = (sets: SetValues[]) => [...sets].sort((a, b) => Number(numberText(b.weight)) - Number(numberText(a.weight)) || Number(b.reps) - Number(a.reps))[0];
  const before = best(prior), after = best(current);
  if (Number(before.reps) !== Number(after.reps)) return null;
  const gain = Number(numberText(after.weight)) - Number(numberText(before.weight));
  return gain > 0 ? Number(gain.toFixed(2)) : null;
}

// Cardio values may mix time and distance: a dated reference is not a maximum.
export function performanceReference(current: Performance, previous: Performance | undefined, exercise: Exercise | undefined): Performance {
  if (!previous) return current;
  if (exercise?.cat === 'Cardio') return current.date > previous.date ? current : previous;
  return Number(current.weight) > Number(previous.weight) || Number(current.weight) === Number(previous.weight) && Number(current.reps) > Number(previous.reps) ? current : previous;
}
