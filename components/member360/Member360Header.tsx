import React from "react";
import type { AppState, User } from "../../types";
import {
  getClient360AdminSections,
  getClient360CoachingContact,
  getClient360Facts,
} from "../client360";
import { StatusBadge } from "../internal/InternalUI";
import { memberDate } from "./member360Model";

export function Member360Header({
  member,
  state,
  actions,
  onClose,
  onEdit,
  closeRef,
}: {
  member: User;
  state: AppState;
  actions: React.ReactNode;
  onClose: () => void;
  onEdit: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
}) {
  const facts = getClient360Facts(member, state);
  const coach = getClient360CoachingContact(member, state.currentClub, [
    ...state.users,
    ...(state.user ? [state.user] : []),
  ]);
  const status = member.isSuspended
    ? "Suspendu"
    : member.status === "paused"
      ? "En pause"
      : member.status === "active"
        ? "Actif"
        : "Statut non renseigné";
  const billing = getClient360AdminSections(
    state.currentClub,
    state.user || {},
  ).some((s) => s.id === "billing");
  return (
    <header className="m360-header">
      <div className="m360-breadcrumb">
        <button ref={closeRef} type="button" onClick={onClose}>
          ← Retour
        </button>
        <span>
          Dossier client / <strong>{member.name}</strong>
        </span>
        <span className="vi-eyebrow">Client 360</span>
      </div>
      <div className="m360-identity-row">
        <div className="m360-avatar">
          {member.avatar?.startsWith("http") ? (
            <img src={member.avatar} alt="" />
          ) : (
            member.name
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
          )}
        </div>
        <div className="m360-identity">
          <div>
            <h1>{member.name}</h1>
            <StatusBadge
              tone={
                member.isSuspended || member.status === "paused"
                  ? "lost"
                  : "neutral"
              }
            >
              {status}
            </StatusBadge>
          </div>
          <p>
            {[member.email, member.phone].filter(Boolean).join(" · ") ||
              "Coordonnées non renseignées"}
          </p>
          <p>
            Coach : <strong>{coach?.name || "Non affecté"}</strong>
            {member.createdAt && (
              <> · Inscription le {memberDate(member.createdAt)}</>
            )}
            {billing && facts.activeSubscription && (
              <> · {facts.activeSubscription.planName}</>
            )}
          </p>
        </div>
        <button type="button" className="vi-button" onClick={onEdit}>
          Modifier le profil
        </button>
      </div>
      <div className="m360-header-actions">{actions}</div>
      <div className="m360-facts">
        <Fact
          label="Prochaine séance"
          value={
            facts.nextBooking
              ? memberDate(facts.nextBooking.startTime, true)
              : "Aucune séance planifiée"
          }
          detail={
            facts.nextBooking
              ? facts.nextBooking.type === "trial"
                ? "Séance découverte"
                : "Coaching confirmé"
              : "Réservations confirmées"
          }
        />
        <Fact
          label="Programme actif"
          value={facts.activeProgram?.name || "Aucun programme attribué"}
          detail={
            facts.activeProgram?.durationWeeks
              ? `${facts.activeProgram.durationWeeks} semaines`
              : "Accompagnement"
          }
        />
        <Fact
          label="Dernière séance"
          value={
            facts.lastActivity
              ? memberDate(facts.lastActivity.date)
              : "Aucune séance enregistrée"
          }
          detail={facts.lastActivity?.dayName || "Activité réelle du membre"}
        />
        <Fact
          label="Dernier suivi"
          value={
            facts.lastNote
              ? memberDate(facts.lastNote.date)
              : "Aucune note de suivi"
          }
          detail={
            facts.lastNote
              ? "Note coaching"
              : "Conservez le contexte de la relation"
          }
        />
      </div>
    </header>
  );
}
function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
