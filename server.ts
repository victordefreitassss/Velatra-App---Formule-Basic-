import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/stripe/payments", async (req, res) => {
    try {
      const { stripeSecretKey } = req.body;
      
      if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
        return res.status(400).json({ error: "Clé secrète Stripe manquante ou invalide" });
      }
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
      
      // Fetch recent charges/payments
      const charges = await stripeClient.charges.list({ limit: 100 });
      
      const payments = charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents
        currency: charge.currency,
        status: charge.status,
        date: new Date(charge.created * 1000).toISOString(),
        customerEmail: charge.billing_details?.email || null,
        customerName: charge.billing_details?.name || null,
        method: charge.payment_method_details?.type || 'card',
        receiptUrl: charge.receipt_url
      }));

      // Fetch active subscriptions
      const stripeSubscriptions = await stripeClient.subscriptions.list({ limit: 100, status: 'all', expand: ['data.customer'] });
      
      const subscriptions = stripeSubscriptions.data.map(sub => {
        const customer = sub.customer as Stripe.Customer;
        return {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          customerId: customer.id,
          customerEmail: customer.email,
          priceId: sub.items.data[0]?.price.id,
          amount: (sub.items.data[0]?.price.unit_amount || 0) / 100,
          interval: sub.items.data[0]?.price.recurring?.interval || 'month'
        };
      });

      res.json({ payments, subscriptions });
    } catch (error) {
      console.error("Stripe API error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/stripe/create-plan", async (req, res) => {
    try {
      const { stripeSecretKey, name, price, billingCycle, description } = req.body;
      if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
      
      const product = await stripeClient.products.create({
        name,
        description: description || undefined,
      });

      const priceData: any = {
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: 'eur',
      };

      if (billingCycle === 'monthly') {
        priceData.recurring = { interval: 'month' };
      } else if (billingCycle === 'yearly') {
        priceData.recurring = { interval: 'year' };
      }

      const stripePrice = await stripeClient.prices.create(priceData);

      res.json({ productId: product.id, priceId: stripePrice.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { stripeSecretKey, priceId, customerId, customerEmail, successUrl, cancelUrl } = req.body;
      if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
      
      const sessionConfig: any = {
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: priceId.includes('recurring') || req.body.isRecurring ? 'subscription' : 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
      };

      if (customerId) {
        sessionConfig.customer = customerId;
      } else if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }

      const session = await stripeClient.checkout.sessions.create(sessionConfig);
      res.json({ url: session.url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  // Google Fit OAuth Endpoints
  app.get('/api/auth/google-fit/url', (req, res) => {
    // We use the APP_URL environment variable provided by the platform
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/google-fit/callback`;
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_FIT_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.nutrition.read',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get('/api/auth/google-fit/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const redirectUri = `${appUrl}/api/auth/google-fit/callback`;
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_FIT_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET || '',
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        })
      });
      
      const tokens = await tokenResponse.json();
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'googleFit', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Connexion réussie ! Vous pouvez fermer cette fenêtre.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("OAuth Error:", err);
      res.status(500).send('Erreur lors de la connexion à Google Fit');
    }
  });

  app.get('/api/auth/strava/url', (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/api/auth/strava/callback`;
    
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read,activity:read',
    });
    
    res.json({ url: `https://www.strava.com/oauth/authorize?${params}` });
  });

  app.get('/api/auth/strava/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
        })
      });
      
      const tokens = await tokenResponse.json();
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'strava', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Connexion Strava réussie ! Vous pouvez fermer cette fenêtre.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("OAuth Error:", err);
      res.status(500).send('Erreur lors de la connexion à Strava');
    }
  });

  app.post('/api/strava/activities', async (req, res) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) return res.status(400).json({ error: "Token manquant" });

      const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=5', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
      }

      const activities = await response.json();
      res.json(activities);
    } catch (error) {
      console.error("Strava API Error:", error);
      res.status(500).json({ error: "Erreur lors de la récupération des activités" });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    try {
      const { stripeSecretKey, customerId, returnUrl } = req.body;
      if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
      
      const session = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  app.post("/api/stripe/refund", async (req, res) => {
    try {
      const { stripeSecretKey, chargeId } = req.body;
      if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2026-02-25.clover" });
      
      const refund = await stripeClient.refunds.create({ charge: chargeId });
      res.json({ refund });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
