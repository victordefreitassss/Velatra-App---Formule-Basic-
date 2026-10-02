import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Express, Request, Response } from 'express';
import type { AttendanceStatus, Booking, Prospect } from '../types.ts';
import { resolveAccountType } from '../productCapabilities.ts';
import { MemberCreationError } from './createMember.ts';
import { staffReader } from './staffFacts.ts';
import { validDay } from './followupModel.ts';
import { legacyProspectNumericId } from './prospectIdentity.ts';
import { attendance, salesJoins, stamp, trialGroup, type SalesInput } from '../sales/salesModel.ts';
import { salesOverview } from '../sales/salesEngine.ts';
import { salesActivity, salesEvent, salesEventId, trialReferences } from './salesEvents.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const safe = (id: unknown): id is string => typeof id === 'string' && /^[^/]{1,180}$/.test(id);
function globalAccess(actor: any) { if (!['owner', 'manager'].includes(actor.role)) fail(403, 'Le cockpit Sales est réservé à Owner et Manager.'); }
export async function loadSales(db: Firestore, uid: string, allowCoach = false): Promise<{ input: SalesInput; actor: Awaited<ReturnType<typeof staffReader>>['actor'] }> {
  const reader = await staffReader(db, uid);
  if (!allowCoach) globalAccess(reader.actor);
  const [prospects, bookings, events, coaches] = await Promise.all([
    reader.source('prospects', [], 5000), reader.source('bookings', [], 10000), allowCoach ? [] : reader.source('salesEvents', [], 20000),
    reader.source('users', [], 2000)
  ]);
  return { actor: reader.actor, input: { clubId: reader.club.id, studio: resolveAccountType(reader.club) === 'studio', prospects, bookings, events, coaches, partialSources: reader.partialSources } };
}
export async function markTrialAttendance(db: Firestore, uid: string, bookingId: string, body: any) {
  if (!safe(bookingId) || !body || Object.keys(body).some(key => key !== 'attendanceStatus') || !['SHOWED_UP', 'NO_SHOW'].includes(body.attendanceStatus)) fail(400, 'Présence invalide. Utilisez le flow d’annulation pour annuler.');
  return db.runTransaction(async tx => {
    const reader = await staffReader(db, uid, tx), ref = db.doc(`bookings/${bookingId}`), snap = await tx.get(ref), booking = snap.data();
    if (!booking || booking.type !== 'trial' || booking.clubId !== reader.club.id) fail(403, 'Cet essai ne fait pas partie de votre espace.');
    const { prospectDoc, prospect, coachDoc } = await trialReferences(db, tx, booking);
    if (reader.actor.role === 'coach' && coachDoc.id !== uid) fail(403, 'Cet essai ne vous est pas affecté.');
    if (attendance(booking as Booking) === 'CANCELLED' || !['confirmed', 'completed'].includes(booking.status) || !Number.isFinite(stamp(booking.startTime)) || stamp(booking.startTime) > Date.now()) fail(409, 'La présence ne peut être saisie qu’à partir du début de l’essai.');
    const previous = attendance(booking as Booking), target = body.attendanceStatus as AttendanceStatus;
    if (previous === target) return { booking: { ...booking, id: bookingId }, unchanged: true };
    const at = new Date().toISOString(), revision = (Number.isSafeInteger(booking.attendanceRevision) ? booking.attendanceRevision : 0) + 1;
    const patch = { prospectUid: prospectDoc.id, coachUid: coachDoc.id, assignedCoachUid: coachDoc.id, attendanceStatus: target,
      attendanceMarkedAt: booking.attendanceMarkedAt || at, attendanceMarkedByUid: booking.attendanceMarkedByUid || uid,
      attendanceUpdatedAt: at, attendanceUpdatedByUid: uid, attendanceRevision: revision };
    const event = salesEvent(db, `trial:${bookingId}:attendance:${revision}`, target === 'SHOWED_UP' ? 'TRIAL_SHOWED_UP' : 'TRIAL_NO_SHOW', prospectDoc.id, prospect, at, uid,
      { bookingId, coachUid: coachDoc.id, correction: previous !== 'PENDING' });
    tx.update(ref, patch); tx.create(event.ref, event.data);
    tx.update(prospectDoc.ref, { activityHistory: salesActivity(prospect, `${previous !== 'PENDING' ? 'Présence corrigée : ' : 'Essai : '}${target === 'SHOWED_UP' ? 'Présent' : 'No-show'}`, uid, at, event.ref.id) });
    return { booking: { ...booking, ...patch, id: bookingId }, unchanged: false };
  });
}
export async function createSalesProspect(db: Firestore, uid: string, body: any) {
  if (!body || Object.keys(body).some(k => !['requestId', 'name', 'email', 'phone', 'source', 'notes'].includes(k)) || !safe(body.requestId) || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120 ||
    ['email', 'phone', 'source', 'notes'].some(k => body[k] !== undefined && typeof body[k] !== 'string')) fail(400, 'Prospect invalide.');
  if ((body.email || '').length > 254 || (body.phone || '').length > 80 || (body.source || '').length > 80 || (body.notes || '').length > 2000) fail(400, 'Informations trop longues.');
  return db.runTransaction(async tx => {
    const { actor, club } = await staffReader(db, uid, tx); globalAccess(actor);
    const id = salesEventId(`lead:${club.id}:${uid}:${body.requestId}`), ref = db.doc(`prospects/${id}`), previous = await tx.get(ref);
    if (previous.exists) return { prospect: { ...previous.data(), firebaseUid: id }, unchanged: true };
    const at = new Date().toISOString();
    const prospect = { id: legacyProspectNumericId(id), clubId: club.id, name: body.name.trim(), email: (body.email || '').trim().toLowerCase(), phone: (body.phone || '').trim(),
      source: (body.source || '').trim(), date: at, status: 'lead', answers: {}, salesVersion: 2, activityHistory: salesActivity({}, 'Lead créé', uid, at, id),
      notesHistory: body.notes?.trim() ? [{ id, date: at, content: body.notes.trim(), authorUid: uid }] : [] };
    const event = salesEvent(db, `lead:${id}`, 'LEAD_CREATED', id, prospect, at, uid);
    tx.create(ref, prospect); tx.create(event.ref, event.data);
    return { prospect: { ...prospect, firebaseUid: id }, unchanged: false };
  });
}
export async function updateSalesProspect(db: Firestore, uid: string, prospectUid: string, body: any, assignment = false) {
  if (!safe(prospectUid) || !body || Object.keys(body).some(k => !(assignment ? ['coachUid'] : ['status', 'nextReminderDate', 'lostReason']).includes(k))) fail(400, 'Modification invalide.');
  if (assignment ? body.coachUid !== null && !safe(body.coachUid) : !['lead', 'contacted', 'call_pending', 'lost'].includes(body.status)) fail(400, 'Modification invalide.');
  if (!assignment && (body.nextReminderDate != null && (typeof body.nextReminderDate !== 'string' || !Number.isFinite(stamp(body.nextReminderDate))) || body.lostReason != null && (typeof body.lostReason !== 'string' || body.lostReason.length > 300))) fail(400, 'Relance ou motif invalide.');
  if (!assignment && body.status === 'call_pending' && !Number.isFinite(stamp(body.nextReminderDate))) fail(400, 'Choisissez une date de relance.');
  return db.runTransaction(async tx => {
    const { actor, club } = await staffReader(db, uid, tx); globalAccess(actor);
    const ref = db.doc(`prospects/${prospectUid}`), snap = await tx.get(ref), prospect = snap.data();
    if (!prospect || prospect.clubId !== club.id) fail(403, 'Prospect hors de votre espace.');
    if (prospect.convertedMemberUid || prospect.status === 'won') fail(409, 'Ce dossier est déjà gagné.');
    let patch: any, label: string;
    if (assignment) {
      if (resolveAccountType(club) !== 'studio') fail(400, 'La responsabilité est implicite en Solo.');
      if (body.coachUid !== null) { const coach = (await tx.get(db.doc(`users/${body.coachUid}`))).data(); if (!coach || coach.role !== 'coach' || coach.clubId !== club.id || coach.isSuspended === true) fail(403, 'Choisissez un Coach actif de ce Studio.'); }
      patch = { assignedCoachUid: body.coachUid }; label = 'Responsable commercial modifié';
    } else {
      patch = { status: body.status, nextReminderDate: body.status === 'call_pending' ? body.nextReminderDate : null };
      label = body.status === 'lost' ? 'Classé perdu' : body.status === 'call_pending' ? 'Relance planifiée' : body.status === 'contacted' ? 'Étape : Contacté' : 'Étape : Nouveau';
      if (body.status === 'lost') { patch.lostReason = (body.lostReason || '').trim(); patch.lostAt = prospect.status === 'lost' ? prospect.lostAt || new Date().toISOString() : new Date().toISOString(); }
      else { patch.lostAt = null; patch.lostReason = null; }
    }
    if (Object.entries(patch).every(([k, v]) => (prospect[k] ?? null) === v)) return { prospect: { ...prospect, firebaseUid: prospectUid }, unchanged: true };
    const at = new Date().toISOString(), eventId = randomUUID();
    patch.activityHistory = salesActivity(prospect, label, uid, at, eventId);
    if (!assignment && ['contacted', 'lost'].includes(body.status)) { const e = salesEvent(db, `stage:${prospectUid}:${eventId}`, body.status === 'contacted' ? 'CONTACTED' : 'LOST', prospectUid, prospect, at, uid); tx.create(e.ref, e.data); }
    tx.update(ref, patch);
    return { prospect: { ...prospect, ...patch, firebaseUid: prospectUid }, unchanged: false };
  });
}
const route = (handler: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { if (!req.auth?.uid) fail(401, 'Authentification requise.'); res.json(await handler(req)); }
  catch (error: any) { if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message }); console.error('Sales unavailable', { code: error?.code || 'unknown' }); res.status(500).json({ error: 'Sales indisponible. Réessayez.' }); }
};
export function registerSales(app: Express, db: Firestore) {
  app.get('/api/sales/overview', route(async req => {
    const { from, to } = req.query;
    if (!validDay(from) || !validDay(to) || String(from) > String(to)) fail(400, 'Période invalide.');
    const { input } = await loadSales(db, req.auth.uid); return salesOverview(input, String(from), String(to));
  }));
  app.get('/api/sales/trials/:bookingId', route(async req => db.runTransaction(async tx => {
    const id = String(req.params.bookingId);
    if (!safe(id)) fail(400, 'Essai invalide.');
    const reader = await staffReader(db, req.auth.uid, tx), snap = await tx.get(db.doc(`bookings/${id}`)), booking = snap.data();
    if (!booking || booking.type !== 'trial' || booking.clubId !== reader.club.id) fail(403, 'Essai hors de votre espace.');
    const { prospect, prospectDoc, coachDoc, coach } = await trialReferences(db, tx, booking);
    if (reader.actor.role === 'coach' && coachDoc.id !== req.auth.uid) fail(403, 'Cet essai ne vous est pas affecté.');
    return { booking: { ...booking, id }, prospectUid: prospectDoc.id, prospectName: prospect.name, coachName: coach.name || 'Coach', group: trialGroup(booking as Booking, new Date()) };
  })));
  app.get('/api/sales/trials', route(async req => {
    const { input, actor } = await loadSales(db, req.auth.uid, true), now = new Date(), joins = salesJoins(input);
    const limit = Number(req.query.limit || 20), offset = Number(req.query.offset || 0), group = req.query.group;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || offset > 10000 || group && !['upcoming', 'missing', 'showed', 'noShow', 'cancelled'].includes(String(group)) || req.query.prospectUid && !safe(req.query.prospectUid)) fail(400, 'Filtres invalides.');
    const rows = input.bookings.filter(b => b.type === 'trial' && b.clubId === input.clubId && Number.isFinite(stamp(b.startTime)) &&
      (actor.role !== 'coach' || joins.coach(b)?.firebaseUid === req.auth.uid) && (!group || trialGroup(b, now) === group) && (!req.query.prospectUid || joins.prospect(b)?.firebaseUid === req.query.prospectUid))
      .sort((a, b) => stamp(b.startTime) - stamp(a.startTime) || a.id.localeCompare(b.id));
    return { trials: rows.slice(offset, offset + limit).map(b => ({ booking: b, group: trialGroup(b, now), prospectUid: joins.prospect(b)?.firebaseUid || null, prospectName: joins.prospect(b)?.name || 'Prospect non identifié', coachName: joins.coach(b)?.name || 'Non attribué' })), total: rows.length, partial: !!input.partialSources?.length, partialSources: input.partialSources };
  }));
  app.post('/api/sales/prospects', route(req => createSalesProspect(db, req.auth.uid, req.body)));
  app.post('/api/sales/prospects/:id/stage', route(req => updateSalesProspect(db, req.auth.uid, String(req.params.id), req.body)));
  app.post('/api/sales/prospects/:id/assignment', route(req => updateSalesProspect(db, req.auth.uid, String(req.params.id), req.body, true)));
  app.post('/api/bookings/:bookingId/attendance', route(req => markTrialAttendance(db, req.auth.uid, String(req.params.bookingId), req.body)));
}
