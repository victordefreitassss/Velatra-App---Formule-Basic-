import { createHash } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { staffReader } from './staffFacts.ts';
import { safeId } from './followupModel.ts';
import { MemberCreationError } from './createMember.ts';
import { assessRetention, retentionCounts } from '../retention/retentionEngine.ts';
import { interventionLabels, retentionStates, type RetentionFacts, type RetentionIntervention } from '../retention/retentionModel.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function loadRetention(db: Firestore, uid: string, now = new Date()) {
  const reader = await staffReader(db, uid), { actor, club, source, billing, partialSources } = reader;
  const coach = actor.role === 'coach';
  const [users, programs, logs, bookings, assignments, responses, habits, entries, received, sent, subscriptions, interventions] = await Promise.all([
    source('users', coach ? [['role', 'member'], ['assignedCoachUid', uid]] : [], 1000), source('programs'), source('logs'), source('bookings'), source('coachCheckInAssignments'),
    source('coachCheckInResponses'), source('coachHabits'), source('coachHabitEntries'), source('messages', [['to', actor.id]]), source('messages', [['from', actor.id]]), billing ? source('subscriptions') : [], source('retentionInterventions', undefined, 5000),
  ]);
  const facts: RetentionFacts = { actor, club, users, programs, logs, bookings, assignments, responses, habits, entries, messages: [...received, ...sent], subscriptions, partialSources };
  const assessments = assessRetention(facts, now);
  return { actor, club, assessments, counts: retentionCounts(assessments), partialSources, interventions, coaches: coach ? [] : users.filter(item => item.role === 'coach' && !item.isSuspended).map(item => ({ uid: item.firebaseUid, name: item.name })) };
}
const publicIntervention = (row: any): RetentionIntervention => ({ id: row.id, kind: row.kind, note: row.note || '', actorUid: row.actorUid, createdAt: row.createdAt });
const route = (handler: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { if (!req.auth?.uid) fail(401, 'Authentification requise.'); res.json(await handler(req)); }
  catch (error: any) { if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message }); console.error('Retain unavailable', { code: error?.code || 'unknown' }); res.status(500).json({ error: 'Retain est indisponible. Réessayez.' }); }
};
export function registerRetention(app: Express, db: Firestore) {
  app.get('/api/retention', route(async req => {
    if (Object.keys(req.query).some(key => !['state', 'signal', 'coach', 'search', 'limit', 'cursor'].includes(key))) fail(400, 'Filtres Retain invalides.');
    const now = new Date(), result = await loadRetention(db, req.auth.uid, now);
    const state = req.query.state ?? 'all', signal = req.query.signal ?? 'all', coach = req.query.coach ?? 'all', search = req.query.search ?? '';
    const limit = Number(req.query.limit ?? 20);
    const signalTypes = [...new Set(result.assessments.flatMap(item => item.signals.map(signal => signal.type)))];
    if (typeof search !== 'string' || search.length > 100 || typeof coach !== 'string' || coach !== 'all' && !safeId(coach) || typeof state !== 'string' || !['all', ...retentionStates].includes(state) || typeof signal !== 'string' || signal !== 'all' && !/^[A-Z_]{1,80}$/.test(signal) || !Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'Filtres Retain invalides.');
    if (result.actor.role === 'coach' && coach !== 'all' || result.actor.role !== 'owner' && ['PAYMENT_CONTEXT', 'RENEWAL_WINDOW'].includes(String(signal))) fail(403, 'Filtre non autorisé.');
    const assessments = result.assessments.filter(item => (state === 'all' || item.state === state) && (signal === 'all' || item.signals.some(s => s.type === signal)) && (coach === 'all' || item.assignedCoachUid === coach) && item.memberName.toLocaleLowerCase('fr').includes(String(search).toLocaleLowerCase('fr')));
    const digest = hash([req.auth.uid, result.club.id, state, signal, coach, search, assessments.map(item => [item.memberUid, item.memberName, item.assignedCoachUid || null, item.state, item.signals.map(s => [s.type, s.severity, s.factKey])])]);
    let offset = 0;
    if (req.query.cursor !== undefined) { if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 300) fail(400, 'Curseur invalide.'); let cursor: any; try { cursor = JSON.parse(Buffer.from(req.query.cursor as string, 'base64url').toString()); } catch { fail(400, 'Curseur invalide.'); }
      if (!Number.isInteger(cursor?.offset) || cursor.offset < 0 || cursor.offset > assessments.length) fail(400, 'Curseur invalide.'); if (cursor.digest !== digest) fail(409, 'Le portefeuille a changé. Actualisez Retain.'); offset = cursor.offset; }
    const next = offset + limit;
    return { assessments: assessments.slice(offset, next), counts: result.counts, total: assessments.length, coaches: result.coaches, signalTypes, partialSources: result.partialSources, evaluatedAt: now.toISOString(), nextCursor: next < assessments.length ? Buffer.from(JSON.stringify({ offset: next, digest })).toString('base64url') : null };
  }));
  app.get('/api/retention/:memberUid', route(async req => {
    const uid = String(req.params.memberUid); if (!safeId(uid)) fail(400, 'Client invalide.');
    const result = await loadRetention(db, req.auth.uid), assessment = result.assessments.find(item => item.memberUid === uid);
    if (!assessment) fail(404, 'Ce client n’est pas disponible dans Retain.');
    const rows = result.interventions.filter(row => row.memberUid === uid).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return { assessment, interventions: rows.slice(0, 50).map(publicIntervention), interventionsPartial: result.partialSources.includes('retentionInterventions') || rows.length > 50 };
  }));
  app.post('/api/retention/:memberUid/interventions', route(async req => {
    const uid = String(req.params.memberUid), body = req.body;
    if (!safeId(uid) || !body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['requestId', 'kind', 'note'].includes(key)) || !safeId(body.requestId) || body.requestId.length < 16 || typeof body.kind !== 'string' || !Object.hasOwn(interventionLabels, body.kind) || body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 1000)) fail(400, 'Intervention invalide.');
    return db.runTransaction(async tx => {
      const { actor, club, readDoc } = await staffReader(db, req.auth.uid, tx);
      const member = (await readDoc(db.doc(`users/${uid}`))).data();
      if (!member || member.role !== 'member' || member.clubId !== club.id || actor.role === 'coach' && member.assignedCoachUid !== req.auth.uid) fail(404, 'Client non autorisé.');
      const ref = db.doc(`retentionInterventions/${hash([req.auth.uid, club.id, uid, body.requestId])}`), existing = await tx.get(ref);
      const note = (body.note || '').trim(), payloadHash = hash([body.kind, note]);
      if (existing.exists) { if (existing.data()?.payloadHash !== payloadHash) fail(409, 'Cette référence désigne une autre intervention.'); return { intervention: publicIntervention({ ...existing.data(), id: ref.id }), alreadyCreated: true }; }
      const intervention = { id: ref.id, clubId: club.id, memberUid: uid, actorUid: req.auth.uid, kind: body.kind, note, createdAt: new Date().toISOString(), payloadHash };
      tx.create(ref, intervention); return { intervention: publicIntervention(intervention), alreadyCreated: false };
    });
  }));
}
