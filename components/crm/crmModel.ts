import type { Prospect, User } from '../../types';
import { prospectStage, prospectPriority } from '../prospectCrm';
export const initialFilters = { search: '', stage: '', owner: '', source: '', tag: '', from: '', to: '', segment: '', sort: 'priority' };
export type CrmFilters = typeof initialFilters;
export const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
export const validStamp = (value?: string) => { const n = Date.parse(value || ''); return Number.isFinite(n) ? n : 0; };
export function scopedProspects(prospects: Prospect[], actor: User | null, clubId?: string) {
  if (!actor || !clubId || actor.clubId !== clubId || !['owner', 'manager'].includes(actor.role)) return [];
  return prospects.filter(p => p.clubId === clubId);
}
export function prospectTimeline(p: Prospect) {
  const notes = p.notesHistory || [];
  const recorded = (p.activityHistory || []).map(a => ({ ...a, content: a.noteId ? notes.find(n => n.id === a.noteId)?.content : a.content }));
  const linked = new Set(recorded.map(a => a.noteId).filter(Boolean));
  const rows = [...recorded, ...notes.filter(n => !linked.has(n.id)).map(n => ({ id: 'note:'+n.id, date: n.date, label: 'Note CRM', content: n.content, authorUid: n.authorUid, kind: 'note' as const }))];
  if (validStamp(p.date) && !recorded.some(a => ['Lead créé','Prospect créé'].includes(a.label))) rows.push({ id: 'created', date: p.date, label: 'Prospect créé', content: undefined, authorUid: undefined });
  return rows.sort((a,b) => validStamp(b.date)-validStamp(a.date) || a.id.localeCompare(b.id));
}
export function lastActivity(p: Prospect) { return Math.max(validStamp(p.date), validStamp(p.lastContactAt), ...(p.activityHistory || []).map(a => validStamp(a.date)), ...(p.notesHistory || []).map(n => validStamp(n.date))); }
export function filterProspects(rows: Prospect[], f: CrmFilters, now = Date.now()) {
  return rows.filter(p => {
    const closed = ['won','lost'].includes(p.status), created = (p.date || '').slice(0,10);
    return (!f.search || [p.name,p.email,p.phone,p.source,p.proposedOffer,...(p.tags||[])].some(v => normalize(v).includes(normalize(f.search.trim())))) &&
      (!f.stage || prospectStage(p) === f.stage) && (!f.owner || (p.assignedCoachUid || 'unassigned') === f.owner) &&
      (!f.source || p.source === f.source) && (!f.tag || p.tags?.includes(f.tag)) && (!f.from || created >= f.from) && (!f.to || created <= f.to) &&
      (!f.segment || (f.segment === 'overdue' ? reminderGroup(p,new Date(now)) === 'overdue' : f.segment === 'quiet' ? !closed && lastActivity(p) > 0 && lastActivity(p) < now-14*86400000 : f.segment === 'untouched' ? !closed && !validStamp(p.lastContactAt) && prospectStage(p) === 'lead' : true));
  }).sort((a,b) => (f.sort === 'name' ? a.name.localeCompare(b.name,'fr') : f.sort === 'newest' ? validStamp(b.date)-validStamp(a.date) : f.sort === 'oldest' ? validStamp(a.date)-validStamp(b.date) : prospectPriority(a,now)-prospectPriority(b,now)) || String(a.firebaseUid||a.id).localeCompare(String(b.firebaseUid||b.id)));
}
export function reminderGroup(p: Prospect, now = new Date()) {
  if (['won','lost'].includes(p.status) || !validStamp(p.nextReminderDate)) return 'none';
  const day = (d: Date) => d.toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'});
  const date = new Date(p.nextReminderDate!);
  return day(date) === day(now) ? 'today' : date < now ? 'overdue' : 'upcoming';
}
export const crmDate = (value?: string) => validStamp(value) ? new Date(value!).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Non renseigné';
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase();
