import express from "express";
import Stripe from "stripe";
import path from "path";

const app = express();
const PORT = parseInt(process.env.PORT as string) || 3000;

app.use(express.json());

// API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/stripe/payments", async (req, res) => {
    try {
      const { stripeSecretKey } = req.body;
      
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) {
        return res.status(400).json({ error: "Clé secrète Stripe manquante ou invalide" });
      }
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
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
        receiptUrl: charge.receipt_url,
        description: charge.description || null
      }));

      // Fetch active subscriptions
      const stripeSubscriptions = await stripeClient.subscriptions.list({ limit: 100, status: 'all', expand: ['data.customer'] });
      
      const subscriptions = stripeSubscriptions.data.map((sub: any) => {
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
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
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

  app.post("/api/stripe/payment-link", async (req, res) => {
    try {
      const { stripeSecretKey, priceId } = req.body;
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
      const paymentLink = await stripeClient.paymentLinks.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
      });

      res.json({ url: paymentLink.url, id: paymentLink.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  app.post("/api/stripe/charge-customer", async (req, res) => {
    try {
      const { stripeSecretKey, customerId, amount, description } = req.body;
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      if (!customerId) return res.status(400).json({ error: "ID Client Stripe manquant" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
      // First, get the customer's default payment method
      const customer = await stripeClient.customers.retrieve(customerId);
      if (customer.deleted) {
        return res.status(400).json({ error: "Client Stripe supprimé" });
      }

      const activeCustomer = customer as Stripe.Customer;
      let paymentMethodId = activeCustomer.invoice_settings?.default_payment_method;

      if (!paymentMethodId) {
        // Try to find any attached payment method
        const paymentMethods = await stripeClient.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });
        if (paymentMethods.data.length > 0) {
          paymentMethodId = paymentMethods.data[0].id;
        } else {
          return res.status(400).json({ error: "Aucun moyen de paiement enregistré pour ce client" });
        }
      }

      // Create and confirm a PaymentIntent
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur',
        customer: customerId,
        payment_method: paymentMethodId as string,
        off_session: true,
        confirm: true,
        description: description || 'Prélèvement manuel',
      });

      res.json({ success: true, paymentIntentId: paymentIntent.id, status: paymentIntent.status });
    } catch (error: any) {
      console.error("Stripe charge error:", error);
      // Handle off-session authentication errors
      if (error.code === 'authentication_required') {
        return res.status(400).json({ error: "Le moyen de paiement requiert une authentification (3D Secure). Le prélèvement automatique a échoué." });
      }
      res.status(500).json({ error: error.message || "Erreur inconnue" });
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { stripeSecretKey, priceId, customerId, customerEmail, successUrl, cancelUrl } = req.body;
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
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
      res.json({ url: session.url, id: session.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { userId, email, clubId } = req.body;
      
      // In a real scenario, you'd fetch the club's stripe secret key from the DB
      // For this demo, we expect it in the env
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error("La clé STRIPE_SECRET_KEY est manquante dans les variables d'environnement.");
      }
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Abonnement Premium VELATRA',
                description: 'Accès illimité, programmes personnalisés, suivi biométrique.',
              },
              unit_amount: 4900, // 49.00 EUR
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin || 'http://localhost:3000'}/?onboarding_success=true`,
        cancel_url: `${req.headers.origin || 'http://localhost:3000'}/?onboarding_canceled=true`,
        customer_email: email,
        client_reference_id: String(userId),
        metadata: {
          userId: String(userId),
          clubId: String(clubId)
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Create checkout session error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    try {
      const { stripeSecretKey, customerId, returnUrl } = req.body;
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
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
      if (!stripeSecretKey || (!stripeSecretKey.startsWith('sk_') && !stripeSecretKey.startsWith('rk_'))) return res.status(400).json({ error: "Clé secrète invalide" });
      
      const stripeClient = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
      
      const refund = await stripeClient.refunds.create({ charge: chargeId });
      res.json({ refund });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  });

  // Webhook endpoint for Stripe events
  // Note: In a real app, you'd use express.raw({type: 'application/json'}) for this specific route
  // to verify the webhook signature. For simplicity in this demo, we parse it as JSON.
  app.post("/api/stripe/webhook", async (req, res) => {
    const event = req.body;

    try {
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log(`Payment successful for session ${session.id}`);
          // Here you would typically update the user's status in your database
          // e.g., db.collection('users').doc(session.client_reference_id).update({ paymentStatus: 'active' })
          break;
        case 'invoice.payment_failed':
          const invoice = event.data.object;
          console.log(`Payment failed for invoice ${invoice.id}`);
          // Here you would suspend the user's access
          // e.g., db.collection('users').doc(invoice.customer).update({ paymentStatus: 'past_due' })
          break;
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          console.log(`Subscription canceled: ${subscription.id}`);
          // e.g., db.collection('users').doc(subscription.customer).update({ paymentStatus: 'canceled' })
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      res.send();
    } catch (err) {
      console.error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
