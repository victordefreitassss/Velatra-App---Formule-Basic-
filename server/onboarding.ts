import { createHash } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { staffReader } from './staffFacts.ts';
import { MemberCreationError } from './createMember.ts';
import { safeId } from './followupModel.ts';
import { assessOnboarding, onboardingStates } from '../onboarding/onboardingEngine.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
export async function loadOnboarding(db: Firestore, uid: string, now = new Date()) {
  const { actor, club, source, partialSources } = await staffReader(db, uid);
  if (!['solo', 'studio'].includes(club.accountType || '')) fail(403, 'Type d’espace non pris en charge.');
  // Eight bounded club queries independent of roster size. Staff roster validates coach references.
  const [users, programs, logs, bookings, prospects, assignments, responses, templates] = await Promise.all([
    source('users', undefined, 2000), source('programs'), source('logs'), source('bookings'), source('prospects'),
    source('coachCheckInAssignments'), source('coachCheckInResponses'), source('coachCheckInTemplates'),
  ]);
  const assessments = assessOnboarding({ actor, club, users, programs, logs, bookings, prospects, assignments, responses, templates, partialSources }, now);
  return { assessments, partialSources, actor, club, coaches: actor.role === 'coach' ? [] : users.filter(u => u.role === 'coach' && !u.isSuspended && u.status !== 'paused').map(u => ({ uid: u.firebaseUid, name: u.name })) };
}
const route = (handler: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { if (!req.auth?.uid) fail(401, 'Authentification requise.'); res.json(await handler(req)); }
  catch (e: any) { if (e instanceof MemberCreationError) return res.status(e.status).json({ error: e.message }); console.error('Onboarding unavailable', { code: e?.code || 'unknown' }); res.status(500).json({ error: 'Onboarding indisponible. Réessayez.' }); }
};
export function registerOnboarding(app: Express, db: Firestore) {
  app.get('/api/onboarding/policy', route(async req => {
    const { club } = await staffReader(db, req.auth.uid);
    return { policy: club.settings?.onboarding || { requireInitialAssessment: false } };
  }));
  app.put('/api/onboarding/policy', route(async req => {
    const body = req.body;
    if (!body || Array.isArray(body) || Object.keys(body).some(k => !['requireInitialAssessment', 'initialAssessmentTemplateId'].includes(k)) || typeof body.requireInitialAssessment !== 'boolean' || body.initialAssessmentTemplateId !== undefined && !safeId(body.initialAssessmentTemplateId)) fail(400, 'Politique invalide.');
    return db.runTransaction(async tx => {
      const { actor, club, readDoc } = await staffReader(db, req.auth.uid, tx);
      if (!['owner', 'manager'].includes(actor.role)) fail(403, 'Configuration réservée à Owner / Manager.');
      if (body.initialAssessmentTemplateId) { const template = (await readDoc(db.doc(`coachCheckInTemplates/${body.initialAssessmentTemplateId}`))).data(); if (!template?.active || template.clubId !== club.id) fail(400, 'Choisissez un modèle actif de cet espace.'); }
      const policy = { requireInitialAssessment: body.requireInitialAssessment, ...(body.initialAssessmentTemplateId ? { initialAssessmentTemplateId: body.initialAssessmentTemplateId } : {}) };
      tx.update(db.doc(`clubs/${club.id}`), { 'settings.onboarding': policy }); return { policy };
    });
  }));
  // Questionnaire remains an SDK write; this server-owned flag is confirmed from saved answers, never body values.
  app.post('/api/onboarding/profile-confirmation', route(async req => {
    if (req.body && Object.keys(req.body).length) fail(400, 'Aucun champ de profil attendu.');
    return db.runTransaction(async tx => {
      const ref = db.doc(`users/${req.auth.uid}`), member = (await tx.get(ref)).data();
      if (!member || member.role !== 'member' || member.isSuspended || !safeId(member.clubId)) fail(403, 'Accès membre requis.');
      const club = (await tx.get(db.doc(`clubs/${member.clubId}`))).data();
      if (!club || club.isActive === false) fail(403, 'Espace indisponible.');
      if (member.onboardingCompleted !== true || !Number.isInteger(member.age) || member.age < 13 || member.age > 110 || !Number.isFinite(member.weight) || member.weight < 20 || member.weight > 500 || !Number.isFinite(member.height) || member.height < 80 || member.height > 260 || !Number.isInteger(member.trainingDays) || member.trainingDays < 1 || member.trainingDays > 7 || !Number.isFinite(member.sessionDuration) || member.sessionDuration < 15 || member.sessionDuration > 240) fail(409, 'Terminez le questionnaire avec vos informations réelles.');
      if (member.profileMeasurementsPending === true) tx.update(ref, { profileMeasurementsPending: false });
      return { success: true };
    });
  }));
  app.get('/api/onboarding', route(async req => {
    if (Object.keys(req.query).some(k => !['state', 'coach', 'search', 'limit', 'cursor'].includes(k))) fail(400, 'Filtres invalides.');
    const state = req.query.state ?? 'active', coach = req.query.coach ?? 'all', search = req.query.search ?? '', limit = Number(req.query.limit ?? 20);
    if (typeof state !== 'string' || !['all', 'active', ...onboardingStates].includes(state) || typeof coach !== 'string' || coach !== 'all' && !safeId(coach) || typeof search !== 'string' || search.length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'Filtres invalides.');
    const result = await loadOnboarding(db, req.auth.uid);
    if (result.actor.role === 'coach' && coach !== 'all') fail(403, 'Filtre non autorisé.');
    const filtered = result.assessments.filter(a => (state === 'all' || state === 'active' && a.needsAttention || a.state === state) && (coach === 'all' || a.assignedCoachUid === coach) && a.memberName.toLocaleLowerCase('fr').includes(String(search).toLocaleLowerCase('fr')));
    const digest = createHash('sha256').update(JSON.stringify([req.auth.uid, result.club.id, state, coach, search, filtered])).digest('hex');
    let offset = 0;
    if (req.query.cursor !== undefined) { let cursor: any; try { if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 300) fail(400, 'Curseur invalide.'); cursor = JSON.parse(Buffer.from(req.query.cursor as string, 'base64url').toString()); } catch { fail(400, 'Curseur invalide.'); }
      if (!Number.isInteger(cursor?.offset) || cursor.offset < 0 || cursor.offset > filtered.length) fail(400, 'Curseur invalide.'); if (cursor.digest !== digest) fail(409, 'Le portefeuille a changé. Actualisez.'); offset = cursor.offset; }
    return { assessments: filtered.slice(offset, offset + limit), total: filtered.length, activeTotal: result.assessments.filter(a => a.needsAttention && !a.partial).length, coaches: result.coaches, partialSources: result.partialSources,
      nextCursor: offset + limit < filtered.length ? Buffer.from(JSON.stringify({ offset: offset + limit, digest })).toString('base64url') : null };
  }));
  app.get('/api/onboarding/:memberUid', route(async req => {
    if (!safeId(req.params.memberUid)) fail(400, 'Client invalide.');
    const result = await loadOnboarding(db, req.auth.uid), assessment = result.assessments.find(a => a.memberUid === req.params.memberUid);
    if (!assessment) fail(404, 'Client non disponible dans votre périmètre.'); return { assessment };
  }));
}
