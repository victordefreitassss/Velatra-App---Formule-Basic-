import express from "express";
import path from "path";
import admin from "firebase-admin";

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;

app.use(express.json());

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
