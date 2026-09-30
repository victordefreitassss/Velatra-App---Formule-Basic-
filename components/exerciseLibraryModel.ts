import { Exercise, Preset, Program } from '../types';

export const EXERCISE_MUSCLES = [
  'Pectoraux', 'Grand dorsal', 'Haut du dos', 'Trapèzes', 'Épaules',
  'Biceps', 'Triceps', 'Avant-bras', 'Abdominaux', 'Lombaires',
  'Fessiers', 'Quadriceps', 'Ischio-jambiers', 'Mollets', 'Adducteurs',
  'Abducteurs', 'Cardio global',
] as const;

export const EXERCISE_TYPES = ['strength', 'cardio', 'timed', 'distance', 'mobility', 'other'] as const;
export const EXERCISE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export type ExerciseType = typeof EXERCISE_TYPES[number];
export type ExerciseDifficulty = typeof EXERCISE_DIFFICULTIES[number];
export type ExerciseOrigin = 'all' | 'global' | 'club';

export interface ExerciseDraft {
  name: string;
  cat: string;
  equip: string;
  photo?: string | null;
  videoUrl?: string;
  description?: string;
  instructions?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  difficulty?: ExerciseDifficulty;
  tags?: string[];
  exerciseType?: ExerciseType;
}

export interface ExerciseFilters {
  search?: string;
  category?: string;
  muscle?: string;
  equipment?: string;
  difficulty?: ExerciseDifficulty | '';
  exerciseType?: ExerciseType | '';
  origin?: ExerciseOrigin;
  includeArchived?: boolean;
  sort?: 'name' | 'recent';
  clubId?: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_EQUIPMENT_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_INSTRUCTIONS_LENGTH = 3_000;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 30;
const MAX_PRIMARY_MUSCLES = 4;
const MAX_SECONDARY_MUSCLES = 6;

const cleanText = (value: string | null | undefined) => (value || '').trim().replace(/\s+/g, ' ');

export const normalizeSearch = (value: string | null | undefined) => cleanText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr');

const unique = (values: string[] | undefined) => Array.from(new Set((values || []).map(cleanText).filter(Boolean)));

const isKnownMuscle = (muscle: string) => (EXERCISE_MUSCLES as readonly string[]).includes(muscle);
const isHttpUrl = (value: string) => /^https:\/\/.+/i.test(value);
const isLegacyImage = (value: string) => /^data:image\//i.test(value);

export const isGlobalExercise = (exercise: Exercise) => exercise.clubId === 'global';
export const isExerciseArchived = (exercise: Exercise) => exercise.isArchived === true;
export const canManageExercise = (exercise: Exercise, clubId?: string) => Boolean(clubId && exercise.clubId === clubId && !isGlobalExercise(exercise));

/**
 * Legacy records do not have exerciseType. This deterministic fallback deliberately
 * uses only their historical category: Cardio → cardio, Mobilité/Stretching →
 * mobility, and all other categories → strength. No legacy record is re-written.
 */
export const getExerciseType = (exercise: Pick<Exercise, 'cat' | 'exerciseType'>): ExerciseType => {
  if (exercise.exerciseType && (EXERCISE_TYPES as readonly string[]).includes(exercise.exerciseType)) return exercise.exerciseType;
  const category = normalizeSearch(exercise.cat);
  if (category === 'cardio') return 'cardio';
  if (category === 'mobilite' || category === 'stretching') return 'mobility';
  return 'strength';
};

export const createPerfId = (name: string, id: number) => {
  const slug = normalizeSearch(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'exercise';
  return `club-${id.toString(36)}-${slug}`;
};

const ensureUrl = (value: string | null | undefined, label: string, allowLegacy = false) => {
  const cleaned = cleanText(value);
  if (!cleaned) return '';
  if (isHttpUrl(cleaned) || (allowLegacy && isLegacyImage(cleaned))) return cleaned;
  throw new Error(`${label} doit utiliser une URL HTTPS.`);
};

export const validateExerciseDraft = (draft: ExerciseDraft, options: { allowLegacyPhoto?: boolean } = {}): ExerciseDraft => {
  const name = cleanText(draft.name);
  const cat = cleanText(draft.cat);
  const equip = cleanText(draft.equip);
  const description = cleanText(draft.description);
  const instructions = cleanText(draft.instructions);
  const primaryMuscles = unique(draft.primaryMuscles);
  const secondaryMuscles = unique(draft.secondaryMuscles).filter(muscle => !primaryMuscles.includes(muscle));
  const tags = unique(draft.tags).map(tag => tag.toLocaleLowerCase('fr'));

  if (!name || name.length > MAX_NAME_LENGTH) throw new Error(`Le nom est requis et doit contenir au plus ${MAX_NAME_LENGTH} caractères.`);
  if (!cat || cat.length > MAX_NAME_LENGTH) throw new Error('La catégorie est requise.');
  if (!equip || equip.length > MAX_EQUIPMENT_LENGTH) throw new Error(`L’équipement est requis et doit contenir au plus ${MAX_EQUIPMENT_LENGTH} caractères.`);
  if (description.length > MAX_DESCRIPTION_LENGTH) throw new Error(`La description ne peut pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`);
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) throw new Error(`Les consignes ne peuvent pas dépasser ${MAX_INSTRUCTIONS_LENGTH} caractères.`);
  if (primaryMuscles.length > MAX_PRIMARY_MUSCLES || secondaryMuscles.length > MAX_SECONDARY_MUSCLES || ![...primaryMuscles, ...secondaryMuscles].every(isKnownMuscle)) {
    throw new Error('Les muscles doivent être choisis dans la liste proposée.');
  }
  if (tags.length > MAX_TAGS || tags.some(tag => tag.length > MAX_TAG_LENGTH)) throw new Error('Les tags sont trop nombreux ou trop longs.');
  if (draft.difficulty && !(EXERCISE_DIFFICULTIES as readonly string[]).includes(draft.difficulty)) throw new Error('Niveau de difficulté invalide.');
  if (draft.exerciseType && !(EXERCISE_TYPES as readonly string[]).includes(draft.exerciseType)) throw new Error('Type d’exercice invalide.');

  return {
    name,
    cat,
    equip,
    photo: ensureUrl(draft.photo, 'La photo', options.allowLegacyPhoto) || null,
    videoUrl: ensureUrl(draft.videoUrl, 'La vidéo'),
    description,
    instructions,
    primaryMuscles,
    secondaryMuscles,
    difficulty: draft.difficulty,
    tags,
    exerciseType: draft.exerciseType,
  };
};

export const buildClubExercise = (draft: ExerciseDraft, context: { id: number; clubId: string; createdByUid: string; now: string }): Exercise => {
  if (!context.clubId || context.clubId === 'global') throw new Error('Un exercice de bibliothèque doit appartenir à un club.');
  const normalized = validateExerciseDraft(draft);
  return {
    id: context.id,
    clubId: context.clubId,
    ...normalized,
    photo: normalized.photo || null,
    videoUrl: normalized.videoUrl || '',
    perfId: createPerfId(normalized.name, context.id),
    isArchived: false,
    createdByUid: context.createdByUid,
    createdAt: context.now,
    updatedAt: context.now,
  };
};

export const updateClubExercise = (existing: Exercise, draft: ExerciseDraft, context: { clubId: string; now: string }): Exercise => {
  if (!canManageExercise(existing, context.clubId)) throw new Error('Cet exercice Velatra est en lecture seule. Dupliquez-le pour votre club.');
  const normalized = validateExerciseDraft(draft, { allowLegacyPhoto: true });
  return {
    ...existing,
    ...normalized,
    photo: normalized.photo || null,
    videoUrl: normalized.videoUrl || '',
    perfId: existing.perfId || createPerfId(normalized.name, existing.id),
    updatedAt: context.now,
  };
};

export const duplicateExerciseForClub = (source: Exercise, context: { id: number; clubId: string; createdByUid: string; now: string }): Exercise => buildClubExercise({
  name: `${source.name} — copie`,
  cat: source.cat,
  equip: source.equip,
  photo: source.photo,
  videoUrl: source.videoUrl,
  description: source.description,
  instructions: source.instructions,
  primaryMuscles: source.primaryMuscles,
  secondaryMuscles: source.secondaryMuscles,
  difficulty: source.difficulty,
  tags: source.tags,
  exerciseType: source.exerciseType || getExerciseType(source),
}, context);

export const mergeExercises = (globalExercises: Exercise[], persistedExercises: Exercise[]) => {
  const merged = new Map<number, Exercise>();
  globalExercises.forEach(exercise => merged.set(exercise.id, exercise));
  persistedExercises.forEach(exercise => merged.set(exercise.id, exercise));
  return Array.from(merged.values());
};

export const getSelectableExercises = (exercises: Exercise[], selectedId?: number) => exercises.filter(exercise => !isExerciseArchived(exercise) || exercise.id === selectedId);

export const filterExercises = (exercises: Exercise[], filters: ExerciseFilters = {}) => {
  const query = normalizeSearch(filters.search);
  const normalizedEquipment = normalizeSearch(filters.equipment);
  const normalizedMuscle = filters.muscle || '';
  const filtered = exercises.filter(exercise => {
    if (!filters.includeArchived && isExerciseArchived(exercise)) return false;
    if (filters.origin === 'global' && !isGlobalExercise(exercise)) return false;
    if (filters.origin === 'club' && (isGlobalExercise(exercise) || (filters.clubId && exercise.clubId !== filters.clubId))) return false;
    if (filters.category && exercise.cat !== filters.category) return false;
    if (normalizedEquipment && normalizeSearch(exercise.equip) !== normalizedEquipment) return false;
    if (filters.difficulty && exercise.difficulty !== filters.difficulty) return false;
    if (filters.exerciseType && getExerciseType(exercise) !== filters.exerciseType) return false;
    if (normalizedMuscle && ![...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])].includes(normalizedMuscle)) return false;
    if (!query) return true;
    return [exercise.name, exercise.cat, exercise.equip, ...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || []), ...(exercise.tags || [])]
      .some(value => normalizeSearch(value).includes(query));
  });
  return filtered.sort((a, b) => filters.sort === 'recent'
    ? (b.createdAt || '').localeCompare(a.createdAt || '') || b.id - a.id
    : a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
};

export const countActiveFilters = (filters: ExerciseFilters) => [filters.category, filters.muscle, filters.equipment, filters.difficulty, filters.exerciseType, filters.origin && filters.origin !== 'all', filters.includeArchived].filter(Boolean).length;

/** Programs and presets store exercise IDs. Archives preserve those IDs for resolution. */
export const isExerciseReferenced = (exerciseId: number, programs: Program[] = [], presets: Preset[] = []) => [...programs, ...presets]
  .some(item => item.days.some(day => day.exercises.some(entry => entry.exId === exerciseId)));
