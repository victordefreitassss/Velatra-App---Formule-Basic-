import { createHash } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { Firestore, Query, Transaction, DocumentReference } from 'firebase-admin/firestore';
import type { Club, User } from '../types.ts';
import { authorizationActor, canManageBilling, canOperateStudio } from './authorization.ts';
import { MemberCreationError } from './createMember.ts';
import { dueDateFor, safeId, validDay } from './followupModel.ts';
import { resolveAccountType } from '../productCapabilities.ts';
import { resolveExperienceCapabilities } from '../productExperience.ts';
import { parisDateKey } from '../components/planningSlots.ts';
import { applyPulseStates, derivePulse, pulseCategories } from '../pulse/pulseEngine.ts';
import { snoozeUntil, type PulseAction, type PulseCategory, type PulseActionState, type PulseFollowup, type PulseInput, type SnoozePreset } from '../pulse/pulseModel.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const SOURCE_CAP = 10000;
export const pulseStateId = (uid: string, clubId: string, key: string) => hash([uid, clubId, key]);

/** Same reader for GET and transactional writes: no N queries per client. */
export async function loadPulse(db: Firestore, uid: string, now: Date, tx?: Transaction): Promise<{ actor: User; club: Club; categories: PulseCategory[]; partialSources: string[]; actions: PulseAction[] }> {
  if (!safeId(uid)) fail(401, 'Authentification requise.');
  const readDoc = (ref: DocumentReference) => tx ? tx.get(ref) : ref.get();
  const readQuery = (query: Query) => tx ? tx.get(query) : query.get();
  const actorDoc = await readDoc(db.doc(`users/${uid}`));
  const profile = actorDoc.data();
  if (!profile || !safeId(profile.clubId)) fail(403, 'Accès réservé au staff.');
  const clubDoc = await readDoc(db.doc(`clubs/${profile.clubId}`));
  const clubData = clubDoc.data();
  const club = clubData && { ...clubData, id: clubDoc.id } as Club;
  const actor = { ...profile, firebaseUid: uid } as User;
  const policy = authorizationActor(actor, club);
  if (!club || club.isActive === false || !canOperateStudio(policy, actor.clubId) ||
    actor.role === 'owner' && resolveAccountType(club) !== 'legacy' && club.ownerId !== uid ||
    !resolveExperienceCapabilities(club, actor).clients.runtimeUsable) fail(403, 'Accès Pulse refusé.');
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0) fail(403, 'Profil staff invalide.');
  const partialSources: string[] = [];
  const sourceVersions: Record<string, string> = {};
  async function source(name: string, extra?: [string, unknown][], cap = SOURCE_CAP) {
    let query: Query = db.collection(name).where('clubId', '==', actor.clubId);
    for (const [field, value] of extra || []) query = query.where(field, '==', value);
    const snap = await readQuery(query.limit(cap + 1));
    if (snap.size > cap) partialSources.push(name);
    snap.docs.slice(0, cap).forEach(doc => { if (doc.updateTime) sourceVersions[`${name}/${['programs', 'logs', 'messages'].includes(name) ? doc.data().id ?? doc.id : doc.id}`] = `${doc.updateTime.seconds}:${doc.updateTime.nanoseconds}`; });
    return snap.docs.slice(0, cap).map(doc => ({ ...doc.data(), id: ['users', 'prospects', 'programs', 'logs', 'messages'].includes(name) ? doc.data().id ?? doc.id : doc.id,
      ...(['users', 'prospects'].includes(name) ? { firebaseUid: doc.id } : {}) })) as any[];
  }
  const coach = actor.role === 'coach';
  const billing = canManageBilling(policy, actor.clubId);
  const [users, programs, logs, bookings, tasks, messages, prospects, subscriptions, payments, assignments, states] = await Promise.all([
    source('users', [['role', 'member'], ...(coach ? [['assignedCoachUid', uid] as [string, unknown]] : [])], 1000),
    source('programs'), source('logs'), source('bookings'), source('tasks'), source('messages', [['to', actor.id], ['read', false]]),
    coach ? [] : source('prospects'), billing ? source('subscriptions') : [], billing ? source('payments') : [],
    source('coachCheckInAssignments'), source('pulseActionStates', [['actorUid', uid]], 5000),
  ]);
  const input: PulseInput = { user: actor, currentClub: club, users, programs, logs, bookings, tasks, messages, prospects, subscriptions, payments, sourceVersions };
  const uids = new Set(users.filter(member => !coach || member.assignedCoachUid === uid).map(member => member.firebaseUid));
  const today = parisDateKey(now);
  const due = assignments.filter(item => item.active === true && uids.has(item.memberUid) && safeId(item.id) && item.frequency && validDay(item.startDate))
    .map(item => ({ ...item, dueDate: item.frequency.kind === 'manual' ? item.startDate : dueDateFor(item.frequency, item.startDate, today) }))
    .filter(item => item.dueDate && item.dueDate <= today);
  const followups: PulseFollowup[] = [];
  for (let offset = 0; offset < due.length; offset += 250) {
    const batch = due.slice(offset, offset + 250);
    const refs = batch.map(item => db.doc(`coachCheckInResponses/${item.id}_${item.dueDate}`));
    const answers = tx ? await tx.getAll(...refs) : await db.getAll(...refs);
    batch.forEach((item, index) => { const response = answers[index].data();
      if (!response || response.clubId !== actor.clubId || response.memberUid !== item.memberUid) followups.push({ id: item.id, memberUid: item.memberUid, templateName: item.templateName || 'Bilan', dueDate: item.dueDate });
    });
  }
  let actions = derivePulse(input, followups, now);
  // A truncated history must not create false absence/inactivity signals.
  if (partialSources.includes('logs')) actions = actions.filter(item => item.type !== 'CLIENT_INACTIVE');
  if (partialSources.includes('programs')) actions = actions.filter(item => !['PROGRAM_MISSING', 'PROGRAM_ENDING'].includes(item.type));
  return { actor, club, categories: pulseCategories(input), partialSources, actions: applyPulseStates(actions, states as PulseActionState[], uid, club.id, now) };
}
const route = (handler: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try {
    if (!req.auth?.uid) fail(401, 'Authentification requise.');
    res.json(await handler(req));
  } catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Pulse unavailable', { code: error?.code || 'unknown' });
    res.status(500).json({ error: 'Pulse est indisponible. Réessayez.' });
  }
};
export function registerPulse(app: Express, db: Firestore) {
  app.get('/api/pulse', route(async req => {
    const now = new Date(), result = await loadPulse(db, req.auth.uid, now);
    const status = req.query.status ?? 'open', group = req.query.group ?? 'all', category = req.query.category ?? 'all';
    const limit = Number(req.query.limit ?? 20);
    if (!['open', 'handled', 'snoozed'].includes(String(status)) || !['all', 'overdue', 'today', 'upcoming'].includes(String(group)) || !Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'Filtres Pulse invalides.');
    if (category !== 'all' && !result.categories.includes(category as any)) fail(403, 'Catégorie non autorisée.');
    const actions = result.actions.filter(item => item.state === status && (group === 'all' || item.group === group) && (category === 'all' || item.category === category));
    const digest = hash([req.auth.uid, result.club.id, status, group, category, actions.map(item => [item.key, item.sourceFingerprint, item.state, item.snoozedUntil])]);
    let offset = 0;
    if (req.query.cursor !== undefined) {
      if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 300) fail(400, 'Curseur invalide.');
      let cursor: any;
      try { cursor = JSON.parse(Buffer.from(String(req.query.cursor), 'base64url').toString()); } catch { fail(400, 'Curseur invalide.'); }
      if (!Number.isInteger(cursor?.offset) || cursor.offset < 0 || cursor.offset > actions.length) fail(400, 'Curseur invalide.');
      if (cursor.digest !== digest) fail(409, 'Les actions ont changé. Actualisez Pulse.');
      offset = cursor.offset;
    }
    const next = offset + limit;
    return { actions: actions.slice(offset, next), total: actions.length, nextCursor: next < actions.length ? Buffer.from(JSON.stringify({ offset: next, digest })).toString('base64url') : null,
      categories: result.categories, partialSources: result.partialSources, generatedAt: now.toISOString() };
  }));
  for (const operation of ['handled', 'snooze'] as const) {
    app.post(`/api/pulse/:actionKey/${operation}`, route(async req => {
      const body = req.body, key = String(req.params.actionKey);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(field => !['sourceFingerprint', ...(operation === 'snooze' ? ['preset'] : [])].includes(field)) ||
        typeof body.sourceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(body.sourceFingerprint) || key.length > 400 || !/^[a-zA-Z0-9:_-]+$/.test(key)) fail(400, 'Action Pulse invalide.');
      if (operation === 'snooze' && !['laterToday', 'tomorrow', 'threeDays', 'sevenDays'].includes(body.preset)) fail(400, 'Rappel invalide.');
      return db.runTransaction(async tx => {
        const now = new Date(), result = await loadPulse(db, req.auth.uid, now, tx);
        const action = result.actions.find(item => item.key === key);
        if (!action) fail(404, 'Cette action n’est plus disponible.');
        if (action.sourceFingerprint !== body.sourceFingerprint) fail(409, 'Cette situation a changé. Actualisez Pulse.');
        const until = operation === 'snooze' ? snoozeUntil(now, body.preset as SnoozePreset) : null;
        if (operation === 'snooze' && !until) fail(400, 'Choisissez un rappel pour demain.');
        const ref = db.doc(`pulseActionStates/${pulseStateId(req.auth.uid, result.club.id, key)}`);
        const existing = await tx.get(ref);
        const state: PulseActionState = { actorUid: req.auth.uid, clubId: result.club.id, key, sourceFingerprint: action.sourceFingerprint,
          status: operation === 'handled' ? 'handled' : 'snoozed', ...(until ? { snoozedUntil: until } : {}), createdAt: existing.data()?.createdAt || now.toISOString(), updatedAt: now.toISOString() };
        tx.set(ref, state);
        return { state };
      });
    }));
  }
}
