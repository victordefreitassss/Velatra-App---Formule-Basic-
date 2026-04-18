import express from "express";
import path from "path";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import Stripe from "stripe";

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;

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
  console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing. Admin features will not work.");
}

// ==========================================
// Stripe Webhook (MUST be before express.json)
// ==========================================
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;
    // For a multi-tenant system, we can't easily verify the signature before knowing
    // which club this belongs to. For now, we will parse the raw body.
    // In production, you would look up the club's specific webhook secret from the DB.
    try {
      event = req.body;
      if (Buffer.isBuffer(event)) {
          event = JSON.parse(event.toString('utf8'));
      }
    } catch (err: any) {
      console.error('Error parsing webhook payload', err);
      return res.status(400).send(`Webhook Error: Invalid payload`);
    }

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

// Endpoint to create a Stripe Price/Plan
app.post("/api/stripe/create-plan", async (req, res) => {
  try {
    const { stripeSecretKey, name, amount, price, currency, unit, billingCycle, limit } = req.body;
    if (!stripeSecretKey) return res.status(400).json({ error: "Clé secrète Stripe manquante." });
    
    // Support both amount/price
    let finalAmount = amount !== undefined ? amount : price;
    if (finalAmount === undefined || isNaN(finalAmount)) {
       return res.status(400).json({ error: "Le montant (amount ou price) est invalide ou manquant." });
    }

    const stripe = new Stripe(stripeSecretKey);
    
    // 1. Create a product
    const product = await stripe.products.create({ name });
    
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
    const { stripeSecretKey, priceId } = req.body;
    if (!stripeSecretKey || !priceId) return res.status(400).json({ error: "Missing required parameters." });

    const stripe = new Stripe(stripeSecretKey);

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
    const { stripeSecretKey, customerId, amount, currency, description } = req.body;
    if (!stripeSecretKey || !customerId || !amount) return res.status(400).json({ error: "Missing required parameters." });

    const stripe = new Stripe(stripeSecretKey);

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

// Endpoint to send onboarding email (Contract & Payment)
app.post("/api/send-onboarding-email", async (req, res) => {
  try {
    const { email, memberName, paymentLink, contractLink, clubName } = req.body;

    if (!email || !paymentLink || !contractLink) {
      return res.status(400).json({ error: "Email, lien de paiement et lien de contrat sont requis." });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Velatra" <noreply@velatra.com>',
      to: email,
      subject: `Finalisez votre inscription chez ${clubName || 'Velatra'}`,
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #18181b;">
          <h2 style="color: #18181b;">Bonjour ${memberName},</h2>
          <p>Bienvenue chez <strong>${clubName || 'Velatra'}</strong> ! Votre profil a été validé par votre coach.</p>
          <p>Pour finaliser votre inscription et démarrer votre accompagnement, veuillez compléter les deux étapes ci-dessous :</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #18181b;">1. Signature du contrat</h3>
            <p style="color: #52525b;">Veuillez lire et signer numériquement votre contrat d'engagement :</p>
            <a href="${contractLink}" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Signer le contrat</a>
          </div>

          <div style="margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 12px;">
            <h3 style="margin-top: 0; color: #18181b;">2. Paiement de l'abonnement</h3>
            <p style="color: #52525b;">Veuillez configurer votre moyen de paiement sécurisé via Stripe :</p>
            <a href="${paymentLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">Régler mon abonnement</a>
          </div>

          <p style="margin-top: 40px;">À très vite !</p>
          <p style="font-weight: bold;">L'équipe ${clubName || 'Velatra'}</p>
        </div>
      `
    };

    // If SMTP is not configured, simulate the email send (useful for testing/preview)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials missing. Simulating email send.");
      console.log("--- SIMULATED EMAIL ---");
      console.log("To:", email);
      console.log("Content:", mailOptions.html);
      console.log("-----------------------");
      return res.json({ success: true, simulated: true, message: "Email simulé avec succès (identifiants SMTP manquants)" });
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
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: "Firebase Admin is not initialized. Missing Service Account." });
    }

    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted user ${uid} from Firebase Auth`);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });
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
