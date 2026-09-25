const ALLOWED_GENDERS = new Set(['M', 'F', 'Autre']);
const ALLOWED_EXPERIENCE_LEVELS = new Set(['Débutant', 'Intermédiaire', 'Avancé']);
const ALLOWED_EQUIPMENT = new Set(['Salle complète', 'Haltères/Kettlebells', 'Poids du corps', 'Élastiques']);

export interface MemberRegistrationInput {
  clubId: string;
  name: string;
  age: number;
  weight: number;
  height: number;
  gender: string;
  objectifs: string[];
  notes: string;
  experienceLevel: string;
  trainingDays: number;
  sessionDuration: number;
  equipment: string;
  injuries: string;
}

export function validateMemberRegistration(body: unknown): MemberRegistrationInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const data = body as Record<string, unknown>;
  const clubId = typeof data.clubId === 'string' ? data.clubId.trim() : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const objectifs = data.objectifs;
  const notes = data.notes;
  const injuries = data.injuries;

  if (!/^\d{6}$/.test(clubId) || name.length < 2 || name.length > 100 ||
    !Number.isInteger(data.age) || Number(data.age) < 13 || Number(data.age) > 110 ||
    typeof data.weight !== 'number' || !Number.isFinite(data.weight) || data.weight < 20 || data.weight > 500 ||
    typeof data.height !== 'number' || !Number.isFinite(data.height) || data.height < 80 || data.height > 260 ||
    typeof data.gender !== 'string' || !ALLOWED_GENDERS.has(data.gender) ||
    typeof data.experienceLevel !== 'string' || !ALLOWED_EXPERIENCE_LEVELS.has(data.experienceLevel) ||
    typeof data.equipment !== 'string' || !ALLOWED_EQUIPMENT.has(data.equipment) ||
    !Number.isInteger(data.trainingDays) || Number(data.trainingDays) < 1 || Number(data.trainingDays) > 7 ||
    !Number.isInteger(data.sessionDuration) || Number(data.sessionDuration) < 15 || Number(data.sessionDuration) > 240 ||
    !Array.isArray(objectifs) || objectifs.length > 12 || objectifs.some((goal) => typeof goal !== 'string' || goal.trim().length > 80) ||
    typeof notes !== 'string' || notes.length > 2000 || typeof injuries !== 'string' || injuries.length > 1000) {
    return null;
  }

  return {
    clubId,
    name,
    age: Number(data.age),
    weight: data.weight,
    height: data.height,
    gender: data.gender,
    objectifs: objectifs.map((goal) => goal.trim()).filter(Boolean),
    notes: notes.trim(),
    experienceLevel: data.experienceLevel,
    trainingDays: Number(data.trainingDays),
    sessionDuration: Number(data.sessionDuration),
    equipment: data.equipment,
    injuries: injuries.trim()
  };
}
