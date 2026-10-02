import type { Express } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { MemberCreationError } from './createMember.ts';
import { notificationActor, notificationHash, enqueueNotification, dispatchPendingPush } from './notifications.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
export async function sendMessage(db: Firestore, uid: string, input: any) {
  if (typeof input?.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(input.requestId) || !Number.isSafeInteger(input.to) || input.to <= 0 || typeof input.text !== 'string' || input.text.length > 5000 || !input.text.trim() && !input.file) fail(400, 'Message invalide.');
  if (input.file != null && (typeof input.file !== 'string' || input.file.length > 960000 || !/^data:(image\/(?:png|jpeg|gif|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(input.file))) fail(400, 'Pièce jointe invalide (image ou PDF).');
  const initial = await notificationActor(db, uid);
  const candidates = await db.collection('users').where('clubId', '==', initial.clubId).where('id', '==', input.to).limit(2).get();
  if (candidates.size !== 1) fail(403, 'Destinataire indisponible.');
  const target = candidates.docs[0], id = notificationHash(initial.clubId, uid, input.requestId), ref = db.doc(`messages/${id}`);
  const fingerprint = notificationHash(String(input.to), input.text, input.file || '');
  const result = await db.runTransaction(async tx => {
    const actor = await notificationActor(db, uid, tx);
    if (actor.clubId !== initial.clubId) fail(403, 'Votre espace a changé.');
    const [recipientDoc, previous] = await Promise.all([tx.get(target.ref), tx.get(ref)]), recipient = recipientDoc.data();
    if (!recipient || recipient.clubId !== actor.clubId || recipient.isSuspended === true || target.id === uid) fail(403, 'Conversation non autorisée.');
    const member = actor.profile.role === 'member' ? actor.profile : recipient.role === 'member' ? recipient : null;
    const staff = actor.profile.role === 'member' ? recipient : actor.profile;
    const staffUid = actor.profile.role === 'member' ? target.id : uid;
    const canonicalOwner = actor.club.accountType !== 'studio' && actor.club.ownerId === staffUid && staff.role === 'owner';
    const assignedCoach = staff.role === 'coach' && member?.assignedCoachUid === staffUid;
    // Managers/Studio Owners may operate planning, never intercept private coaching conversations.
    if (!member || !canonicalOwner && !assignedCoach) fail(403, 'Conversation non autorisée.');
    if (previous.exists) {
      if (previous.data()?.requestFingerprint !== fingerprint) fail(409, 'Ce message a déjà été envoyé avec un autre contenu.');
      return { success: true, id, recipientUid: target.id, clubId: actor.clubId, alreadySent: true };
    }
    tx.create(ref, { id, messageVersion: 2, clubId: actor.clubId, senderUid: uid, recipientUid: target.id,
      from: actor.profile.id, to: recipient.id, assignedCoachUid: assignedCoach ? staffUid : null,
      text: input.text.trim() || 'Fichier joint', file: input.file || null, date: new Date().toISOString(), read: false, requestFingerprint: fingerprint });
    enqueueNotification(tx, db, { clubId: actor.clubId, recipientUid: target.id, actorUid: uid, type: 'MESSAGE_RECEIVED', eventKey: `message:${id}`,
      destination: { velatraPage: 'chat', conversationMemberId: actor.profile.role === 'member' ? actor.profile.id : member.id }, sourceId: id, sourceType: 'message' });
    return { success: true, id, recipientUid: target.id, clubId: actor.clubId, alreadySent: false };
  });
  await dispatchPendingPush(db, result.clubId, result.recipientUid);
  return { success: result.success, id: result.id, alreadySent: result.alreadySent };
}
export function registerMessages(app: Express, db: Firestore) {
  app.post('/api/messages', async (req, res) => {
    try { res.json(await sendMessage(db, req.auth.uid, req.body)); }
    catch (error: any) { res.status(error instanceof MemberCreationError ? error.status : 500).json({ error: error instanceof MemberCreationError ? error.message : 'Message non envoyé. Votre texte est conservé.' }); }
  });
}
