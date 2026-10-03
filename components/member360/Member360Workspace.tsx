import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AppState } from "../../types";
import {
  getClient360AdminSections,
  getClient360Sections,
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../client360";
import { ViewTabs } from "../internal/InternalUI";
import "./member360.css";
import {
  getMemberSpace,
  getMemberSpaces,
  type CoachingView,
  type MemberSpace,
} from "./member360Model";
export function useMemberDesktop() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const change = () => setDesktop(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return desktop;
}
export function Member360Mount({
  desktop,
  children,
}: {
  desktop: boolean;
  children: React.ReactNode;
}) {
  return desktop ? <>{children}</> : createPortal(children, document.body);
}
export function Member360Navigation({
  state,
  section,
  admin,
  coachingView,
  setCoachingView,
  onChange,
}: {
  state: AppState;
  section: Client360SectionId;
  admin: Client360AdminSectionId;
  coachingView: CoachingView;
  setCoachingView: (value: CoachingView) => void;
  onChange: (
    section: Client360SectionId,
    admin?: Client360AdminSectionId,
  ) => void;
}) {
  const active = getMemberSpace(section, admin),
    sections = getClient360Sections(state.currentClub, state.user || {}),
    admins = getClient360AdminSections(state.currentClub, state.user || {});
  const go = (space: MemberSpace) => {
    if (space === "documents") onChange("administrative", "documents");
    else if (space === "management") onChange("administrative", "profile");
    else {
      if (space === "coaching") setCoachingView("program");
      onChange(space);
    }
  };
  const subs: [string, string][] =
    active === "coaching"
      ? [
          ...(sections.some((s) => s.id === "coaching")
            ? ([
                ["program", "Programme"],
                ["sessions", "Séances"],
              ] as [string, string][])
            : []),
          ...(sections.some((s) => s.id === "nutrition")
            ? ([["nutrition", "Nutrition"]] as [string, string][])
            : []),
        ]
      : active === "followup"
        ? sections
            .filter((s) =>
              ["followup", "onboarding", "retention"].includes(s.id),
            )
            .map((s) => [s.id, s.id === "followup" ? "Notes" : s.label])
        : active === "management"
          ? admins
              .filter((s) => s.id !== "documents")
              .map((s) => [
                s.id,
                s.id === "billing" ? "Abonnement & facturation" : s.label,
              ])
          : [];
  const sub =
    active === "coaching"
      ? section === "nutrition"
        ? "nutrition"
        : coachingView
      : active === "management"
        ? admin
        : section;
  return (
    <div className="m360-navigation">
      <ViewTabs
        label="Espaces Client 360"
        items={getMemberSpaces(state)}
        active={active}
        onChange={go}
      />
      {subs.length > 0 && (
        <div className="m360-subnav">
          <ViewTabs
            label="Rubriques Client 360"
            items={subs}
            active={sub}
            onChange={(value) => {
              if (active === "coaching") {
                if (value === "nutrition") onChange("nutrition");
                else {
                  setCoachingView(value as CoachingView);
                  onChange("coaching");
                }
              } else if (active === "management")
                onChange("administrative", value as Client360AdminSectionId);
              else onChange(value as Client360SectionId);
            }}
          />
        </div>
      )}
    </div>
  );
}
