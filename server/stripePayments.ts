import type { Firestore } from "firebase-admin/firestore";
import type { Express } from "express";
import express from "express";
import Stripe from "stripe";
import { createHash } from "node:crypto";
import { BillingError } from "./billing.ts";
const id = (v: any) => (typeof v === "string" ? v : v?.id);
const stable = (parts: any[]) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const metadata = (o: any) => ({
  ...o.subscription_details?.metadata,
  ...o.parent?.subscription_details?.metadata,
  ...o.metadata,
});
const safeId = (v: any) =>
  typeof v === "string" && /^[\w-]{1,150}$/.test(v) ? v : deny();
const deny = (): never => {
  throw new BillingError(409, "Association Stripe non vérifiable.");
};
async function subscriptionForInvoice(
  db: Firestore,
  invoice: any,
  clubId: string,
) {
  const stripeId = id(
    invoice.subscription || invoice.parent?.subscription_details?.subscription,
  );
  if (!stripeId) return null;
  const meta = metadata(invoice);
  if (meta.clubId && meta.clubId !== clubId) deny();
  if (meta.subscriptionId) {
    const ref = db.doc(`subscriptions/${safeId(meta.subscriptionId)}`),
      sub = (await ref.get()).data();
    if (
      !sub ||
      sub.clubId !== clubId ||
      (meta.planId && meta.planId !== sub.planId) ||
      meta.memberUid !== sub.memberUid ||
      (sub.stripeSubscriptionId && sub.stripeSubscriptionId !== stripeId)
    )
      deny();
    return { ref, sub, stripeId };
  }
  const matches = await db
    .collection("subscriptions")
    .where("clubId", "==", clubId)
    .where("stripeSubscriptionId", "==", stripeId)
    .limit(2)
    .get();
  if (matches.size !== 1) deny();
  return { ref: matches.docs[0].ref, sub: matches.docs[0].data(), stripeId };
}
export async function recordPaidInvoice(
  db: Firestore,
  invoice: any,
  clubId: string,
) {
  if (
    !clubId ||
    typeof invoice.id !== "string" ||
    !/^in_[\w]+$/.test(invoice.id) ||
    !Number.isSafeInteger(invoice.amount_paid) ||
    invoice.amount_paid < 0 ||
    !Number.isFinite(invoice.created)
  )
    deny();
  const mapping = await subscriptionForInvoice(db, invoice, clubId);
  if (!mapping) return;
  const ref = db.doc(`payments/stripe_${stable([clubId, invoice.id])}`);
  await db.runTransaction(async (tx) => {
    const [previous, subSnap] = await Promise.all([
      tx.get(ref),
      tx.get(mapping.ref),
    ]);
    if (previous.exists) return;
    const sub = subSnap.data()!;
    if (
      sub.clubId !== clubId ||
      (sub.stripeSubscriptionId &&
        sub.stripeSubscriptionId !== mapping.stripeId)
    )
      deny();
    const memberQuery = await tx.get(
      db
        .collection("users")
        .where("clubId", "==", clubId)
        .where("id", "==", sub.memberId)
        .limit(2),
    );
    if (memberQuery.size !== 1) deny();
    const member = memberQuery.docs[0].data(),
      memberRef = memberQuery.docs[0].ref;
    if (
      member.role !== "member" ||
      id(invoice.customer) !== member.stripeCustomerId ||
      invoice.currency?.toLowerCase() !== (sub.currency || "eur")
    )
      deny();
    const paidEntries =
      invoice.payments?.data?.filter((p: any) => p.status === "paid") || [];
    const paymentIntents = [
      ...new Set(
        paidEntries
          .map((p: any) => id(p.payment?.payment_intent))
          .filter(Boolean),
      ),
    ];
    const charges = [
      ...new Set(
        paidEntries.map((p: any) => id(p.payment?.charge)).filter(Boolean),
      ),
    ];
    const intentId =
      id(invoice.payment_intent) ||
      (paymentIntents.length === 1 ? paymentIntents[0] : null);
    const chargeId =
      id(invoice.charge) || (charges.length === 1 ? charges[0] : null);
    const paidTimestamp =
      invoice.status_transitions?.paid_at || invoice.created;
    const now = new Date(paidTimestamp * 1000).toISOString();
    const payment: any = {
      id: ref.id,
      clubId,
      memberId: sub.memberId,
      memberUid: memberRef.id,
      subscriptionId: mapping.ref.id,
      amount: invoice.amount_paid / 100,
      date: now,
      status: "paid",
      method: "card",
      category: "subscription",
      currency: invoice.currency,
      vatRate: sub.vatRate ?? null,
      stripeInvoiceId: invoice.id,
      ...(member.assignedCoachUid
        ? { assignedCoachUid: member.assignedCoachUid }
        : {}),
      ...(intentId ? { stripePaymentIntentId: intentId } : {}),
      ...(chargeId ? { stripeChargeId: chargeId } : {}),
      ...(invoice.hosted_invoice_url
        ? { hostedInvoiceUrl: invoice.hosted_invoice_url }
        : {}),
      ...(invoice.invoice_pdf ? { invoicePdf: invoice.invoice_pdf } : {}),
    };
    tx.create(ref, payment);
    const updates: any = { stripeSubscriptionId: mapping.stripeId };
    if (invoice.amount_paid > 0 && !sub.creditsGrantedAt) {
      const g = sub.creditGrant || { credits: 0, sessionCredits: {} },
        sessionCredits = { ...(member.sessionCredits || {}) };
      for (const [k, n] of Object.entries(g.sessionCredits))
        sessionCredits[k] = (sessionCredits[k] || 0) + Number(n);
      tx.update(memberRef, {
        credits: (member.credits || 0) + g.credits,
        sessionCredits,
      });
      updates.creditsGrantedAt = now;
    }
    if (
      sub.status !== "cancelled" &&
      (!sub.lastPaidInvoiceCreated ||
        paidTimestamp >= sub.lastPaidInvoiceCreated)
    ) {
      updates.status = "active";
      updates.lastPaidInvoiceCreated = paidTimestamp;
    }
    tx.update(mapping.ref, updates);
  });
}
export async function processBillingStripeEvent(
  db: Firestore,
  clubId: string,
  event: any,
) {
  if (!/^[\w-]{1,150}$/.test(clubId) || !/^evt_[\w]+$/.test(event.id)) deny();
  const o = event.data.object,
    meta = metadata(o);
  if (meta.clubId && meta.clubId !== clubId) deny();
  if (
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_succeeded"
  ) {
    await recordPaidInvoice(db, o, clubId);
    return;
  }
  if (event.type === "invoice.payment_failed") {
    const m = await subscriptionForInvoice(db, o, clubId);
    if (!m) return;
    await db.runTransaction(async (tx) => {
      const s = (await tx.get(m.ref)).data()!;
      const confirmed = await tx.get(
        db.doc(`payments/stripe_${stable([clubId, o.id])}`),
      );
      if (confirmed.exists) return;
      if (
        s.status !== "cancelled" &&
        (!s.lastPaidInvoiceCreated || o.created >= s.lastPaidInvoiceCreated)
      )
        tx.update(m.ref, { status: "past_due" });
    });
    return;
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    if (o.payment_status !== "paid") return;
    if (!meta.memberUid || meta.clubId !== clubId) deny();
    const target = meta.subscriptionId
      ? db.doc(`subscriptions/${safeId(meta.subscriptionId)}`)
      : meta.paymentId
        ? db.doc(`payments/${safeId(meta.paymentId)}`)
        : null;
    if (!target) deny();
    await db.runTransaction(async (tx) => {
      const [snap, memberSnap] = await Promise.all([
        tx.get(target!),
        tx.get(db.doc(`users/${safeId(meta.memberUid)}`)),
      ]);
      const data = snap.data(),
        member = memberSnap.data();
      if (
        !data ||
        !member ||
        data.clubId !== clubId ||
        member.clubId !== clubId ||
        member.role !== "member" ||
        data.memberId !== member.id ||
        data.stripeCheckoutSessionId !== o.id ||
        member.stripeCustomerId !== id(o.customer)
      )
        deny();
      if (meta.subscriptionId) {
        if (meta.planId !== data.planId || data.collectionMode !== "stripe")
          deny();
        if (o.mode === "subscription") {
          const subId = id(o.subscription);
          if (
            !subId ||
            (data.stripeSubscriptionId && data.stripeSubscriptionId !== subId)
          )
            deny();
          tx.update(target!, { stripeSubscriptionId: subId });
        } else {
          if (
            o.mode !== "payment" ||
            data.billingCycle !== "once" ||
            o.currency !== (data.currency || "eur") ||
            (data.isTTC === false && data.vatRate == null) ||
            !id(o.payment_intent) ||
            o.amount_total !==
              Math.round(
                (data.isTTC !== false
                  ? data.price
                  : data.price * (1 + (data.vatRate || 0) / 100)) * 100,
              )
          )
            deny();
          const paymentRef = db.doc(
              `payments/checkout_${stable([clubId, o.id])}`,
            ),
            old = await tx.get(paymentRef);
          if (!old.exists) {
            tx.create(paymentRef, {
              id: paymentRef.id,
              clubId,
              memberId: member.id,
              memberUid: meta.memberUid,
              ...(member.assignedCoachUid
                ? { assignedCoachUid: member.assignedCoachUid }
                : {}),
              subscriptionId: target!.id,
              amount: o.amount_total / 100,
              currency: o.currency,
              vatRate: data.vatRate ?? null,
              date: new Date(event.created * 1000).toISOString(),
              status: "paid",
              method: "card",
              category: "subscription",
              stripePaymentIntentId: id(o.payment_intent),
            });
            if (!data.creditsGrantedAt) {
              const g = data.creditGrant || { credits: 0, sessionCredits: {} },
                sc = { ...(member.sessionCredits || {}) };
              for (const [k, n] of Object.entries(g.sessionCredits))
                sc[k] = (sc[k] || 0) + Number(n);
              tx.update(memberSnap.ref, {
                credits: (member.credits || 0) + g.credits,
                sessionCredits: sc,
              });
            }
            tx.update(target!, {
              status: "active",
              creditsGrantedAt:
                data.creditsGrantedAt || new Date().toISOString(),
            });
          }
        }
      } else {
        if (
          o.amount_total !== Math.round(data.amount * 100) ||
          o.currency !== (data.currency || "eur") ||
          data.collectionChannel !== "stripeCheckout"
        )
          deny();
        if (["refunded", "partially_refunded"].includes(data.status)) return;
        tx.update(target!, {
          status: "paid",
          stripePaymentIntentId: id(o.payment_intent),
          date: new Date(event.created * 1000).toISOString(),
        });
      }
    });
    return;
  }
  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed"
  ) {
    if (!meta.paymentId || meta.clubId !== clubId) return;
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`payments/${safeId(meta.paymentId)}`),
        p = (await tx.get(ref)).data();
      if (!p || p.clubId !== clubId || p.stripePaymentIntentId !== o.id) deny();
      const m = await tx.get(
        db
          .collection("users")
          .where("clubId", "==", clubId)
          .where("id", "==", p.memberId)
          .limit(2),
      );
      if (
        m.size !== 1 ||
        m.docs[0].data().stripeCustomerId !== id(o.customer) ||
        o.amount !== Math.round(p.amount * 100) ||
        o.currency !== (p.currency || "eur")
      )
        deny();
      if (
        ["refunded", "partially_refunded"].includes(p.status) ||
        (p.status === "paid" && event.type === "payment_intent.payment_failed")
      )
        return;
      tx.update(ref, {
        status: event.type === "payment_intent.succeeded" ? "paid" : "failed",
        ...(id(o.latest_charge) ? { stripeChargeId: id(o.latest_charge) } : {}),
      });
    });
    return;
  }
  if (event.type === "charge.refunded") {
    const pi = id(o.payment_intent);
    if (!pi) return;
    const matches = await db
      .collection("payments")
      .where("clubId", "==", clubId)
      .where("stripePaymentIntentId", "==", pi)
      .limit(2)
      .get();
    if (matches.size !== 1) deny();
    const ref = matches.docs[0].ref;
    await db.runTransaction(async (tx) => {
      const p = (await tx.get(ref)).data()!;
      if (
        !Number.isSafeInteger(o.amount_refunded) ||
        o.amount_refunded < 0 ||
        o.amount_refunded > Math.round(p.amount * 100)
      )
        deny();
      const refunded = Math.max(p.refundedAmount || 0, o.amount_refunded / 100);
      tx.update(ref, {
        refundedAmount: refunded,
        status: refunded >= p.amount ? "refunded" : "partially_refunded",
        refundStatus: "confirmed_stripe",
      });
    });
    return;
  }
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const matches = await db
      .collection("subscriptions")
      .where("clubId", "==", clubId)
      .where("stripeSubscriptionId", "==", o.id)
      .limit(2)
      .get();
    if (matches.size !== 1) deny();
    const ref = matches.docs[0].ref;
    await db.runTransaction(async (tx) => {
      const s = (await tx.get(ref)).data()!;
      if (
        event.created <
        Math.max(
          s.lastSubscriptionEventCreated || 0,
          s.lastPaidInvoiceCreated || 0,
        )
      )
        return;
      const status =
        event.type === "customer.subscription.deleted"
          ? "cancelled"
          : ["past_due", "unpaid", "canceled"].includes(o.status)
            ? o.status === "canceled"
              ? "cancelled"
              : o.status
            : null;
      if (status)
        tx.update(ref, { status, lastSubscriptionEventCreated: event.created });
    });
  }
}
export function registerBillingWebhooks(app: Express, db: Firestore) {
  const handler = async (req: any, res: any) => {
    try {
      const clubId = req.params.clubId || process.env.STRIPE_WEBHOOK_CLUB_ID;
      if (!clubId || !/^[\w-]{1,150}$/.test(clubId))
        return res.status(503).send("Webhook club configuration required.");
      const stored = (await db.doc(`stripeSecrets/${clubId}`).get()).data();
      const secret = req.params.clubId
        ? stored?.webhookSecret
        : process.env.STRIPE_WEBHOOK_SECRET;
      const key = stored?.secretKey;
      if (
        !secret ||
        !key ||
        (!req.params.clubId && key !== process.env.STRIPE_SECRET_KEY) ||
        typeof req.headers["stripe-signature"] !== "string"
      )
        return res.status(503).send("Webhook configuration unavailable.");
      const stripe = new Stripe(key);
      const event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        secret,
      );
      if (["invoice.paid", "invoice.payment_succeeded"].includes(event.type)) {
        const invoice: any = event.data.object;
        if (!invoice.payment_intent && !invoice.payments) {
          const canonical = await stripe.invoices.retrieve(invoice.id, {
            expand: ["payments"],
          });
          if (
            canonical.id !== invoice.id ||
            canonical.amount_paid !== invoice.amount_paid ||
            id(canonical.customer) !== id(invoice.customer) ||
            canonical.currency !== invoice.currency
          )
            deny();
          (event.data as any).object = canonical;
        }
      }
      await processBillingStripeEvent(db, clubId, event);
      res.json({ received: true });
    } catch (e: any) {
      console.error("Billing webhook refused", {
        code: e instanceof BillingError ? e.status : e?.type || "unknown",
      });
      res
        .status(e?.type === "StripeSignatureVerificationError" ? 400 : 503)
        .send("Webhook not processed.");
    }
  };
  app.post(
    "/api/stripe/webhook/:clubId",
    express.raw({ type: "application/json" }),
    handler,
  );
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handler,
  );
}
