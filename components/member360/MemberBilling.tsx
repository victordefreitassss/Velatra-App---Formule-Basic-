import React from "react";
import {
  netPayment,
  paymentStatusLabels,
  subscriptionStatusLabels,
} from "../../components/billingMetrics";
import {
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../../components/client360";
import {
  BellIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  MailIcon,
} from "../../components/Icons";
import { Badge, Button, Input } from "../../components/UI";
import {
  AppState,
  BodyData,
  Invoice,
  Payment,
  Performance,
  Program,
  Subscription,
  User,
} from "../../types";

interface Props {
  state: AppState;
  memberTab: Client360SectionId;
  adminSection: Client360AdminSectionId;
  selectedProfile: User;
  billingBusy: boolean;
  handleUpdateCredits: (member: User, delta: number) => Promise<void>;
  handleUpdateSessionCredits: (
    member: User,
    sessionTypeId: string,
    delta: number,
  ) => Promise<void>;
  stats: {
    perfs: Performance[];
    body: BodyData[];
    program: Program;
    totalSpent: number;
    memberOrders: import("../../types").SupplementOrder[];
    subscription: Subscription;
  };
  isEditingSub: boolean;
  subStartDate: string;
  setSubStartDate: React.Dispatch<React.SetStateAction<string>>;
  subCommitmentDate: string;
  setSubCommitmentDate: React.Dispatch<React.SetStateAction<string>>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  subContractUrl: string;
  setSubContractUrl: React.Dispatch<React.SetStateAction<string>>;
  setIsEditingSub: React.Dispatch<React.SetStateAction<boolean>>;
  handleUpdateSubscription: () => Promise<void>;
  isAssigningPlan: boolean;
  billingMode: "manual" | "stripe";
  setBillingMode: React.Dispatch<React.SetStateAction<"manual" | "stripe">>;
  selectedPlanId: string;
  setSelectedPlanId: React.Dispatch<React.SetStateAction<string>>;
  setIsAssigningPlan: React.Dispatch<React.SetStateAction<boolean>>;
  handleAssignSubscription: () => Promise<void>;
  setShowOnboardingEmailModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleCopyPaymentLink: () => Promise<void>;
  isGeneratingLink: boolean;
  setIsAddingPayment: React.Dispatch<React.SetStateAction<boolean>>;
  isAddingPayment: boolean;
  newPayment: Partial<Payment>;
  setNewPayment: React.Dispatch<React.SetStateAction<Partial<Payment>>>;
  handleAddPayment: () => Promise<void>;
  isStripeConnected: boolean;
  handleCharge: (payment: Payment) => Promise<void>;
  isCharging: string;
  handleGeneratePaymentLink: (payment: Payment) => Promise<void>;
  isGeneratingLinkForPayment: string;
  handleRemind: (payment: Payment) => void;
  handleManualPayment: (payment: Payment) => Promise<void>;
  handleDownloadInvoice: (invoice: Invoice) => Promise<void>;
  handleGenerateInvoice: (payment: Payment) => Promise<void>;
}

export function MemberBilling({
  state,
  memberTab,
  adminSection,
  selectedProfile,
  billingBusy,
  handleUpdateCredits,
  handleUpdateSessionCredits,
  stats,
  isEditingSub,
  subStartDate,
  setSubStartDate,
  subCommitmentDate,
  setSubCommitmentDate,
  handleFileUpload,
  subContractUrl,
  setSubContractUrl,
  setIsEditingSub,
  handleUpdateSubscription,
  isAssigningPlan,
  billingMode,
  setBillingMode,
  selectedPlanId,
  setSelectedPlanId,
  setIsAssigningPlan,
  handleAssignSubscription,
  setShowOnboardingEmailModal,
  handleCopyPaymentLink,
  isGeneratingLink,
  setIsAddingPayment,
  isAddingPayment,
  newPayment,
  setNewPayment,
  handleAddPayment,
  isStripeConnected,
  handleCharge,
  isCharging,
  handleGeneratePaymentLink,
  isGeneratingLinkForPayment,
  handleRemind,
  handleManualPayment,
  handleDownloadInvoice,
  handleGenerateInvoice,
}: Props) {
  return (
    <>
      {state.user?.role !== "manager" &&
        memberTab === "administrative" &&
        adminSection === "billing" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-800 lg:text-indigo-800">
                    Crédits Coaching
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-zinc-50 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 shadow-sm">
                    <div>
                      <div className="text-xl font-black text-zinc-900">
                        {selectedProfile.credits || 0}
                      </div>
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Standard
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="!p-1 !h-8 !w-8 flex items-center justify-center \!bg-zinc-50 \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm"
                        disabled={state.user?.role !== "owner" || billingBusy}
                        onClick={() => handleUpdateCredits(selectedProfile, -1)}
                      >
                        -
                      </Button>
                      <Button
                        variant="secondary"
                        className="!p-1 !h-8 !w-8 flex items-center justify-center \!bg-zinc-50 \!border-zinc-200 !text-zinc-900 hover:!bg-white shadow-sm"
                        disabled={state.user?.role !== "owner" || billingBusy}
                        onClick={() => handleUpdateCredits(selectedProfile, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {state.currentClub?.settings?.booking?.sessionTypes?.map(
                    (type) => (
                      <div
                        key={type.id}
                        className="flex items-center justify-between bg-zinc-50 backdrop-blur-xl p-3 rounded-2xl border border-zinc-200 shadow-sm"
                      >
                        <div>
                          <div className="text-xl font-black text-zinc-900">
                            {selectedProfile.sessionCredits?.[type.id] || 0}
                          </div>
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            {type.name}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            className="!p-1 !h-8 !w-8 flex items-center justify-center"
                            disabled={
                              state.user?.role !== "owner" || billingBusy
                            }
                            onClick={() =>
                              handleUpdateSessionCredits(
                                selectedProfile,
                                type.id,
                                -1,
                              )
                            }
                          >
                            -
                          </Button>
                          <Button
                            variant="secondary"
                            className="!p-1 !h-8 !w-8 flex items-center justify-center"
                            disabled={
                              state.user?.role !== "owner" || billingBusy
                            }
                            onClick={() =>
                              handleUpdateSessionCredits(
                                selectedProfile,
                                type.id,
                                1,
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-800 lg:text-indigo-800">
                  Fidélité & Achats
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                      Points
                    </div>
                    <div className="text-xl font-black text-zinc-900">
                      {selectedProfile.pointsFidelite || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                      Total Achats
                    </div>
                    <div className="text-xl font-black text-emerald-800 lg:text-indigo-800">
                      {stats.totalSpent}€
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-800 lg:text-indigo-800">
                    Abonnement
                  </h3>
                </div>
                {stats.subscription ? (
                  <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <span className="min-w-0 break-words font-black text-zinc-900 text-lg uppercase italic">
                        {stats.subscription.planName}
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-green-500/20 text-emerald-900 lg:text-indigo-900 rounded-full font-black uppercase tracking-widest">
                        {subscriptionStatusLabels[stats.subscription.status]}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">
                      <span className="block text-sm">
                        {subscriptionStatusLabels[stats.subscription.status]}
                      </span>
                      {stats.subscription.price}€ /{" "}
                      {stats.subscription.billingCycle === "monthly"
                        ? "mois"
                        : stats.subscription.billingCycle === "yearly"
                          ? "an"
                          : "fois"}
                    </div>

                    <div className="pt-4 border-t  space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Début :</span>
                        <span className="font-bold text-zinc-900">
                          {new Date(
                            stats.subscription.startDate,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      {stats.subscription.commitmentEndDate && (
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">
                            Fin d'engagement :
                          </span>
                          <span
                            className={`font-bold ${new Date(stats.subscription.commitmentEndDate) < new Date() ? "text-red-500" : "text-zinc-900"}`}
                          >
                            {new Date(
                              stats.subscription.commitmentEndDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {stats.subscription.contractUrl && (
                        <div className="flex justify-between text-xs pt-2">
                          <a
                            href={stats.subscription.contractUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-800 lg:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                          >
                            <LinkIcon size={12} /> Voir le contrat
                          </a>
                        </div>
                      )}
                    </div>

                    {isEditingSub ? (
                      <div className="space-y-3 pt-4 border-t  max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Date de début
                          </label>
                          <Input
                            type="date"
                            value={subStartDate}
                            onChange={(e) => setSubStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Fin d'engagement (optionnel)
                          </label>
                          <Input
                            type="date"
                            value={subCommitmentDate}
                            onChange={(e) =>
                              setSubCommitmentDate(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Importer un contrat (PDF, Image)
                          </label>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileUpload}
                            className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 lg:bg-indigo-500/10 file:text-emerald-800 lg:text-indigo-800 hover:file:bg-emerald-500/20 lg:bg-indigo-500/20 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Ou lien du contrat (optionnel)
                          </label>
                          <Input
                            type="url"
                            placeholder="https://..."
                            value={subContractUrl}
                            onChange={(e) => setSubContractUrl(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-2 z-10">
                          <button
                            onClick={() => setIsEditingSub(false)}
                            className="flex-1 px-3 py-2 text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleUpdateSubscription}
                            className="flex-1 bg-emerald-800 lg:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
                          >
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSubStartDate(
                            stats.subscription!.startDate.split("T")[0],
                          );
                          setSubCommitmentDate(
                            stats.subscription!.commitmentEndDate
                              ? stats.subscription!.commitmentEndDate.split(
                                  "T",
                                )[0]
                              : "",
                          );
                          setSubContractUrl(
                            stats.subscription!.contractUrl || "",
                          );
                          setIsEditingSub(true);
                        }}
                        className="w-full mt-4 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-xl py-2 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors"
                      >
                        Modifier l'abonnement
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 font-medium px-1">
                      Aucun abonnement actif.
                    </p>
                    {isAssigningPlan ? (
                      <div className="space-y-3 bg-zinc-50 p-4 rounded-3xl border border-zinc-200 shadow-sm max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        <label className="block text-sm text-zinc-800 mb-2">
                          Encaissement
                          <select
                            aria-label="Mode de règlement abonnement"
                            value={billingMode}
                            onChange={(e) =>
                              setBillingMode(e.target.value as any)
                            }
                            className="w-full rounded-xl border bg-white p-3"
                          >
                            <option value="manual">
                              Interne / règlement manuel — actif immédiatement
                            </option>
                            <option
                              value="stripe"
                              disabled={state.user?.role !== "owner"}
                            >
                              Stripe — en attente jusqu’au paiement confirmé
                            </option>
                          </select>
                        </label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => {
                            const planId = e.target.value;
                            setSelectedPlanId(planId);
                            const plan = state.plans.find(
                              (p) => p.id === planId,
                            );
                            if (
                              plan &&
                              plan.hasCommitment &&
                              plan.commitmentMonths
                            ) {
                              const start = new Date(subStartDate);
                              if (!isNaN(start.getTime())) {
                                start.setMonth(
                                  start.getMonth() + plan.commitmentMonths,
                                );
                                setSubCommitmentDate(
                                  start.toISOString().split("T")[0],
                                );
                              }
                            } else {
                              setSubCommitmentDate("");
                            }
                          }}
                          className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-xs font-medium focus:outline-none focus:border-emerald-500 lg:focus:border-indigo-500 shadow-sm"
                        >
                          <option value="">Sélectionner une formule</option>
                          {state.plans
                            .filter((p) => p.isActive !== false)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} - {p.price}€
                              </option>
                            ))}
                        </select>

                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Date de début
                          </label>
                          <Input
                            type="date"
                            value={subStartDate}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              setSubStartDate(newDate);
                              const plan = state.plans.find(
                                (p) => p.id === selectedPlanId,
                              );
                              if (
                                plan &&
                                plan.hasCommitment &&
                                plan.commitmentMonths
                              ) {
                                const start = new Date(newDate);
                                if (!isNaN(start.getTime())) {
                                  start.setMonth(
                                    start.getMonth() + plan.commitmentMonths,
                                  );
                                  setSubCommitmentDate(
                                    start.toISOString().split("T")[0],
                                  );
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Fin d'engagement (optionnel)
                          </label>
                          <Input
                            type="date"
                            value={subCommitmentDate}
                            onChange={(e) =>
                              setSubCommitmentDate(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Importer un contrat (PDF, Image)
                          </label>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileUpload}
                            className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-emerald-500/10 lg:bg-indigo-500/10 file:text-emerald-800 lg:text-indigo-800 hover:file:bg-emerald-500/20 lg:bg-indigo-500/20 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 ml-1">
                            Ou lien du contrat (optionnel)
                          </label>
                          <Input
                            type="url"
                            placeholder="https://..."
                            value={subContractUrl}
                            onChange={(e) => setSubContractUrl(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2 sticky bottom-0 bg-zinc-50 pb-2 z-10">
                          <button
                            onClick={() => setIsAssigningPlan(false)}
                            className="flex-1 px-3 py-2 text-xs font-black uppercase text-zinc-500 tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleAssignSubscription}
                            disabled={!selectedPlanId || billingBusy}
                            className="flex-1 bg-emerald-800 lg:bg-indigo-800 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
                          >
                            Confirmer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => setIsAssigningPlan(true)}
                          className="w-full border border-dashed  text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 rounded-3xl py-4 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors"
                        >
                          + Assigner une formule
                        </button>
                        <button
                          onClick={() => setShowOnboardingEmailModal(true)}
                          className="w-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 rounded-3xl py-4 text-xs font-black uppercase text-zinc-500 tracking-wider transition-colors flex items-center justify-center gap-2"
                        >
                          <MailIcon size={14} /> ENVOYER CONTRAT & PAIEMENT
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-2xl text-emerald-800 lg:text-indigo-800">
                  <CreditCardIcon size={24} />
                </div>
                <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                  Finances & Facturation
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                    Solde Total Payé
                  </div>
                  <div className="text-4xl font-black text-emerald-800 lg:text-indigo-800">
                    {state.payments
                      ?.filter(
                        (p) =>
                          p.clubId === state.user?.clubId &&
                          p.memberId === Number(selectedProfile.id),
                      )
                      .reduce((sum, p) => sum + netPayment(p), 0) || 0}
                    €
                  </div>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm flex flex-col justify-center">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleCopyPaymentLink}
                    disabled={isGeneratingLink}
                    className="!py-4 mb-3"
                  >
                    <LinkIcon size={16} className="mr-2" />{" "}
                    {isGeneratingLink
                      ? "GÉNÉRATION..."
                      : "COPIER LIEN DE PAIEMENT"}
                  </Button>
                  <p className="text-[10px] text-zinc-500 text-center">
                    Envoyez ce lien à votre client pour un paiement en ligne
                    sécurisé via Stripe.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-[40px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                    Historique des prélèvements & paiements
                  </h4>
                  <Button
                    variant="secondary"
                    className="!py-2 !px-4 !text-[10px] !rounded-xl"
                    onClick={() => setIsAddingPayment(!isAddingPayment)}
                  >
                    {isAddingPayment ? "ANNULER" : "+ AJOUTER PAIEMENT"}
                  </Button>
                </div>

                {isAddingPayment && (
                  <div className="bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl p-6 mb-6 shadow-sm">
                    <h5 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4">
                      Nouveau Paiement
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Montant (€)
                        </label>
                        <Input
                          type="number"
                          value={newPayment.amount || ""}
                          onChange={(e) =>
                            setNewPayment({
                              ...newPayment,
                              amount: Number(e.target.value),
                            })
                          }
                          placeholder="Ex: 50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Date
                        </label>
                        <Input
                          type="date"
                          value={newPayment.date || ""}
                          onChange={(e) =>
                            setNewPayment({
                              ...newPayment,
                              date: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Méthode
                        </label>
                        <select
                          className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 lg:focus:border-indigo-500 shadow-sm"
                          value={newPayment.method}
                          onChange={(e) =>
                            setNewPayment({
                              ...newPayment,
                              method: e.target.value as any,
                            })
                          }
                        >
                          <option value="card">Carte Bancaire</option>
                          <option value="cash">Espèces</option>
                          <option value="transfer">Virement</option>
                          <option value="sepa">Prélèvement SEPA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Catégorie
                        </label>
                        <select
                          className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 lg:focus:border-indigo-500 shadow-sm"
                          value={newPayment.category || "other"}
                          onChange={(e) =>
                            setNewPayment({
                              ...newPayment,
                              category: e.target.value as any,
                            })
                          }
                        >
                          <option value="subscription">Abonnement</option>
                          <option value="coaching">Coaching</option>
                          <option value="boutique">Boutique</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                          Statut
                        </label>
                        <select
                          className="w-full bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-xl p-3 text-zinc-900 text-sm focus:outline-none focus:border-emerald-500 lg:focus:border-indigo-500 shadow-sm"
                          value={newPayment.status}
                          onChange={(e) =>
                            setNewPayment({
                              ...newPayment,
                              status: e.target.value as any,
                            })
                          }
                        >
                          <option value="pending">
                            En attente — à confirmer
                          </option>
                        </select>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleAddPayment}
                      disabled={!newPayment.amount || billingBusy}
                    >
                      ENREGISTRER LE PAIEMENT
                    </Button>
                  </div>
                )}

                {(state.payments?.filter(
                  (p) =>
                    p.clubId === state.user?.clubId &&
                    p.memberId === Number(selectedProfile.id),
                )?.length || 0) > 0 ? (
                  <div className="space-y-4">
                    {(state.payments || [])
                      .filter(
                        (p) =>
                          p.clubId === state.user?.clubId &&
                          p.memberId === Number(selectedProfile.id),
                      )
                      .sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )
                      .map((payment) => {
                        const invoice = state.invoices?.find(
                          (inv) => inv.paymentId === payment.id,
                        );
                        return (
                          <div
                            key={payment.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 backdrop-blur-xl border border-zinc-200 rounded-2xl gap-4 shadow-sm"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-lg font-black text-zinc-900">
                                  {payment.amount}€
                                </span>
                                <Badge
                                  variant={
                                    payment.status === "paid"
                                      ? "success"
                                      : payment.status === "pending"
                                        ? "orange"
                                        : "dark"
                                  }
                                >
                                  {paymentStatusLabels[payment.status]}
                                </Badge>
                              </div>
                              <div className="text-xs text-zinc-500">
                                {new Date(payment.date).toLocaleDateString(
                                  "fr-FR",
                                )}{" "}
                                •{" "}
                                {payment.method === "card"
                                  ? "Carte Bancaire"
                                  : payment.method === "sepa"
                                    ? "Prélèvement SEPA"
                                    : payment.method === "cash"
                                      ? "Espèces"
                                      : "Virement"}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0">
                              {["pending", "failed"].includes(
                                payment.status,
                              ) && (
                                <>
                                  {(payment.method === "card" ||
                                    payment.method === "sepa") &&
                                    isStripeConnected &&
                                    state.user?.role === "owner" && (
                                      <>
                                        <Button
                                          variant="secondary"
                                          className="!py-2 !px-3 !text-[10px] !rounded-xl text-emerald-800 lg:text-indigo-800 border-emerald-500/30 lg:border-indigo-500/30 hover:bg-emerald-500/10 lg:hover:bg-indigo-500/10"
                                          onClick={() => handleCharge(payment)}
                                          disabled={isCharging === payment.id}
                                        >
                                          <CreditCardIcon
                                            size={14}
                                            className="mr-1"
                                          />
                                          {isCharging === payment.id
                                            ? "EN COURS..."
                                            : "PRÉLEVER"}
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          className="!py-2 !px-3 !text-[10px] !rounded-xl text-blue-800 border-blue-500/30 hover:bg-blue-500/10"
                                          onClick={() =>
                                            handleGeneratePaymentLink(payment)
                                          }
                                          disabled={
                                            isGeneratingLinkForPayment ===
                                            payment.id
                                          }
                                        >
                                          <LinkIcon
                                            size={14}
                                            className="mr-1"
                                          />
                                          {isGeneratingLinkForPayment ===
                                          payment.id
                                            ? "GÉNÉRATION..."
                                            : "LIEN"}
                                        </Button>
                                      </>
                                    )}
                                  <Button
                                    variant="secondary"
                                    className="!py-2 !px-3 !text-[10px] !rounded-xl text-amber-800 border-orange-500/30 hover:bg-orange-500/10"
                                    onClick={() => handleRemind(payment)}
                                  >
                                    <BellIcon size={14} className="mr-1" />{" "}
                                    RELANCER
                                  </Button>
                                </>
                              )}

                              {payment.status === "pending" &&
                                ["cash", "transfer"].includes(
                                  payment.method,
                                ) && (
                                  <Button
                                    variant="secondary"
                                    onClick={() => handleManualPayment(payment)}
                                  >
                                    Encaisser manuellement
                                  </Button>
                                )}
                              {invoice ? (
                                <Button
                                  variant="secondary"
                                  className="!py-2 !px-3 !text-[10px] !rounded-xl"
                                  onClick={() => handleDownloadInvoice(invoice)}
                                >
                                  <DownloadIcon size={14} className="mr-1" />{" "}
                                  JUSTIFICATIF
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  disabled={payment.status !== "paid"}
                                  className="!py-2 !px-3 !text-[10px] !rounded-xl"
                                  onClick={() => handleGenerateInvoice(payment)}
                                >
                                  <FileTextIcon size={14} className="mr-1" />{" "}
                                  GÉNÉRER JUSTIFICATIF
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-sm italic">
                    Aucun paiement enregistré pour ce membre.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
    </>
  );
}
