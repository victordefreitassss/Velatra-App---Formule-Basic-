import React from "react";
import { subscriptionStatusLabels } from "../../components/billingMetrics";
import {
  getClient360AdminSections,
  type Client360SectionId,
} from "../../components/client360";
import { CalendarIcon, XIcon } from "../../components/Icons";
import { Badge, Button } from "../../components/UI";
import { apiFetch } from "../../firebase";
import { AppState, User } from "../../types";

interface Props {
  memberTab: Client360SectionId;
  selectedProfile: User;
  openPlanningForMember: () => void;
  state: AppState;
  bookingStatusFilter: string;
  setBookingStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  bookingTypeFilter: string;
  setBookingTypeFilter: React.Dispatch<React.SetStateAction<string>>;
  showToast: any;
}

export function MemberPlanning({
  memberTab,
  selectedProfile,
  openPlanningForMember,
  state,
  bookingStatusFilter,
  setBookingStatusFilter,
  bookingTypeFilter,
  setBookingTypeFilter,
  showToast,
}: Props) {
  const [pastLimit, setPastLimit] = React.useState(10);
  return (
    <>
      {memberTab === "calendar" && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 lg:bg-indigo-500/10 rounded-2xl text-emerald-500 lg:text-indigo-500">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">
                Agenda & Réservations
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Consultez, filtrez et gérez les réservations et le forfait
                d'abonnement actif pour {selectedProfile.name}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPlanningForMember}
            className="va-client-360-action"
          >
            <CalendarIcon size={16} /> Planifier une séance pour{" "}
            {selectedProfile.name}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* SIDEBAR FILTERS AND STATS */}
            <div className="lg:col-span-1 space-y-6">
              {/* 1. Subscription Stats Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2">
                  Abonnement & Forfait
                </h4>
                {(() => {
                  const activeSub =
                    getClient360AdminSections(
                      state.currentClub,
                      state.user || {},
                    ).some((s) => s.id === "billing") &&
                    state.subscriptions?.find(
                      (s) =>
                        s.clubId === state.user?.clubId &&
                        s.memberId === Number(selectedProfile?.id) &&
                        ["active", "pending", "past_due", "unpaid"].includes(
                          s.status,
                        ),
                    );
                  const activePlan = activeSub
                    ? state.plans?.find((p) => p.id === activeSub.planId)
                    : null;
                  const memberBookings =
                    state.bookings?.filter(
                      (b) =>
                        b.clubId === state.user?.clubId &&
                        b.memberId === Number(selectedProfile?.id) &&
                        b.status !== "cancelled",
                    ) || [];
                  const totalBookings = memberBookings.length;

                  if (!activeSub) {
                    return (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-2xl p-3 text-center space-y-1">
                          <div className="font-extrabold uppercase tracking-wide">
                            ⚠️ Pas d'abonnement en cours
                          </div>
                          <div className="text-[10px] text-red-400 font-medium normal-case">
                            Aucune formule active trouvée pour ce membre.
                          </div>
                        </div>
                        <div className="pt-2 border-t border-zinc-200/60 flex justify-between items-center text-[11px]">
                          <span className="font-bold text-zinc-500 uppercase tracking-wider">
                            Réservations totales
                          </span>
                          <span className="font-black text-zinc-900 bg-zinc-200 px-2 py-0.5 rounded-full">
                            {totalBookings}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const creditsText =
                    activePlan?.credits !== undefined
                      ? String(activePlan.credits)
                      : "Non renseigné";
                  return (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-emerald-600 lg:text-indigo-600 tracking-wider bg-emerald-50 lg:bg-indigo-50 border border-emerald-100 lg:border-indigo-100 px-2 py-1 rounded-full inline-block">
                          {subscriptionStatusLabels[activeSub.status]}
                        </span>
                        <h5 className="font-black text-zinc-950 text-xs leading-tight uppercase font-display italic">
                          {activeSub.planName || "Formule Active"}
                        </h5>
                        <p className="text-[10px] text-zinc-500 font-medium">
                          Débute le :{" "}
                          {new Date(activeSub.startDate).toLocaleDateString(
                            "fr-FR",
                          )}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-zinc-200/60 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                            Réservations totales
                          </span>
                          <span className="font-black text-emerald-600 lg:text-indigo-600 bg-emerald-50 lg:bg-indigo-50 px-2.5 py-0.5 rounded-full border border-emerald-100 lg:border-indigo-100">
                            {totalBookings}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                            Séances forfait
                          </span>
                          <span className="font-black text-zinc-800 bg-zinc-200 px-2.5 py-0.5 rounded-full">
                            {creditsText}
                          </span>
                        </div>

                        {selectedProfile.credits !== undefined && (
                          <p className="text-xs text-zinc-600">
                            Solde actuel : {selectedProfile.credits} crédit(s)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. Filters Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-2">
                  Filtres de l'Agenda
                </h4>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Statut
                  </label>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 text-zinc-800 cursor-pointer"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="confirmed">Confirmées / Actives</option>
                    <option value="pending">En attente</option>
                    <option value="completed">Terminées</option>
                    <option value="cancelled">Annulées / Rejetées</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    Type de séance
                  </label>
                  <select
                    value={bookingTypeFilter}
                    onChange={(e) => setBookingTypeFilter(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500 lg:focus:border-indigo-500 text-zinc-800 cursor-pointer"
                  >
                    <option value="all">Tous les types</option>
                    <option value="coaching">Coaching individuel</option>
                    <option value="trial">Séance d'essai</option>
                  </select>
                </div>
              </div>
            </div>

            {/* MAIN RESERVATIONS TIMELINE */}
            <div className="lg:col-span-3 space-y-4">
              {(() => {
                const rawBookings =
                  state.bookings?.filter(
                    (b) =>
                      b.clubId === state.user?.clubId &&
                      b.memberId === Number(selectedProfile?.id),
                  ) || [];

                // Filter bookings based on state
                const filteredBookings = rawBookings.filter((b) => {
                  // Status filter
                  if (
                    bookingStatusFilter === "confirmed" &&
                    b.status !== "confirmed"
                  )
                    return false;
                  if (
                    bookingStatusFilter === "pending" &&
                    b.status !== "pending"
                  )
                    return false;
                  if (
                    bookingStatusFilter === "completed" &&
                    b.status !== "completed"
                  )
                    return false;
                  if (
                    bookingStatusFilter === "cancelled" &&
                    b.status !== "cancelled" &&
                    b.status !== "rejected"
                  )
                    return false;

                  // Type filter
                  if (bookingTypeFilter === "coaching" && b.type !== "coaching")
                    return false;
                  if (bookingTypeFilter === "trial" && b.type !== "trial")
                    return false;

                  return true;
                });

                // Sort chronologically (upcoming first, then past)
                const upcoming = filteredBookings
                  .filter((b) => new Date(b.startTime).getTime() >= Date.now())
                  .sort(
                    (a, b) =>
                      new Date(a.startTime).getTime() -
                      new Date(b.startTime).getTime(),
                  );
                const past = filteredBookings
                  .filter((b) => new Date(b.startTime).getTime() < Date.now())
                  .sort(
                    (a, b) =>
                      new Date(b.startTime).getTime() -
                      new Date(a.startTime).getTime(),
                  );
                const sortedBookings = [
                  ...upcoming,
                  ...past.slice(0, pastLimit),
                ];

                if (sortedBookings.length === 0) {
                  return (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-[32px] p-12 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                      <div className="p-4 bg-zinc-200/50 rounded-full text-zinc-400 inline-block">
                        <CalendarIcon size={32} />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h4 className="font-black text-zinc-900 text-sm uppercase">
                          Aucune réservation trouvée
                        </h4>
                        <p className="text-xs text-zinc-500 leading-normal">
                          Aucun créneau de réservation ne correspond à vos
                          filtres actuels ou le membre n'a aucun enregistrement.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {sortedBookings.map((booking) => {
                      const coachName =
                        state.users?.find(
                          (u) =>
                            u.clubId === selectedProfile.clubId &&
                            (String(u.id) === booking.coachId ||
                              u.firebaseUid === booking.coachUid ||
                              u.firebaseUid === booking.coachId),
                        )?.name || "Coach du club";
                      const start = new Date(booking.startTime);
                      const end = new Date(booking.endTime);

                      // Format nicer French dates
                      const dayName = start.toLocaleDateString("fr-FR", {
                        timeZone: "Europe/Paris",
                        weekday: "short",
                      });
                      const dayNum = start.toLocaleDateString("fr-FR", {
                        timeZone: "Europe/Paris",
                        day: "numeric",
                        month: "short",
                      });
                      const timeStr = `${start.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}`;

                      return (
                        <React.Fragment key={booking.id}>
                          {(booking === upcoming[0] || booking === past[0]) && (
                            <h4 className="text-sm font-semibold pt-2">
                              {booking === upcoming[0] ? "À venir" : "Passées"}
                            </h4>
                          )}
                          <div className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              {/* Date indicator block */}
                              <div className="bg-zinc-100 border border-zinc-200/60 rounded-xl px-3.5 py-2.5 text-center min-w-[70px]">
                                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                  {dayName}
                                </div>
                                <div className="text-sm font-black text-zinc-900 uppercase font-display italic tracking-tighter">
                                  {dayNum}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-zinc-950 uppercase">
                                    {booking.type === "coaching"
                                      ? state.currentClub?.settings?.booking?.sessionTypes?.find(
                                          (type) =>
                                            type.id === booking.sessionTypeId,
                                        )?.name || "Coaching"
                                      : "Séance d'Essai"}
                                  </span>
                                  <Badge
                                    variant={
                                      booking.status === "confirmed"
                                        ? "success"
                                        : booking.status === "completed"
                                          ? "accent"
                                          : booking.status === "pending"
                                            ? "orange"
                                            : "dark"
                                    }
                                    className="uppercase !text-[9px] !px-2 !py-0.5 font-bold tracking-widest"
                                  >
                                    {booking.status === "confirmed"
                                      ? "Confirmé"
                                      : booking.status === "completed"
                                        ? "Complété"
                                        : booking.status === "pending"
                                          ? "En attente"
                                          : booking.status === "cancelled"
                                            ? "Annulé"
                                            : booking.status === "rejected"
                                              ? "Rejeté"
                                              : booking.status}
                                  </Badge>
                                </div>
                                <div className="text-[11px] text-zinc-500 font-bold flex items-center gap-1.5">
                                  <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700">
                                    {timeStr}
                                  </span>
                                  <span>
                                    • Dirigé par :{" "}
                                    <strong className="text-zinc-700 font-extrabold">
                                      {coachName}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action button */}
                            {booking.status === "confirmed" && (
                              <Button
                                variant="secondary"
                                className="!py-1.5 !px-3 font-bold !text-[9px] !rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      `Voulez-vous vraiment annuler la réservation de ${selectedProfile.name} le ${dayNum} à ${timeStr} ?`,
                                    )
                                  ) {
                                    try {
                                      const response = await apiFetch(
                                        "/api/bookings/cancel",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            id: booking.id,
                                          }),
                                        },
                                      );
                                      if (!response.ok)
                                        throw new Error("Cancellation failed");
                                      showToast(
                                        "Réservation annulée avec succès",
                                      );
                                    } catch (err) {
                                      console.error(err);
                                      showToast(
                                        "Erreur lors de l'annulation",
                                        "error",
                                      );
                                    }
                                  }
                                }}
                              >
                                <XIcon
                                  size={12}
                                  className="mr-1 inline-block"
                                />{" "}
                                ANNULER
                              </Button>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {past.length > pastLimit && (
                      <Button
                        variant="secondary"
                        onClick={() => setPastLimit((n) => n + 10)}
                      >
                        Voir les séances précédentes
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
