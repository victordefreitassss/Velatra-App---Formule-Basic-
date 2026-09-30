import type { ExerciseEntry } from '../types';

export type GroupType = 'superset' | 'biset' | 'triset' | 'giantset';
export const groupSize = (type: GroupType) => ({ superset: 2, biset: 2, triset: 3, giantset: 4 })[type];
const isGroupType = (type: ExerciseEntry['setType']): type is GroupType =>
  type === 'superset' || type === 'biset' || type === 'triset' || type === 'giantset';
const ungroup = (entry: ExerciseEntry): ExerciseEntry => ({ ...entry, setGroup: null, setType: 'normal', setName: null });
const nextGroupId = (entries: ExerciseEntry[]) => Math.max(0, ...entries.map(entry => entry.setGroup || 0)) + 1;

// A group is one contiguous block. Broken legacy blocks become independent exercises.
export function normalizeExerciseGroups(entries: ExerciseEntry[]): ExerciseEntry[] {
  const result = entries.map(entry => ({ ...entry }));
  const seen = new Set<number>();
  let nextId = nextGroupId(result);
  for (let start = 0; start < result.length;) {
    const id = result[start].setGroup;
    if (!id || !isGroupType(result[start].setType)) { if (isGroupType(result[start].setType) || id) result[start] = ungroup(result[start]); start++; continue; }
    let end = start + 1;
    while (end < result.length && result[end].setGroup === id && isGroupType(result[end].setType)) end++;
    if (end - start < 2) result[start] = ungroup(result[start]);
    else {
      const type = result[start].setType;
      const uniqueId = seen.has(id) ? nextId++ : id;
      for (let index = start; index < end; index++) result[index] = { ...result[index], setGroup: uniqueId, setType: type };
      seen.add(id);
    }
    start = end;
  }
  return result;
}

export function setExerciseGroupType(entries: ExerciseEntry[], index: number, type: ExerciseEntry['setType']): ExerciseEntry[] | null {
  if (!entries[index]) return null;
  const result = entries.map(entry => ({ ...entry }));
  const previousGroup = result[index].setGroup;
  if (previousGroup) for (let i = 0; i < result.length; i++) if (result[i].setGroup === previousGroup) result[i] = ungroup(result[i]);
  if (!isGroupType(type)) {
    result[index] = { ...result[index], setType: type, setGroup: null };
    return normalizeExerciseGroups(result);
  }
  const count = groupSize(type);
  if (index + count > result.length) return null;
  const id = nextGroupId(result);
  for (let i = index; i < index + count; i++) result[i] = { ...result[i], setGroup: id, setType: type };
  return normalizeExerciseGroups(result);
}

export function createGroupWithExercises(entries: ExerciseEntry[], sourceIndex: number, companionIndexes: number[], type: GroupType): ExerciseEntry[] | null {
  if (!entries[sourceIndex] || companionIndexes.length !== groupSize(type) - 1 || new Set([sourceIndex, ...companionIndexes]).size !== groupSize(type) || companionIndexes.some(index => !entries[index])) return null;
  const selected = [sourceIndex, ...companionIndexes];
  const remaining = entries.filter((_, index) => !selected.includes(index)).map(entry => ({ ...entry }));
  const insertAt = entries.slice(0, sourceIndex).filter((_, index) => !companionIndexes.includes(index)).length;
  const id = nextGroupId(entries);
  const grouped = selected.map(index => ({ ...entries[index], setGroup: id, setType: type }));
  remaining.splice(insertAt, 0, ...grouped);
  return normalizeExerciseGroups(remaining);
}

export function togglePreviousExerciseLink(entries: ExerciseEntry[], index: number): ExerciseEntry[] {
  if (index < 1 || index >= entries.length) return entries;
  const result = entries.map(entry => ({ ...entry }));
  const current = result[index], previous = result[index - 1];
  if (current.setGroup && current.setGroup === previous.setGroup) {
    result[index] = ungroup(current);
  } else {
    const id = previous.setGroup || nextGroupId(result);
    const type = isGroupType(previous.setType) ? previous.setType : 'superset';
    if (!previous.setGroup) result[index - 1] = { ...previous, setGroup: id, setType: type };
    result[index] = { ...current, setGroup: id, setType: type };
  }
  return normalizeExerciseGroups(result);
}

export function duplicateExercise(entries: ExerciseEntry[], index: number): ExerciseEntry[] {
  const result = entries.map(entry => ({ ...entry }));
  if (result[index]) {
    let insertAt = index + 1;
    const id = result[index].setGroup;
    if (id) while (insertAt < result.length && result[insertAt].setGroup === id) insertAt++;
    result.splice(insertAt, 0, ungroup(result[index]));
  }
  return normalizeExerciseGroups(result);
}

export function copyExerciseToDay(entry: ExerciseEntry): ExerciseEntry { return ungroup(entry); }

export function appendPresetExercises(existing: ExerciseEntry[], incoming: ExerciseEntry[]): ExerciseEntry[] {
  const offset = Math.max(0, ...existing.map(entry => entry.setGroup || 0));
  return normalizeExerciseGroups([
    ...existing.map(entry => ({ ...entry })),
    ...incoming.map(entry => ({ ...entry, setGroup: entry.setGroup ? entry.setGroup + offset : null }))
  ]);
}
