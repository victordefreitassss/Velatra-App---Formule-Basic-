import { randomUUID } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { MemberCreationError } from './createMember.ts';
import { dayKey, dueDateFor, dueStatus, normalizePhases, parseFrequency, parseQuestions, safeId, shortText, validDay, validateAnswers, weekRate } from './followupModel.ts';
import { resolveAccountType } from '../productCapabilities.ts';

const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
const id = () => randomUUID().replaceAll('-', '');
const rows = (snap: FirebaseFirestore.QuerySnapshot): any[] => snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
type Actor = { uid: string; role: string; clubId: string; memberId?: number; assignedCoachUid?: string };

async function scope(db: Firestore, uid: string, memberUid: string, write = false) {
  if (!safeId(uid) || !safeId(memberUid)) fail(400, 'Identifiant invalide.');
  const [actorDoc, memberDoc] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`users/${memberUid}`).get()]);
  const actor = actorDoc.data() as Actor | undefined, member = memberDoc.data();
  if (!actor || !member || member.role !== 'member' || !actor.clubId || actor.clubId !== member.clubId) fail(403, 'Accès au suivi refusé.');
  if (actor.role === 'member') {
    if (write || uid !== memberUid) fail(403, 'Accès au suivi refusé.');
  } else if (actor.role === 'coach') {
    if (member.assignedCoachUid !== uid) fail(403, 'Cet adhérent ne vous est pas affecté.');
  } else if (actor.role === 'owner') {
    const club = (await db.doc(`clubs/${actor.clubId}`).get()).data();
    if (!club || (resolveAccountType(club) !== 'legacy' && club.ownerId !== uid)) fail(403, 'Accès au suivi refusé.');
  } else fail(403, 'Accès au suivi refusé.');
  return { actor, member, memberUid, clubId: actor.clubId };
}

async function staff(db: Firestore, uid: string) {
  const actor = (await db.doc(`users/${uid}`).get()).data() as Actor | undefined;
  if (!actor?.clubId || !['owner', 'coach'].includes(actor.role)) fail(403, 'Accès réservé au coach.');
  if (actor.role === 'owner') {
    const club = (await db.doc(`clubs/${actor.clubId}`).get()).data();
    if (!club || (resolveAccountType(club) !== 'legacy' && club.ownerId !== uid)) fail(403, 'Accès refusé.');
  }
  return { ...actor, uid };
}

async function currentStaffMember(tx: Transaction, db: Firestore, uid: string, memberUid: string, clubId: string) {
  const [actorDoc, memberDoc] = await Promise.all([tx.get(db.doc(`users/${uid}`)), tx.get(db.doc(`users/${memberUid}`))]);
  const actor = actorDoc.data(), member = memberDoc.data();
  if (!actor || !member || member.role !== 'member' || actor.clubId !== clubId || member.clubId !== clubId) fail(403, 'Vos droits ont changé.');
  if (actor.role === 'coach' && member.assignedCoachUid !== uid) fail(403, 'Cet adhérent ne vous est plus affecté.');
  if (actor.role === 'owner') {
    const club = (await tx.get(db.doc(`clubs/${clubId}`))).data();
    if (!club || resolveAccountType(club) !== 'legacy' && club.ownerId !== uid) fail(403, 'Vos droits ont changé.');
  }
  if (!['owner', 'coach'].includes(actor.role)) fail(403, 'Vos droits ont changé.');
  return member;
}

const route = (handler: (req: Request, res: Response, db: Firestore) => Promise<unknown>, db: Firestore) => async (req: Request, res: Response) => {
  try {
    if (JSON.stringify(req.body || {}).length > 20000) fail(413, 'Ce formulaire est trop volumineux.');
    const result = await handler(req, res, db);
    if (!res.headersSent) res.json(result);
  } catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Coaching follow-up failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: 'Le suivi est indisponible. Réessayez.' });
  }
};

async function memberView(db: Firestore, uid: string, memberUid: string) {
  const access = await scope(db, uid, memberUid);
  const today = dayKey();
  const isMember = access.actor.role === 'member';
  const [journey, assignmentSnap, habitSnap, responseSnap, entrySnap, logSnap] = await Promise.all([
    db.doc(`coachingJourneys/${memberUid}`).get(),
    db.collection('coachCheckInAssignments').where('memberUid', '==', memberUid).limit(50).get(),
    db.collection('coachHabits').where('memberUid', '==', memberUid).limit(50).get(),
    isMember ? Promise.resolve(null) : db.collection('coachCheckInResponses').where('memberUid', '==', memberUid).limit(50).get(),
    db.collection('coachHabitEntries').where('memberUid', '==', memberUid).limit(100).get(),
    db.collection('logs').where('memberId', '==', access.member.id).limit(30).get(),
  ]);
  const responses = (responseSnap ? rows(responseSnap) : []).filter((item: any) => item.clubId === access.clubId)
    .sort((a: any, b: any) => String(b.answeredAt).localeCompare(String(a.answeredAt))).slice(0, 20);
  const entries = (entrySnap ? rows(entrySnap) : []).filter((item: any) => item.clubId === access.clubId)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))).slice(0, 70);
  const assignments = rows(assignmentSnap).filter((item: any) => item.clubId === access.clubId).map((item: any) => {
    const dueDate = item.active ? item.frequency.kind === 'manual' ? item.startDate : dueDateFor(item.frequency, item.startDate, today) : null;
    return { ...item, dueDate, status: 'none' };
  });
  const dueAssignments = assignments.filter(item => item.dueDate);
  const dueDocs = dueAssignments.length ? await db.getAll(...dueAssignments.map(item => db.doc(`coachCheckInResponses/${item.id}_${item.dueDate}`))) : [];
  dueAssignments.forEach((item, index) => { item.status = dueStatus(item.dueDate, dueDocs[index].exists ? [item.dueDate] : [], today); });
  const habits = rows(habitSnap).filter((item: any) => item.clubId === access.clubId).map((item: any) => {
    const own = entries.filter((entry: any) => entry.habitId === item.id);
    const dueDate = item.active ? dueDateFor(item.frequency, item.startDate, today) : null;
    const todayEntry = dueDate ? own.find((entry: any) => entry.date === dueDate) || null : null;
    return { ...item, dueDate, todayEntry, week: item.frequency.kind === 'daily' ? weekRate(own, today) : { completed: todayEntry?.met ? 1 : 0, expected: 1 } };
  });
  if (isMember) {
    const dueHabits = habits.filter((item: any) => item.dueDate);
    const dueEntries = dueHabits.length ? await db.getAll(...dueHabits.map((item: any) => db.doc(`coachHabitEntries/${item.id}_${item.dueDate}`))) : [];
    dueHabits.forEach((item: any, index: number) => {
      item.todayEntry = dueEntries[index].exists && dueEntries[index].data()?.clubId === access.clubId ? dueEntries[index].data() : null;
      if (item.frequency.kind !== 'daily') item.week = { completed: item.todayEntry?.met ? 1 : 0, expected: 1 };
    });
  }
  const logs = rows(logSnap).filter((item: any) => item.clubId === access.clubId && item.memberId === access.member.id)
    .sort((a: any, b: any) => String(b.completedAt || b.date).localeCompare(String(a.completedAt || a.date))).slice(0, 10)
    .map((item: any) => ({ id: item.id, date: item.date, dayName: item.dayName, isCoaching: item.isCoaching === true, rpe: item.rpe ?? null, feedback: item.memberFeedback || null }));
  const journeyData = journey.exists && journey.data()?.clubId === access.clubId ? journey.data() : null;
  return { journey: journeyData && access.actor.role === 'member' ? { ...journeyData, phases: journeyData.phases?.map((phase: any) => ({ ...phase, notes: '' })) } : journeyData,
    assignments, responses: access.actor.role === 'member' ? responses.filter((item: any) => item.memberUid === uid) : responses,
    habits: habits.filter((item: any) => item.active || access.actor.role !== 'member'),
    entries: access.actor.role === 'member' ? entries.filter((item: any) => item.memberUid === uid) : entries, logs, today };
}

export function registerCoachingFollowup(app: Express, db: Firestore) {
  app.get('/api/followup/priorities', route(async (req, _res, database) => {
    const actor = await staff(database, req.auth.uid), today = dayKey();
    const snap = await database.collection('coachCheckInAssignments').where('clubId', '==', actor.clubId).limit(100).get();
    const candidates = rows(snap).filter((item: any) => item.active && safeId(item.memberUid));
    const members = candidates.length ? await database.getAll(...candidates.map((item: any) => database.doc(`users/${item.memberUid}`))) : [];
    const allowed = candidates.filter((item: any, index: number) => members[index].data()?.role === 'member' && members[index].data()?.clubId === actor.clubId &&
      (actor.role === 'owner' || members[index].data()?.assignedCoachUid === req.auth.uid));
    const due = allowed.map((item: any) => ({ ...item, dueDate: item.frequency.kind === 'manual' ? item.startDate : dueDateFor(item.frequency, item.startDate, today) })).filter((item: any) => item.dueDate && item.dueDate <= today);
    const received = due.length ? await database.getAll(...due.map((item: any) => database.doc(`coachCheckInResponses/${item.id}_${item.dueDate}`))) : [];
    const priorities = due.filter((item: any, index: number) => !received[index].exists).slice(0, 4).map((item: any) => ({ memberUid: item.memberUid,
      memberName: members[candidates.findIndex((candidate: any) => candidate.id === item.id)].data()?.name || 'Adhérent',
      templateName: item.templateName, dueDate: item.dueDate, status: item.dueDate < today ? 'late' : 'expected' }));
    return { priorities, dueCount: due.filter((item: any, index: number) => !received[index].exists).length };
  }, db));
  app.get('/api/followup/me', route(async (req, _res, database) => {
    const actor = (await database.doc(`users/${req.auth.uid}`).get()).data();
    if (actor?.role !== 'member') fail(403, 'Accès réservé aux adhérents.');
    return memberView(database, req.auth.uid, req.auth.uid);
  }, db));
  app.get('/api/followup/clients/:memberUid/summary', route(async (req, _res, database) => {
    const memberUid = String(req.params.memberUid), access = await scope(database, req.auth.uid, memberUid);
    const journey = (await database.doc(`coachingJourneys/${memberUid}`).get()).data();
    if (!journey || journey.clubId !== access.clubId) return { journey: null };
    return { journey: { phases: journey.phases?.map((phase: any) => ({ id: phase.id, name: phase.name, status: phase.status })) || [], version: journey.version } };
  }, db));
  app.get('/api/followup/clients/:memberUid/journey', route(async (req, _res, database) => {
    const memberUid = String(req.params.memberUid), access = await scope(database, req.auth.uid, memberUid);
    if (access.actor.role === 'member') fail(403, 'Cette vue est réservée au coach.');
    const journey = (await database.doc(`coachingJourneys/${memberUid}`).get()).data();
    return { journey: journey?.clubId === access.clubId ? journey : null };
  }, db));
  app.get('/api/followup/clients/:memberUid', route(async (req, _res, database) => memberView(database, req.auth.uid, String(req.params.memberUid)), db));
  app.get('/api/followup/templates', route(async (req, _res, database) => {
    const actor = await staff(database, req.auth.uid);
    const snap = await database.collection('coachCheckInTemplates').where('clubId', '==', actor.clubId).limit(100).get();
    return { templates: rows(snap).filter((item: any) => actor.role === 'owner' || item.createdBy === actor.uid) };
  }, db));
  app.post('/api/followup/templates', route(async (req, _res, database) => {
    const actor = await staff(database, req.auth.uid);
    const body = req.body || {}, questions = parseQuestions(body.questions), frequency = body.defaultFrequency ? parseFrequency(body.defaultFrequency) : null;
    if (!shortText(body.name, 100) || !questions || body.defaultFrequency && !frequency || (body.description && (typeof body.description !== 'string' || body.description.length > 500))) fail(400, 'Vérifiez le modèle et ses questions.');
    if ((await database.collection('coachCheckInTemplates').where('clubId', '==', actor.clubId).limit(100).get()).size >= 100) fail(409, 'La bibliothèque de modèles est pleine. Réutilisez un modèle existant.');
    const ref = database.collection('coachCheckInTemplates').doc(id());
    const value = { id: ref.id, clubId: actor.clubId, name: shortText(body.name, 100), description: shortText(body.description, 500), questions,
      defaultFrequency: frequency, createdBy: req.auth.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), active: true };
    await ref.create(value); return { template: value };
  }, db));
  app.patch('/api/followup/templates/:templateId', route(async (req, _res, database) => {
    const actor = await staff(database, req.auth.uid), templateId = String(req.params.templateId);
    if (!safeId(templateId)) fail(400, 'Modèle invalide.');
    const ref = database.doc(`coachCheckInTemplates/${templateId}`), previous = (await ref.get()).data();
    if (!previous || previous.clubId !== actor.clubId || actor.role === 'coach' && previous.createdBy !== actor.uid) fail(403, 'Modèle inaccessible.');
    const body = req.body || {}, questions = body.questions === undefined ? previous.questions : parseQuestions(body.questions);
    if (!questions || body.name !== undefined && !shortText(body.name, 100) || body.active !== undefined && typeof body.active !== 'boolean') fail(400, 'Modèle invalide.');
    const patch = { name: body.name === undefined ? previous.name : shortText(body.name, 100), questions,
      description: body.description === undefined ? previous.description : shortText(body.description, 500),
      active: body.active === undefined ? previous.active : body.active, updatedAt: new Date().toISOString() };
    await ref.update(patch); return { template: { ...previous, ...patch } };
  }, db));
  app.put('/api/followup/journeys/:memberUid', route(async (req, _res, database) => {
    const memberUid = String(req.params.memberUid), access = await scope(database, req.auth.uid, memberUid, true);
    const phases = normalizePhases(req.body?.phases), expectedVersion = req.body?.expectedVersion;
    if (!phases || !Number.isInteger(expectedVersion) || expectedVersion < 0) fail(400, 'Parcours invalide.');
    for (const phase of phases) {
      if (phase.programId) {
        const [current, archived] = await Promise.all([database.doc(`programs/${phase.programId}`).get(), database.doc(`archivedPrograms/${phase.programId}`).get()]);
        const program = current.exists ? current.data() : archived.data();
        if (!program || program.clubId !== access.clubId || program.memberId !== access.member.id) fail(400, 'Le programme associé ne correspond pas à cet adhérent.');
      }
      for (const templateId of phase.checkInTemplateIds) {
        const template = (await database.doc(`coachCheckInTemplates/${templateId}`).get()).data();
        if (!template || template.clubId !== access.clubId) fail(400, 'Le bilan associé ne correspond pas à ce club.');
      }
    }
    const ref = database.doc(`coachingJourneys/${memberUid}`);
    return database.runTransaction(async tx => {
      const current = await tx.get(ref);
      const member = await currentStaffMember(tx, database, req.auth.uid, memberUid, access.clubId);
      if (Number(current.data()?.version || 0) !== expectedVersion) fail(409, 'Ce parcours a été modifié. Rechargez-le avant de continuer.');
      const oldPhases = current.data()?.phases || [];
      for (const old of oldPhases) {
        if (old.status === 'completed' && !phases.some(phase => phase.id === old.id && phase.status === 'completed')) fail(409, 'Une phase terminée ne peut pas être effacée.');
      }
      const value = { id: memberUid, memberUid, memberId: member.id, clubId: access.clubId, phases,
        version: expectedVersion + 1, updatedBy: req.auth.uid, updatedAt: new Date().toISOString(), createdAt: current.data()?.createdAt || new Date().toISOString() };
      tx.set(ref, value); return { journey: value };
    });
  }, db));
  app.post('/api/followup/assignments/:memberUid', route(async (req, _res, database) => {
    const memberUid = String(req.params.memberUid), access = await scope(database, req.auth.uid, memberUid, true);
    const body = req.body || {}, frequency = parseFrequency(body.frequency);
    if (!safeId(body.templateId) || !frequency || !validDay(body.startDate) || body.phaseId && !safeId(body.phaseId)) fail(400, 'Assignation invalide.');
    const template = (await database.doc(`coachCheckInTemplates/${body.templateId}`).get()).data();
    if (!template?.active || template.clubId !== access.clubId || access.actor.role === 'coach' && template.createdBy !== req.auth.uid) fail(403, 'Modèle indisponible.');
    if (body.phaseId) {
      const journey = (await database.doc(`coachingJourneys/${memberUid}`).get()).data();
      if (!journey?.phases?.some((phase: any) => phase.id === body.phaseId)) fail(400, 'Phase inconnue.');
    }
    if ((await database.collection('coachCheckInAssignments').where('memberUid', '==', memberUid).limit(50).get()).size >= 50) fail(409, 'Ce client a déjà trop de bilans assignés.');
    const ref = database.collection('coachCheckInAssignments').doc(id());
    const value = { id: ref.id, clubId: access.clubId, memberUid, memberId: access.member.id, assignedCoachUid: access.member.assignedCoachUid || null,
      templateId: body.templateId, templateName: template.name, questions: template.questions, frequency, startDate: body.startDate,
      phaseId: body.phaseId || null, active: true, createdBy: req.auth.uid, createdAt: new Date().toISOString() };
    await database.runTransaction(async tx => {
      await currentStaffMember(tx, database, req.auth.uid, memberUid, access.clubId);
      const currentTemplate = (await tx.get(database.doc(`coachCheckInTemplates/${body.templateId}`))).data();
      if (!currentTemplate?.active || currentTemplate.clubId !== access.clubId || access.actor.role === 'coach' && currentTemplate.createdBy !== req.auth.uid) fail(409, 'Ce modèle a changé.');
      tx.create(ref, value);
    });
    return { assignment: value };
  }, db));
  app.patch('/api/followup/assignments/:assignmentId', route(async (req, _res, database) => {
    const assignmentId = String(req.params.assignmentId);
    if (!safeId(assignmentId) || typeof req.body?.active !== 'boolean') fail(400, 'Assignation invalide.');
    const ref = database.doc(`coachCheckInAssignments/${assignmentId}`), previous = (await ref.get()).data();
    if (!previous) fail(404, 'Assignation introuvable.');
    const access = await scope(database, req.auth.uid, previous.memberUid, true);
    await database.runTransaction(async tx => { const current = await tx.get(ref); await currentStaffMember(tx, database, req.auth.uid, previous.memberUid, access.clubId);
      if (!current.exists || current.data()?.memberUid !== previous.memberUid || current.data()?.clubId !== access.clubId) fail(409, 'Cette assignation a changé.');
      tx.update(ref, { active: req.body.active, updatedAt: new Date().toISOString() }); }); return { success: true };
  }, db));
  app.post('/api/followup/checkins/:assignmentId/respond', route(async (req, _res, database) => {
    const assignmentId = String(req.params.assignmentId), uid = req.auth.uid;
    if (!safeId(assignmentId)) fail(400, 'Bilan invalide.');
    const assignmentRef = database.doc(`coachCheckInAssignments/${assignmentId}`), actorRef = database.doc(`users/${uid}`);
    const assignment = (await assignmentRef.get()).data();
    if (!assignment || assignment.memberUid !== uid) fail(403, 'Ce bilan ne vous est pas destiné.');
    const dueDate = assignment.frequency.kind === 'manual' ? req.body?.dueDate : dueDateFor(assignment.frequency, assignment.startDate, dayKey());
    if (!validDay(dueDate) || dueDate > dayKey() || dueDate < assignment.startDate || assignment.frequency.kind === 'manual' && dueDate !== assignment.startDate) fail(400, 'Cette échéance n’est pas disponible.');
    const answers = validateAnswers(assignment.questions, req.body?.answers);
    if (!answers) fail(400, 'Vérifiez vos réponses.');
    const ref = database.doc(`coachCheckInResponses/${assignmentId}_${dueDate}`);
    return database.runTransaction(async tx => {
      const [memberDoc, assignmentDoc, previous] = await Promise.all([tx.get(actorRef), tx.get(assignmentRef), tx.get(ref)]);
      const member = memberDoc.data(), current = assignmentDoc.data();
      if (member?.role !== 'member' || member?.clubId !== assignment.clubId || current?.memberUid !== uid || !current?.active || current?.clubId !== member.clubId) fail(403, 'Ce bilan n’est plus disponible.');
      if (previous.exists) return { response: previous.data(), alreadySubmitted: true };
      const value = { id: ref.id, memberUid: uid, memberId: member.id, clubId: member.clubId, assignedCoachUid: member.assignedCoachUid || null,
        assignmentId, templateId: current!.templateId, templateName: current!.templateName, questions: current!.questions,
        dueDate, answeredAt: new Date().toISOString(), answers };
      tx.create(ref, value); return { response: value, alreadySubmitted: false };
    });
  }, db));
  app.post('/api/followup/habits/:memberUid', route(async (req, _res, database) => {
    const memberUid = String(req.params.memberUid), access = await scope(database, req.auth.uid, memberUid, true), body = req.body || {};
    const frequency = parseFrequency(body.frequency || { kind: 'daily' });
    if (!shortText(body.name, 100) || !frequency || frequency.kind === 'manual' || !validDay(body.startDate) || body.endDate && (!validDay(body.endDate) || body.endDate < body.startDate) ||
      !['boolean', 'number'].includes(body.valueType) || body.target != null && (!Number.isFinite(body.target) || body.target < 0 || body.target > 1000000)) fail(400, 'Habitude invalide.');
    if ((await database.collection('coachHabits').where('memberUid', '==', memberUid).limit(50).get()).size >= 50) fail(409, 'Ce client a déjà trop d’habitudes configurées.');
    const ref = database.collection('coachHabits').doc(id());
    const value = { id: ref.id, clubId: access.clubId, memberUid, memberId: access.member.id, name: shortText(body.name, 100),
      description: shortText(body.description, 500), valueType: body.valueType, target: body.target ?? null, unit: shortText(body.unit, 30), frequency,
      startDate: body.startDate, endDate: body.endDate || null, active: true, createdBy: req.auth.uid, createdAt: new Date().toISOString() };
    await database.runTransaction(async tx => { await currentStaffMember(tx, database, req.auth.uid, memberUid, access.clubId); tx.create(ref, value); });
    return { habit: value };
  }, db));
  app.patch('/api/followup/habits/:habitId', route(async (req, _res, database) => {
    const habitId = String(req.params.habitId);
    if (!safeId(habitId) || typeof req.body?.active !== 'boolean') fail(400, 'Habitude invalide.');
    const ref = database.doc(`coachHabits/${habitId}`), previous = (await ref.get()).data();
    if (!previous) fail(404, 'Habitude introuvable.');
    const access = await scope(database, req.auth.uid, previous.memberUid, true);
    await database.runTransaction(async tx => { const current = await tx.get(ref); await currentStaffMember(tx, database, req.auth.uid, previous.memberUid, access.clubId);
      if (!current.exists || current.data()?.memberUid !== previous.memberUid || current.data()?.clubId !== access.clubId) fail(409, 'Cette habitude a changé.');
      tx.update(ref, { active: req.body.active, updatedAt: new Date().toISOString() }); }); return { success: true };
  }, db));
  app.post('/api/followup/habits/:habitId/complete', route(async (req, _res, database) => {
    const habitId = String(req.params.habitId), uid = req.auth.uid, today = dayKey();
    if (!safeId(habitId)) fail(400, 'Habitude invalide.');
    const habitRef = database.doc(`coachHabits/${habitId}`), memberRef = database.doc(`users/${uid}`);
    const value = req.body?.value;
    return database.runTransaction(async tx => {
      const [habitDoc, memberDoc] = await Promise.all([tx.get(habitRef), tx.get(memberRef)]);
      const habit = habitDoc.data(), member = memberDoc.data();
      if (!habit || !member || member.role !== 'member' || habit.memberUid !== uid || habit.clubId !== member.clubId || !habit.active || today < habit.startDate || habit.endDate && today > habit.endDate) fail(403, 'Cette habitude n’est pas disponible.');
      const dueDate = dueDateFor(habit.frequency, habit.startDate, today);
      if (!dueDate) fail(403, 'Cette habitude n’est pas attendue.');
      const ref = database.doc(`coachHabitEntries/${habitId}_${dueDate}`);
      const prior = await tx.get(ref);
      if (habit.valueType === 'number' && (!Number.isFinite(value) || value < 0 || value > 1000000)) fail(400, 'Valeur invalide.');
      if (habit.valueType === 'boolean' && value !== true) fail(400, 'Validation invalide.');
      if (prior.exists) return { entry: prior.data(), alreadyCompleted: true };
      const entry = { id: ref.id, clubId: member.clubId, memberUid: uid, memberId: member.id, habitId, date: dueDate,
        value: habit.valueType === 'number' ? value : true, met: habit.valueType === 'boolean' || habit.target == null || value >= habit.target, completedAt: new Date().toISOString() };
      tx.create(ref, entry); return { entry, alreadyCompleted: false };
    });
  }, db));
  app.post('/api/followup/sessions/:logId/feedback', route(async (req, _res, database) => {
    const logId = String(req.params.logId), uid = req.auth.uid, body = req.body || {};
    if (!safeId(logId) || !Number.isInteger(body.rpe) || body.rpe < 1 || body.rpe > 10 || !Number.isInteger(body.energy) || body.energy < 1 || body.energy > 5 ||
      typeof body.pain !== 'boolean' || typeof body.comment !== 'string' || body.comment.length > 1000 || body.painArea && (typeof body.painArea !== 'string' || body.painArea.length > 100)) fail(400, 'Feedback invalide.');
    const ref = database.doc(`logs/${logId}`), memberRef = database.doc(`users/${uid}`);
    return database.runTransaction(async tx => {
      const [logDoc, memberDoc] = await Promise.all([tx.get(ref), tx.get(memberRef)]);
      const log = logDoc.data(), member = memberDoc.data();
      if (!log || !member || member.role !== 'member' || log.memberId !== member.id || log.clubId !== member.clubId || log.isCoaching === true) fail(403, 'Cette séance ne vous appartient pas.');
      if (log.memberFeedback) return { feedback: log.memberFeedback, alreadySubmitted: true };
      const feedback = { energy: body.energy, pain: body.pain, painArea: body.pain ? shortText(body.painArea, 100) : '', comment: shortText(body.comment, 1000), submittedAt: new Date().toISOString() };
      tx.update(ref, { rpe: body.rpe, memberFeedback: feedback }); return { feedback, alreadySubmitted: false };
    });
  }, db));
}
