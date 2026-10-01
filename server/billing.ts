import { authorizationActor, canManageBilling, canUseBilling } from './authorization.ts';
import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import type { Express } from "express";
import Stripe from "stripe";
import { createHash } from "node:crypto";
import { resolveAccountType } from "../productCapabilities.ts";
import { creditGrant } from "../components/billingMetrics.ts";

export class BillingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const fail = (status: number, message: string): never => {
  throw new BillingError(status, message);
};
const cleanId = (v: any) =>
  typeof v === "string" && /^[\w-]{1,150}$/.test(v)
    ? v
    : fail(400, "Référence invalide.");
const requestId = (v: any) =>
  typeof v === "string" && /^[\w-]{16,80}$/.test(v)
    ? v
    : fail(400, "Identifiant de requête invalide.");
const hash = (v: any) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const money = (v: any) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v > 0 &&
  v <= 1_000_000 &&
  Math.abs(v * 100 - Math.round(v * 100)) < 0.00001
    ? v
    : fail(400, "Montant invalide (deux décimales maximum).");
const text = (v: any, max = 500) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const date = (v: any) =>
  typeof v === "string" && Number.isFinite(Date.parse(v))
    ? new Date(v).toISOString()
    : fail(400, "Date invalide.");
const currency = (v: any) =>
  !v || (typeof v === "string" && v.toLowerCase() === "eur")
    ? "eur"
    : fail(400, "Seuls les montants en EUR sont pris en charge.");
const assigned = (member: any) =>
  member.assignedCoachUid ? { assignedCoachUid: member.assignedCoachUid } : {};
const objectId = (o: any) => (typeof o === "string" ? o : o?.id);
export type StripeFactory = (clubId: string) => Promise<any>;
export async function billingStripe(db: Firestore, clubId: string) {
  const secret = (
    await db.doc(`stripeSecrets/${cleanId(clubId)}`).get()
  ).data();
  if (!secret?.secretKey) fail(409, "Configuration Stripe indisponible.");
  return new Stripe(secret.secretKey);
}
export async function billingContext(
  db: Firestore,
  uid: string,
  memberId?: any,
  sensitiveBilling = false,
) {
  const user = (await db.doc(`users/${cleanId(uid)}`).get()).data();
  if (!user?.clubId || !canUseBilling(authorizationActor(user), user.clubId))
    fail(403, "Droits insuffisants.");
  const club = (await db.doc(`clubs/${cleanId(user.clubId)}`).get()).data();
  if (
    !club ||
    (user.role === "owner" &&
      resolveAccountType(club) !== "legacy" &&
      club.ownerId !== uid) ||
    (sensitiveBilling && !canManageBilling(authorizationActor(user, club), user.clubId))
  )
    fail(403, "Droits insuffisants.");
  if (memberId == null)
    return {
      user,
      club,
      uid,
      clubId: user.clubId,
      member: null as any,
      memberRef: null as any,
    };
  if (!Number.isSafeInteger(Number(memberId))) fail(400, "Adhérent invalide.");
  const members = await db
    .collection("users")
    .where("clubId", "==", user.clubId)
    .where("id", "==", Number(memberId))
    .limit(2)
    .get();
  if (members.size !== 1 || members.docs[0].data().role !== "member")
    fail(404, "Adhérent introuvable.");
  const member = members.docs[0].data();
  if (
    user.role === "coach" &&
    (member.assignedCoachUid !== uid ||
      !user.assignedMemberIds?.includes(Number(memberId)))
  )
    fail(403, "Cet adhérent ne vous est pas attribué.");
  return {
    user,
    club,
    uid,
    clubId: user.clubId,
    member,
    memberRef: members.docs[0].ref,
  };
}
const ttc = (p: any) => {
  if (p.isTTC !== false) return p.price;
  if (p.vatRate == null)
    fail(409, "Renseignez la TVA de cette formule HT avant de facturer.");
  return Math.round(p.price * (1 + p.vatRate / 100) * 100) / 100;
};
function validatePlan(input: any) {
  if (
    !text(input.name, 120) ||
    !["monthly", "yearly", "once"].includes(input.billingCycle)
  )
    fail(400, "Nom ou périodicité invalide.");
  const vatRate =
    input.vatRate == null || input.vatRate === ""
      ? null
      : Number(input.vatRate);
  if (
    vatRate !== null &&
    (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100)
  )
    fail(400, "Taux de TVA invalide.");
  const validCredits = (n: any) =>
    n == null || (Number.isSafeInteger(n) && n >= 0 && n <= 100000);
  if (
    !validCredits(input.credits) ||
    Object.values(input.sessionCredits || {}).some((n) => !validCredits(n))
  )
    fail(400, "Crédits invalides.");
  if (
    input.creditsInterval &&
    !["weekly", "monthly", "cycle"].includes(input.creditsInterval)
  )
    fail(400, "Période de crédits invalide.");
  if (
    Object.keys(input.sessionCredits || {}).some(
      (k) => !/^[\w-]{1,100}$/.test(k),
    ) ||
    Object.values(input.sessionCreditsIntervals || {}).some(
      (i) => !["weekly", "monthly", "cycle"].includes(String(i)),
    )
  )
    fail(400, "Crédits séance invalides.");
  return {
    name: text(input.name, 120),
    price: money(input.price),
    billingCycle: input.billingCycle,
    description: text(input.description),
    currency: currency(input.currency),
    vatRate,
    isTTC: input.isTTC !== false,
    hasCommitment: !!input.hasCommitment,
    commitmentMonths: Math.max(
      0,
      Math.min(120, Number(input.commitmentMonths) || 0),
    ),
    paymentMethods: Array.isArray(input.paymentMethods)
      ? input.paymentMethods.filter((v: any) =>
          ["card", "sepa", "cash", "transfer"].includes(v),
        )
      : [],
    credits: input.credits || 0,
    creditsInterval: input.creditsInterval || "cycle",
    sessionCredits: input.sessionCredits || {},
    sessionCreditsIntervals: input.sessionCreditsIntervals || {},
  };
}
export async function saveBillingPlan(db: Firestore, uid: string, input: any) {
  const ctx = await billingContext(db, uid),
    data = validatePlan(input),
    id = input.id
      ? cleanId(input.id)
      : `plan_${hash([ctx.clubId, requestId(input.requestId)]).slice(0, 32)}`,
    ref = db.doc(`plans/${id}`);
  await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (old && old.clubId !== ctx.clubId) fail(403, "Formule inaccessible.");
    if (!input.id && old) {
      if (hash(validatePlan(old)) !== hash(data))
        fail(409, "Cette requête a déjà créé une autre formule.");
      return;
    }
    const oldNormalized = old ? validatePlan(old) : null;
    const priceChanged =
      oldNormalized &&
      ["price", "billingCycle", "currency", "vatRate", "isTTC"].some(
        (k) => oldNormalized[k] !== data[k],
      );
    const now = new Date().toISOString();
    const next: any = {
      ...old,
      ...data,
      id,
      clubId: ctx.clubId,
      isActive: old?.isActive !== false,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    };
    if (priceChanged) {
      delete next.stripePriceId;
      delete next.stripeSyncedRevision;
    }
    tx.set(ref, next);
  });
  return (await ref.get()).data();
}
export async function archiveBillingPlan(
  db: Firestore,
  uid: string,
  id: string,
) {
  const ctx = await billingContext(db, uid),
    ref = db.doc(`plans/${cleanId(id)}`);
  await db.runTransaction(async (tx) => {
    const p = (await tx.get(ref)).data();
    if (!p || p.clubId !== ctx.clubId) fail(404, "Formule introuvable.");
    tx.update(ref, { isActive: false, updatedAt: new Date().toISOString() });
  });
  return { success: true };
}
async function grant(tx: any, memberRef: any, member: any, sub: any) {
  if (sub.creditsGrantedAt) return;
  const g = sub.creditGrant || { credits: 0, sessionCredits: {} };
  const updates: any = {
    credits: (member.credits || 0) + g.credits,
    sessionCredits: { ...(member.sessionCredits || {}) },
  };
  for (const [k, n] of Object.entries(g.sessionCredits))
    updates.sessionCredits[k] = (updates.sessionCredits[k] || 0) + Number(n);
  tx.update(memberRef, updates);
}
export async function assignBillingSubscription(
  db: Firestore,
  uid: string,
  input: any,
) {
  const ctx = await billingContext(db, uid, input.memberId),
    planId = cleanId(input.planId),
    startDate = date(input.startDate),
    key = requestId(input.requestId),
    ref = db.doc(
      `subscriptions/sub_${hash([ctx.clubId, ctx.memberRef.id, key]).slice(0, 32)}`,
    );
  const signature = hash([
    planId,
    startDate,
    input.collectionMode || "manual",
    input.commitmentEndDate || null,
    input.contractUrl || null,
  ]);
  return db.runTransaction(async (tx) => {
    const [oldSnap, pSnap, mSnap, cSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.doc(`plans/${planId}`)),
      tx.get(ctx.memberRef as DocumentReference),
      tx.get(db.doc(`stripeSecrets/${ctx.clubId}`)),
    ]);
    if (oldSnap.exists) {
      if (oldSnap.data()?.assignmentSignature !== signature)
        fail(409, "Cette requête correspond à une autre assignation.");
      return oldSnap.data();
    }
    const p = pSnap.data(),
      member = mSnap.data();
    if (!p || p.clubId !== ctx.clubId) fail(404, "Formule introuvable.");
    if (p.isActive === false) fail(409, "Cette formule est archivée.");
    if (
      !member ||
      member.clubId !== ctx.clubId ||
      member.role !== "member" ||
      (ctx.user.role === "coach" && member.assignedCoachUid !== uid)
    )
      fail(409, "Adhérent modifié.");
    const existing = await tx.get(
      db
        .collection("subscriptions")
        .where("clubId", "==", ctx.clubId)
        .where("memberId", "==", Number(input.memberId)),
    );
    const open = existing.docs.filter((d) =>
      ["active", "pending", "past_due", "unpaid"].includes(d.data().status),
    );
    if (open.length) {
      const same =
        open.length === 1 &&
        open[0].data().planId === planId &&
        open[0].data().startDate === startDate &&
        (open[0].data().collectionMode || "manual") ===
          (input.collectionMode || "manual");
      if (
        same &&
        (!open[0].data().assignmentSignature ||
          open[0].data().assignmentSignature === signature)
      )
        return open[0].data();
      fail(
        409,
        "Un abonnement existe déjà. Clôturez-le avant une nouvelle assignation.",
      );
    }
    const mode = input.collectionMode === "stripe" ? "stripe" : "manual";
    if (
      mode === "stripe" &&
      (!p.stripePriceId ||
        !cSnap.data()?.secretKey ||
        !cSnap.data()?.webhookSecret)
    )
      fail(
        409,
        "Synchronisez la formule et configurez le webhook Stripe avant l’assignation Stripe.",
      );
    const now = new Date().toISOString(),
      sub: any = {
        id: ref.id,
        clubId: ctx.clubId,
        memberId: member!.id,
        memberUid: ctx.memberRef.id,
        ...assigned(member),
        planId,
        planName: p.name,
        price: p.price,
        billingCycle: p.billingCycle,
        currency: currency(p.currency),
        vatRate: p.vatRate ?? null,
        isTTC: p.isTTC !== false,
        startDate,
        status: mode === "stripe" ? "pending" : "active",
        collectionMode: mode,
        assignmentSignature: signature,
        createdByUid: uid,
        creditGrant: creditGrant(p as any),
        ...(p.stripePriceId ? { stripePriceId: p.stripePriceId } : {}),
        ...(mode === "manual" ? { creditsGrantedAt: now } : {}),
      };
    if (input.commitmentEndDate)
      sub.commitmentEndDate = date(input.commitmentEndDate);
    if (input.contractUrl) {
      if (
        !/^https:\/\//.test(input.contractUrl) ||
        input.contractUrl.length > 2000
      )
        fail(400, "Lien de contrat invalide.");
      sub.contractUrl = input.contractUrl;
    }
    tx.create(ref, sub);
    if (mode === "manual")
      await grant(tx, ctx.memberRef, member, {
        ...sub,
        creditsGrantedAt: undefined,
      });
    tx.create(db.doc(`notifications/billing_${ref.id}`), {
      clubId: ctx.clubId,
      userId: member!.id,
      ...assigned(member),
      title: "Nouvel abonnement",
      message: `Formule ${p.name} : ${mode === "stripe" ? "en attente de paiement" : "assignée"}.`,
      type: "info",
      read: false,
      createdAt: now,
      link: "profile",
    });
    return sub;
  });
}
export async function editBillingSubscription(
  db: Firestore,
  uid: string,
  id: string,
  input: any,
) {
  const ref = db.doc(`subscriptions/${cleanId(id)}`),
    s = (await ref.get()).data();
  if (!s) fail(404, "Abonnement introuvable.");
  const ctx = await billingContext(db, uid, s.memberId);
  if (s.clubId !== ctx.clubId) fail(403, "Abonnement inaccessible.");
  const updates: any = { updatedAt: new Date().toISOString() };
  for (const k of ["startDate", "endDate", "commitmentEndDate"])
    if (k in input) updates[k] = input[k] ? date(input[k]) : null;
  if ("contractUrl" in input) {
    if (input.contractUrl && !/^https:\/\//.test(input.contractUrl))
      fail(400, "Contrat invalide.");
    updates.contractUrl = text(input.contractUrl, 2000) || null;
  }
  await ref.update(updates);
  return { success: true };
}
export async function createBillingPayment(
  db: Firestore,
  uid: string,
  input: any,
) {
  const ctx = await billingContext(db, uid, input.memberId),
    id = `pay_${hash([ctx.clubId, ctx.memberRef.id, requestId(input.requestId)]).slice(0, 32)}`,
    ref = db.doc(`payments/${id}`);
  const data: any = {
    id,
    clubId: ctx.clubId,
    memberId: ctx.member.id,
    memberUid: ctx.memberRef.id,
    ...assigned(ctx.member),
    amount: money(input.amount),
    currency: currency(input.currency),
    date: date(input.date || new Date().toISOString()),
    status: "pending",
    method: ["card", "sepa", "cash", "transfer"].includes(input.method)
      ? input.method
      : "cash",
    category: ["subscription", "coaching", "boutique", "other"].includes(
      input.category,
    )
      ? input.category
      : "other",
    description: text(input.description),
    vatRate: input.vatRate == null ? null : Number(input.vatRate),
    createdByUid: uid,
  };
  if (
    data.vatRate !== null &&
    (!Number.isFinite(data.vatRate) || data.vatRate < 0 || data.vatRate > 100)
  )
    fail(400, "TVA invalide.");
  await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (old) {
      if (old.amount !== data.amount || old.method !== data.method)
        fail(409, "Requête déjà utilisée.");
      return;
    }
    tx.create(ref, data);
  });
  return (await ref.get()).data();
}
async function paymentContext(
  db: Firestore,
  uid: string,
  id: string,
  sensitiveBilling = false,
) {
  const ref = db.doc(`payments/${cleanId(id)}`),
    p = (await ref.get()).data();
  if (!p) fail(404, "Paiement introuvable.");
  const ctx = await billingContext(db, uid, p.memberId, sensitiveBilling);
  if (p.clubId !== ctx.clubId) fail(403, "Paiement inaccessible.");
  return { ...ctx, p, ref };
}
export async function settleManualPayment(
  db: Firestore,
  uid: string,
  id: string,
  input: any,
) {
  const ctx = await paymentContext(db, uid, id);
  if (!["cash", "transfer"].includes(input.method))
    fail(400, "Choisissez espèces ou virement.");
  return db.runTransaction(async (tx) => {
    const p = (await tx.get(ctx.ref)).data()!;
    if (p.status === "paid" && p.collectionChannel === "manual") return p;
    if (
      p.status !== "pending" ||
      p.stripePaymentIntentId ||
      p.stripeChargeId ||
      p.stripeInvoiceId ||
      p.collectionChannel
    )
      fail(409, "Ce paiement ne peut pas être encaissé manuellement.");
    const next = {
      status: "paid",
      method: input.method,
      date: date(input.date || new Date().toISOString()),
      collectionChannel: "manual",
      manualNote: text(input.note),
      settledByUid: uid,
    };
    tx.update(ctx.ref, next);
    return { ...p, ...next };
  });
}
export async function refundManualPayment(
  db: Firestore,
  uid: string,
  id: string,
  input: any,
) {
  const ctx = await paymentContext(db, uid, id, true);
  requestId(input.requestId);
  return db.runTransaction(async (tx) => {
    const p = (await tx.get(ctx.ref)).data()!;
    if (
      p.stripePaymentIntentId ||
      p.stripeChargeId ||
      p.stripeInvoiceId ||
      (p.collectionChannel && p.collectionChannel !== "manual") ||
      !["cash", "transfer"].includes(p.method)
    )
      fail(
        409,
        "Le remboursement Stripe se fait depuis Stripe ; il n’est pas disponible dans Velatra.",
      );
    if (p.status === "refunded") return p;
    if (p.status !== "paid")
      fail(409, "Seul un paiement encaissé peut être remboursé.");
    const next = {
      status: "refunded",
      refundedAmount: p.amount,
      refundStatus: "recorded_manual",
      refundNote: text(input.note),
      refundedAt: new Date().toISOString(),
      refundedByUid: uid,
    };
    tx.update(ctx.ref, next);
    return { ...p, ...next };
  });
}
export async function receiptForPayment(
  db: Firestore,
  uid: string,
  id: string,
) {
  const ctx = await paymentContext(db, uid, id),
    ref = db.doc(`invoices/receipt_${hash([ctx.clubId, id]).slice(0, 32)}`);
  return db.runTransaction(async (tx) => {
    const [snap, pSnap] = await Promise.all([tx.get(ref), tx.get(ctx.ref)]);
    if (snap.exists) return snap.data();
    const p = pSnap.data()!;
    if (p.status !== "paid")
      fail(409, "Un reçu nécessite un paiement encaissé.");
    const receipt = {
      id: ref.id,
      clubId: ctx.clubId,
      memberId: ctx.member.id,
      memberUid: ctx.memberRef.id,
      ...assigned(ctx.member),
      paymentId: id,
      amount: p.amount,
      currency: p.currency || "eur",
      vatRate: p.vatRate ?? null,
      date: p.date,
      status: "paid",
      number: `REC-${id}`,
      documentType: "receipt",
      clubName: ctx.club.name,
      memberName: ctx.member.name,
      memberEmail: ctx.member.email || "",
    };
    tx.create(ref, receipt);
    tx.update(ctx.ref, { invoiceId: ref.id });
    return receipt;
  });
}
export async function adjustBillingCredits(
  db: Firestore,
  uid: string,
  memberId: number,
  input: any,
) {
  const ctx = await billingContext(db, uid, memberId, true),
    delta = input.delta;
  if (!Number.isSafeInteger(delta) || Math.abs(delta) > 10000 || delta === 0)
    fail(400, "Ajustement invalide.");
  const key = requestId(input.requestId),
    op = db.doc(
      `billingOperations/credit_${hash([ctx.clubId, key]).slice(0, 32)}`,
    ),
    type = input.sessionTypeId ? cleanId(input.sessionTypeId) : null;
  return db.runTransaction(async (tx) => {
    const [old, m] = await Promise.all([
      tx.get(op),
      tx.get(ctx.memberRef as DocumentReference),
    ]);
    if (old.exists) {
      if (
        old.data()?.memberId !== memberId ||
        old.data()?.delta !== delta ||
        old.data()?.sessionTypeId !== type
      )
        fail(409, "Cette requête a déjà été utilisée.");
      return old.data()?.result;
    }
    const member = m.data()!,
      field = type ? "sessionCredits" : "credits",
      n = (type ? member.sessionCredits?.[type] : member.credits) || 0;
    if (n + delta < 0) fail(409, "Le solde ne peut pas devenir négatif.");
    const updates = type
      ? {
          sessionCredits: {
            ...(member.sessionCredits || {}),
            [type]: n + delta,
          },
        }
      : { credits: n + delta };
    tx.update(ctx.memberRef, updates);
    tx.create(op, {
      clubId: ctx.clubId,
      memberId,
      delta,
      sessionTypeId: type,
      createdAt: new Date().toISOString(),
      result: updates,
    });
    return updates;
  });
}
// Durable operation records retain Stripe's key and arguments. Uncertain old operations
// fail closed rather than reusing a key after Stripe's minimum retention window.
async function stripeContextFor(db: Firestore, clubId: string) {
  const config = (await db.doc(`stripeSecrets/${clubId}`).get()).data();
  return config?.stripeAccountId
    ? `${config.stripeAccountId}:${String(config.secretKey).match(/_(test|live)_/)?.[1] || hash(config.secretKey)}`
    : hash(config?.secretKey || "test-injected-context");
}
async function stripeOperation(
  db: Firestore,
  clubId: string,
  key: string,
  fingerprint: any,
  execute: (idempotencyKey: string) => Promise<any>,
) {
  const stripeContext = await stripeContextFor(db, clubId);
  const id = hash([clubId, stripeContext, key]),
    ref = db.doc(`billingOperations/stripe_${id}`),
    signature = hash(fingerprint);
  const cached = await db.runTransaction(async (tx) => {
    const old = (await tx.get(ref)).data();
    if (old) {
      if (old.signature !== signature)
        fail(409, "Cette opération a changé. Réconciliation nécessaire.");
      if (old.result) return old.result;
      if (Date.now() - old.createdMillis > 23 * 3600000)
        fail(
          409,
          "Opération Stripe à réconcilier avant une nouvelle tentative.",
        );
    } else
      tx.create(ref, {
        clubId,
        signature,
        createdMillis: Date.now(),
        createdAt: new Date().toISOString(),
      });
    return null;
  });
  if (cached) return cached;
  let result;
  try {
    result = await execute(`velatra-${id}`);
  } catch (e: any) {
    if (e instanceof BillingError) throw e;
    throw new BillingError(
      409,
      e?.type === "StripeCardError"
        ? "Paiement refusé ou authentification requise."
        : "Stripe n’a pas confirmé l’opération. Réessayez sans créer une nouvelle demande.",
    );
  }
  await ref.set(
    { result, completedAt: new Date().toISOString() },
    { merge: true },
  );
  return result;
}
export async function syncBillingPlan(
  db: Firestore,
  uid: string,
  id: string,
  factory: StripeFactory,
) {
  const ctx = await billingContext(db, uid, undefined, true),
    ref = db.doc(`plans/${cleanId(id)}`),
    p = (await ref.get()).data();
  if (!p || p.clubId !== ctx.clubId || p.isActive === false)
    fail(404, "Formule indisponible.");
  const data = validatePlan(p),
    signature = hash(data),
    total = ttc(data),
    stripe = await factory(ctx.clubId);
  const result = await stripeOperation(
    db,
    ctx.clubId,
    `plan:${id}:${signature}`,
    data,
    async (key) => {
      const product = await stripe.products.create(
        {
          name: data.name,
          description: data.description || undefined,
          metadata: { clubId: ctx.clubId, planId: id },
        },
        { idempotencyKey: key + "-product" },
      );
      const price = await stripe.prices.create(
        {
          product: product.id,
          currency: "eur",
          unit_amount: Math.round(total * 100),
          ...(data.billingCycle === "once"
            ? {}
            : {
                recurring: {
                  interval: data.billingCycle === "yearly" ? "year" : "month",
                },
              }),
          metadata: { clubId: ctx.clubId, planId: id },
        },
        { idempotencyKey: key + "-price" },
      );
      return { stripeProductId: product.id, stripePriceId: price.id };
    },
  );
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (!latest || hash(validatePlan(latest)) !== signature)
      fail(409, "Formule modifiée pendant la synchronisation. Réessayez.");
    tx.update(ref, { ...result, stripeSyncedRevision: signature });
  });
  return result;
}
async function checkedCustomer(
  db: Firestore,
  ctx: any,
  stripe: any,
  create = false,
) {
  const member = (await ctx.memberRef.get()).data();
  if (member.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(member.stripeCustomerId);
    if (
      customer.deleted ||
      customer.metadata?.clubId !== ctx.clubId ||
      customer.metadata?.memberUid !== ctx.memberRef.id
    )
      fail(
        409,
        "Le client Stripe historique doit être réconcilié par le propriétaire.",
      );
    return customer.id;
  }
  if (!create) fail(409, "Aucun moyen de paiement Stripe associé.");
  const result = await stripeOperation(
    db,
    ctx.clubId,
    `customer:${ctx.memberRef.id}`,
    { memberUid: ctx.memberRef.id },
    async (key) => {
      const customer = await stripe.customers.create(
        {
          name: member.name,
          email: member.email,
          metadata: {
            clubId: ctx.clubId,
            memberUid: ctx.memberRef.id,
            memberId: String(member.id),
          },
        },
        { idempotencyKey: key },
      );
      return { customerId: customer.id };
    },
  );
  await db.runTransaction(async (tx) => {
    const m = (await tx.get(ctx.memberRef as DocumentReference)).data();
    if (m?.stripeCustomerId && m.stripeCustomerId !== result.customerId)
      fail(409, "Client Stripe modifié.");
    tx.update(ctx.memberRef, {
      stripeCustomerId: result.customerId,
      stripeCustomerClubId: ctx.clubId,
    });
  });
  return result.customerId;
}
export async function chargeBillingPayment(
  db: Firestore,
  uid: string,
  id: string,
  factory: StripeFactory,
) {
  const ctx = await paymentContext(db, uid, id, true),
    stripe = await factory(ctx.clubId),
    customer = await checkedCustomer(db, ctx, stripe),
    stripeContext = await stripeContextFor(db, ctx.clubId);
  const p = await db.runTransaction(async (tx) => {
    const p = (await tx.get(ctx.ref)).data()!;
    if (p.status === "paid") return p;
    if (
      !["pending", "failed"].includes(p.status) ||
      !["card", "sepa"].includes(p.method) ||
      p.stripeInvoiceId ||
      (p.collectionChannel && p.collectionChannel !== "stripeCharge")
    )
      fail(409, "Paiement non éligible au prélèvement.");
    if (p.stripeContext && p.stripeContext !== stripeContext)
      fail(409, "Compte Stripe modifié. Réconciliation nécessaire.");
    tx.update(ctx.ref, { collectionChannel: "stripeCharge", stripeContext });
    return p;
  });
  if (p.status === "paid") return { status: "succeeded", success: true };
  const customerData = await stripe.customers.retrieve(customer),
    paymentMethod = objectId(
      customerData.invoice_settings?.default_payment_method ||
        customerData.default_source,
    );
  if (!paymentMethod)
    fail(409, "Aucun moyen de paiement enregistré. Utilisez un lien Stripe.");
  const result = await stripeOperation(
    db,
    ctx.clubId,
    `charge:${id}`,
    {
      amount: money(p.amount),
      customer,
      paymentMethod,
      currency: currency(p.currency),
    },
    async (key) => {
      let intent;
      try {
        intent = await stripe.paymentIntents.create(
          {
            amount: Math.round(p.amount * 100),
            currency: currency(p.currency),
            customer,
            payment_method: paymentMethod,
            description: text(p.description) || "Paiement Velatra",
            confirm: true,
            off_session: true,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never",
            },
            metadata: {
              clubId: ctx.clubId,
              paymentId: id,
              memberUid: ctx.memberRef.id,
            },
          },
          { idempotencyKey: key },
        );
      } catch (e: any) {
        if (e?.type === "StripeCardError" && e.payment_intent?.id)
          intent = e.payment_intent;
        else throw e;
      }
      return { id: intent.id, status: intent.status };
    },
  );
  const intent = await stripe.paymentIntents.retrieve(result.id);
  if (
    objectId(intent.customer) !== customer ||
    intent.amount !== Math.round(p.amount * 100) ||
    intent.currency !== currency(p.currency)
  )
    fail(409, "Confirmation Stripe incohérente.");
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ctx.ref)).data()!;
    if (["refunded", "partially_refunded"].includes(latest.status)) return;
    if (latest.status === "paid" && intent.status !== "succeeded") return;
    tx.update(ctx.ref, {
      stripePaymentIntentId: intent.id,
      status:
        intent.status === "succeeded"
          ? "paid"
          : ["requires_payment_method", "canceled"].includes(intent.status)
            ? "failed"
            : "pending",
      ...(intent.status === "succeeded"
        ? { date: new Date().toISOString() }
        : {}),
    });
  });
  return { success: intent.status === "succeeded", status: intent.status };
}
export async function billingCheckout(
  db: Firestore,
  uid: string,
  input: any,
  factory: StripeFactory,
  origin: string,
) {
  let ctx: any, ref!: DocumentReference, p: any, sub: any;
  if (input.subscriptionId) {
    ref = db.doc(`subscriptions/${cleanId(input.subscriptionId)}`);
    sub = (await ref.get()).data();
    if (!sub) fail(404, "Abonnement introuvable.");
    ctx = await billingContext(db, uid, sub.memberId, true);
    if (
      sub.clubId !== ctx.clubId ||
      sub.collectionMode !== "stripe" ||
      !sub.stripePriceId ||
      sub.status !== "pending"
    )
      fail(409, "Abonnement non éligible au paiement Stripe.");
  } else {
    ctx = await paymentContext(db, uid, cleanId(input.paymentId), true);
    p = ctx.p;
    ref = ctx.ref;
    if (
      !["pending", "failed"].includes(p.status) ||
      p.stripeInvoiceId ||
      (p.collectionChannel && p.collectionChannel !== "stripeCheckout")
    )
      fail(409, "Paiement non éligible à un lien Stripe.");
  }
  const secret = (await db.doc(`stripeSecrets/${ctx.clubId}`).get()).data();
  if (!secret?.webhookSecret)
    fail(
      409,
      "Configurez le webhook Stripe du club avant de générer un paiement.",
    );
  const stripe = await factory(ctx.clubId),
    customer = await checkedCustomer(db, ctx, stripe, true),
    meta: any = {
      clubId: ctx.clubId,
      memberUid: ctx.memberRef.id,
      memberId: String(ctx.member.id),
      ...(sub
        ? { subscriptionId: ref.id, planId: sub.planId }
        : { paymentId: ref.id }),
    };
  const stripeContext = await stripeContextFor(db, ctx.clubId);
  await db.runTransaction(async (tx) => {
    const latest = (await tx.get(ref)).data();
    if (
      !(sub
        ? latest?.status === "pending"
        : ["pending", "failed"].includes(latest?.status)) ||
      (latest?.collectionChannel &&
        latest.collectionChannel !== "stripeCheckout")
    )
      fail(409, "Paiement déjà en cours.");
    if (latest?.stripeContext && latest.stripeContext !== stripeContext)
      fail(409, "Compte Stripe modifié. Réconciliation nécessaire.");
    tx.update(ref, { collectionChannel: "stripeCheckout", stripeContext });
  });
  const recurring = sub && sub.billingCycle !== "once",
    snapshot = sub
      ? {
          amount: ttc(sub),
          currency: currency(sub.currency),
          priceId: sub.stripePriceId,
        }
      : { amount: money(p.amount), currency: currency(p.currency) };
  const result = await stripeOperation(
    db,
    ctx.clubId,
    `checkout:${ref.id}`,
    { ...snapshot, customer },
    async (key) => {
      if (sub) {
        const price = await stripe.prices.retrieve(sub.stripePriceId);
        if (
          (recurring
            ? price.recurring?.interval !==
                (sub.billingCycle === "yearly" ? "year" : "month") ||
              Number(price.recurring?.interval_count || 1) !== 1
            : !!price.recurring) ||
          price.active === false ||
          price.unit_amount !== Math.round(snapshot.amount * 100) ||
          price.currency !== snapshot.currency ||
          price.metadata?.clubId !== ctx.clubId ||
          price.metadata?.planId !== sub.planId
        )
          fail(409, "Le tarif Stripe ne correspond pas à cet abonnement.");
      }
      const session = await stripe.checkout.sessions.create(
        {
          mode: recurring ? "subscription" : "payment",
          customer,
          client_reference_id: ref.id,
          metadata: meta,
          ...(recurring
            ? { subscription_data: { metadata: meta } }
            : { payment_intent_data: { metadata: meta } }),
          line_items: sub
            ? [{ price: sub.stripePriceId, quantity: 1 }]
            : [
                {
                  price_data: {
                    currency: snapshot.currency,
                    unit_amount: Math.round(snapshot.amount * 100),
                    product_data: {
                      name: text(p.description) || "Paiement Velatra",
                    },
                  },
                  quantity: 1,
                },
              ],
          success_url: origin + "/dashboard",
          cancel_url: origin + "/dashboard",
        },
        { idempotencyKey: key },
      );
      return { id: session.id, url: session.url };
    },
  );
  await ref.update({ stripeCheckoutSessionId: result.id });
  return { link: result.url, sessionId: result.id };
}
export async function billingPortal(
  db: Firestore,
  uid: string,
  factory: StripeFactory,
  origin: string,
  returnUrl?: string,
) {
  const member = (await db.doc(`users/${cleanId(uid)}`).get()).data();
  if (member?.role !== "member" || !member.clubId)
    fail(403, "Portail réservé aux adhérents.");
  const ctx = { memberRef: db.doc(`users/${uid}`), clubId: member.clubId },
    stripe = await factory(member.clubId),
    customer = await checkedCustomer(db, ctx, stripe);
  const url = returnUrl || origin + "/dashboard";
  try {
    if (new URL(url).origin !== origin)
      fail(400, "L’adresse de retour doit rester sur Velatra.");
  } catch {
    fail(400, "Adresse de retour invalide.");
  }
  const s = await stripe.billingPortal.sessions.create({
    customer,
    return_url: url,
  });
  return { session: { url: s.url } };
}
export async function cancelInternalSubscription(
  db: Firestore,
  uid: string,
  id: string,
) {
  const ref = db.doc(`subscriptions/${cleanId(id)}`),
    sub = (await ref.get()).data();
  if (!sub) fail(404, "Abonnement introuvable.");
  const ctx = await billingContext(db, uid, sub.memberId);
  return db.runTransaction(async (tx) => {
    const s = (await tx.get(ref)).data()!;
    if (s.clubId !== ctx.clubId) fail(403, "Abonnement inaccessible.");
    if (
      s.stripeSubscriptionId ||
      s.stripeCheckoutSessionId ||
      (s.stripePriceId && s.collectionMode !== "manual") ||
      s.collectionMode === "stripe"
    )
      fail(409, "La résiliation Stripe se fait depuis Stripe.");
    if (s.status !== "cancelled")
      tx.update(ref, {
        status: "cancelled",
        endDate: new Date().toISOString(),
      });
    return { success: true };
  });
}
export function registerBillingRoutes(
  app: Express,
  db: Firestore,
  factory: StripeFactory = (club) => billingStripe(db, club),
) {
  const route = (
    path: string,
    fn: (req: any) => Promise<any>,
    method: "post" | "patch" = "post",
  ) =>
    app[method](path, async (req, res) => {
      try {
        res.json(await fn(req));
      } catch (e: any) {
        console.error("Billing operation failed", {
          code: e instanceof BillingError ? e.status : e?.type || "unknown",
        });
        res.status(e instanceof BillingError ? e.status : 500).json({
          error:
            e instanceof BillingError
              ? e.message
              : "L’opération financière n’a pas pu être confirmée.",
        });
      }
    });
  const origin = (req: any) =>
    new URL(process.env.APP_URL || `https://${req.headers.host}`).origin;
  route("/api/billing/plans", (r) => saveBillingPlan(db, r.auth.uid, r.body));
  route("/api/billing/plans/:id/archive", (r) =>
    archiveBillingPlan(db, r.auth.uid, String(r.params.id)),
  );
  route("/api/billing/plans/:id/sync", (r) =>
    syncBillingPlan(db, r.auth.uid, String(r.params.id), factory),
  );
  route("/api/billing/subscriptions/:id/cancel", (r) =>
    cancelInternalSubscription(db, r.auth.uid, String(r.params.id)),
  );
  route("/api/billing/subscriptions/assign", (r) =>
    assignBillingSubscription(db, r.auth.uid, r.body),
  );
  route(
    "/api/billing/subscriptions/:id",
    (r) => editBillingSubscription(db, r.auth.uid, String(r.params.id), r.body),
    "patch",
  );
  route("/api/billing/payments", (r) =>
    createBillingPayment(db, r.auth.uid, r.body),
  );
  route("/api/billing/payments/:id/manual", (r) =>
    settleManualPayment(db, r.auth.uid, String(r.params.id), r.body),
  );
  route("/api/billing/payments/:id/refund", (r) =>
    refundManualPayment(db, r.auth.uid, String(r.params.id), r.body),
  );
  route("/api/billing/payments/:id/receipt", (r) =>
    receiptForPayment(db, r.auth.uid, String(r.params.id)),
  );
  route("/api/billing/payments/:id/charge", (r) =>
    chargeBillingPayment(db, r.auth.uid, String(r.params.id), factory),
  );
  route("/api/billing/checkout", (r) =>
    billingCheckout(db, r.auth.uid, r.body, factory, origin(r)),
  );
  route("/api/billing/members/:id/credits", (r) =>
    adjustBillingCredits(db, r.auth.uid, Number(r.params.id), r.body),
  );
  route("/api/stripe/portal", (r) =>
    billingPortal(db, r.auth.uid, factory, origin(r), r.body?.returnUrl),
  );
  route("/api/stripe/webhook-config", async (r) => {
    const ctx = await billingContext(db, r.auth.uid, undefined, true);
    const secret = r.body?.webhookSecret;
    if (typeof secret !== "string" || !/^whsec_[a-zA-Z0-9]+$/.test(secret))
      fail(400, "Secret de signature invalide.");
    await db
      .doc(`stripeSecrets/${ctx.clubId}`)
      .set({ webhookSecret: secret }, { merge: true });
    return { success: true };
  });
  for (const p of [
    "/api/stripe/create-plan",
    "/api/stripe/payment-link",
    "/api/stripe/charge-customer",
  ])
    route(p, async () =>
      fail(
        410,
        "Actualisez Velatra pour utiliser le parcours de facturation sécurisé.",
      ),
    );
}
