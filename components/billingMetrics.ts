import type { Payment, Plan, Subscription, Expense } from "../types";
export const paymentStatusLabels: Record<Payment["status"], string> = {
  paid: "Encaissé",
  pending: "En attente",
  failed: "Échoué",
  refunded: "Remboursé",
  partially_refunded: "Partiellement remboursé",
};
export const subscriptionStatusLabels: Record<Subscription["status"], string> =
  {
    active: "Actif",
    pending: "En attente de paiement",
    cancelled: "Résilié",
    past_due: "En retard",
    unpaid: "Impayé",
  };
export function creditGrant(
  plan: Pick<
    Plan,
    | "billingCycle"
    | "credits"
    | "creditsInterval"
    | "sessionCredits"
    | "sessionCreditsIntervals"
  >,
) {
  const factor = (interval?: string) =>
    plan.billingCycle === "monthly" && interval === "weekly"
      ? 4
      : plan.billingCycle === "yearly" && interval === "weekly"
        ? 52
        : plan.billingCycle === "yearly" && interval === "monthly"
          ? 12
          : 1;
  return {
    credits: (plan.credits || 0) * factor(plan.creditsInterval),
    sessionCredits: Object.fromEntries(
      Object.entries(plan.sessionCredits || {}).map(([id, n]) => [
        id,
        n * factor(plan.sessionCreditsIntervals?.[id]),
      ]),
    ),
  };
}
export function vatPart(amount: number, rate?: number | null) {
  return rate == null || !Number.isFinite(rate)
    ? null
    : amount - amount / (1 + rate / 100);
}
export function netPayment(payment: Payment) {
  return ["paid", "refunded", "partially_refunded"].includes(payment.status)
    ? payment.amount -
        (payment.refundedAmount ||
          (payment.status === "refunded" ? payment.amount : 0))
    : 0;
}
export function billingMetrics(
  subscriptions: Subscription[],
  payments: Payment[],
  expenses: Expense[],
) {
  const recurring = subscriptions.filter(
    (s) =>
      s.status === "active" &&
      ["monthly", "yearly"].includes(s.billingCycle) &&
      (!s.currency || s.currency.toLowerCase() === "eur"),
  );
  const mrr = recurring.reduce(
    (n, s) => n + s.price / (s.billingCycle === "yearly" ? 12 : 1),
    0,
  );
  const revenue = payments.reduce((n, p) => n + netPayment(p), 0),
    spent = expenses.reduce((n, e) => n + e.amount, 0);
  return {
    mrr,
    arr: mrr * 12,
    arpu: recurring.length ? mrr / recurring.length : 0,
    recurringCount: recurring.length,
    revenue,
    spent,
    balance: revenue - spent,
    vatCollected: payments.reduce(
      (n, p) => n + (vatPart(netPayment(p), p.vatRate) || 0),
      0,
    ),
    vatExpenses: expenses.reduce(
      (n, e) => n + (vatPart(e.amount, e.vatRate) || 0),
      0,
    ),
    unknownVatCount:
      payments.filter((p) => netPayment(p) > 0 && p.vatRate == null).length +
      expenses.filter((e) => e.vatRate == null).length,
  };
}
export function matchesPeriod(date: string, period: string, now = new Date()) {
  const n = new Date(date);
  if (!Number.isFinite(n.getTime())) return false;
  if (period === "all") return true;
  if (n.getTime() > now.getTime()) return false;
  if (period === "thisMonth")
    return (
      n.getFullYear() === now.getFullYear() && n.getMonth() === now.getMonth()
    );
  if (period === "thisYear") return n.getFullYear() === now.getFullYear();
  return n.getTime() >= now.getTime() - (period === "7d" ? 7 : 30) * 86400000;
}
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return '"' + (/^[=+@-]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"';
}
export function financialCsv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
