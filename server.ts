import express from "express";
import path from "path";
import admin from "firebase-admin";
import nodemailer from "nodemailer";

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;

app.use(express.json());

// Initialize Firebase Admin
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

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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
