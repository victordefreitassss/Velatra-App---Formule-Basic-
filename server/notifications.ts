import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import type { Express } from 'express';
import { MemberCreationError } from './createMember.ts';
import { defaultPreferences, notificationCategories, safeNotificationDestination, type NotificationCategory, type NotificationV2 } from '../notifications/model.ts';
const fail = (status: number, message: string): never => { throw new MemberCreationError(status, message); };
export const notificationHash = (...parts: string[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export const notificationInbox = (db: Firestore, clubId: string, uid: string) => db.doc(`notificationInboxes/${notificationHash(clubId, uid)}`);
const safeId = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
export async function notificationActor(db: Firestore, uid: string, tx?: Transaction) {
  if (!safeId(uid)) fail(403, 'Session invalide.');
  const get = (path: string) => tx ? tx.get(db.doc(path)) : db.doc(path).get();
  const profile = (await get(`users/${uid}`)).data();
  if (!profile?.clubId || profile.isSuspended === true || !['owner', 'manager', 'coach', 'member'].includes(profile.role)) fail(403, 'Accès aux notifications refusé.');
  const club = (await get(`clubs/${profile.clubId}`)).data();
  if (!club || club.isActive === false || profile.role === 'manager' && club.accountType !== 'studio' || profile.role === 'owner' && club.ownerId !== uid) fail(403, 'Votre espace est indisponible.');
  return { uid, profile, club, clubId: String(profile.clubId) };
}
const copy: Record<string, [NotificationCategory, string, string]> = {
  MESSAGE_RECEIVED: ['MESSAGE', 'Nouveau message', 'Un nouveau message vous attend dans Velatra.'],
  BOOKING_CREATED: ['PLANNING', 'Nouvelle séance planifiée', 'Votre planning a été mis à jour.'],
  BOOKING_RESCHEDULED: ['PLANNING', 'Séance déplacée', 'Consultez votre nouvel horaire dans Velatra.'],
  BOOKING_CANCELLED: ['PLANNING', 'Séance annulée', 'Votre planning a été mis à jour.'],
  TRIAL_BOOKED: ['SALES', 'Nouvelle séance d’essai', 'Une séance d’essai vous a été affectée.'],
  FOLLOWUP_ASSIGNED: ['FOLLOWUP', 'Nouveau bilan disponible', 'Un bilan vous attend dans votre espace coaching.'],
  FOLLOWUP_RESPONDED: ['FOLLOWUP', 'Bilan reçu', 'Une nouvelle réponse est disponible dans Velatra.'],
};
// Called after all transaction reads, in the SAME transaction as the business mutation.
export function enqueueNotification(tx: Transaction, db: Firestore, input: { clubId: string; recipientUid: string; actorUid?: string; type: keyof typeof copy; eventKey: string; destination: NotificationV2['destination']; sourceId: string; sourceType: string }) {
  if (!safeId(input.recipientUid) || input.recipientUid === input.actorUid) return;
  const text = copy[input.type], destination = safeNotificationDestination(input.destination);
  if (!text || !destination) throw new Error('Invalid notification event');
  const inbox = notificationInbox(db, input.clubId, input.recipientUid), id = notificationHash(input.clubId, input.eventKey, input.recipientUid);
  const value: NotificationV2 = { id, clubId: input.clubId, recipientUid: input.recipientUid, category: text[0], type: input.type,
    title: text[1], body: text[2], destination, eventKey: input.eventKey, sourceId: input.sourceId, sourceType: input.sourceType,
    createdAt: new Date().toISOString(), readAt: null, priority: 'normal', pushEligible: true };
  tx.create(inbox.collection('items').doc(id), { ...value, pushState: 'pending' });
  tx.set(inbox, { uid: input.recipientUid, clubId: input.clubId, unreadCount: FieldValue.increment(1) }, { merge: true });
}
export type PushTransport = (token: string, data: Record<string, string>) => Promise<void>;
const realPush: PushTransport = async (token, data) => {
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.CI || process.env.NODE_ENV === 'test') return;
  await getMessaging().send({ token, data, webpush: { headers: { TTL: '3600', Urgency: 'normal' } } });
};
// At most one send attempt per notification/device. No automatic reminders or retry spam.
export async function dispatchPendingPush(db: Firestore, clubId: string, uid: string, transport: PushTransport = realPush) {
  try {
    const actor = await notificationActor(db, uid);
    if (actor.clubId !== clubId) return;
    const inbox = notificationInbox(db, clubId, uid);
    const prefs: ReturnType<typeof defaultPreferences> & { pushEnabledAt?: string } = { ...defaultPreferences(), ...(await db.doc(`notificationPreferences/${inbox.id}`).get()).data() };
    const pending = await inbox.collection('items').where('pushState', '==', 'pending').limit(20).get();
    const devices = await db.collection(`pushDevices/${inbox.id}/devices`).where('enabled', '==', true).limit(30).get();
    for (const item of pending.docs) {
      const claimed = await db.runTransaction(async tx => {
        const current = (await tx.get(item.ref)).data();
        if (current?.pushState !== 'pending') return null;
        tx.update(item.ref, { pushState: 'attempted' });
        return current;
      });
      if (!claimed || prefs.pushEnabledAt && claimed.createdAt < prefs.pushEnabledAt || !prefs.pushEnabled || !prefs.categories?.[claimed.category] || !claimed.pushEligible || actor.profile.role === 'member' && claimed.category === 'SALES') continue;
      let failed = false;
      for (const device of devices.docs) {
        const info = device.data();
        if (info.uid !== uid || info.clubId !== clubId) continue;
        try { await transport(info.token, { kind: 'velatra-notification-v2', notificationId: item.id, title: 'Velatra', body: 'Une nouvelle notification vous attend dans Velatra.' }); }
        catch (error: any) {
          failed = true;
          if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error?.code)) {
            await db.runTransaction(async tx => { const current = (await tx.get(device.ref)).data(); if (current?.token === info.token) tx.update(device.ref, { enabled: false, invalidatedAt: new Date().toISOString() }); });
          }
        }
      }
      await item.ref.update({ pushState: failed ? 'failed' : 'sent' });
    }
  } catch { /* Optional delivery must never roll back the business action; no token logging. */ }
}
export async function setNotificationRead(db: Firestore, uid: string, id: string, read: boolean) {
  if (!safeId(id)) fail(400, 'Notification invalide.');
  return db.runTransaction(async tx => {
    const actor = await notificationActor(db, uid, tx), inbox = notificationInbox(db, actor.clubId, uid), ref = inbox.collection('items').doc(id);
    const doc = await tx.get(ref), counter = await tx.get(inbox), value = doc.data();
    if (!value || value.recipientUid !== uid || value.clubId !== actor.clubId) fail(404, 'Notification introuvable.');
    if (Boolean(value.readAt) !== read) {
      tx.update(ref, { readAt: read ? new Date().toISOString() : null });
      tx.set(inbox, { unreadCount: Math.max(0, Number(counter.data()?.unreadCount || 0) + (read ? -1 : 1)) }, { merge: true });
    }
    return { success: true };
  });
}
const publicNotification = (row: any) => Object.fromEntries(['id', 'clubId', 'recipientUid', 'category', 'type', 'title', 'body', 'destination', 'sourceType', 'sourceId', 'eventKey', 'createdAt', 'readAt', 'priority', 'pushEligible'].filter(key => row[key] !== undefined).map(key => [key, row[key]]));
export function registerNotifications(app: Express, db: Firestore) {
  const route = (handler: (req: any, actor: Awaited<ReturnType<typeof notificationActor>>) => Promise<any>) => async (req: any, res: any) => {
    try { res.json(await handler(req, await notificationActor(db, req.auth.uid))); }
    catch (error: any) { res.status(error instanceof MemberCreationError ? error.status : 500).json({ error: error instanceof MemberCreationError ? error.message : 'Les notifications sont indisponibles. Réessayez.' }); }
  };
  // Narrow booking resolver for notification destinations, including a new session provider
  // who does not own the member's private coaching portfolio.
  app.get('/api/notifications/bookings/:bookingId', route(async (req, actor) => {
    if (!safeId(req.params.bookingId)) fail(400, 'Réservation invalide.');
    const row = (await db.doc(`bookings/${req.params.bookingId}`).get()).data();
    if (!row || row.clubId !== actor.clubId || !['coaching', 'trial'].includes(row.type)) fail(404, 'Réservation introuvable.');
    const owned = actor.profile.role === 'member' ? row.type === 'coaching' && (row.memberUid ? row.memberUid === actor.uid : Number(row.memberId) === Number(actor.profile.id))
      : actor.profile.role === 'coach' ? (row.coachUid ? row.coachUid === actor.uid : [actor.uid, String(actor.profile.id)].includes(String(row.coachId))) : true;
    if (!owned) fail(403, 'Cette réservation ne vous est pas destinée.');
    const keys = ['id', 'clubId', 'memberId', 'memberUid', 'coachId', 'coachUid', 'startTime', 'endTime', 'status', 'type', 'sessionTypeId', 'creditDebited', 'attendanceStatus'];
    return { booking: { ...Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, row[key]])), id: req.params.bookingId } };
  }));
  app.get('/api/notifications/unread-count', route(async (_req, actor) => ({ count: Number((await notificationInbox(db, actor.clubId, actor.uid).get()).data()?.unreadCount || 0) })));
  app.get('/api/notifications', route(async (req, actor) => {
    const inbox = notificationInbox(db, actor.clubId, actor.uid), limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
    if (req.query.legacy === 'true') {
      const snapshot = await db.collection('notifications').where('userId', '==', actor.profile.id).limit(50).get();
      const items = snapshot.docs.filter(d => d.data().clubId === actor.clubId).slice(0, 20).map(d => ({ id: d.id, title: d.data().title || 'Notification', body: d.data().message || '', createdAt: d.data().createdAt, readAt: d.data().read ? d.data().createdAt : null }));
      return { items, nextCursor: null, legacy: true };
    }
    let query = inbox.collection('items').orderBy('createdAt', 'desc').orderBy('__name__', 'desc').limit(limit + 1);
    if (req.query.unread === 'true') query = query.where('readAt', '==', null); // local subcollection composite index documented below
    if (req.query.cursor) {
      if (!safeId(req.query.cursor)) fail(400, 'Page invalide.');
      const last = await inbox.collection('items').doc(req.query.cursor).get();
      if (!last.exists) fail(400, 'Page invalide.');
      query = query.startAfter(last);
    }
    const rows = (await query.get()).docs;
    return { items: rows.slice(0, limit).map(d => publicNotification(d.data())), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  }));
  app.post('/api/notifications/read-all', route(async (_req, actor) => {
    const inbox = notificationInbox(db, actor.clubId, actor.uid);
    // Bounded batches; repeat until no unread items remain. Each batch is atomic with its counter.
    for (let batch = 0; batch < 20; batch++) {
      const count = await db.runTransaction(async tx => {
        const currentActor = await notificationActor(db, actor.uid, tx);
        if (currentActor.clubId !== actor.clubId) fail(403, 'Votre espace a changé.');
        const snapshot = await tx.get(inbox.collection('items').where('readAt', '==', null).limit(200));
        const counter = await tx.get(inbox);
        snapshot.docs.forEach(d => tx.update(d.ref, { readAt: new Date().toISOString() }));
        tx.set(inbox, { unreadCount: Math.max(0, Number(counter.data()?.unreadCount || 0) - snapshot.size) }, { merge: true });
        return snapshot.size;
      });
      if (count < 200) return { success: true };
    }
    return { success: true, more: true };
  }));
  app.get('/api/notifications/preferences', route(async (_req, actor) => ({ ...defaultPreferences(), ...(await db.doc(`notificationPreferences/${notificationInbox(db, actor.clubId, actor.uid).id}`).get()).data() })));
  app.put('/api/notifications/preferences', route(async (req, actor) => {
    const base = defaultPreferences(), body = req.body || {};
    if (typeof body.pushEnabled !== 'boolean' || !body.categories || notificationCategories.some(key => typeof body.categories[key] !== 'boolean')) fail(400, 'Préférences invalides.');
    base.pushEnabled = body.pushEnabled;
    notificationCategories.forEach(key => base.categories[key] = key === 'SALES' && actor.profile.role === 'member' ? false : body.categories[key]);
    const ref = db.doc(`notificationPreferences/${notificationInbox(db, actor.clubId, actor.uid).id}`);
    await db.runTransaction(async tx => {
      const current = await notificationActor(db, actor.uid, tx);
      if (current.clubId !== actor.clubId) fail(403, 'Votre espace a changé.');
      const previous = (await tx.get(ref)).data();
      tx.set(ref, { ...base, pushEnabledAt: base.pushEnabled && !previous?.pushEnabled ? new Date().toISOString() : previous?.pushEnabledAt || null });
    });
    return base;
  }));
  app.get('/api/notifications/devices', route(async (_req, actor) => ({ devices: (await db.collection(`pushDevices/${notificationInbox(db, actor.clubId, actor.uid).id}/devices`).limit(30).get()).docs.map(d => ({ deviceId: d.id, platform: d.data().platform, enabled: d.data().enabled, lastSeenAt: d.data().lastSeenAt })) })));
  app.post('/api/notifications/devices', route(async (req, actor) => {
    const { deviceId, token, platform } = req.body || {};
    if (!safeId(deviceId) || typeof token !== 'string' || token.length < 20 || token.length > 4096 || !/^[a-zA-Z0-9_:\-]+$/.test(token) || !['web', 'ios', 'android'].includes(platform)) fail(400, 'Appareil invalide.');
    const inbox = notificationInbox(db, actor.clubId, actor.uid), ref = db.doc(`pushDevices/${inbox.id}/devices/${deviceId}`), tokenRef = db.doc(`pushTokenOwners/${notificationHash(token)}`);
    await db.runTransaction(async tx => {
      const current = await notificationActor(db, actor.uid, tx);
      if (current.clubId !== actor.clubId) fail(403, 'Votre espace a changé.');
      const [old, owner, devices] = await Promise.all([tx.get(ref), tx.get(tokenRef), tx.get(db.collection(`pushDevices/${inbox.id}/devices`).limit(30))]);
      if (!old.exists && devices.size >= 30) fail(409, 'Limite d’appareils atteinte.');
      const previousOwnerRef = old.data()?.token && old.data()?.token !== token ? db.doc(`pushTokenOwners/${notificationHash(old.data()!.token)}`) : null;
      const previousOwner = previousOwnerRef ? await tx.get(previousOwnerRef) : null;
      const oldPath = owner.data()?.path;
      if (oldPath && oldPath !== ref.path) tx.update(db.doc(oldPath), { enabled: false });
      if (previousOwnerRef && previousOwner?.data()?.path === ref.path) tx.delete(previousOwnerRef);
      const at = new Date().toISOString();
      tx.set(ref, { uid: actor.uid, clubId: actor.clubId, token, platform, enabled: true, createdAt: old.data()?.createdAt || at, lastSeenAt: at });
      tx.set(tokenRef, { path: ref.path });
    });
    return { success: true, deviceId };
  }));
  app.delete('/api/notifications/devices/:deviceId', route(async (req, actor) => {
    if (!safeId(req.params.deviceId)) fail(400, 'Appareil invalide.');
    const ref = db.doc(`pushDevices/${notificationInbox(db, actor.clubId, actor.uid).id}/devices/${req.params.deviceId}`);
    await db.runTransaction(async tx => {
      const current = await notificationActor(db, actor.uid, tx);
      if (current.clubId !== actor.clubId) fail(403, 'Votre espace a changé.');
      if ((await tx.get(ref)).exists) tx.update(ref, { enabled: false });
    });
    return { success: true };
  }));
  app.get('/api/notifications/:id', route(async (req, actor) => {
    if (!safeId(req.params.id)) fail(400, 'Notification invalide.');
    const item = await notificationInbox(db, actor.clubId, actor.uid).collection('items').doc(req.params.id).get();
    if (!item.exists || item.data()?.recipientUid !== actor.uid || item.data()?.clubId !== actor.clubId) fail(404, 'Notification introuvable.');
    return publicNotification(item.data());
  }));
  for (const action of ['read', 'unread']) app.post(`/api/notifications/:id/${action}`, route(async (req, actor) => setNotificationRead(db, actor.uid, req.params.id, action === 'read')));
}
