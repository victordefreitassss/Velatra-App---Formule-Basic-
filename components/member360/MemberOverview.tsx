import React, { useState } from "react";
import { OnboardingDetail } from "../../onboarding/OnboardingDetail";
import { RetentionDetail } from "../../retention/RetentionDetail";
import type { AppState, User } from "../../types";
import {
  getClient360AdminSections,
  getClient360Facts,
  getClient360Sections,
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../client360";
import { CoachFollowup } from "../CoachingFollowup";
import { EmptyState, StatusBadge } from "../internal/InternalUI";
import { getMemberTimeline, memberDate } from "./member360Model";

export function MemberOverview({
  member,
  state,
  setState,
  onNavigate,
  onPlan,
  onProgram,
}: {
  member: User;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onNavigate: (
    section: Client360SectionId,
    admin?: Client360AdminSectionId,
  ) => void;
  onPlan: () => void;
  onProgram: () => void;
}) {
  const [limit, setLimit] = useState(8),
    facts = getClient360Facts(member, state),
    timeline = getMemberTimeline(member, state, 200);
  const allowed = (id: Client360SectionId) =>
    getClient360Sections(state.currentClub, state.user || {}).some(
      (s) => s.id === id,
    );
  const billing = getClient360AdminSections(
    state.currentClub,
    state.user || {},
  ).some((s) => s.id === "billing");
  const problem =
    billing &&
    state.subscriptions.find(
      (s) =>
        s.clubId === member.clubId &&
        Number(s.memberId) === Number(member.id) &&
        ["unpaid", "past_due"].includes(s.status),
    );
  return (
    <section className="m360-overview" data-member-overview>
      <div className="m360-overview-main">
        <article className="m360-card">
          <div className="m360-section-title">
            <div>
              <span className="vi-eyebrow">Accompagnement</span>
              <h2>La prochaine étape</h2>
            </div>
            <StatusBadge>
              {member.objectifs?.[0] || "Objectif à définir"}
            </StatusBadge>
          </div>
          {allowed("coaching") && (
            <div className="m360-action-row">
              <div className="m360-row-icon">↗</div>
              <div>
                <h3>{facts.activeProgram?.name || "Aucun programme actif"}</h3>
                <p>
                  {facts.activeProgram
                    ? `Début : ${memberDate(facts.activeProgram.startDate)}${facts.activeProgram.durationWeeks ? ` · ${facts.activeProgram.durationWeeks} semaines` : ""}`
                    : `Aucun programme n’est actuellement attribué à ${member.name.split(" ")[0]}.`}
                </p>
              </div>
              <button
                className="vi-button"
                onClick={
                  facts.activeProgram ? () => onNavigate("coaching") : onProgram
                }
              >
                {facts.activeProgram ? "Ouvrir" : "Attribuer un programme"}
              </button>
            </div>
          )}
          {allowed("calendar") && (
            <div className="m360-action-row">
              <div className="m360-row-icon">◷</div>
              <div>
                <h3>
                  {facts.nextBooking
                    ? "Prochaine séance"
                    : "Aucun rendez-vous prévu"}
                </h3>
                <p>
                  {facts.nextBooking
                    ? memberDate(facts.nextBooking.startTime, true)
                    : "Aucune séance planifiée."}
                </p>
              </div>
              <button
                className="vi-button"
                onClick={
                  facts.nextBooking ? () => onNavigate("calendar") : onPlan
                }
              >
                {facts.nextBooking
                  ? "Voir le planning"
                  : "Planifier une séance"}
              </button>
            </div>
          )}
          {problem && (
            <div className="m360-action-row">
              <div>
                <h3>Paiement à examiner</h3>
                <p>
                  {problem.planName} ·{" "}
                  {problem.status === "unpaid"
                    ? "Impayé"
                    : "Paiement en retard"}
                </p>
              </div>
              <button
                className="vi-button"
                onClick={() => onNavigate("administrative", "billing")}
              >
                Voir la facturation
              </button>
            </div>
          )}
          {member.firebaseUid && (
            <CoachFollowup
              memberUid={member.firebaseUid}
              programs={[]}
              section="summary"
            />
          )}
        </article>
        <article className="m360-card">
          <div className="m360-section-title">
            <div>
              <span className="vi-eyebrow">Relation client</span>
              <h2>Historique du membre</h2>
            </div>
            <small>Événements enregistrés et réservations</small>
          </div>
          {timeline.length ? (
            <ol className="m360-timeline">
              {timeline.slice(0, limit).map((event) => (
                <li key={event.id}>
                  <span className="m360-timeline-dot" />
                  <div>
                    <div className="m360-timeline-meta">
                      <StatusBadge>{event.type}</StatusBadge>
                      <time dateTime={event.date}>
                        {memberDate(event.date, true)}
                      </time>
                    </div>
                    <h3>{event.title}</h3>
                    {event.description && <p>{event.description}</p>}
                  </div>
                  {event.section && allowed(event.section) && (
                    <button
                      className="vi-button"
                      aria-label={`Ouvrir : ${event.title}`}
                      onClick={() => onNavigate(event.section!, event.admin)}
                    >
                      Voir ↗
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="L’histoire commence ici">
              Les prochaines séances, notes et mesures apparaîtront ici.
            </EmptyState>
          )}
          {timeline.length > limit && (
            <button
              className="vi-button"
              onClick={() => setLimit((n) => n + 8)}
            >
              Afficher davantage
            </button>
          )}
          {timeline.length === 200 && (
            <small>Les 200 événements les plus récents.</small>
          )}
        </article>
      </div>
      <aside className="m360-overview-aside">
        <article className="m360-card m360-note">
          <span className="vi-eyebrow">Le fil du suivi</span>
          <h2>Dernière note</h2>
          {facts.lastNote ? (
            <>
              <p className="m360-note-content">{facts.lastNote.content}</p>
              <small>
                {memberDate(facts.lastNote.date)} ·{" "}
                {facts.lastNote.authorName || "Auteur non renseigné"}
              </small>
            </>
          ) : (
            <p>
              Ajoutez une première note de suivi pour conserver le contexte de
              l’accompagnement.
            </p>
          )}
          {allowed("followup") && (
            <button
              className="vi-button"
              onClick={() => onNavigate("followup")}
            >
              {facts.lastNote ? "Toutes les notes" : "Ajouter une note"}
            </button>
          )}
        </article>
        <article className="m360-card">
          <span className="vi-eyebrow">Progression</span>
          <h2>Dernière mesure</h2>
          {facts.lastBodyRecord ? (
            <>
              <strong className="m360-measure">
                {facts.lastBodyRecord.weight}
                <small> kg</small>
              </strong>
              <p>{memberDate(facts.lastBodyRecord.date)}</p>
              <dl className="m360-measure-details">
                <div>
                  <dt>Masse grasse</dt>
                  <dd>{facts.lastBodyRecord.fat ?? "—"} %</dd>
                </div>
                <div>
                  <dt>Masse musculaire</dt>
                  <dd>{facts.lastBodyRecord.muscle ?? "—"} kg</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>Aucune mesure enregistrée.</p>
          )}
          {allowed("progress") && (
            <button
              className="vi-button"
              onClick={() => onNavigate("progress")}
            >
              Voir la progression
            </button>
          )}
        </article>
        {member.firebaseUid && allowed("retention") && (
          <article className="m360-card">
            <RetentionDetail
              state={state}
              setState={setState}
              memberUid={member.firebaseUid}
              summary
            />
            <button
              className="vi-button"
              onClick={() => onNavigate("retention")}
            >
              Examiner les signaux
            </button>
          </article>
        )}
        {member.firebaseUid && allowed("onboarding") && (
          <article className="m360-card">
            <OnboardingDetail
              state={state}
              setState={setState}
              memberUid={member.firebaseUid}
              summary
            />
            <button
              className="vi-button"
              onClick={() => onNavigate("onboarding")}
            >
              Voir les étapes
            </button>
          </article>
        )}
      </aside>
    </section>
  );
}
