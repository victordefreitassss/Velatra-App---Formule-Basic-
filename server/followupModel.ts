export type FollowupFrequency = { kind: 'daily' | 'weekly' | 'everyWeeks' | 'once' | 'manual'; intervalWeeks?: number };
export type FollowupQuestion = { id: string; label: string; type: 'text' | 'number' | 'scale' | 'boolean' | 'single' | 'multiple'; required: boolean; options?: string[]; min?: number; max?: number };
export type JourneyPhase = { id: string; name: string; objective: string; durationWeeks: number | null; startDate: string | null; plannedEndDate: string | null; programId: string | null; checkInTemplateIds: string[]; notes: string; status: 'planned' | 'active' | 'completed' | 'paused'; completedAt?: string };

export const FOLLOWUP_TIME_ZONE = 'Europe/Paris';
export const dayKey = (date: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: FOLLOWUP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const validDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export const shiftDay = (day: string, days: number) => { const value = new Date(`${day}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
export const shortText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const safeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function parseFrequency(value: any): FollowupFrequency | null {
  if (!value || !['daily', 'weekly', 'everyWeeks', 'once', 'manual'].includes(value.kind)) return null;
  if (value.kind === 'everyWeeks' && (!Number.isInteger(value.intervalWeeks) || value.intervalWeeks < 2 || value.intervalWeeks > 12)) return null;
  if (value.weekdays !== undefined) return null;
  return { kind: value.kind, ...(value.kind === 'everyWeeks' ? { intervalWeeks: value.intervalWeeks } : {}) };
}

export function dueDateFor(frequency: FollowupFrequency, startDate: string, today: string): string | null {
  if (!validDay(startDate) || !validDay(today) || today < startDate || frequency.kind === 'manual') return null;
  if (frequency.kind === 'once') return startDate;
  if (frequency.kind === 'daily') return today;
  const span = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86400000);
  const interval = frequency.kind === 'weekly' ? 7 : (frequency.intervalWeeks || 2) * 7;
  const due = shiftDay(startDate, Math.floor(span / interval) * interval);
  return due;
}

export function dueStatus(due: string | null, responseDates: readonly string[], today: string): 'none' | 'expected' | 'received' | 'late' {
  if (!due) return 'none';
  if (due > today) return 'none';
  if (responseDates.includes(due)) return 'received';
  return due < today ? 'late' : 'expected';
}

export function parseQuestions(value: unknown): FollowupQuestion[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const ids = new Set<string>();
  const questions: FollowupQuestion[] = [];
  for (const raw of value) {
    if (!safeId(raw?.id) || ids.has(raw.id) || typeof raw.label !== 'string' || !raw.label.trim() || raw.label.length > 180 ||
        !['text', 'number', 'scale', 'boolean', 'single', 'multiple'].includes(raw.type) || typeof raw.required !== 'boolean') return null;
    ids.add(raw.id);
    const q: FollowupQuestion = { id: raw.id, label: raw.label.trim(), type: raw.type, required: raw.required };
    if (['single', 'multiple'].includes(q.type)) {
      if (!Array.isArray(raw.options) || raw.options.length < 2 || raw.options.length > 12 || raw.options.some((item: unknown) => typeof item !== 'string' || !item.trim() || item.length > 100)) return null;
      q.options = raw.options.map((item: string) => item.trim());
    }
    if (['number', 'scale'].includes(q.type)) {
      if (!Number.isFinite(raw.min) || !Number.isFinite(raw.max) || raw.min >= raw.max || raw.min < -10000 || raw.max > 100000) return null;
      q.min = raw.min; q.max = raw.max;
    }
    questions.push(q);
  }
  return questions;
}

export function validateAnswers(questions: FollowupQuestion[], raw: unknown): Record<string, string | number | boolean | string[]> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some(key => !questions.some(q => q.id === key))) return null;
  const answers: Record<string, string | number | boolean | string[]> = {};
  for (const q of questions) {
    const answer = input[q.id];
    if (answer === undefined || answer === null || answer === '') { if (q.required) return null; continue; }
    if (q.type === 'text' && (typeof answer !== 'string' || answer.length > 2000)) return null;
    if (['number', 'scale'].includes(q.type) && (typeof answer !== 'number' || !Number.isFinite(answer) || answer < (q.min ?? -10000) || answer > (q.max ?? 100000))) return null;
    if (q.type === 'boolean' && typeof answer !== 'boolean') return null;
    if (q.type === 'single' && (typeof answer !== 'string' || !q.options?.includes(answer))) return null;
    if (q.type === 'multiple' && (!Array.isArray(answer) || answer.length > 12 || answer.some(item => typeof item !== 'string' || !q.options?.includes(item)))) return null;
    answers[q.id] = answer as any;
  }
  return answers;
}

export function normalizePhases(value: unknown): JourneyPhase[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const ids = new Set<string>(); let active = 0;
  const phases: JourneyPhase[] = [];
  for (const raw of value) {
    if (!safeId(raw?.id) || ids.has(raw.id) || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 100 ||
        !['planned', 'active', 'completed', 'paused'].includes(raw.status) ||
        (raw.startDate && !validDay(raw.startDate)) || (raw.plannedEndDate && !validDay(raw.plannedEndDate)) ||
        (raw.durationWeeks != null && (!Number.isInteger(raw.durationWeeks) || raw.durationWeeks < 1 || raw.durationWeeks > 260)) ||
        (raw.programId && !safeId(raw.programId)) || !Array.isArray(raw.checkInTemplateIds) || raw.checkInTemplateIds.length > 20 || raw.checkInTemplateIds.some((id: unknown) => !safeId(id)) ||
        (raw.objective && (typeof raw.objective !== 'string' || raw.objective.length > 500)) || (raw.notes && (typeof raw.notes !== 'string' || raw.notes.length > 2000))) return null;
    ids.add(raw.id); if (raw.status === 'active') active++;
    phases.push({ id: raw.id, name: raw.name.trim(), objective: shortText(raw.objective, 500), durationWeeks: raw.durationWeeks || null,
      startDate: raw.startDate || null, plannedEndDate: raw.plannedEndDate || null, programId: raw.programId || null,
      checkInTemplateIds: raw.checkInTemplateIds, notes: shortText(raw.notes, 2000), status: raw.status,
      ...(raw.completedAt && typeof raw.completedAt === 'string' ? { completedAt: raw.completedAt } : {}) });
  }
  return active <= 1 ? phases : null;
}

export function weekRate(entries: readonly { date: string; met: boolean }[], today: string): { completed: number; expected: number } {
  const start = shiftDay(today, -6);
  const week = entries.filter(item => item.date >= start && item.date <= today);
  return { completed: week.filter(item => item.met).length, expected: 7 };
}
