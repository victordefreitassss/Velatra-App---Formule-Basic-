import express from "express";
import path from "path";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import Stripe from "stripe";

declare global {
  namespace Express {
    interface Request {
      auth?: any;
      profile?: any;
    }
  }
}

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;
const geminiRequestsByUser = new Map<string, number[]>();

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
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const signature = req.headers['stripe-signature'];
    if (!webhookSecret || !stripeSecretKey || typeof signature !== 'string') {
      return res.status(503).send('Stripe webhook verification is not configured.');
    }

    const stripe = new Stripe(stripeSecretKey);
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    // Process the event
    if (!admin.apps.length) throw new Error("Firebase Admin non initialisé");
    const db = admin.firestore();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const memberId = session.client_reference_id;
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;
      
      console.log(`[Stripe Webhook] Checkout Completed: memberId=${memberId}, subId=${stripeSubscriptionId}`);

      if (memberId) {
        // Find subscription for this member that is "pending" or "active"
        const subsSnapshot = await db.collection("subscriptions")
          .where("memberId", "==", Number(memberId))
          .get();

        if (!subsSnapshot.empty) {
          // Identify the most recent or relevant one, or just update the pending one.
          const subDoc = subsSnapshot.docs[0]; // simplistic assumption
          await subDoc.ref.update({
            status: 'active',
            stripeSubscriptionId: stripeSubscriptionId,
            startDate: new Date().toISOString()
          });
          console.log(`Updated subscription ${subDoc.id} with status active`);
        }
      }
    }

    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const stripeSubscriptionId = invoice.subscription as string;
      console.log(`[Stripe Webhook] Invoice Paid: subId=${stripeSubscriptionId}`);

      if (stripeSubscriptionId) {
        const subsSnapshot = await db.collection("subscriptions")
          .where("stripeSubscriptionId", "==", stripeSubscriptionId)
          .get();

        if (!subsSnapshot.empty) {
          const subDoc = subsSnapshot.docs[0];
          const subData = subDoc.data();
          const clubId = subData.clubId;
          const memberId = subData.memberId;
          
          await db.collection("payments").add({
            id: Date.now().toString(),
            clubId: clubId,
            memberId: memberId,
            amount: invoice.amount_paid / 100, // Stripe returns cents
            date: new Date(invoice.created * 1000).toISOString(),
            status: 'paid',
            method: 'card',
            category: 'subscription',
            stripeChargeId: invoice.charge
          });
          console.log(`Logged payment for subscription ${stripeSubscriptionId}`);
        }
      }
    }

    res.json({received: true});
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

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
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Impossible de charger le profil utilisateur." });
  }
};

// A new club owner has a Firebase session before their server-side profile exists.
app.post("/api/register-club", verifyFirebaseSession, async (req: any, res: any) => {
  try {
    const { clubName, ownerName, accountType, inviteCode } = req.body || {};
    if (!clubName?.trim() || !ownerName?.trim() || !['coach', 'club'].includes(accountType)) {
      return res.status(400).json({ error: "Les informations du club sont incomplètes." });
    }
    const configuredInviteCode = process.env.CLUB_INVITE_CODE;
    if (!configuredInviteCode) {
      return res.status(503).json({ error: "L'inscription est temporairement indisponible. Le code d'invitation doit être configuré côté serveur." });
    }
    if (String(inviteCode || '').trim() !== configuredInviteCode.trim()) {
      return res.status(403).json({ error: "Code d'invitation invalide." });
    }

    const db = admin.firestore();
    const uid = req.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const existingProfile = await userRef.get();
    if (existingProfile.exists) {
      return res.status(409).json({ error: "Un profil existe déjà pour ce compte." });
    }

    let clubId = '';
    let clubRef;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      clubId = String(Math.floor(100000 + Math.random() * 900000));
      clubRef = db.collection('clubs').doc(clubId);
      const existingClub = await clubRef.get();
      if (!existingClub.exists) break;
      clubRef = undefined;
    }
    if (!clubRef) return res.status(503).json({ error: "Impossible de réserver un code de club, réessayez." });

    const email = req.auth.email || '';
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      transaction.create(clubRef!, {
        id: clubId,
        name: clubName.trim(),
        ownerId: uid,
        email,
        phone: "",
        address: "",
        description: accountType === 'coach' ? `Espace de coaching de ${clubName.trim()}` : `Bienvenue chez ${clubName.trim()}`,
        horaires: "",
        createdAt: now
      });
      transaction.create(userRef, {
        id: Date.now(),
        clubId,
        code: "",
        pwd: "",
        name: ownerName.trim(),
        email,
        role: "owner",
        avatar: ownerName.trim().substring(0, 2).toUpperCase(),
        gender: "M",
        age: 30,
        weight: 80,
        height: 180,
        objectifs: ["Performance sportive"],
        notes: accountType === 'coach' ? "Coach Indépendant" : "Propriétaire du club",
        createdAt: now,
        xp: 0,
        streak: 0,
        pointsFidelite: 0,
        firebaseUid: uid
      });
    });

    return res.json({ success: true, clubId });
  } catch (error: any) {
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

// All remaining API routes require a verified session and a server-side profile.
app.use("/api", verifyFirebaseSession, requireUserProfile);

app.post('/api/create-member-profile', async (req: any, res: any) => {
  try {
    const requester = req.profile;
    if (!['owner', 'coach'].includes(requester?.role) || !requester.clubId) {
      return res.status(403).json({ error: "Seuls les coachs et propriétaires peuvent ajouter un adhérent." });
    }
    const uid = String(req.body?.uid || '');
    const submitted = req.body?.profile;
    if (!uid || !submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
      return res.status(400).json({ error: "Le profil adhérent est incomplet." });
    }
    if (uid === req.auth.uid) return res.status(400).json({ error: "Impossible de remplacer votre propre profil." });

    const account = await admin.auth().getUser(uid);
    if (!account.email || String(submitted.email || '').trim().toLowerCase() !== account.email.toLowerCase()) {
      return res.status(400).json({ error: "L'adresse e-mail ne correspond pas au compte créé." });
    }
    const userRef = admin.firestore().collection('users').doc(uid);
    if ((await userRef.get()).exists) return res.status(409).json({ error: "Un profil existe déjà pour ce compte." });

    const allowedFields = [
      'code', 'name', 'phone', 'address', 'gender', 'age', 'weight', 'height', 'birthDate',
      'objectifs', 'notes', 'experienceLevel', 'trainingDays', 'sessionDuration', 'equipment',
      'injuries', 'blessures', 'createdAt', 'xp', 'streak', 'pointsFidelite', 'status',
      'avatar', 'onboardingCompleted', 'planRequested', 'measurements'
    ];
    const cleanProfile: Record<string, any> = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(submitted, field)) cleanProfile[field] = submitted[field];
    }
    cleanProfile.id = Number.isFinite(Number(submitted.id)) ? Number(submitted.id) : Date.now();
    cleanProfile.pwd = '';
    cleanProfile.email = account.email;
    cleanProfile.clubId = requester.clubId;
    cleanProfile.role = 'member';
    cleanProfile.firebaseUid = uid;
    cleanProfile.createdAt = cleanProfile.createdAt || new Date().toISOString();
    if (requester.role === 'coach') cleanProfile.assignedCoachUid = req.auth.uid;

    await userRef.create(cleanProfile);
    return res.json({ success: true, uid });
  } catch (error: any) {
    console.error('Error creating member profile:', error.message);
    return res.status(500).json({ error: "Impossible de créer le profil adhérent." });
  }
});

const isTrustedSuperAdmin = (req: any) => req.auth?.email_verified === true && req.auth?.email === 'victor.defreitas.pro@gmail.com';
const isClubManager = (req: any) => req.profile?.role === 'owner' || (req.profile?.role === 'superadmin' && isTrustedSuperAdmin(req));

const getStripeClientForRequest = async (req: any, allowMember = false) => {
  const profile = req.profile;
  if ((!isClubManager(req) && !(allowMember && profile?.role === 'member')) || !profile.clubId) {
    throw new Error("Droits insuffisants pour utiliser Stripe.");
  }

  const db = admin.firestore();
  const secretRef = db.collection('stripeSecrets').doc(profile.clubId);
  const secureSecret = await secretRef.get();
  let secretKey = secureSecret.exists ? secureSecret.data()?.secretKey : undefined;

  // Migrate legacy keys out of the client-readable club document the first time a manager uses Stripe.
  if (!secretKey) {
    const clubRef = db.collection('clubs').doc(profile.clubId);
    const clubSnapshot = await clubRef.get();
    secretKey = clubSnapshot.data()?.settings?.payment?.stripeSecretKey;
    if (secretKey) {
      await secretRef.set({ secretKey, clubId: profile.clubId, updatedBy: req.auth.uid, updatedAt: new Date().toISOString() });
      await clubRef.update({ 'settings.payment.stripeSecretKey': admin.firestore.FieldValue.delete() });
    }
  }

  if (!secretKey) throw new Error("Connectez d'abord votre compte Stripe dans les paramètres.");
  return new Stripe(secretKey);
};

app.get('/api/stripe/status', async (req: any, res: any) => {
  try {
    const profile = req.profile;
    const clubId = profile?.clubId;
    if (!clubId) return res.json({ connected: false });
    const db = admin.firestore();
    const secretRef = db.collection('stripeSecrets').doc(clubId);
    const secureSecret = await secretRef.get();
    let connected = secureSecret.exists && !!secureSecret.data()?.secretKey;
    if (!connected && isClubManager(req)) {
      const clubRef = db.collection('clubs').doc(clubId);
      const clubSnapshot = await clubRef.get();
      const legacyKey = clubSnapshot.data()?.settings?.payment?.stripeSecretKey;
      if (legacyKey) {
        await secretRef.set({ secretKey: legacyKey, clubId, updatedBy: req.auth.uid, updatedAt: new Date().toISOString() });
        await clubRef.update({ 'settings.payment.stripeSecretKey': admin.firestore.FieldValue.delete() });
        connected = true;
      }
    }
    return res.json({ connected });
  } catch (error: any) {
    console.error('Stripe status lookup failed:', error.message);
    return res.status(500).json({ error: "Impossible de vérifier la connexion Stripe." });
  }
});

app.post('/api/stripe/connect', async (req: any, res: any) => {
  try {
    const profile = req.profile;
    const secretKey = String(req.body?.secretKey || '').trim();
    if (!isClubManager(req) || !profile.clubId) {
      return res.status(403).json({ error: "Seul le propriétaire du club peut connecter Stripe." });
    }
    if (!/^(sk|rk)_(test|live)_/.test(secretKey)) {
      return res.status(400).json({ error: "La clé Stripe semble invalide." });
    }

    const db = admin.firestore();
    await db.collection('stripeSecrets').doc(profile.clubId).set({
      secretKey,
      clubId: profile.clubId,
      updatedBy: req.auth.uid,
      updatedAt: new Date().toISOString()
    });
    await db.collection('clubs').doc(profile.clubId).set({
      settings: { payment: { stripeConnected: true } }
    }, { merge: true });
    return res.json({ success: true, connected: true });
  } catch (error: any) {
    console.error('Stripe connection failed:', error.message);
    return res.status(500).json({ error: "Impossible d'enregistrer la connexion Stripe." });
  }
});

app.delete('/api/stripe/connect', async (req: any, res: any) => {
  try {
    const profile = req.profile;
    if (!isClubManager(req) || !profile.clubId) {
      return res.status(403).json({ error: "Seul le propriétaire du club peut déconnecter Stripe." });
    }
    const db = admin.firestore();
    await db.collection('stripeSecrets').doc(profile.clubId).delete();
    await db.collection('clubs').doc(profile.clubId).set({
      settings: { payment: { stripeConnected: false } }
    }, { merge: true });
    return res.json({ success: true, connected: false });
  } catch (error: any) {
    console.error('Stripe disconnection failed:', error.message);
    return res.status(500).json({ error: "Impossible de déconnecter Stripe." });
  }
});

// Endpoint to create a staff member (coach) without logging out the current user
app.post("/api/create-staff", async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ error: "Firebase Admin is not configured" });
    }

    const { email, password, name, clubId } = req.body;
    
    if (!email || !password || !name || !clubId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = admin.firestore();

    // Authorize the verified Firebase identity, never a UID supplied by the caller.
    const requestorData = req.profile;
    const trustedSuperAdmin = isTrustedSuperAdmin(req);
    if (requestorData?.role !== 'owner' && !(requestorData?.role === 'superadmin' && trustedSuperAdmin)) {
      return res.status(403).json({ error: "Seul le propriétaire du club peut ajouter un coach." });
    }
    if (!trustedSuperAdmin && requestorData?.clubId !== clubId) {
      return res.status(403).json({ error: "Unauthorized: Club mismatch" });
    }

    // Create user in Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      id: Date.now(),
      clubId: clubId,
      code: email.split("@")[0].substring(0, 8),
      pwd: "", // Standard procedure, hide actual pwd
      name: name,
      email: email,
      role: "coach",
      avatar: name.substring(0, 2).toUpperCase(),
      createdAt: new Date().toISOString(),
      firebaseUid: userRecord.uid,
      // Minimal defaults:
      gender: "M",
      age: 25,
      weight: 70,
      height: 175,
      xp: 0,
      streak: 0,
      pointsFidelite: 0,
      objectifs: [],
      notes: ""
    });

    res.json({ success: true, uid: userRecord.uid });

  } catch (err: any) {
    console.error("Error creating staff:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to create a Stripe Price/Plan
app.post("/api/stripe/create-plan", async (req, res) => {
  try {
    const { name, amount, price, currency, unit, billingCycle, description } = req.body;
    
    // Support both amount/price
    let finalAmount = amount !== undefined ? amount : price;
    if (!name?.trim() || finalAmount === undefined || !Number.isFinite(Number(finalAmount)) || Number(finalAmount) <= 0) {
       return res.status(400).json({ error: "Le montant (amount ou price) est invalide ou manquant." });
    }

    const stripe = await getStripeClientForRequest(req);
    
    // 1. Create a product
    const product = await stripe.products.create({ name: name.trim(), ...(description ? { description: String(description).slice(0, 500) } : {}) });
    
    // 2. Create the price
    const priceData: any = {
      product: product.id,
      unit_amount: Math.round(Number(finalAmount) * 100),
      currency: currency || 'eur',
    };
    
    // Support both unit/billingCycle
    const finalUnit = unit || billingCycle;
    
    if (finalUnit && finalUnit !== 'once') {
      // Map 'monthly' to 'month', 'yearly' to 'year', etc if needed.
      let stripeInterval = finalUnit;
      if (finalUnit === 'monthly') stripeInterval = 'month';
      if (finalUnit === 'yearly') stripeInterval = 'year';
      if (finalUnit === 'weekly') stripeInterval = 'week';
      
      priceData.recurring = { interval: stripeInterval };
    }
    
    const stripePrice = await stripe.prices.create(priceData);
    
    res.json({ priceId: stripePrice.id, productId: product.id });
  } catch (err: any) {
    console.error("Erreur Stripe lors de la création du plan:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to generate a payment link
app.post("/api/stripe/payment-link", async (req, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: "Missing required parameters." });

    const stripe = await getStripeClientForRequest(req);

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: priceId, quantity: 1 }],
      after_completion: { type: 'hosted_confirmation' },
    });

    res.json({ link: paymentLink.url, linkId: paymentLink.id });
  } catch (err: any) {
    console.error("Erreur gération de lien de paiement Stripe:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to charge an existing customer directly
app.post("/api/stripe/charge-customer", async (req, res) => {
  try {
    const { customerId, amount, currency, description } = req.body;
    if (!customerId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ error: "Missing required parameters." });

    if (!isClubManager(req)) return res.status(403).json({ error: "Droits insuffisants pour effectuer ce paiement." });
    const stripe = await getStripeClientForRequest(req);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || 'eur',
      customer: customerId,
      description: description || "Facturation manuelle Velatra",
      confirm: true,
      off_session: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
    });

    res.json({ success: true, paymentIntentId: paymentIntent.id });
  } catch (err: any) {
    console.error("Erreur facturation Stripe:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to create a Stripe Customer Portal session
app.post("/api/stripe/portal", async (req, res) => {
  try {
    const { returnUrl } = req.body || {};
    const customerId = req.profile?.stripeCustomerId;
    if (req.profile?.role !== 'member' || !customerId) {
       return res.status(403).json({ error: "Aucun abonnement Stripe n'est associé à ce compte." });
    }
    const stripe = await getStripeClientForRequest(req, true);
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const requestedReturnUrl = returnUrl || `${origin}/profile`;
    if (new URL(requestedReturnUrl).origin !== origin) {
      return res.status(400).json({ error: "L'adresse de retour doit rester sur le site de Velatra." });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: requestedReturnUrl
    });

    res.json({ session });
  } catch (err: any) {
    console.error("Erreur génération de portail Stripe:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to send onboarding email (Contract & Payment)
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
      .limit(1).get();
    if (recipients.empty) {
      return res.status(404).json({ error: "Aucun adhérent correspondant dans ce club." });
    }
    const escapeHtml = (value: unknown) => String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char] as string));

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Velatra" <noreply@velatra.com>',
      to: email,
      subject: `Finalisez votre inscription chez ${clubName || 'Velatra'}`,
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #18181b;">
          <h2 style="color: #18181b;">Bonjour ${escapeHtml(memberName)},</h2>
          <p>Bienvenue chez <strong>${escapeHtml(clubName || 'Velatra')}</strong> ! Votre profil a été validé par votre coach.</p>
          <p>Pour finaliser votre inscription et démarrer votre accompagnement, veuillez compléter les deux étapes ci-dessous :</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #18181b;">1. Signature du contrat</h3>
            <p style="color: #52525b;">Veuillez lire et signer numériquement votre contrat d'engagement :</p>
            <a href="${escapeHtml(safeContractLink)}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Signer le contrat</a>
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
    if (caller?.role !== 'owner' && !(caller?.role === 'superadmin' && isTrustedSuperAdmin(req))) {
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
    if (!targetDoc.exists || (!isTrustedSuperAdmin(req) && targetProfile?.clubId !== caller?.clubId)) {
      return res.status(403).json({ error: "Ce compte ne fait pas partie de votre club." });
    }
    if (targetProfile?.role === 'owner' && !isTrustedSuperAdmin(req)) {
      return res.status(403).json({ error: "Seul un super administrateur peut supprimer le propriétaire du club." });
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
      return res.status(500).json({ error: "Clé API Gemini côté serveur manquante. Veuillez configurer l'environnement variable 'GEMINI_API_KEY' dans Vercel." });
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
    const generationConfig: any = {};
    if (config) {
      if (config.temperature !== undefined) generationConfig.temperature = config.temperature;
      if (config.responseMimeType !== undefined) generationConfig.responseMimeType = config.responseMimeType;
      if (config.responseSchema !== undefined) generationConfig.responseSchema = config.responseSchema;
      if (config.topP !== undefined) generationConfig.topP = config.topP;
      if (config.topK !== undefined) generationConfig.topK = config.topK;
      if (config.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = Math.min(Number(config.maxOutputTokens) || 1024, 2048);
      if (config.stopSequences !== undefined) generationConfig.stopSequences = config.stopSequences;
    }

    // Construct the actual JSON request body for Google's REST API
    const payload: any = {
      contents: contents || []
    };
    if (systemInstruction) {
      const roleGuidance = req.profile?.role === 'member'
        ? "L'utilisateur est un adhérent. Ne prétends pas avoir consulté ses données personnelles, séances ou programmes sauf si elles sont explicitement présentes dans la conversation. Pour toute douleur, blessure ou question médicale, recommande de contacter son coach et un professionnel de santé."
        : "L'utilisateur est un coach. Présente les conseils comme des suggestions que le coach doit vérifier avant tout changement de programme ou de nutrition. Ne prétends pas avoir consulté des données d'adhérents qui ne sont pas explicitement présentes dans la conversation.";
      const instructionText = typeof systemInstruction === 'string'
        ? systemInstruction
        : systemInstruction.parts?.map((part: any) => part.text || '').join('\n') || '';
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
      body: JSON.stringify(payload)
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
    let errorMsg = "Failed to call Gemini";
    
    const errText = error.message ? String(error.message) : "";
    
    // Parse Google REST error response if it's JSON inside the thrown Error
    let googleErrorMessage = "";
    const jsonStart = errText.indexOf("{");
    if (jsonStart !== -1) {
      try {
        const jsonStr = errText.substring(jsonStart);
        const parsed = JSON.parse(jsonStr);
        if (parsed.error && parsed.error.message) {
          googleErrorMessage = parsed.error.message;
        }
      } catch (e) {}
    }

    const isSuspended = error.status === 403 || 
                        errText.includes("status 403") ||
                        errText.includes("suspended") || 
                        errText.includes("Consumer 'api_key") ||
                        errText.includes("PERMISSION_DENIED") ||
                        (googleErrorMessage && (
                          googleErrorMessage.toLowerCase().includes("suspended") ||
                          googleErrorMessage.toLowerCase().includes("permission_denied") ||
                          googleErrorMessage.toLowerCase().includes("disabled")
                        ));
                        
    if (isSuspended) {
      errorMsg = "La clé API Gemini par défaut est actuellement inactive ou suspendue. Pour utiliser les fonctionnalités d'IA (générateur de programmes, nutrition, recettes, stagnation, etc.), veuillez configurer votre propre clé 'GEMINI_API_KEY' dans les paramètres (Settings) de votre projet Google AI Studio.";
    } else if (error.status === 429 || errText.includes("quota") || (googleErrorMessage && googleErrorMessage.toLowerCase().includes("quota"))) {
      errorMsg = "Quota dépassé ou clé API invalide.";
    } else if (googleErrorMessage) {
      errorMsg = `Erreur Google API : ${googleErrorMessage}`;
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    // Prevent sending massive JSON strings if error.message is stringified JSON
    if (errorMsg.startsWith("{")) {
       try {
         const parsed = JSON.parse(errorMsg);
         if (parsed.error && parsed.error.message) errorMsg = parsed.error.message;
       } catch(e) {}
    }
    res.status(500).json({ error: errorMsg });
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
