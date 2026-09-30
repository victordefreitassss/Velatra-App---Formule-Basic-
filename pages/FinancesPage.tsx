import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Payment } from "../types";
import { apiFetch, db, doc, setDoc, deleteDoc } from "../firebase";
import { billingRequest, downloadReceipt } from "../components/billingClient";
import {
  billingMetrics,
  matchesPeriod,
  netPayment,
  paymentStatusLabels,
  subscriptionStatusLabels,
  vatPart,
  financialCsv,
} from "../components/billingMetrics";
import {
  Plus,
  Search,
  Download,
  CreditCard,
  FileText,
  Archive,
  ArrowRight,
} from "lucide-react";
const money = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    n,
  );
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800 disabled:opacity-60";
const input =
  "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 placeholder:text-zinc-600 focus:outline-2 focus:outline-emerald-800";
const panel =
  "min-w-0 rounded-2xl border border-zinc-200 bg-white/95 p-4 sm:p-5";
export const FinancesPage: React.FC<{
  state: AppState;
  setState?: any;
  showToast?: any;
}> = ({ state, showToast }) => {
  const [tab, setTab] = useState("overview"),
    [period, setPeriod] = useState("thisMonth"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Payment | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<"plan" | "payment" | "expense" | "fixed" | null>(
      null,
    ),
    [fields, setFields] = useState<any>({});
  const keys = useRef<Record<string, string>>({}),
    key = (action: string) => (keys.current[action] ||= crypto.randomUUID());
  const [stripeStatus, setStripeStatus] = useState({
    connected: false,
    webhookConfigured: false,
  });
  useEffect(() => {
    let alive = true;
    apiFetch("/api/stripe/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then((r: any) => {
        if (alive)
          setStripeStatus({
            connected: r.connected === true,
            webhookConfigured: r.webhookConfigured === true,
          });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [state.user?.clubId]);
  const selectedPayment =
    selected && (state.payments.find((p) => p.id === selected.id) || selected);
  const manager =
    state.user?.role === "owner" || state.user?.role === "superadmin";
  const members = state.users.filter((u) => u.role === "member");
  const payments = useMemo(
    () => state.payments.filter((p) => matchesPeriod(p.date, period)),
    [state.payments, period],
  );
  const expenses = useMemo(
    () => state.expenses.filter((e) => matchesPeriod(e.date, period)),
    [state.expenses, period],
  );
  const metrics = useMemo(
    () => billingMetrics(state.subscriptions, payments, expenses),
    [state.subscriptions, payments, expenses],
  );
  const memberName = (id: number) =>
    state.users.find((u) => u.id === id)?.name || `Adhérent ${id}`;
  const matching = (s: string) =>
    s.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const visiblePayments = payments
    .filter((p) =>
      matching(
        `${memberName(p.memberId)} ${p.description || ""} ${paymentStatusLabels[p.status]}`,
      ),
    )
    .sort(
      (a, b) =>
        Number(b.status === "pending") - Number(a.status === "pending") ||
        b.date.localeCompare(a.date),
    );
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "Action non confirmée.");
      showToast?.(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const action = async (path: string, body?: any) => {
    await billingRequest(path, body);
    showToast?.("Opération confirmée.");
  };
  const openForm = (kind: any) => {
    setFields({
      name: "",
      price: "",
      billingCycle: "monthly",
      description: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      method: "cash",
      vatRate: "",
      memberId: members[0]?.id || "",
      category: "other",
    });
    delete keys.current[kind];
    setForm(kind);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (form === "plan")
        await action("/api/billing/plans", {
          ...fields,
          price: Number(fields.price),
          vatRate: fields.vatRate === "" ? null : Number(fields.vatRate),
          requestId: key("plan"),
        });
      if (form === "payment")
        await action("/api/billing/payments", {
          ...fields,
          memberId: Number(fields.memberId),
          amount: Number(fields.amount),
          vatRate: fields.vatRate === "" ? null : Number(fields.vatRate),
          requestId: key("payment"),
        });
      if (form === "expense" || form === "fixed") {
        const id = key(form),
          collection = form === "expense" ? "expenses" : "fixedCosts";
        const data =
          form === "expense"
            ? {
                id,
                clubId: state.user?.clubId,
                amount: Number(fields.amount),
                category: fields.category,
                date: fields.date,
                description: fields.description,
                ...(fields.vatRate === ""
                  ? {}
                  : { vatRate: Number(fields.vatRate) }),
              }
            : {
                id,
                clubId: state.user?.clubId,
                name: fields.name,
                amount: Number(fields.amount),
              };
        if (!Number.isFinite(data.amount) || data.amount <= 0)
          throw new Error("Montant invalide.");
        await setDoc(doc(db, collection, id), data);
      }
      setForm(null);
    });
  };
  const exportRows = () => [
    ["Date", "Type", "Adhérent / description", "Montant", "TVA", "Statut"],
    ...payments.map((p) => [
      p.date,
      "Paiement",
      memberName(p.memberId),
      p.amount,
      p.vatRate ?? "Non renseignée",
      paymentStatusLabels[p.status],
    ]),
    ...expenses.map((e) => [
      e.date,
      "Dépense",
      e.description,
      -e.amount,
      e.vatRate ?? "Non renseignée",
      "Saisie interne",
    ]),
  ];
  const exportCsv = () => {
    const url = URL.createObjectURL(
        new Blob([financialCsv(exportRows())], {
          type: "text/csv;charset=utf-8;",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "export_financier.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = () =>
    run(async () => {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.text("Synthèse financière", 14, 20);
      pdf.setFontSize(10);
      pdf.text(
        [
          `Structure : ${state.currentClub?.name || "Velatra"}`,
          `Période : ${period} — export du ${new Date().toLocaleDateString("fr-FR")}`,
          `Encaissements nets des remboursements : ${money(metrics.revenue)}`,
          `Dépenses saisies : ${money(metrics.spent)}`,
          `Solde de pilotage : ${money(metrics.balance)}`,
          "Charges fixes déclarées séparément. TVA uniquement renseignée.",
          "Cette synthèse ne représente pas une comptabilité exhaustive.",
        ],
        14,
        30,
      );
      autoTable(pdf, {
        startY: 75,
        head: [exportRows()[0]],
        body: exportRows().slice(1),
      });
      pdf.save("synthese_financiere.pdf");
    });
  const checkout = (p: Payment) =>
    run(async () => {
      const r = await billingRequest("/api/billing/checkout", {
        paymentId: p.id,
      });
      await navigator.clipboard.writeText(r.link);
      showToast?.("Lien de paiement personnalisé copié.");
    });
  const receipt = (p: Payment) =>
    run(async () => {
      if (p.hostedInvoiceUrl) {
        window.open(p.hostedInvoiceUrl, "_blank", "noopener");
        return;
      }
      const r = await billingRequest(`/api/billing/payments/${p.id}/receipt`);
      await downloadReceipt(r);
    });
  const paymentActions = (p: Payment) => (
    <div className="mt-3 flex flex-wrap gap-2">
      {["pending", "failed"].includes(p.status) && (
        <>
          {["cash", "transfer"].includes(p.method) &&
            p.status === "pending" && (
              <button
                disabled={busy}
                className={button}
                onClick={() =>
                  run(() =>
                    action(`/api/billing/payments/${p.id}/manual`, {
                      method: p.method,
                      date: new Date().toISOString(),
                    }),
                  )
                }
              >
                Encaisser manuellement
              </button>
            )}
          {manager && ["card", "sepa"].includes(p.method) && (
            <>
              <button
                disabled={
                  busy ||
                  !stripeStatus.connected ||
                  !stripeStatus.webhookConfigured
                }
                className={button}
                onClick={() => checkout(p)}
              >
                Lien Stripe
              </button>
              <button
                disabled={busy || !stripeStatus.connected}
                className={button}
                onClick={() =>
                  run(async () => {
                    const r = await billingRequest(
                      `/api/billing/payments/${p.id}/charge`,
                    );
                    showToast?.(
                      r.success
                        ? "Stripe confirme l’encaissement."
                        : "Stripe attend une action.",
                    );
                  })
                }
              >
                Prélever
              </button>
            </>
          )}
        </>
      )}
      {p.status === "paid" && (
        <button disabled={busy} className={button} onClick={() => receipt(p)}>
          <FileText size={16} />
          {p.hostedInvoiceUrl ? "Facture Stripe" : "Justificatif"}
        </button>
      )}
      {manager && p.status === "paid" && (
        <details className="relative">
          <summary className={button}>Autres actions</summary>
          <div className="mt-2 rounded-xl border bg-white p-3 text-sm">
            {["cash", "transfer"].includes(p.method) &&
            !p.stripePaymentIntentId &&
            !p.stripeChargeId &&
            !p.stripeInvoiceId ? (
              <button
                disabled={busy}
                className={button}
                onClick={() => {
                  if (
                    window.confirm(
                      "Confirmez uniquement si vous avez déjà rendu ce montant au client en espèces ou par virement. Velatra enregistre ce retour ; aucun transfert n’est effectué.",
                    )
                  )
                    run(() =>
                      action(`/api/billing/payments/${p.id}/refund`, {
                        requestId: key(`refund-${p.id}`),
                        note: "Retour du montant confirmé par le responsable",
                      }),
                    );
                }}
              >
                Enregistrer le remboursement manuel complet
              </button>
            ) : (
              <p className="max-w-xs text-zinc-800">
                Le remboursement Stripe se fait depuis Stripe. Velatra ne simule
                aucun remboursement.
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="block min-w-0 text-sm font-semibold text-zinc-800">
      {label}
      <input
        name={name}
        className={input}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={fields[name] ?? ""}
        onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-5 p-3 sm:p-6 lg:p-8 text-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Finances</h1>
          <p className="mt-1 text-sm text-zinc-700">
            Encaissements, abonnements et formules de votre activité.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={exportCsv}>
            <Download size={16} />
            CSV financier
          </button>
          <button disabled={busy} className={button} onClick={exportPdf}>
            Synthèse PDF
          </button>
        </div>
      </header>
      {manager && !stripeStatus.connected && (
        <p className={panel + " text-sm text-zinc-700"}>
          Stripe indisponible. Les formules et encaissements manuels restent
          utilisables. Configurez Stripe dans Paramètres pour les paiements en
          ligne.
        </p>
      )}
      {manager && stripeStatus.connected && !stripeStatus.webhookConfigured && (
        <p className={panel + " text-sm text-zinc-700"}>
          Stripe connecté ; configurez la signature du webhook dans Paramètres
          pour les liens de paiement.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900"
        >
          {error}
        </div>
      )}
      <nav aria-label="Sections financières" className="flex flex-wrap gap-2">
        {[
          ["overview", "Résumé"],
          ["payments", "Paiements"],
          ["subscriptions", "Abonnements"],
          ["plans", "Formules"],
          ["expenses", "Dépenses"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            className={
              button +
              (tab === id
                ? " !bg-emerald-900 !text-white !border-emerald-900"
                : "")
            }
            onClick={() => {
              setTab(id);
              setSelected(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 min-w-0 text-sm font-medium">
          Rechercher
          <div className="relative">
            <Search size={16} className="absolute left-3 top-4 text-zinc-600" />
            <input
              className={input + " !pl-9"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Adhérent, formule, paiement…"
            />
          </div>
        </label>
        <label className="text-sm font-medium">
          Période des paiements et dépenses
          <select
            className={input}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="thisMonth">Ce mois</option>
            <option value="30d">30 derniers jours</option>
            <option value="7d">7 derniers jours</option>
            <option value="thisYear">Cette année</option>
            <option value="all">Toutes les dates</option>
          </select>
        </label>
      </div>
      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Encaissements nets", metrics.revenue],
              [
                "À encaisser",
                payments
                  .filter((p) => p.status === "pending")
                  .reduce((n, p) => n + p.amount, 0),
              ],
              ["Dépenses saisies", metrics.spent],
              ["Solde de pilotage", metrics.balance],
            ].map(([label, value]) => (
              <div key={label} className={panel}>
                <p className="text-sm font-medium text-zinc-700">{label}</p>
                <p className="mt-2 text-2xl font-bold">
                  {money(Number(value))}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={panel}>
              <h2 className="text-lg font-bold">Abonnements récurrents</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  ["MRR", metrics.mrr],
                  ["ARR", metrics.arr],
                  ["ARPU récurrent", metrics.arpu],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-zinc-700">{label}</dt>
                    <dd className="mt-1 text-xl font-bold">
                      {money(Number(value))}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-zinc-700">
                MRR : abonnements récurrents actifs, prix annuels divisés par
                12. ARR : MRR × 12. ARPU : MRR / {metrics.recurringCount}{" "}
                abonnements récurrents actifs. Paiements uniques exclus.
              </p>
            </section>
            <section className={panel}>
              <h2 className="text-lg font-bold">TVA renseignée</h2>
              <p className="mt-3">
                Sur encaissements : {money(metrics.vatCollected)}
              </p>
              <p className="mt-1">
                Sur dépenses : {money(metrics.vatExpenses)}
              </p>
              <p className="mt-3 text-sm text-zinc-700">
                {metrics.unknownVatCount} donnée(s) avec TVA non renseignée,
                exclue(s) de ces calculs. Ce suivi ne constitue pas une
                déclaration de TVA.
              </p>
            </section>
          </div>
          <section className={panel}>
            <h2 className="text-lg font-bold">Paiements à suivre</h2>
            <div className="mt-3 space-y-2">
              {visiblePayments
                .filter((p) => ["pending", "failed"].includes(p.status))
                .slice(0, 5)
                .map((p) => (
                  <button
                    className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-left"
                    key={p.id}
                    onClick={() => {
                      setTab("payments");
                      setSelected(p);
                    }}
                  >
                    <span className="min-w-0 break-words">
                      {memberName(p.memberId)}
                      <span className="block text-sm text-zinc-700">
                        {paymentStatusLabels[p.status]}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold">
                      {money(p.amount)}
                    </span>
                  </button>
                ))}
              {!visiblePayments.some((p) =>
                ["pending", "failed"].includes(p.status),
              ) && (
                <p className="text-sm text-zinc-700">
                  Aucun paiement nécessitant une action sur cette période.
                </p>
              )}
            </div>
          </section>
          <p className="text-sm text-zinc-700">
            Le solde utilise les encaissements nets et les dépenses saisies sur
            la période. Les charges fixes déclarées sont affichées séparément,
            sans extrapolation ni double comptage.
          </p>
        </>
      )}
      {tab === "payments" && (
        <>
          <button className={button} onClick={() => openForm("payment")}>
            <Plus size={16} />
            Créer un paiement en attente
          </button>
          <div className="grid min-w-0 gap-4 min-[1600px]:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="space-y-3">
              {visiblePayments.map((p) => (
                <article key={p.id} className={panel}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      className="min-w-0 text-left"
                      onClick={() => setSelected(p)}
                    >
                      <h2 className="break-words font-bold">
                        {memberName(p.memberId)}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-700">
                        {new Date(p.date).toLocaleDateString("fr-FR")} ·{" "}
                        {paymentStatusLabels[p.status]} · {p.method}
                      </p>
                    </button>
                    <strong>{money(p.amount)}</strong>
                  </div>
                  <p className="mt-2 break-words text-sm text-zinc-700">
                    {p.description || "Paiement"} ·{" "}
                    {p.vatRate == null
                      ? "TVA non renseignée"
                      : `TVA ${p.vatRate} %`}
                    {p.refundedAmount
                      ? ` · Remboursé ${money(p.refundedAmount)}`
                      : ""}
                  </p>
                  {paymentActions(p)}
                </article>
              ))}
              {!visiblePayments.length && (
                <p className={panel}>Aucun paiement sur cette période.</p>
              )}
            </div>
            <aside className={panel + " hidden self-start min-[1600px]:block"}>
              <h2 className="text-lg font-bold">Détail du paiement</h2>
              {selectedPayment ? (
                <>
                  <p className="mt-3 break-words">
                    {memberName(selectedPayment.memberId)}
                  </p>
                  <p className="mt-2 font-bold">
                    {money(selectedPayment.amount)} ·{" "}
                    {paymentStatusLabels[selectedPayment.status]}
                  </p>
                  <p className="mt-2 break-all text-xs text-zinc-700">
                    Référence : {selectedPayment.id}
                  </p>
                  {paymentActions(selectedPayment)}
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-700">
                  Sélectionnez un paiement pour le consulter ici.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
      {tab === "payments" && !!state.invoices?.length && (
        <details className={panel}>
          <summary className="min-h-11 cursor-pointer font-semibold">
            Justificatifs et documents historiques
          </summary>
          <p className="mt-2 text-sm text-zinc-700">
            Documents conservés ; aucune certification fiscale rétroactive.
          </p>
          <div className="mt-3 space-y-3">
            {state.invoices
              .filter((i) => matchesPeriod(i.date, period))
              .map((i) => (
                <div
                  key={i.id}
                  className="flex flex-wrap justify-between gap-2 border-t pt-3"
                >
                  <span className="min-w-0 break-words">
                    {i.number} · {memberName(i.memberId)} · {money(i.amount)} ·{" "}
                    {i.status}
                  </span>
                  <button
                    className={button}
                    disabled={busy || i.status !== "paid"}
                    onClick={() => run(() => downloadReceipt(i))}
                  >
                    Télécharger le justificatif
                  </button>
                </div>
              ))}
          </div>
        </details>
      )}
      {tab === "subscriptions" && (
        <div className="grid gap-3 xl:grid-cols-2">
          {state.subscriptions
            .filter((s) => matching(`${s.planName} ${memberName(s.memberId)}`))
            .map((s) => (
              <article key={s.id} className={panel}>
                <h2 className="break-words font-bold">
                  {memberName(s.memberId)}
                </h2>
                <p className="mt-2">
                  {s.planName} · {money(s.price)} /{" "}
                  {s.billingCycle === "monthly"
                    ? "mois"
                    : s.billingCycle === "yearly"
                      ? "an"
                      : "une fois"}
                </p>
                <p className="mt-1 text-sm text-zinc-700">
                  {subscriptionStatusLabels[s.status]} · depuis{" "}
                  {new Date(s.startDate).toLocaleDateString("fr-FR")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.contractUrl && (
                    <a
                      className={button}
                      href={s.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contrat
                    </a>
                  )}
                  {manager &&
                    s.status === "pending" &&
                    s.collectionMode === "stripe" && (
                      <button
                        disabled={
                          busy ||
                          !stripeStatus.connected ||
                          !stripeStatus.webhookConfigured
                        }
                        className={button}
                        onClick={() =>
                          run(async () => {
                            const r = await billingRequest(
                              "/api/billing/checkout",
                              { subscriptionId: s.id },
                            );
                            await navigator.clipboard.writeText(r.link);
                            showToast?.("Lien copié.");
                          })
                        }
                      >
                        Lien de paiement Stripe
                      </button>
                    )}
                  {s.status === "active" &&
                    s.collectionMode !== "stripe" &&
                    !s.stripeSubscriptionId && (
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            action(`/api/billing/subscriptions/${s.id}/cancel`),
                          )
                        }
                      >
                        Clôturer l’abonnement interne
                      </button>
                    )}
                </div>
              </article>
            ))}
          {!state.subscriptions.length && (
            <p className={panel}>
              Aucun abonnement. L’assignation se fait depuis Client 360 →
              Administratif.
            </p>
          )}
        </div>
      )}
      {tab === "plans" && (
        <>
          <button className={button} onClick={() => openForm("plan")}>
            <Plus size={16} />
            Nouvelle formule
          </button>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {state.plans
              .filter((p) => matching(p.name))
              .map((p) => (
                <article key={p.id} className={panel}>
                  <h2 className="break-words text-lg font-bold">{p.name}</h2>
                  <p className="mt-2 text-xl font-bold">
                    {money(p.price)}{" "}
                    <span className="text-sm font-normal">
                      {p.isTTC === false ? "HT" : "TTC"} /{" "}
                      {p.billingCycle === "monthly"
                        ? "mois"
                        : p.billingCycle === "yearly"
                          ? "an"
                          : "une fois"}
                    </span>
                  </p>
                  <p className="mt-2 break-words text-sm text-zinc-700">
                    {p.description || "Sans description"} ·{" "}
                    {p.isActive === false ? "Archivée" : "Disponible"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.isActive !== false && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() =>
                          run(() =>
                            action(`/api/billing/plans/${p.id}/archive`),
                          )
                        }
                      >
                        <Archive size={16} />
                        Archiver
                      </button>
                    )}
                    {manager && p.isActive !== false && (
                      <button
                        disabled={busy || !stripeStatus.connected}
                        className={button}
                        onClick={() =>
                          run(() => action(`/api/billing/plans/${p.id}/sync`))
                        }
                      >
                        {p.stripePriceId
                          ? "Vérifier la synchronisation"
                          : "Synchroniser Stripe"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
          </div>
          <p className="text-sm text-zinc-700">
            La configuration détaillée des crédits et l’édition des formules
            restent dans Paramètres. Une formule archivée reste dans
            l’historique.
          </p>
        </>
      )}
      {tab === "expenses" && (
        <>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => openForm("expense")}>
              Ajouter une dépense
            </button>
            <button className={button} onClick={() => openForm("fixed")}>
              Ajouter une charge fixe
            </button>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className={panel}>
              <h2 className="font-bold">Dépenses saisies sur la période</h2>
              {expenses
                .filter((e) => matching(e.description))
                .map((e) => (
                  <div
                    key={e.id}
                    className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-3"
                  >
                    <span className="min-w-0 break-words">
                      {e.description || e.category} · {money(e.amount)}
                      <span className="block text-sm text-zinc-700">
                        {e.vatRate == null
                          ? "TVA non renseignée"
                          : `TVA ${e.vatRate} %`}
                      </span>
                    </span>
                    <button
                      className={button}
                      onClick={() =>
                        run(async () => {
                          await deleteDoc(doc(db, "expenses", e.id));
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
            </section>
            <section className={panel}>
              <h2 className="font-bold">Charges fixes mensuelles déclarées</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Information séparée ; les dépenses réellement payées sont
                saisies dans Dépenses.
              </p>
              {state.fixedCosts?.map((c) => (
                <div
                  key={c.id}
                  className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-3"
                >
                  <span className="break-words">
                    {c.name} · {money(c.amount)} / mois
                  </span>
                  <button
                    className={button}
                    onClick={() =>
                      run(async () => {
                        await deleteDoc(doc(db, "fixedCosts", c.id));
                      })
                    }
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
      {form && (
        <section className={panel} aria-label="Formulaire financier">
          <h2 className="text-lg font-bold">
            {form === "plan"
              ? "Créer une formule"
              : form === "payment"
                ? "Créer un paiement en attente"
                : form === "expense"
                  ? "Saisir une dépense"
                  : "Déclarer une charge fixe"}
          </h2>
          <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
            {form === "payment" && (
              <label className="text-sm font-semibold">
                Adhérent
                <select
                  className={input}
                  value={fields.memberId}
                  required
                  onChange={(e) =>
                    setFields({ ...fields, memberId: e.target.value })
                  }
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["plan", "fixed"].includes(form) && field("name", "Nom")}
            {field(
              form === "plan" ? "price" : "amount",
              form === "plan" ? "Prix TTC (€)" : "Montant TTC (€)",
              "number",
            )}
            {form === "plan" && (
              <label className="text-sm font-semibold">
                Périodicité
                <select
                  className={input}
                  value={fields.billingCycle}
                  onChange={(e) =>
                    setFields({ ...fields, billingCycle: e.target.value })
                  }
                >
                  <option value="monthly">Mensuelle</option>
                  <option value="yearly">Annuelle</option>
                  <option value="once">Paiement unique</option>
                </select>
              </label>
            )}
            {form === "payment" && (
              <label className="text-sm font-semibold">
                Moyen prévu
                <select
                  className={input}
                  value={fields.method}
                  onChange={(e) =>
                    setFields({ ...fields, method: e.target.value })
                  }
                >
                  <option value="cash">Espèces</option>
                  <option value="transfer">Virement</option>
                  <option value="card">Carte / Stripe</option>
                </select>
              </label>
            )}
            {form !== "fixed" && (
              <>
                {field(
                  "vatRate",
                  "TVA (%) — laisser vide si inconnue",
                  "number",
                  false,
                )}
                {field("description", "Description", "text", false)}
              </>
            )}
            {form === "expense" && (
              <label className="text-sm font-semibold">
                Catégorie
                <select
                  className={input}
                  value={fields.category}
                  onChange={(e) =>
                    setFields({ ...fields, category: e.target.value })
                  }
                >
                  {[
                    "other",
                    "rent",
                    "equipment",
                    "marketing",
                    "salary",
                    "software",
                  ].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {["payment", "expense"].includes(form) &&
              field("date", "Date", "date")}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                disabled={busy}
                className={button + " !bg-emerald-900 !text-white"}
                type="submit"
              >
                {busy ? "Confirmation…" : "Enregistrer"}
              </button>
              <button
                className={button}
                type="button"
                onClick={() => setForm(null)}
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};
