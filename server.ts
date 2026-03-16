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
