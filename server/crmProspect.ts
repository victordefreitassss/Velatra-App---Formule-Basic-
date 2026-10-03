import type { Firestore } from 'firebase-admin/firestore';
import { MemberCreationError } from './createMember.ts';
import { staffReader } from './staffFacts.ts';

const invalid = (): never => { throw new MemberCreationError(400, 'Informations CRM invalides.'); };
const limits: Record<string, number> = { name: 120, firstName: 80, lastName: 80, email: 254, phone: 80, source: 80, proposedOffer: 200, nextAction: 200 };
export function crmProfilePatch(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return invalid();
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'tags') {
      if (!Array.isArray(value) || value.length > 12 || value.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 40)) return invalid();
      patch.tags = [...new Set(value.map(tag => tag.trim()))];
    } else {
      if (!Object.hasOwn(limits, key) || typeof value !== 'string' || value.length > limits[key]) return invalid();
      patch[key] = key === 'email' ? value.trim().toLowerCase() : value.trim();
    }
  }
  if (!Object.keys(patch).length || patch.name === '' || patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(patch.email))) return invalid();
  return patch;
}

/** Extends the existing prospect record and journals; never grants CRM access to a new role. */
export async function editCrmProspect(db: Firestore, uid: string, prospectUid: string, body: any, activity = false) {
  if (!/^[^/]{1,180}$/.test(prospectUid)) return invalid();
  const patch = activity ? {} : crmProfilePatch(body);
  if (activity && (!body || Array.isArray(body) || Object.keys(body).some(k => !['requestId', 'kind', 'content'].includes(k)) ||
    typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.requestId) ||
    !['note', 'call', 'email', 'message'].includes(body.kind) || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 2000)) return invalid();
  return db.runTransaction(async tx => {
    const { actor, club } = await staffReader(db, uid, tx);
    if (!['owner', 'manager'].includes(actor.role)) throw new MemberCreationError(403, 'Accès CRM réservé à Owner et Manager.');
    const ref = db.doc(`prospects/${prospectUid}`), snapshot = await tx.get(ref), prospect = snapshot.data();
    if (!prospect || prospect.clubId !== club.id) throw new MemberCreationError(403, 'Prospect hors de votre espace.');
    const at = new Date().toISOString();
    let changes: Record<string, unknown>;
    if (activity) {
      // A retry of the same manual action does not duplicate a retained journal entry.
      if ((prospect.activityHistory || []).some((entry: any) => entry.id === body.requestId && entry.authorUid === uid)) return { prospect: { ...prospect, firebaseUid: snapshot.id }, unchanged: true };
      const labels = { note: 'Note CRM ajoutée', call: 'Appel consigné', email: 'Email consigné', message: 'Message consigné' };
      const event = { id: body.requestId, date: at, authorUid: uid, label: labels[body.kind as keyof typeof labels], kind: body.kind,
        ...(body.kind === 'note' ? { noteId: body.requestId } : { content: body.content.trim() }) };
      changes = { activityHistory: [event, ...(prospect.activityHistory || [])].slice(0, 80) };
      if (body.kind === 'note') changes.notesHistory = [{ id: body.requestId, date: at, authorUid: uid, authorName: actor.name || '', content: body.content.trim() }, ...(prospect.notesHistory || [])].slice(0, 100);
      else changes.lastContactAt = at;
    } else {
      if (Object.entries(patch).every(([key, value]) => JSON.stringify(prospect[key] ?? '') === JSON.stringify(value))) return { prospect: { ...prospect, firebaseUid: snapshot.id }, unchanged: true };
      changes = { ...patch, activityHistory: [{ id: crypto.randomUUID(), date: at, authorUid: uid, label: 'Fiche CRM mise à jour' }, ...(prospect.activityHistory || [])].slice(0, 80) };
    }
    tx.update(ref, changes);
    return { prospect: { ...prospect, ...changes, firebaseUid: snapshot.id }, unchanged: false };
  });
}
