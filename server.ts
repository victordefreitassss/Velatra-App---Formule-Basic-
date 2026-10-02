import { registerSales } from './server/sales.ts';
import { salesEvent } from './server/salesEvents.ts';
import { createStaffAccount } from './server/teamManagement.ts';
import { registerClub, ClubRegistrationError } from './server/clubRegistration.ts';
import { authorizationActor, canReadStripeStatus, canAssignMembers, canManageStripe, canPerformDestructiveClubActions, canDeleteUser } from './server/authorization.ts';
import { completeWorkout } from './server/completeWorkout.ts';
import { registerBillingWebhooks } from './server/stripePayments.ts';
import { billingContext, registerBillingRoutes } from './server/billing.ts';
import { reserveBooking, cancelBooking, rescheduleBooking, bookingAvailability, createTrialBooking } from './server/bookings.ts';
import express from "express";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { createManagedMember, MemberCreationError } from "./server/createMember.ts";
import { convertProspect } from "./server/convertProspect.ts";
import { legacyProspectNumericId } from './server/prospectIdentity.ts';
import { resolveMemberCoachingContact } from "./server/memberCoachingContact.ts";
import { randomInt } from "node:crypto";
import { validateMemberRegistration } from "./server/memberRegistration.ts";
import { validatePublicProspect } from "./server/prospectValidation.ts";
import { validatePublicContact } from "./server/contactValidation.ts";
import { calculateCheckInReward, parseDailyCheckInInput } from "./server/memberDailyCheckIn.ts";
import { parseAIConversation } from "./server/aiConversation.ts";
import { registerRetention } from './server/retention.ts';
import { registerPulse } from './server/pulse.ts';
import { registerCoachingFollowup } from './server/coachingFollowup.ts';

declare global {
  namespace Express {
    interface Request {
      auth?: any;
      profile?: any;
      authorizationActor?: ReturnType<typeof authorizationActor>;
    }
  }
}

// Keep the existing Admin SDK call sites readable while using the modular API
// required by Firebase Admin SDK 14.
const admin = {
  get apps() { return getApps(); },
  initializeApp,
  credential: { cert },
  auth: () => getAuth(),
  firestore: () => getFirestore()
};

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT as string) || 3000;
const geminiRequestsByUser = new Map<string, number[]>();
const prospectRequestsByIp = new Map<string, number[]>();

// Initialize Firebase Admin first because webhook will need it
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    // Handle potential escaping issues with Vercel environment variables
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    const serviceAccount = JSON.parse(serviceAccountStr);
    
    // Fix private key newlines if they were escaped by the environment
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully.");
    }
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing. Attempting default credentials initialization.");
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials.");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin with default credentials:", error);
  }
}

// ==========================================
// Stripe Webhook (MUST be before express.json)
// ==========================================
registerBillingWebhooks(app, admin.firestore());

app.use(express.json());

app.post('/api/public/contact', async (req: any, res: any) => {
  const contact = validatePublicContact(req.body);
  if (!contact) return res.status(400).json({ error: "Vérifiez votre adresse e-mail et le contenu du message." });
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: "Le formulaire de contact est temporairement indisponible. Écrivez-nous par e-mail." });
  }

  const now = Date.now();
  const ip = String(req.ip || 'unknown').slice(0, 80);
  const recent = (prospectRequestsByIp.get(ip) || []).filter((timestamp) => now - timestamp < 10 * 60_000);
  if (recent.length >= 5) return res.status(429).json({ error: "Trop de demandes ont été envoyées. Réessayez un peu plus tard." });
  if (prospectRequestsByIp.size > 5000) {
    for (const [knownIp, timestamps] of prospectRequestsByIp) {
      if (!timestamps.some((timestamp) => now - timestamp < 10 * 60_000)) prospectRequestsByIp.delete(knownIp);
    }
  }
  recent.push(now);
  prospectRequestsByIp.set(ip, recent);

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char] as string));
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br>');
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Velatra" <noreply@velatra.app>',
      to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
      replyTo: contact.email,
      subject: `[Velatra] ${contact.subject}`,
      text: `De : ${contact.name} <${contact.email}>\nSujet : ${contact.subject}\n\n${contact.message}`,
      html: `<h2>Demande de contact Velatra</h2><p><strong>Nom :</strong> ${escapeHtml(contact.name)}</p><p><strong>E-mail :</strong> ${escapeHtml(contact.email)}</p><p><strong>Sujet :</strong> ${escapeHtml(contact.subject)}</p><p>${safeMessage}</p>`
    });
    return res.status(202).json({ success: true });
  } catch (error: any) {
    console.error('Public contact email failed', { code: error?.code || 'unknown' });
    return res.status(503).json({ error: "Le message n'a pas pu être envoyé. Réessayez plus tard ou contactez-nous par e-mail." });
  }
});

app.post('/api/public/prospects', async (req: any, res: any) => {
  try {
    const submission = validatePublicProspect(req.body);
    if (!submission) return res.status(400).json({ error: "Vérifiez les informations du formulaire et réessayez." });
    if (!admin.apps.length) return res.status(503).json({ error: "Le formulaire est temporairement indisponible." });

    const now = Date.now();
    const ip = String(req.ip || 'unknown').slice(0, 80);
    const recent = (prospectRequestsByIp.get(ip) || []).filter((timestamp) => now - timestamp < 10 * 60_000);
    if (recent.length >= 5) return res.status(429).json({ error: "Trop de demandes ont été envoyées. Réessayez un peu plus tard." });
    if (prospectRequestsByIp.size > 5000) {
      for (const [knownIp, timestamps] of prospectRequestsByIp) {
        if (!timestamps.some((timestamp) => now - timestamp < 10 * 60_000)) prospectRequestsByIp.delete(knownIp);
      }
    }
    recent.push(now);
    prospectRequestsByIp.set(ip, recent);

    const club = await admin.firestore().collection('clubs').doc(submission.clubId).get();
    if (!club.exists) return res.status(404).json({ error: "Ce code de club n'existe pas." });
    const prospectRef = admin.firestore().collection('prospects').doc();
    const batch = admin.firestore().batch();
    const prospectData = {
      id: legacyProspectNumericId(prospectRef.id),
      clubId: submission.clubId,
      name: submission.name,
      email: submission.email,
      phone: submission.answers.phone || '',
      date: new Date(now).toISOString(),
      status: 'pending',
      answers: submission.answers, salesVersion: 2,
      ...(typeof submission.answers.source === 'string' ? { source: submission.answers.source.slice(0, 80) } : {})
    };
    const leadEvent = salesEvent(admin.firestore(), `lead:${prospectRef.id}`, 'LEAD_CREATED', prospectRef.id, prospectData, prospectData.date);
    batch.create(prospectRef, prospectData); batch.create(leadEvent.ref, leadEvent.data);
    await batch.commit();
    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('Public prospect submission failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "La demande n'a pas pu être envoyée. Réessayez." });
  }
});

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const verifyFirebaseSession = async (req: any, res: any, next: any) => {
  try {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i) : null;
    if (!match || !admin.apps.length) {
      return res.status(401).json({ error: "Authentification requise." });
    }

    req.auth = await admin.auth().verifyIdToken(match[1]);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
};

const requireUserProfile = async (req: any, res: any, next: any) => {
  try {
    const userSnapshot = await admin.firestore().collection('users').doc(req.auth.uid).get();
    if (!userSnapshot.exists) {
      return res.status(403).json({ error: "Profil utilisateur introuvable." });
    }
    req.profile = userSnapshot.data();
    if (req.profile?.isSuspended === true) return res.status(403).json({ error: 'Compte suspendu.' });
    const club = req.profile?.role === 'manager' && req.profile.clubId
      ? (await admin.firestore().doc(`clubs/${req.profile.clubId}`).get()).data() : undefined;
    if (req.profile?.role === 'manager' && club?.accountType !== 'studio') return res.status(403).json({ error: 'Manager nécessite un Studio explicite.' });
    req.authorizationActor = authorizationActor(req.profile, club,
      req.auth.email_verified === true && req.auth.email === 'victor.defreitas.pro@gmail.com');
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Impossible de charger le profil utilisateur." });
  }
};

const MEMBER_SCOPED_COLLECTIONS: Array<[string, string]> = [
  ['programs', 'memberId'], ['archivedPrograms', 'memberId'], ['performances', 'memberId'],
  ['logs', 'memberId'], ['bodyData', 'memberId'], ['nutritionPlans', 'memberId'],
  ['nutritionLogs', 'userId'], ['subscriptions', 'memberId'], ['payments', 'memberId'], ['invoices', 'memberId'],
  ['supplementOrders', 'adherentId'], ['progressPhotos', 'memberId'],
  ['bookings', 'memberId'], ['notifications', 'userId'], ['messages', 'from,to']
];

async function syncMemberRecordCoachUid(db: Firestore, clubId: string, memberIds: number[], coachUid: string | null) {
  if (!memberIds.length) return 0;
  const writer = db.bulkWriter();
  let updated = 0;
  const assignmentValue = coachUid ? coachUid : FieldValue.delete();
  for (const [collectionName, ownerField] of MEMBER_SCOPED_COLLECTIONS) {
    for (let offset = 0; offset < memberIds.length; offset += 30) {
      const idChunk = memberIds.slice(offset, offset + 30);
      const queryFields = ownerField === 'from,to' ? ['from', 'to'] : [ownerField];
      const snapshots = await Promise.all(queryFields.map(field => db.collection(collectionName)
        .where('clubId', '==', clubId)
        .where(field, 'in', idChunk)
        .get()));
      const documents = new Map(snapshots.flatMap(snapshot => snapshot.docs).map(document => [document.id, document]));
      documents.forEach(document => {
        if (document.data().assignedCoachUid === coachUid) return;
        writer.update(document.ref, { assignedCoachUid: assignmentValue });
        updated += 1;
      });
    }
  }
  await writer.close();
  return updated;
}

// A new club owner has a Firebase session before their server-side profile exists.
app.post("/api/register-club", verifyFirebaseSession, async (req: any, res: any) => {
  try {
    const result = await registerClub(admin.firestore(), req.auth, req.body, process.env.CLUB_INVITE_CODE);
    return res.json(result);
  } catch (error: any) {
    if (error instanceof ClubRegistrationError) return res.status(error.status).json({ error: error.message });
    console.error("Error registering club:", error);
    return res.status(500).json({ error: "La création du club a échoué. Réessayez." });
  }
});

app.post("/api/bootstrap-superadmin", verifyFirebaseSession, async (req: any, res: any) => {
  try {
    if (req.auth.email !== 'victor.defreitas.pro@gmail.com' || req.auth.email_verified !== true) {
      return res.status(403).json({ error: "Compte administrateur non autorisé." });
    }
    const db = admin.firestore();
    const targetRef = db.collection('users').doc(req.auth.uid);
    const existing = await targetRef.get();
    if (existing.exists) {
      await targetRef.update({ role: 'superadmin', firebaseUid: req.auth.uid, email: req.auth.email });
      return res.json({ success: true });
    }

    const legacyProfiles = await db.collection('users').where('email', '==', req.auth.email).limit(1).get();
    const profile = legacyProfiles.empty ? null : legacyProfiles.docs[0].data();
    let clubId = profile?.clubId;
    if (!clubId) {
      const clubs = await db.collection('clubs').limit(1).get();
      if (clubs.empty) {
        clubId = 'CLUB123';
        await db.collection('clubs').doc(clubId).set({ id: clubId, name: 'Mon Club', ownerId: req.auth.uid });
      } else {
        clubId = clubs.docs[0].id;
      }
    }

    await targetRef.set({
      ...(profile || {}),
      id: Number(profile?.id) || Date.now(),
      clubId,
      name: profile?.name || 'Victor De Freitas',
      email: req.auth.email,
      role: 'superadmin',
      avatar: profile?.avatar || 'VD',
      firebaseUid: req.auth.uid,
      createdAt: profile?.createdAt || new Date().toISOString()
    });
    if (!legacyProfiles.empty && legacyProfiles.docs[0].id !== req.auth.uid) {
      await legacyProfiles.docs[0].ref.delete();
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Superadmin bootstrap failed:', error.message);
    return res.status(500).json({ error: "Impossible d'initialiser le compte administrateur." });
  }
});

// Public member registration still requires a valid Firebase identity, but the
// profile and its numeric application ID are created only by this trusted API.
app.post("/api/register-member", verifyFirebaseSession, async (req: any, res: any) => {
  try {
    if (!admin.apps.length) {
      return res.status(503).json({ error: "L'inscription est temporairement indisponible." });
    }

    const input = validateMemberRegistration(req.body);
    if (!input) {
      return res.status(400).json({ error: "Vérifiez les informations saisies et réessayez." });
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(req.auth.uid);
    const clubRef = db.collection('clubs').doc(input.clubId);
    const [account, clubSnapshot, profileSnapshot] = await Promise.all([
      admin.auth().getUser(req.auth.uid),
      clubRef.get(),
      userRef.get()
    ]);
    const email = String(account.email || '').trim().toLowerCase();
    if (!email || email !== String(req.auth.email || '').trim().toLowerCase()) {
      return res.status(403).json({ error: "L'adresse e-mail du compte n'a pas pu être vérifiée." });
    }
    if (!clubSnapshot.exists) {
      return res.status(404).json({ error: "Ce code de club n'existe pas." });
    }
    if (profileSnapshot.exists) {
      const existing = profileSnapshot.data();
      if (existing?.role === 'member' && existing?.clubId === input.clubId) {
        return res.json({ success: true, alreadyRegistered: true });
      }
      return res.status(409).json({ error: "Un profil existe déjà pour ce compte." });
    }

    const displayName = input.name;
    let memberId: number | null = null;
    const profile = {
      clubId: input.clubId,
      code: email.split('@')[0].slice(0, 40),
      pwd: '',
      name: displayName,
      email,
      role: 'member',
      avatar: displayName.substring(0, 2).toUpperCase(),
      gender: input.gender,
      age: input.age,
      weight: input.weight,
      height: input.height,
      objectifs: input.objectifs,
      notes: input.notes,
      experienceLevel: input.experienceLevel,
      trainingDays: input.trainingDays,
      sessionDuration: input.sessionDuration,
      equipment: input.equipment,
      injuries: input.injuries,
      createdAt: new Date().toISOString(),
      xp: 0,
      streak: 0,
      pointsFidelite: 0,
      firebaseUid: req.auth.uid
    };

    await db.runTransaction(async (transaction) => {
      const latest = await transaction.get(userRef);
      if (latest.exists) throw new Error('PROFILE_ALREADY_EXISTS');
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidateId = randomInt(1_000_000_000_000, 2_000_000_000_000);
        const collision = await transaction.get(db.collection('users').where('id', '==', candidateId).limit(1));
        if (collision.empty) {
          memberId = candidateId;
          transaction.create(userRef, { ...profile, id: candidateId });
          return;
        }
      }
      throw new Error('MEMBER_ID_ALLOCATION_FAILED');
    });
    return res.status(201).json({ success: true, memberId });
  } catch (error: any) {
    if (error?.message === 'PROFILE_ALREADY_EXISTS') {
      return res.status(409).json({ error: "Un profil existe déjà pour ce compte." });
    }
    console.error('Member registration failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "L'inscription a échoué. Réessayez dans quelques instants." });
  }
});

// All remaining API routes require a verified session and a server-side profile.
app.use("/api", verifyFirebaseSession, requireUserProfile);
registerCoachingFollowup(app, admin.firestore());
registerPulse(app, admin.firestore());
registerSales(app, admin.firestore());
registerRetention(app, admin.firestore());
registerBillingRoutes(app, admin.firestore());

app.get('/api/bookings/availability', async (req, res) => {
  try { return res.json(await bookingAvailability(admin.firestore(), req.auth.uid, String(req.query.date || ''))); }
  catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Booking availability failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: 'Les places disponibles ne peuvent pas être vérifiées actuellement.' });
  }
});

app.post('/api/bookings/trial', async (req, res) => {
  try { return res.json(await createTrialBooking(admin.firestore(), req.auth.uid, req.body)); }
  catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Trial booking failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: 'La séance d’essai n’a pas pu être planifiée.' });
  }
});

for (const action of ['reserve', 'cancel', 'reschedule'] as const) {
  app.post(`/api/bookings/${action}`, async (req, res) => {
    try {
      const result = action === 'reserve'
        ? await reserveBooking(admin.firestore(), req.auth.uid, req.body)
        : action === 'reschedule'
          ? await rescheduleBooking(admin.firestore(), req.auth.uid, req.body)
          : await cancelBooking(admin.firestore(), req.auth.uid, String(req.body?.id || ''));
      return res.json(result);
    } catch (error: any) {
      if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
      console.error('Booking operation failed', { code: error?.code || 'unknown' });
      return res.status(500).json({ error: 'La réservation n’a pas pu être mise à jour. Rechargez le planning avant de réessayer.' });
    }
  });
}

app.post('/api/create-member', async (req: any, res: any) => {
  try {
    return res.json(await createManagedMember(admin.auth(), admin.firestore(), req.auth.uid, req.body));
  } catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Member creation failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "La création n’a pas pu aboutir. Rechargez la liste des adhérents avant de réessayer." });
  }
});

app.post('/api/prospects/:id/convert', async (req: any, res: any) => {
  try { return res.json(await convertProspect(admin.auth(), admin.firestore(), req.auth.uid, String(req.params.id), req.body)); }
  catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Prospect conversion failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: 'La conversion ne peut pas être confirmée. Réessayez sans créer un autre prospect.' });
  }
});

app.post('/api/workouts/complete', async (req: any, res: any) => {
  try { return res.json(await completeWorkout(admin.firestore(), req.auth.uid, req.body)); }
  catch (error: any) {
    return res.status(error instanceof MemberCreationError ? error.status : 500).json({ error: error instanceof MemberCreationError ? error.message : 'La séance n’a pas pu être enregistrée. Réessayez.' });
  }
});

// Old clients must reload; accepting an arbitrary Auth UID allowed account claiming.
app.post('/api/create-member-profile', (_req, res) => {
  res.status(410).json({ error: 'Rechargez Velatra pour utiliser la nouvelle création d’adhérent.' });
});

app.get('/api/member/assigned-coach', async (req: any, res: any) => {
  if (req.profile?.role !== 'member' || !req.profile?.clubId) {
    return res.status(403).json({ error: "Cette action est réservée aux adhérents." });
  }
  try {
    return res.json({ coach: await resolveMemberCoachingContact(admin.firestore(), req.profile) });
  } catch (error: any) {
    console.error('Assigned member coach lookup failed:', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "Impossible de charger les coordonnées de votre coach." });
  }
});

app.get('/api/member/daily-checkin/today', async (req: any, res: any) => {
  if (req.profile?.role !== 'member') {
    return res.status(403).json({ error: "Cette action est réservée aux adhérents." });
  }
  if (!admin.apps.length) return res.status(503).json({ error: "Le suivi quotidien est temporairement indisponible." });

  const today = new Date().toISOString().slice(0, 10);
  try {
    const snapshot = await admin.firestore().collection('dailyCheckIns').doc(`${req.auth.uid}_${today}`).get();
    if (!snapshot.exists) return res.json({ checkIn: null });
    const data = snapshot.data() || {};
    if (data.userUid !== req.auth.uid || data.clubId !== req.profile.clubId) {
      return res.status(404).json({ error: "Le suivi du jour est introuvable." });
    }
    return res.json({
      checkIn: {
        date: data.date,
        waterLitres: data.waterLitres,
        sleepHours: data.sleepHours,
        proteinTargetMet: data.proteinTargetMet,
        mood: data.mood
      }
    });
  } catch (error: any) {
    console.error('Daily check-in read failed:', error?.code || 'unknown');
    return res.status(500).json({ error: "Impossible de charger le suivi du jour." });
  }
});

app.post('/api/member/daily-checkin', async (req: any, res: any) => {
  if (req.profile?.role !== 'member') {
    return res.status(403).json({ error: "Cette action est réservée aux adhérents." });
  }
  if (!admin.apps.length) return res.status(503).json({ error: "Le suivi quotidien est temporairement indisponible." });

  const input = parseDailyCheckInInput(req.body);
  if (!input) return res.status(400).json({ error: "Vérifiez l'eau, le sommeil, l'objectif protéines et l'humeur." });

  const today = new Date().toISOString().slice(0, 10);
  const db = admin.firestore();
  const profileRef = db.collection('users').doc(req.auth.uid);
  const checkInRef = db.collection('dailyCheckIns').doc(`${req.auth.uid}_${today}`);
  try {
    const result = await db.runTransaction(async (transaction) => {
      const [profileSnapshot, checkInSnapshot] = await Promise.all([
        transaction.get(profileRef),
        transaction.get(checkInRef)
      ]);
      if (!profileSnapshot.exists || profileSnapshot.data()?.role !== 'member' || profileSnapshot.data()?.clubId !== req.profile.clubId) {
        throw new Error('MEMBER_PROFILE_CHANGED');
      }
      if (checkInSnapshot.exists) {
        const existing = checkInSnapshot.data() || {};
        return {
          alreadyCompleted: true,
          checkIn: {
            date: today,
            waterLitres: existing.waterLitres,
            sleepHours: existing.sleepHours,
            proteinTargetMet: existing.proteinTargetMet,
            mood: existing.mood
          },
          xp: Number(profileSnapshot.data()?.xp) || 0,
          streak: Number(profileSnapshot.data()?.streak) || 0
        };
      }

      const profile = profileSnapshot.data() || {};
      const reward = calculateCheckInReward(profile, today);
      const checkIn = {
        userUid: req.auth.uid,
        memberId: profile.id,
        clubId: profile.clubId,
        ...(typeof profile.assignedCoachUid === 'string' ? { assignedCoachUid: profile.assignedCoachUid } : {}),
        date: today,
        ...input,
        createdAt: new Date().toISOString()
      };
      transaction.create(checkInRef, checkIn);
      transaction.update(profileRef, reward);
      return { alreadyCompleted: false, checkIn, xp: reward.xp, streak: reward.streak };
    });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    if (error?.message === 'MEMBER_PROFILE_CHANGED') {
      return res.status(409).json({ error: "Le profil adhérent a changé. Rechargez l'application." });
    }
    console.error('Daily check-in save failed:', error?.code || 'unknown');
    return res.status(500).json({ error: "Impossible d'enregistrer le suivi du jour." });
  }
});

async function resolveAIConversationScope(req: any, rawMemberId: unknown) {
  const role = req.profile?.role;
  const uid = req.auth?.uid;
  if (!uid || !['member', 'coach', 'owner', 'superadmin'].includes(role)) {
    return { error: "L'assistant IA n'est pas disponible pour ce profil.", status: 403 } as const;
  }

  if (rawMemberId == null || rawMemberId === '') {
    return { ownerUid: uid, clubId: req.profile.clubId, role, memberId: null, key: `${uid}_general` } as const;
  }
  if (!['coach', 'owner', 'superadmin'].includes(role)) {
    return { error: "Vous ne pouvez pas ouvrir une conversation au nom d'un adhérent.", status: 403 } as const;
  }
  const memberId = Number(rawMemberId);
  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    return { error: "Adhérent invalide.", status: 400 } as const;
  }

  const memberSnapshot = await admin.firestore().collection('users').where('id', '==', memberId).limit(1).get();
  const member = memberSnapshot.docs[0]?.data();
  if (!member || member.role !== 'member' || member.clubId !== req.profile.clubId) {
    return { error: "Cet adhérent n'est pas accessible dans votre club.", status: 404 } as const;
  }
  if (role === 'coach' && member.assignedCoachUid !== uid) {
    return { error: "Cet adhérent ne vous est pas affecté.", status: 403 } as const;
  }
  return { ownerUid: uid, clubId: req.profile.clubId, role, memberId, key: `${uid}_${memberId}` } as const;
}

app.get('/api/ai/conversation', async (req: any, res: any) => {
  try {
    const scope = await resolveAIConversationScope(req, req.query.memberId);
    if ('error' in scope) return res.status(scope.status).json({ error: scope.error });
    const snapshot = await admin.firestore().collection('aiConversations').doc(scope.key).get();
    if (!snapshot.exists) return res.json({ messages: [] });
    const data = snapshot.data() || {};
    if (data.ownerUid !== scope.ownerUid || data.clubId !== scope.clubId || data.memberId !== scope.memberId) {
      return res.json({ messages: [] });
    }
    return res.json({ messages: parseAIConversation(data.messages) || [] });
  } catch (error: any) {
    console.error('AI conversation read failed:', error?.code || 'unknown');
    return res.status(500).json({ error: "Impossible de charger l'historique IA." });
  }
});

app.put('/api/ai/conversation', async (req: any, res: any) => {
  try {
    const scope = await resolveAIConversationScope(req, req.body?.memberId);
    if ('error' in scope) return res.status(scope.status).json({ error: scope.error });
    const messages = parseAIConversation(req.body?.messages);
    if (!messages) return res.status(400).json({ error: "L'historique de conversation est invalide ou trop volumineux." });
    await admin.firestore().collection('aiConversations').doc(scope.key).set({
      ownerUid: scope.ownerUid,
      clubId: scope.clubId,
      role: scope.role,
      memberId: scope.memberId,
      messages,
      updatedAt: new Date().toISOString()
    });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('AI conversation save failed:', error?.code || 'unknown');
    return res.status(500).json({ error: "Impossible d'enregistrer l'historique IA." });
  }
});

app.delete('/api/ai/conversation', async (req: any, res: any) => {
  try {
    const scope = await resolveAIConversationScope(req, req.query.memberId);
    if ('error' in scope) return res.status(scope.status).json({ error: scope.error });
    const reference = admin.firestore().collection('aiConversations').doc(scope.key);
    const snapshot = await reference.get();
    const data = snapshot.data();
    if (snapshot.exists && data?.ownerUid === scope.ownerUid && data?.clubId === scope.clubId && data?.memberId === scope.memberId) {
      await reference.delete();
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error('AI conversation delete failed:', error?.code || 'unknown');
    return res.status(500).json({ error: "Impossible d'effacer l'historique IA." });
  }
});

app.get('/api/coach/assigned-members', async (req: any, res: any) => {
  if (req.profile?.role !== 'coach' || !req.profile?.clubId) {
    return res.status(403).json({ error: "Cette action est réservée aux coachs." });
  }
  try {
    const db = admin.firestore();
    const coachRef = db.collection('users').doc(req.auth.uid);
    const members = await db.collection('users')
      .where('clubId', '==', req.profile.clubId)
      .where('role', '==', 'member')
      .where('assignedCoachUid', '==', req.auth.uid)
      .get();
    const assignedMemberIds = [...new Set(members.docs.map(doc => Number(doc.data().id)).filter(Number.isFinite))];
    await coachRef.update({ assignedMemberIds, assignmentIndexVersion: 1 });
    const migratedRecords = await syncMemberRecordCoachUid(db, req.profile.clubId, assignedMemberIds, req.auth.uid);
    return res.json({ assignedMemberIds, migratedRecords });
  } catch (error: any) {
    console.error('Coach assignment index sync failed:', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "Impossible de charger les adhérents affectés." });
  }
});

app.post('/api/assign-member-coach', async (req: any, res: any) => {
  if (!canAssignMembers(req.authorizationActor, req.profile?.clubId)) {
    return res.status(403).json({ error: "Droits insuffisants pour affecter un adhérent." });
  }
  const memberUid = typeof req.body?.memberUid === 'string' ? req.body.memberUid : '';
  const coachUid = req.body?.coachUid === null ? null : (typeof req.body?.coachUid === 'string' ? req.body.coachUid : '');
  if (!memberUid || (coachUid === '' && req.body?.coachUid !== null) || memberUid === req.auth.uid) {
    return res.status(400).json({ error: "Les informations d'affectation sont invalides." });
  }
  try {
    const db = admin.firestore();
    const memberRef = db.collection('users').doc(memberUid);
    const nextCoachRef = coachUid ? db.collection('users').doc(coachUid) : null;
    const memberSnapshot = await memberRef.get();
    if (!memberSnapshot.exists || memberSnapshot.data()?.role !== 'member' || memberSnapshot.data()?.clubId !== req.profile.clubId) {
      return res.status(404).json({ error: "Cet adhérent n'appartient pas à votre club." });
    }
    const oldCoachUid = typeof memberSnapshot.data()?.assignedCoachUid === 'string' ? memberSnapshot.data()!.assignedCoachUid : null;
    if (nextCoachRef) {
      const nextCoach = await nextCoachRef.get();
      if (!nextCoach.exists || nextCoach.data()?.role !== 'coach' || nextCoach.data()?.clubId !== req.profile.clubId) {
        return res.status(404).json({ error: "Ce coach n'appartient pas à votre club." });
      }
    }
    const oldCoachRef = oldCoachUid ? db.collection('users').doc(oldCoachUid) : null;
    await db.runTransaction(async transaction => {
      const callerRef = db.doc(`users/${req.auth.uid}`);
      const clubRef = db.doc(`clubs/${req.profile.clubId}`);
      const refs = [callerRef, clubRef, memberRef, ...(oldCoachRef ? [oldCoachRef] : []), ...(nextCoachRef && nextCoachRef.path !== oldCoachRef?.path ? [nextCoachRef] : [])];
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      const dataByPath = new Map(refs.map((ref, index) => [ref.path, snapshots[index].data()]));
      const currentActor = authorizationActor(dataByPath.get(callerRef.path), dataByPath.get(clubRef.path), isTrustedSuperAdmin(req));
      if (!canAssignMembers(currentActor, req.profile.clubId)) throw new Error('ASSIGNMENT_ACCESS_CHANGED');
      const latestMember = dataByPath.get(memberRef.path);
      const latestCoachUid = typeof latestMember?.assignedCoachUid === 'string' ? latestMember.assignedCoachUid : null;
      if (!latestMember || latestMember.role !== 'member' || latestMember.clubId !== req.profile.clubId || latestCoachUid !== oldCoachUid) {
        throw new Error('MEMBER_ASSIGNMENT_CHANGED');
      }
      if (oldCoachRef && oldCoachRef.path !== nextCoachRef?.path) {
        const oldCoach = dataByPath.get(oldCoachRef.path);
        if (oldCoach?.role === 'coach' && oldCoach.clubId === req.profile.clubId) {
          const ids = Array.isArray(oldCoach.assignedMemberIds) ? oldCoach.assignedMemberIds.map(Number) : [];
          transaction.update(oldCoachRef, { assignedMemberIds: ids.filter(id => id !== Number(latestMember.id)), assignmentIndexVersion: 1 });
        }
      }
      if (nextCoachRef) {
        const nextCoach = dataByPath.get(nextCoachRef.path);
        if (!nextCoach || nextCoach.role !== 'coach' || nextCoach.clubId !== req.profile.clubId) throw new Error('COACH_ASSIGNMENT_INVALID');
        const ids = Array.isArray(nextCoach.assignedMemberIds) ? nextCoach.assignedMemberIds.map(Number).filter(Number.isFinite) : [];
        transaction.update(nextCoachRef, { assignedMemberIds: [...new Set([...ids, Number(latestMember.id)])], assignmentIndexVersion: 1 });
        transaction.update(memberRef, { assignedCoachUid: coachUid });
      } else {
        transaction.update(memberRef, { assignedCoachUid: FieldValue.delete() });
      }
    });
    const memberId = Number(memberSnapshot.data()!.id);
    const migratedRecords = await syncMemberRecordCoachUid(db, req.profile.clubId, [memberId], coachUid);
    return res.json({ success: true, assignedCoachUid: coachUid, migratedRecords });
  } catch (error: any) {
    console.error('Member coach assignment failed:', { code: error?.code || 'unknown' });
    return res.status(409).json({ error: "L'affectation n'a pas pu être modifiée. Actualisez puis réessayez." });
  }
});

const isTrustedSuperAdmin = (req: any) => req.auth?.email_verified === true && req.auth?.email === 'victor.defreitas.pro@gmail.com';
const canAccessStripe = (req: any) => canManageStripe(req.authorizationActor, req.profile?.clubId);

app.get('/api/stripe/status', async (req: any, res: any) => {
  if (!canReadStripeStatus(req.authorizationActor, req.profile?.clubId)) return res.status(403).json({ error: 'La configuration Stripe est réservée au propriétaire.' });
  try {
    const profile = req.profile;
    const clubId = profile?.clubId;
    if (!clubId) return res.json({ connected: false });
    const db = admin.firestore();
    const secretRef = db.collection('stripeSecrets').doc(clubId);
    const secureSecret = await secretRef.get();
    let connected = secureSecret.exists && !!secureSecret.data()?.secretKey;
    if (!connected && canAccessStripe(req)) {
      const clubRef = db.collection('clubs').doc(clubId);
      const clubSnapshot = await clubRef.get();
      const legacyKey = clubSnapshot.data()?.settings?.payment?.stripeSecretKey;
      if (legacyKey) {
        await secretRef.set({ secretKey: legacyKey, clubId, updatedBy: req.auth.uid, updatedAt: new Date().toISOString() });
        await clubRef.update({ 'settings.payment.stripeSecretKey': FieldValue.delete() });
        connected = true;
      }
    }
    if (connected) { try { await new Stripe(secureSecret.data()?.secretKey || (await secretRef.get()).data()?.secretKey).accounts.retrieve(); } catch { connected = false; } }
    return res.json({ connected, webhookConfigured: !!secureSecret.data()?.webhookSecret, webhookUrl: `/api/stripe/webhook/${clubId}` });
  } catch (error: any) {
    console.error('Stripe status lookup failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "Impossible de vérifier la connexion Stripe." });
  }
});

app.post('/api/stripe/connect', async (req: any, res: any) => {
  try {
    const profile = req.profile;
    const secretKey = String(req.body?.secretKey || '').trim();
    const webhookSecret = String(req.body?.webhookSecret || '').trim();
    if (!canAccessStripe(req) || !profile.clubId) {
      return res.status(403).json({ error: "Seul le propriétaire du club peut connecter Stripe." });
    }
    if (webhookSecret && !/^whsec_[a-zA-Z0-9]+$/.test(webhookSecret)) return res.status(400).json({ error: 'Secret webhook invalide.' });
    if (!/^(sk|rk)_(test|live)_/.test(secretKey)) {
      return res.status(400).json({ error: "La clé Stripe semble invalide." });
    }

    const db = admin.firestore();
    const account = await new Stripe(secretKey).accounts.retrieve();
    await db.collection('stripeSecrets').doc(profile.clubId).set({
      secretKey, stripeAccountId: account.id,
      clubId: profile.clubId,
      updatedBy: req.auth.uid,
      updatedAt: new Date().toISOString(),
      webhookSecret: webhookSecret || null
    }, { merge: true });
    await db.collection('clubs').doc(profile.clubId).set({
      settings: { payment: { stripeConnected: true } }
    }, { merge: true });
    return res.json({ success: true, connected: true });
  } catch (error: any) {
    console.error('Stripe connection failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "Impossible d'enregistrer la connexion Stripe." });
  }
});

app.delete('/api/stripe/connect', async (req: any, res: any) => {
  try {
    const profile = req.profile;
    if (!canAccessStripe(req) || !profile.clubId) {
      return res.status(403).json({ error: "Seul le propriétaire du club peut déconnecter Stripe." });
    }
    const db = admin.firestore();
    await db.collection('stripeSecrets').doc(profile.clubId).delete();
    await db.collection('clubs').doc(profile.clubId).set({
      settings: { payment: { stripeConnected: false } }
    }, { merge: true });
    return res.json({ success: true, connected: false });
  } catch (error: any) {
    console.error('Stripe disconnection failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: "Impossible de déconnecter Stripe." });
  }
});

// Team operations are distinct from owner-only settings, Stripe and destruction.
app.post('/api/create-staff', async (req, res) => {
  try {
    return res.json(await createStaffAccount(admin.auth(), admin.firestore(), req.auth.uid, req.body, isTrustedSuperAdmin(req)));
  } catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    console.error('Staff creation failed', { code: error?.code || 'unknown' });
    return res.status(500).json({ error: 'La création du coach a échoué.' });
  }
});

app.post('/api/create-manager', async (req, res) => {
  try { return res.json(await createStaffAccount(admin.auth(), admin.firestore(), req.auth.uid, req.body, false, 'manager')); }
  catch (error: any) {
    if (error instanceof MemberCreationError) return res.status(error.status).json({ error: error.message });
    return res.status(500).json({ error: 'La création du Manager a échoué.' });
  }
});

app.post("/api/send-onboarding-email", async (req, res) => {
  try {
    const { email, memberName, paymentLink, contractLink, clubName } = req.body;

    if (!['owner', 'coach', 'superadmin'].includes(req.profile?.role)) {
      return res.status(403).json({ error: "Droits insuffisants pour envoyer un e-mail d'inscription." });
    }

    if (!email || !paymentLink || !contractLink) {
      return res.status(400).json({ error: "Email, lien de paiement et lien de contrat sont requis." });
    }

    const safeUrl = (value: string) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' ? parsed.toString() : null;
      } catch {
        return null;
      }
    };
    const safePaymentLink = safeUrl(paymentLink);
    const safeContractLink = safeUrl(contractLink);
    if (!safePaymentLink || !safeContractLink) {
      return res.status(400).json({ error: "Les liens doivent être des adresses HTTPS valides." });
    }
    const recipients = await admin.firestore().collection('users')
      .where('clubId', '==', req.profile.clubId)
      .where('email', '==', String(email).trim().toLowerCase())
      .limit(2).get();
    if (recipients.size!==1 || recipients.docs[0].data().role!=='member') {
      return res.status(404).json({ error: "Aucun adhérent correspondant dans ce club." });
    }
    await billingContext(admin.firestore(), req.auth!.uid, recipients.docs[0].data().id);
    const recipient=recipients.docs[0].data();
    const escapeHtml = (value: unknown) => String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char] as string));

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Velatra" <noreply@velatra.com>',
      to: email,
      subject: `Finalisez votre inscription chez ${clubName || 'Velatra'}`,
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #18181b;">
          <h2 style="color: #18181b;">Bonjour ${escapeHtml(recipient.name)},</h2>
          <p>Bienvenue chez <strong>${escapeHtml(clubName || 'Velatra')}</strong> ! Votre profil a été validé par votre coach.</p>
          <p>Pour finaliser votre inscription et démarrer votre accompagnement, veuillez compléter les deux étapes ci-dessous :</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #18181b;">1. Votre contrat</h3>
            <p style="color: #52525b;">Consultez votre document contractuel. Ce lien ne constitue pas une signature électronique :</p>
            <a href="${escapeHtml(safeContractLink)}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Consulter le contrat</a>
          </div>

          <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #18181b;">2. Paiement de l'abonnement</h3>
            <p style="color: #52525b;">Veuillez configurer votre moyen de paiement sécurisé via Stripe :</p>
            <a href="${escapeHtml(safePaymentLink)}" style="display: inline-block; padding: 12px 24px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Régler mon abonnement</a>
          </div>

          <p style="margin-top: 40px;">À très vite !</p>
          <p style="font-weight: bold;">L'équipe ${escapeHtml(clubName || 'Velatra')}</p>
        </div>
      `
    };

    // Never report a simulated email as a successful delivery in production.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({ error: "L'envoi d'e-mails n'est pas configuré sur le serveur." });
    }

    // Configure transporter with real credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email envoyé avec succès" });
  } catch (error: any) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// Endpoint to delete a user from Firebase Auth
app.post("/api/delete-user", async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    if (!uid && !email) {
      return res.status(400).json({ error: "UID or Email is required" });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: "Firebase Admin is not initialized. Missing Service Account." });
    }

    const caller = req.profile;
    if (!canPerformDestructiveClubActions(req.authorizationActor, caller?.clubId)) {
      return res.status(403).json({ error: "Droits insuffisants pour supprimer un compte." });
    }

    let targetRecord = uid ? await admin.auth().getUser(uid) : await admin.auth().getUserByEmail(email);
    if (email && targetRecord.email?.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ error: "L'adresse e-mail ne correspond pas à l'utilisateur." });
    }
    if (targetRecord.uid === req.auth.uid) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte depuis cet écran." });
    }

    const targetDoc = await admin.firestore().collection('users').doc(targetRecord.uid).get();
    const targetProfile = targetDoc.data();
    if (!targetDoc.exists || !canDeleteUser(req.authorizationActor, targetProfile)) {
      return res.status(403).json({ error: "Ce compte ne fait pas partie de votre club." });
    }

    await admin.auth().deleteUser(targetRecord.uid);
    await targetDoc.ref.delete();

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
});

// Secure Proxy for Gemini API
app.post("/api/gemini/generateContent", async (req, res) => {
  try {
    const rawApiKey = process.env.GEMINI_API_KEY;
    if (!rawApiKey) {
      console.warn("[Gemini Proxy] Access failed: GEMINI_API_KEY is not defined in environment variables.");
      return res.status(503).json({ error: "L’assistant IA est temporairement indisponible. Réessayez plus tard ou contactez votre coach." });
    }
    const apiKey = rawApiKey.replace(/[^\x20-\x7E]/g, '').trim().replace(/^['"]|['"]$/g, '');
    
    console.log(`[Gemini Proxy] API key loaded (${apiKey.length} characters).`);

    const { contents, config } = req.body || {};
    const targetModel = "gemini-2.5-flash";
    if (!Array.isArray(contents) || contents.length === 0 || contents.length > 80) {
      return res.status(400).json({ error: "Conversation invalide ou trop longue." });
    }
    if (JSON.stringify(contents).length > 30000 || JSON.stringify(config || {}).length > 12000) {
      return res.status(413).json({ error: "La conversation ou les paramètres sont trop volumineux." });
    }
    const now = Date.now();
    const recentRequests = (geminiRequestsByUser.get(req.auth.uid) || []).filter((timestamp) => now - timestamp < 60_000);
    if (recentRequests.length >= 30) {
      return res.status(429).json({ error: "Limite temporaire atteinte. Réessayez dans une minute." });
    }
    recentRequests.push(now);
    geminiRequestsByUser.set(req.auth.uid, recentRequests);

    // Map systemInstruction from client config format to REST API format
    let systemInstruction = undefined;
    if (config && config.systemInstruction) {
      if (typeof config.systemInstruction === 'string') {
        systemInstruction = {
          parts: [{ text: config.systemInstruction }]
        };
      } else {
        systemInstruction = config.systemInstruction;
      }
    }

    // Map other generation settings from client config format to REST API format
    const generationConfig: any = { maxOutputTokens: 2048 };
    if (config) {
      if (config.temperature !== undefined) generationConfig.temperature = config.temperature;
      if (config.responseMimeType !== undefined) generationConfig.responseMimeType = config.responseMimeType;
      if (config.responseSchema !== undefined) generationConfig.responseSchema = config.responseSchema;
      if (config.topP !== undefined) generationConfig.topP = config.topP;
      if (config.topK !== undefined) generationConfig.topK = config.topK;
      if (config.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = Math.max(1, Math.min(Number(config.maxOutputTokens) || 1024, 2048));
      if (config.stopSequences !== undefined) generationConfig.stopSequences = config.stopSequences;
    }

    // Construct the actual JSON request body for Google's REST API
    const payload: any = {
      contents: contents || []
    };
    {
      const roleGuidance = req.profile?.role === 'member'
        ? "L'utilisateur est un adhérent. Ne prétends pas avoir consulté ses données personnelles, séances ou programmes sauf si elles sont explicitement présentes dans la conversation. Pour toute douleur, blessure ou question médicale, recommande de contacter son coach et un professionnel de santé."
        : "L'utilisateur est un coach. Présente les conseils comme des suggestions que le coach doit vérifier avant tout changement de programme ou de nutrition. Ne prétends pas avoir consulté des données d'adhérents qui ne sont pas explicitement présentes dans la conversation.";
      const instructionText = typeof systemInstruction === 'string'
        ? systemInstruction
        : systemInstruction?.parts?.map((part: any) => part.text || '').join('\n') || '';
      payload.systemInstruction = { parts: [{ text: `${roleGuidance}\n${instructionText}` }] };
    }
    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    console.log(`[Gemini Proxy] Calling REST API for model: ${targetModel}`);

    const apiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });

    if (!apiRes.ok) {
      const status = apiRes.status;
      let errorText = "";
      try {
        errorText = await apiRes.text();
      } catch (e) {}
      throw new Error(`Gemini API returned status ${status}: ${errorText}`);
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    res.json({ text });
  } catch (error: any) {
    console.error("Error proxying Gemini request:", error);
    const limited = error.status === 429 || /status 429|quota/i.test(String(error.message));
    res.status(limited ? 429 : 503).json({ error: limited
      ? 'L’assistant reçoit trop de demandes. Réessayez dans quelques instants.'
      : 'L’assistant IA est temporairement indisponible. Votre demande n’a pas modifié votre programme.' });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  if (!process.env.VERCEL) {
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
