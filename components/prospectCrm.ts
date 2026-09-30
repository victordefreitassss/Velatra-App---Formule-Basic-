import type { Prospect, ProspectActivity } from '../types';

export const PROSPECT_STAGES = [
  { id: 'lead', label: 'Nouveau' }, { id: 'contacted', label: 'Contacté' },
  { id: 'call_pending', label: 'À relancer' }, { id: 'trial', label: 'Essai' },
  { id: 'won', label: 'Gagné' }, { id: 'lost', label: 'Perdu' }
] as const;

export function normalizeProspectEmail(value: string) { return value.trim().toLowerCase(); }
export function normalizeProspectPhone(value: string) { return value.replace(/[^\d+]/g, '').replace(/^00/, '+'); }
export function prospectStage(prospect: Prospect) { return prospect.status === 'pending' ? 'lead' : prospect.status; }
export function probableProspectDuplicate(prospects: Prospect[], email: string, phone: string) {
  const normalizedEmail = normalizeProspectEmail(email), normalizedPhone = normalizeProspectPhone(phone);
  return prospects.find(prospect => (normalizedEmail && normalizeProspectEmail(prospect.email || '') === normalizedEmail) ||
    (normalizedPhone && normalizeProspectPhone(prospect.phone || '') === normalizedPhone));
}
export function prospectPriority(prospect: Prospect, now = Date.now()) {
  if (prospect.status === 'won' || prospect.status === 'lost') return Number.MAX_SAFE_INTEGER;
  const reminder = prospect.nextReminderDate ? new Date(prospect.nextReminderDate).getTime() : NaN;
  return Number.isFinite(reminder) ? reminder : now + 365 * 86400000 - new Date(prospect.date).getTime() / 1e6;
}
export function prospectActivity(history: ProspectActivity[] | undefined, label: string, authorUid?: string): ProspectActivity[] {
  return [{ id: crypto.randomUUID(), date: new Date().toISOString(), label, ...(authorUid ? { authorUid } : {}) }, ...(history || [])].slice(0, 80);
}
