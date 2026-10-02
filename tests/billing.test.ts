import { it, after } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  saveBillingPlan,
  archiveBillingPlan,
  assignBillingSubscription,
  createBillingPayment,
  settleManualPayment,
  refundManualPayment,
  receiptForPayment,
  chargeBillingPayment,
  billingCheckout,
  billingPortal,
  syncBillingPlan,
  adjustBillingCredits,
  cancelInternalSubscription,
} from "../server/billing";
import {
  recordPaidInvoice,
  processBillingStripeEvent,
} from "../server/stripePayments";
import {
  billingMetrics,
  creditGrant,
  matchesPeriod,
  financialCsv,
  vatPart,
} from "../components/billingMetrics";
const app = initializeApp({ projectId: "demo-velatra" }),
  db = getFirestore(app);
after(() => deleteApp(app));
let seq = 0;
async function fixture(accountType: any = "studio") {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Only emulator");
  const clubId = `bill-${++seq}`,
    owner = `${clubId}-owner`,
    coach = `${clubId}-coach`,
    memberUid = `${clubId}-member`,
    memberId = 7000 + seq;
  await db.doc(`clubs/${clubId}`).set({ isActive: true,
    id: clubId,
    name: "Fixture",
    ownerId: owner,
    ...(accountType === "legacy" ? {} : { accountType }),
  });
  await db.doc(`users/${owner}`).set({ role: "owner", clubId });
  await db
    .doc(`users/${coach}`)
    .set({ role: "coach", clubId, assignedMemberIds: [memberId] });
  await db.doc(`users/${memberUid}`).set({
    role: "member",
    id: memberId,
    clubId,
    name: "Fixture Member",
    email: "fixture@example.test",
    assignedCoachUid: coach,
    credits: 3,
    sessionCredits: { default: 2 },
  });
  await db.doc(`stripeSecrets/${clubId}`).set({
    secretKey: "mock-only",
    webhookSecret: "mock-signature",
    stripeAccountId: "acct_mock",
  });
  const plan = await saveBillingPlan(db, owner, {
    name: "Coaching",
    price: 50,
    billingCycle: "monthly",
    credits: 2,
    creditsInterval: "weekly",
    sessionCredits: { default: 1 },
    sessionCreditsIntervals: { default: "weekly" },
    requestId: `plan-request-${clubId}`,
  });
  return {
    clubId,
    owner,
    coach,
    memberUid,
    memberId,
    plan: plan!,
    assign: {
      memberId,
      planId: plan!.id,
      startDate: "2026-09-01",
      requestId: `assign-request-${clubId}`,
    },
  };
}
function mockStripe(ctx: any) {
  let creates = 0;
  const intents = new Map(),
    sessions = new Map(),
    keys = new Map();
  const invoke = async (name: string, options: any, key: any, fn: any) => {
    const k = name + key.idempotencyKey;
    if (keys.has(k)) return keys.get(k);
    const value = fn();
    keys.set(k, value);
    return value;
  };
  const stripe: any = {
    products: {
      create: (o: any, k: any) =>
        invoke("prod", o, k, () => ({ id: "prod_mock" })),
    },
    prices: {
      create: (o: any, k: any) =>
        invoke("price", o, k, () => ({
          id: `price_${Math.round(o.unit_amount)}`,
          ...o,
        })),
      retrieve: async () => ({
        id: "price_mock",
        active: true,
        unit_amount: 5000,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { clubId: ctx.clubId, planId: ctx.plan.id },
      }),
    },
    customers: {
      create: (o: any, k: any) =>
        invoke("customer", o, k, () => ({
          id: `cus_${ctx.clubId}`,
          metadata: o.metadata,
        })),
      retrieve: async (id: string) => ({
        id,
        invoice_settings: { default_payment_method: "pm_mock" },
        metadata: { clubId: ctx.clubId, memberUid: ctx.memberUid },
      }),
    },
    paymentIntents: {
      create: (o: any, k: any) =>
        invoke("intent", o, k, () => {
          creates++;
          const v = { ...o, id: "pi_mock", status: "succeeded" };
          intents.set(v.id, v);
          return v;
        }),
      retrieve: async (id: string) => intents.get(id),
    },
    checkout: {
      sessions: {
        create: (o: any, k: any) =>
          invoke("checkout", o, k, () => {
            const v = {
              ...o,
              id: "cs_mock",
              url: "https://checkout.stripe.com/mock-only",
            };
            sessions.set(v.id, v);
            return v;
          }),
      },
    },
    billingPortal: {
      sessions: {
        create: async (o: any) => ({
          url: "https://billing.stripe.com/mock-only",
          ...o,
        }),
      },
    },
  };
  return {
    stripe,
    factory: async () => stripe,
    creates: () => creates,
    sessions,
  };
}
for (const mode of ["solo", "studio", "legacy"])
  it(`atomically assigns ${mode} with immutable snapshot and historical credits`, async () => {
    const f = await fixture(mode);
    const s = await assignBillingSubscription(db, f.owner, f.assign);
    assert.equal(s?.status, "active");
    const m = (await db.doc(`users/${f.memberUid}`).get()).data()!;
    assert.equal(m.credits, 11);
    assert.equal(m.sessionCredits.default, 6);
    await saveBillingPlan(db, f.owner, { ...f.plan, price: 80 });
    assert.equal(
      (await db.doc(`subscriptions/${s?.id}`).get()).data()?.price,
      50,
    );
  });
it("assigned Studio coach may assign; unassigned coach and member may not", async () => {
  const f = await fixture();
  await assignBillingSubscription(db, f.coach, f.assign);
  await assert.rejects(() =>
    assignBillingSubscription(db, f.memberUid, f.assign),
  );
  const g = await fixture();
  await db.doc(`users/${g.coach}`).update({ assignedMemberIds: [] });
  await assert.rejects(() => assignBillingSubscription(db, g.coach, g.assign));
});
it("assignment retries and concurrent double click produce one subscription and one credit grant", async () => {
  const f = await fixture();
  const [a, b] = await Promise.all([
    assignBillingSubscription(db, f.owner, f.assign),
    assignBillingSubscription(db, f.owner, {
      ...f.assign,
      requestId: f.assign.requestId + "-other",
    }),
  ]);
  assert.equal(a?.id, b?.id);
  await assignBillingSubscription(db, f.owner, f.assign);
  assert.equal(
    (await db.doc(`users/${f.memberUid}`).get()).data()?.credits,
    11,
  );
  const subs = await db
    .collection("subscriptions")
    .where("clubId", "==", f.clubId)
    .get();
  assert.equal(subs.size, 1);
});
it("missing member, missing plan, cross club and archived plan are refused", async () => {
  const f = await fixture(),
    g = await fixture();
  for (const body of [
    { ...f.assign, memberId: 0 },
    { ...f.assign, planId: "missing" },
    { ...f.assign, planId: g.plan.id },
    { ...f.assign, memberId: g.memberId },
  ])
    await assert.rejects(() => assignBillingSubscription(db, f.owner, body));
  await archiveBillingPlan(db, f.owner, f.plan.id);
  await assert.rejects(() => assignBillingSubscription(db, f.owner, f.assign));
  assert.equal(
    (await db.doc(`plans/${f.plan.id}`).get()).data()?.isActive,
    false,
  );
});
it("archives a used plan while retaining its historical subscription", async () => {
  const f = await fixture(),
    sub = await assignBillingSubscription(db, f.owner, f.assign);
  await archiveBillingPlan(db, f.owner, f.plan.id);
  assert.equal((await db.doc(`subscriptions/${sub?.id}`).get()).exists, true);
});
it("internal plan requires no Stripe identifiers and ignores forged Stripe IDs", async () => {
  const f = await fixture();
  assert.equal(f.plan.stripePriceId, undefined);
  const p = await saveBillingPlan(db, f.owner, {
    ...f.plan,
    stripePriceId: "price_forged",
  });
  assert.equal(p?.stripePriceId, undefined);
  const g = await fixture();
  await assert.rejects(() =>
    saveBillingPlan(db, g.owner, { ...f.plan, name: "Hacked" }),
  );
});
it("mock Stripe sync creates immutable Price and price edit leaves historical snapshot intact", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await syncBillingPlan(db, f.owner, f.plan.id, mock.factory);
  const before = (await db.doc(`plans/${f.plan.id}`).get()).data()!;
  await saveBillingPlan(db, f.owner, { ...before, price: 60 });
  assert.equal(
    (await db.doc(`plans/${f.plan.id}`).get()).data()?.stripePriceId,
    undefined,
  );
  const next = await syncBillingPlan(db, f.owner, f.plan.id, mock.factory);
  assert.notEqual(next.stripePriceId, before.stripePriceId);
  await assert.rejects(() =>
    syncBillingPlan(db, f.coach, f.plan.id, mock.factory),
  );
});
it("Stripe assignment is pending with no credit until a verified invoice; retry grants once", async () => {
  const f = await fixture();
  await db.doc(`plans/${f.plan.id}`).update({ stripePriceId: "price_mock" });
  const sub = await assignBillingSubscription(db, f.owner, {
    ...f.assign,
    collectionMode: "stripe",
  });
  assert.equal(sub?.status, "pending");
  assert.equal((await db.doc(`users/${f.memberUid}`).get()).data()?.credits, 3);
  await db.doc(`users/${f.memberUid}`).update({ stripeCustomerId: "cus_mock" });
  const invoice = {
    id: `in_${f.clubId.replace(/-/g, "")}`,
    customer: "cus_mock",
    currency: "eur",
    amount_paid: 5000,
    created: 1788220800,
    parent: {
      subscription_details: {
        subscription: "sub_mock",
        metadata: {
          clubId: f.clubId,
          subscriptionId: sub?.id,
          memberUid: f.memberUid,
        },
      },
    },
  };
  await Promise.all([
    recordPaidInvoice(db, invoice, f.clubId),
    recordPaidInvoice(db, invoice, f.clubId),
  ]);
  assert.equal(
    (await db.doc(`users/${f.memberUid}`).get()).data()?.credits,
    11,
  );
  await recordPaidInvoice(
    db,
    { ...invoice, id: invoice.id + "second", created: invoice.created + 86400 },
    f.clubId,
  );
  assert.equal(
    (await db.doc(`users/${f.memberUid}`).get()).data()?.credits,
    11,
  );
  assert.equal(
    (await db.doc(`subscriptions/${sub?.id}`).get()).data()?.status,
    "active",
  );
});
it("normal payment stays pending even when frontend sends paid and arbitrary Stripe fields", async () => {
  const f = await fixture();
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "cash",
    status: "paid",
    stripeChargeId: "ch_forged",
    requestId: "payment-request-001",
  });
  assert.equal(p?.status, "pending");
  assert.equal(p?.stripeChargeId, undefined);
  const retry = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "cash",
    requestId: "payment-request-001",
  });
  assert.equal(p?.id, retry?.id);
});
it("manual settlement and refund are distinct canonical transactions and receipts are stable snapshots", async () => {
  const f = await fixture();
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "cash",
    requestId: "payment-request-002",
  });
  await settleManualPayment(db, f.owner, p?.id, { method: "cash" });
  const [a, b] = await Promise.all([
    receiptForPayment(db, f.owner, p?.id),
    receiptForPayment(db, f.owner, p?.id),
  ]);
  assert.equal(a?.number, b?.number);
  await db.doc(`clubs/${f.clubId}`).update({ name: "Renamed" });
  assert.equal(
    (await receiptForPayment(db, f.owner, p?.id))?.clubName,
    "Fixture",
  );
  await Promise.all([
    refundManualPayment(db, f.owner, p?.id, {
      requestId: "refund-request-001",
    }),
    refundManualPayment(db, f.owner, p?.id, {
      requestId: "refund-request-001",
    }),
  ]);
  assert.equal(
    (await db.doc(`payments/${p?.id}`).get()).data()?.status,
    "refunded",
  );
});
it("refund Stripe is explicitly refused rather than simulated, including missing Stripe identifier", async () => {
  const f = await fixture();
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "card",
    requestId: "payment-request-003",
  });
  await db.doc(`payments/${p?.id}`).update({ status: "paid" });
  await assert.rejects(
    () =>
      refundManualPayment(db, f.owner, p?.id, {
        requestId: "refund-request-002",
      }),
    /Stripe/,
  );
  assert.equal(
    (await db.doc(`payments/${p?.id}`).get()).data()?.status,
    "paid",
  );
});
it("charge uses canonical amount/customer, only confirmed succeeded becomes paid, and retry cannot charge twice", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db
    .doc(`users/${f.memberUid}`)
    .update({ stripeCustomerId: "cus_canonical" });
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "card",
    requestId: "payment-request-004",
  });
  await Promise.all([
    chargeBillingPayment(db, f.owner, p?.id, mock.factory),
    chargeBillingPayment(db, f.owner, p?.id, mock.factory),
  ]);
  await chargeBillingPayment(db, f.owner, p?.id, mock.factory);
  assert.equal(mock.creates(), 1);
  assert.equal(
    (await db.doc(`payments/${p?.id}`).get()).data()?.status,
    "paid",
  );
  await assert.rejects(() =>
    chargeBillingPayment(db, f.coach, p?.id, mock.factory),
  );
  await assert.rejects(() =>
    chargeBillingPayment(db, f.memberUid, p?.id, mock.factory),
  );
  const other = await fixture();
  await assert.rejects(() =>
    chargeBillingPayment(db, other.owner, p?.id, mock.factory),
  );
});
it("wrong Stripe customer metadata is refused before a charge", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db
    .doc(`users/${f.memberUid}`)
    .update({ stripeCustomerId: "cus_legacy" });
  mock.stripe.customers.retrieve = async () => ({
    id: "cus_legacy",
    metadata: { clubId: "other", memberUid: "other" },
  });
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "card",
    requestId: "payment-request-005",
  });
  await assert.rejects(() =>
    chargeBillingPayment(db, f.owner, p?.id, mock.factory),
  );
  assert.equal(mock.creates(), 0);
});
it("a declined or pending mock charge is never declared paid", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db
    .doc(`users/${f.memberUid}`)
    .update({ stripeCustomerId: "cus_canonical" });
  mock.stripe.paymentIntents.create = async () => {
    throw { type: "StripeCardError", message: "internal details" };
  };
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 42,
    method: "card",
    requestId: "payment-request-006",
  });
  await assert.rejects(
    () => chargeBillingPayment(db, f.owner, p?.id, mock.factory),
    (e) =>
      String(e).includes("Paiement refusé") && !String(e).includes("internal"),
  );
  assert.equal(
    (await db.doc(`payments/${p?.id}`).get()).data()?.status,
    "pending",
  );
});
it("Checkout metadata binds exact subscription, club and member; arbitrary price is never the input", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db.doc(`plans/${f.plan.id}`).update({ stripePriceId: "price_mock" });
  const sub = await assignBillingSubscription(db, f.owner, {
    ...f.assign,
    collectionMode: "stripe",
  });
  const result = await billingCheckout(
    db,
    f.owner,
    { subscriptionId: sub?.id, priceId: "price_forged" },
    mock.factory,
    "https://velatra.test",
  );
  const s = mock.sessions.get(result.sessionId);
  assert.equal(s.line_items[0].price, "price_mock");
  assert.equal(s.metadata.subscriptionId, sub?.id);
  assert.equal(s.metadata.clubId, f.clubId);
  assert.equal(s.subscription_data.metadata.memberUid, f.memberUid);
  const again = await billingCheckout(
    db,
    f.owner,
    { subscriptionId: sub?.id },
    mock.factory,
    "https://velatra.test",
  );
  assert.equal(result.sessionId, again.sessionId);
});
it("generic or forged checkout webhook cannot select a first unrelated subscription", async () => {
  const f = await fixture();
  await assert.rejects(() =>
    processBillingStripeEvent(db, f.clubId, {
      id: "evt_forged",
      created: 1,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_forged",
          payment_status: "paid",
          client_reference_id: f.memberId,
          metadata: {},
        },
      },
    }),
  );
});
it("member portal loads only its canonical customer and rejects cross-origin return URL", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db
    .doc(`users/${f.memberUid}`)
    .update({ stripeCustomerId: "cus_canonical" });
  assert.equal(
    (await billingPortal(db, f.memberUid, mock.factory, "https://velatra.test"))
      .session.url,
    "https://billing.stripe.com/mock-only",
  );
  await assert.rejects(() =>
    billingPortal(
      db,
      f.memberUid,
      mock.factory,
      "https://velatra.test",
      "https://bad.test/",
    ),
  );
  await assert.rejects(() =>
    billingPortal(db, f.owner, mock.factory, "https://velatra.test"),
  );
});
it("credit adjustments are idempotent and internal cancellation preserves subscription history", async () => {
  const f = await fixture();
  await Promise.all([
    adjustBillingCredits(db, f.owner, f.memberId, {
      delta: 1,
      requestId: "credits-request-001",
    }),
    adjustBillingCredits(db, f.owner, f.memberId, {
      delta: 1,
      requestId: "credits-request-001",
    }),
  ]);
  assert.equal((await db.doc(`users/${f.memberUid}`).get()).data()?.credits, 4);
  await assert.rejects(() =>
    adjustBillingCredits(db, f.coach, f.memberId, {
      delta: 1,
      requestId: "credits-request-002",
    }),
  );
  const s = await assignBillingSubscription(db, f.owner, f.assign);
  await cancelInternalSubscription(db, f.owner, s?.id);
  assert.equal(
    (await db.doc(`subscriptions/${s?.id}`).get()).data()?.status,
    "cancelled",
  );
});
it("metrics use recurring active snapshots, known VAT only and real refunds, with exact date and CSV handling", () => {
  const base: any = { price: 120, billingCycle: "monthly", status: "active" },
    m = billingMetrics(
      [
        base,
        { ...base, price: 1200, billingCycle: "yearly" },
        { ...base, price: 999, billingCycle: "once" },
        { ...base, status: "pending" },
      ],
      [
        { amount: 120, status: "paid", vatRate: 20 },
        { amount: 40, status: "paid" },
        { amount: 50, status: "refunded", refundedAmount: 50 },
      ] as any,
      [{ amount: 30, vatRate: 0 }] as any,
    );
  assert.equal(m.mrr, 220);
  assert.equal(m.arr, 2640);
  assert.equal(m.arpu, 110);
  assert.equal(m.revenue, 160);
  assert.equal(m.vatCollected, 20);
  assert.equal(m.unknownVatCount, 1);
  assert.equal(vatPart(40, undefined), null);
  assert.equal(vatPart(40, 0), 0);
  assert.equal(
    matchesPeriod("2026-08-31", "thisMonth", new Date("2026-09-30")),
    false,
  );
  assert.equal(
    matchesPeriod("2026-10-01", "30d", new Date("2026-09-30")),
    false,
  );
  assert.equal(
    creditGrant({
      billingCycle: "yearly",
      credits: 2,
      creditsInterval: "weekly",
    }).credits,
    104,
  );
  assert.match(financialCsv([['a;"b\nc', "=1+1"]]), /"a;""b\nc";"'=1\+1"/);
});

it("checkout and manual collection cannot overlap, even with a different retry channel", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 49,
    method: "card",
    requestId: "channel-request-001",
  });
  await billingCheckout(
    db,
    f.owner,
    { paymentId: p!.id, amount: 1, customerId: "cus_attacker" },
    mock.factory,
    "https://velatra.test",
  );
  assert.equal(
    mock.sessions.get("cs_mock").line_items[0].price_data.unit_amount,
    4900,
  );
  await assert.rejects(() =>
    settleManualPayment(db, f.owner, p!.id, { method: "cash" }),
  );
  await assert.rejects(() =>
    chargeBillingPayment(db, f.owner, p!.id, mock.factory),
  );
  assert.equal(mock.creates(), 0);
});
it("changed Stripe account and old uncertain operation cannot recreate a payment", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db.doc(`users/${f.memberUid}`).update({ stripeCustomerId: "cus_mock" });
  mock.stripe.paymentIntents.create = async () => {
    throw Error("uncertain transport");
  };
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 49,
    method: "card",
    requestId: "uncertain-request-001",
  });
  await assert.rejects(() =>
    chargeBillingPayment(db, f.owner, p!.id, mock.factory),
  );
  const ops = await db
    .collection("billingOperations")
    .where("clubId", "==", f.clubId)
    .get();
  assert.equal(ops.size, 1);
  await ops.docs[0].ref.update({ createdMillis: Date.now() - 25 * 3600000 });
  await assert.rejects(
    () => chargeBillingPayment(db, f.owner, p!.id, mock.factory),
    /réconcilier/,
  );
  await db
    .doc(`stripeSecrets/${f.clubId}`)
    .update({ stripeAccountId: "acct_changed" });
  await assert.rejects(
    () => chargeBillingPayment(db, f.owner, p!.id, mock.factory),
    /Compte Stripe modifié/,
  );
  assert.equal(
    (await db.doc(`payments/${p!.id}`).get()).data()?.status,
    "pending",
  );
});
it("absence of a saved payment method fails explicitly before any charge", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  await db.doc(`users/${f.memberUid}`).update({ stripeCustomerId: "cus_mock" });
  mock.stripe.customers.retrieve = async () => ({
    id: "cus_mock",
    metadata: { clubId: f.clubId, memberUid: f.memberUid },
  });
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 49,
    method: "card",
    requestId: "missing-method-001",
  });
  await assert.rejects(
    () => chargeBillingPayment(db, f.owner, p!.id, mock.factory),
    /Aucun moyen/,
  );
  assert.equal(mock.creates(), 0);
});
it("receipt, manual settlement and refund cannot cross a club or bypass assigned-coach scope", async () => {
  const f = await fixture(),
    g = await fixture();
  const p = await createBillingPayment(db, f.owner, {
    memberId: f.memberId,
    amount: 49,
    method: "cash",
    requestId: "manual-security-001",
  });
  await assert.rejects(() =>
    settleManualPayment(db, g.owner, p!.id, { method: "cash" }),
  );
  await assert.rejects(() =>
    settleManualPayment(db, f.memberUid, p!.id, { method: "cash" }),
  );
  await settleManualPayment(db, f.coach, p!.id, { method: "cash" });
  await assert.rejects(() => receiptForPayment(db, g.owner, p!.id));
  await assert.rejects(() =>
    refundManualPayment(db, f.coach, p!.id, {
      requestId: "manual-refund-security-001",
    }),
  );
  await assert.rejects(() =>
    refundManualPayment(db, g.owner, p!.id, {
      requestId: "manual-refund-security-001",
    }),
  );
});
it("a signed one-time checkout maps exactly, refuses a wrong amount and grants only once", async () => {
  const f = await fixture(),
    mock = mockStripe(f);
  const p = await saveBillingPlan(db, f.owner, {
    ...f.plan,
    billingCycle: "once",
  });
  await db.doc(`plans/${p!.id}`).update({ stripePriceId: "price_mock" });
  mock.stripe.prices.retrieve = async () => ({
    unit_amount: 5000,
    currency: "eur",
    metadata: { clubId: f.clubId, planId: p!.id },
  });
  const sub = await assignBillingSubscription(db, f.owner, {
    ...f.assign,
    collectionMode: "stripe",
  });
  await billingCheckout(
    db,
    f.owner,
    { subscriptionId: sub!.id },
    mock.factory,
    "https://velatra.test",
  );
  const object = {
      ...mock.sessions.get("cs_mock"),
      payment_status: "paid",
      amount_total: 5000,
      currency: "eur",
      payment_intent: "pi_once",
    },
    event = {
      id: "evt_once",
      created: 1788220800,
      type: "checkout.session.completed",
      data: { object },
    };
  await assert.rejects(() =>
    processBillingStripeEvent(db, f.clubId, {
      ...event,
      data: { object: { ...object, amount_total: 1 } },
    }),
  );
  await Promise.all([
    processBillingStripeEvent(db, f.clubId, event),
    processBillingStripeEvent(db, f.clubId, event),
  ]);
  assert.equal(
    (await db.collection("payments").where("clubId", "==", f.clubId).get())
      .size,
    1,
  );
  assert.equal((await db.doc(`users/${f.memberUid}`).get()).data()?.credits, 5);
  assert.equal(
    (await db.doc(`users/${f.memberUid}`).get()).data()?.sessionCredits.default,
    3,
  );
});
it("new invoice payment mapping and refunds are monotonic despite repeated or out-of-order events", async () => {
  const f = await fixture();
  await db.doc(`plans/${f.plan.id}`).update({ stripePriceId: "price_mock" });
  const sub = await assignBillingSubscription(db, f.owner, {
    ...f.assign,
    collectionMode: "stripe",
  });
  await db.doc(`users/${f.memberUid}`).update({ stripeCustomerId: "cus_mock" });
  const invoice = {
    id: "in_modern",
    customer: "cus_mock",
    currency: "eur",
    amount_paid: 5000,
    created: 1788220800,
    parent: {
      subscription_details: {
        subscription: "sub_mock",
        metadata: {
          clubId: f.clubId,
          subscriptionId: sub!.id,
          memberUid: f.memberUid,
          planId: f.plan.id,
        },
      },
    },
    payments: {
      data: [
        {
          status: "paid",
          payment: { type: "payment_intent", payment_intent: "pi_modern" },
        },
      ],
    },
  };
  await recordPaidInvoice(db, invoice, f.clubId);
  const records = await db
    .collection("payments")
    .where("clubId", "==", f.clubId)
    .get();
  assert.equal(records.size, 1);
  assert.equal(records.docs[0].data().stripePaymentIntentId, "pi_modern");
  const refund = (n: number) => ({
    id: "evt_refund",
    created: 1788220900,
    type: "charge.refunded",
    data: { object: { payment_intent: "pi_modern", amount_refunded: n } },
  });
  await processBillingStripeEvent(db, f.clubId, refund(2000));
  assert.equal(
    (await records.docs[0].ref.get()).data()?.status,
    "partially_refunded",
  );
  await processBillingStripeEvent(db, f.clubId, refund(5000));
  await processBillingStripeEvent(db, f.clubId, refund(1000));
  await recordPaidInvoice(db, invoice, f.clubId);
  assert.equal((await records.docs[0].ref.get()).data()?.status, "refunded");
  assert.equal((await records.docs[0].ref.get()).data()?.refundedAmount, 50);
  await processBillingStripeEvent(db, f.clubId, {
    id: "evt_failed_old",
    created: 1788220700,
    type: "invoice.payment_failed",
    data: { object: { ...invoice, created: 1788220700 } },
  });
  assert.equal(
    (await db.doc(`subscriptions/${sub!.id}`).get()).data()?.status,
    "active",
  );
  await processBillingStripeEvent(db, f.clubId, {
    id: "evt_deleted",
    created: 1788221000,
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_mock" } },
  });
  await recordPaidInvoice(
    db,
    { ...invoice, id: "in_modern_later", created: 1788221100 },
    f.clubId,
  );
  assert.equal(
    (await db.doc(`subscriptions/${sub!.id}`).get()).data()?.status,
    "cancelled",
  );
});
it("ambiguous legacy Stripe subscriptions are refused rather than selecting the first", async () => {
  const f = await fixture();
  await db.doc(`subscriptions/legacy-one-${f.clubId}`).set({
    clubId: f.clubId,
    memberId: f.memberId,
    status: "active",
    stripeSubscriptionId: "sub_ambiguous",
  });
  await db.doc(`subscriptions/legacy-two-${f.clubId}`).set({
    clubId: f.clubId,
    memberId: f.memberId,
    status: "active",
    stripeSubscriptionId: "sub_ambiguous",
  });
  await assert.rejects(() =>
    recordPaidInvoice(
      db,
      {
        id: "in_ambiguous",
        subscription: "sub_ambiguous",
        amount_paid: 4900,
        created: 1788220800,
        currency: "eur",
      },
      f.clubId,
    ),
  );
  assert.equal(
    (await db.collection("payments").where("clubId", "==", f.clubId).get())
      .size,
    0,
  );
});
it("HT without VAT cannot create a Stripe price, archived or cross-club plans cannot sync", async () => {
  const f = await fixture(),
    g = await fixture(),
    mock = mockStripe(f);
  await saveBillingPlan(db, f.owner, {
    ...f.plan,
    isTTC: false,
    vatRate: null,
  });
  await assert.rejects(
    () => syncBillingPlan(db, f.owner, f.plan.id, mock.factory),
    /TVA/,
  );
  await assert.rejects(() =>
    syncBillingPlan(db, g.owner, f.plan.id, mock.factory),
  );
  await archiveBillingPlan(db, f.owner, f.plan.id);
  await assert.rejects(() =>
    syncBillingPlan(db, f.owner, f.plan.id, mock.factory),
  );
});

it("HTTP billing ignores arbitrary amount/customer fields on charge and returns no secret", async () => {
  const { default: express } = await import("express");
  const { registerBillingRoutes } = await import("../server/billing");
  const f = await fixture(),
    mock = mockStripe(f);
  await db
    .doc(`users/${f.memberUid}`)
    .update({ stripeCustomerId: "cus_canonical" });
  const p = await createBillingPayment(db, f.owner, {
      memberId: f.memberId,
      amount: 42,
      method: "card",
      requestId: "http-canonical-request",
    }),
    app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.auth = { uid: req.headers["x-qa-uid"] };
    next();
  });
  registerBillingRoutes(app, db, mock.factory);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const response = await fetch(
      `${origin}/api/billing/payments/${p!.id}/charge`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-qa-uid": f.owner },
        body: JSON.stringify({
          amount: 1,
          customerId: "cus_attacker",
          clubId: "other",
          role: "superadmin",
        }),
      },
    );
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(
      !text.includes("mock-only") &&
        !text.includes("mock-signature") &&
        !text.includes("cus_attacker"),
    );
    assert.equal((await db.doc(`payments/${p!.id}`).get()).data()?.amount, 42);
    const denied = await fetch(
      `${origin}/api/billing/payments/${p!.id}/charge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-qa-uid": f.memberUid,
        },
        body: "{}",
      },
    );
    assert.equal(denied.status, 403);
    const old = await fetch(`${origin}/api/stripe/charge-customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-qa-uid": f.owner },
      body: "{}",
    });
    assert.equal(old.status, 410);
  } finally {
    await new Promise<void>((r, e) =>
      server.close((err) => (err ? e(err) : r())),
    );
  }
});
it("per-club raw webhook accepts its signature only, refuses another secret and unconfigured global endpoint", async () => {
  const { default: express } = await import("express");
  const { default: Stripe } = await import("stripe");
  const { registerBillingWebhooks } = await import("../server/stripePayments");
  const f = await fixture();
  await db.doc(`stripeSecrets/${f.clubId}`).set({
    secretKey: "sk_test_fixture_only",
    webhookSecret: "whsec_fixtureOnly",
  });
  const app = express();
  registerBillingWebhooks(app, db);
  app.use(express.json());
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${(server.address() as any).port}`,
    stripe = new Stripe("sk_test_fixture_only"),
    body = JSON.stringify({
      id: "evt_signature",
      type: "fixture.noop",
      created: Math.floor(Date.now() / 1000),
      data: { object: { metadata: { clubId: f.clubId } } },
    });
  const before = await db
    .collection("payments")
    .where("clubId", "==", f.clubId)
    .get();
  try {
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: "whsec_fixtureOnly",
    });
    const result = await fetch(`${origin}/api/stripe/webhook/${f.clubId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body,
    });
    assert.equal(result.status, 200);
    const wrong = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: "whsec_otherClub",
    });
    assert.equal(
      (
        await fetch(`${origin}/api/stripe/webhook/${f.clubId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": wrong,
          },
          body,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${origin}/api/stripe/webhook/missing-club`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": signature,
          },
          body,
        })
      ).status,
      503,
    );
    assert.equal(
      (await db.collection("payments").where("clubId", "==", f.clubId).get())
        .size,
      before.size,
    );
  } finally {
    await new Promise<void>((r, e) =>
      server.close((err) => (err ? e(err) : r())),
    );
  }
});

it("late failed invoice event cannot undo paid proof and dates use real payment time", async () => {
  const f = await fixture();
  await db.doc(`plans/${f.plan.id}`).update({ stripePriceId: "price_mock" });
  const sub = await assignBillingSubscription(db, f.owner, {
    ...f.assign,
    collectionMode: "stripe",
  });
  await db.doc(`users/${f.memberUid}`).update({ stripeCustomerId: "cus_mock" });
  const invoice = {
    id: "in_latefailure",
    customer: "cus_mock",
    currency: "eur",
    amount_paid: 5000,
    created: 1788220800,
    status_transitions: { paid_at: 1788307200 },
    parent: {
      subscription_details: {
        subscription: "sub_mock",
        metadata: {
          clubId: f.clubId,
          subscriptionId: sub!.id,
          memberUid: f.memberUid,
        },
      },
    },
  };
  await recordPaidInvoice(db, invoice, f.clubId);
  const payments = await db
    .collection("payments")
    .where("clubId", "==", f.clubId)
    .get();
  assert.equal(
    payments.docs[0].data().date,
    new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
  );
  await processBillingStripeEvent(db, f.clubId, {
    id: "evt_latefailure",
    created: 1788307300,
    type: "invoice.payment_failed",
    data: { object: invoice },
  });
  await processBillingStripeEvent(db, f.clubId, {
    id: "evt_old_subscription",
    created: 1788220700,
    type: "customer.subscription.updated",
    data: { object: { id: "sub_mock", status: "past_due" } },
  });
  assert.equal(
    (await db.doc(`subscriptions/${sub!.id}`).get()).data()?.status,
    "active",
  );
});
