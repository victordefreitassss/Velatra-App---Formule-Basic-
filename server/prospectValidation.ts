const STRING_LIMITS: Record<string, number> = {
  name: 100, email: 254, address: 300, phone: 40, age: 3, gender: 40,
  profession: 120, condition: 1000, weight: 16, height: 16, medicalTreatments: 1000,
  obj1: 300, obj2: 300, whenResults: 200, trigger: 500, supporter: 200,
  sleep: 100, stress: 100, water: 100, currentSport: 300, diet: 500,
  dietConstraints: 500, frequency: 100, whenStart: 100, source: 120
};
const ARRAY_FIELDS = ['ailments', 'goals', 'vision6Months', 'habits'];

export interface PublicProspectSubmission {
  clubId: string;
  name: string;
  email: string;
  answers: Record<string, unknown>;
}

export function validatePublicProspect(body: unknown): PublicProspectSubmission | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const clubId = typeof input.clubCode === 'string' ? input.clubCode.trim() : '';
  const form = input.formData;
  if (!/^\d{6}$/.test(clubId) || !form || typeof form !== 'object' || Array.isArray(form)) return null;

  const source = form as Record<string, unknown>;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 100 || email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const answers: Record<string, unknown> = {};
  for (const [field, maxLength] of Object.entries(STRING_LIMITS)) {
    const value = source[field];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.length > maxLength) return null;
    answers[field] = value.trim();
  }
  answers.name = name;
  answers.email = email;

  for (const field of ARRAY_FIELDS) {
    const value = source[field];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > 20 || value.some((item) => typeof item !== 'string' || item.length > 100)) return null;
    answers[field] = value.map((item) => item.trim());
  }

  if (source.determination !== undefined) {
    if (!Number.isInteger(source.determination) || Number(source.determination) < 0 || Number(source.determination) > 10) return null;
    answers.determination = source.determination;
  }
  if (source.availability !== undefined) {
    const availability = source.availability;
    if (!availability || typeof availability !== 'object' || Array.isArray(availability) || Object.keys(availability).length > 14 ||
      Object.entries(availability).some(([day, available]) => day.length > 20 || typeof available !== 'boolean')) return null;
    answers.availability = availability;
  }

  return { clubId, name, email, answers };
}
