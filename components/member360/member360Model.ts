import type { AppState, User } from "../../types";
import {
  getClient360AdminSections,
  getClient360Facts,
  getClient360Sections,
  type Client360AdminSectionId,
  type Client360SectionId,
} from "../client360";
import {
  createClient360LocationState,
  resolveClient360Member,
} from "../dashboardNavigation";

export type MemberSpace =
  | "overview"
  | "coaching"
  | "progress"
  | "followup"
  | "calendar"
  | "communication"
  | "documents"
  | "management";
export type CoachingView = "program" | "sessions";
export function canOpenMember(
  member: User,
  state: Pick<AppState, "user" | "users" | "currentClub">,
): boolean {
  return (
    !!state.user &&
    state.user.clubId === state.currentClub?.id &&
    getClient360Sections(state.currentClub, state.user).length > 0 &&
    !!member.firebaseUid &&
    resolveClient360Member(
      state.users,
      state.user.clubId,
      createClient360LocationState(Number(member.id)),
      state.user,
    )?.firebaseUid === member.firebaseUid &&
    member.clubId === state.user.clubId
  );
}
export function getMemberSpaces(
  state: Pick<AppState, "user" | "currentClub">,
): [MemberSpace, string][] {
  const sections = new Set(
    getClient360Sections(state.currentClub, state.user || {}).map((s) => s.id),
  );
  const admin = getClient360AdminSections(state.currentClub, state.user || {});
  const spaces: [MemberSpace, string][] = [];
  if (sections.has("overview")) spaces.push(["overview", "Vue d’ensemble"]);
  if (sections.has("coaching") || sections.has("nutrition"))
    spaces.push(["coaching", "Coaching"]);
  if (sections.has("progress")) spaces.push(["progress", "Progression"]);
  if (sections.has("followup")) spaces.push(["followup", "Suivi"]);
  if (sections.has("calendar")) spaces.push(["calendar", "Planning"]);
  if (sections.has("communication")) spaces.push(["communication", "Messages"]);
  if (admin.some((s) => s.id === "documents"))
    spaces.push(["documents", "Documents"]);
  if (admin.some((s) => s.id === "profile" || s.id === "billing"))
    spaces.push(["management", "Gestion"]);
  return spaces;
}
export function getMemberSpace(
  section: Client360SectionId,
  admin: Client360AdminSectionId,
): MemberSpace {
  if (section === "nutrition") return "coaching";
  if (section === "onboarding" || section === "retention") return "followup";
  if (section === "administrative")
    return admin === "documents" ? "documents" : "management";
  return section;
}
export const memberDate = (value?: string | number, time = false) => {
  if (!value || !Number.isFinite(new Date(value).getTime()))
    return "Non renseigné";
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  });
};
export interface MemberTimelineEntry {
  id: string;
  type: string;
  date: string;
  title: string;
  description?: string;
  section?: Client360SectionId;
  admin?: Client360AdminSectionId;
}
/** Derived read model. No persisted events, guessed dates or cross-tenant joins. */
export function getMemberTimeline(
  member: User,
  state: AppState,
  limit = 12,
): MemberTimelineEntry[] {
  if (!canOpenMember(member, state)) return [];
  const entries: MemberTimelineEntry[] = [];
  const own = (item: { clubId: string; memberId?: number }) =>
    item.clubId === member.clubId &&
    Number(item.memberId) === Number(member.id);
  const push = (entry: MemberTimelineEntry) => {
    if (Number.isFinite(new Date(entry.date).getTime())) entries.push(entry);
  };
  if (member.createdAt)
    push({
      id: "joined",
      type: "Profil",
      date: member.createdAt,
      title: "Inscription du membre",
      section: "administrative",
      admin: "profile",
    });
  for (const note of member.coachingNotesHistory || [])
    push({
      id: `note-${note.id}`,
      type: "Suivi",
      date: note.date,
      title: "Note de suivi",
      description: note.content,
      section: "followup",
    });
  for (const item of state.logs.filter(own))
    push({
      id: `log-${item.id}`,
      type: "Séance",
      date: item.completedAt || item.date,
      title: item.dayName || "Séance enregistrée",
      description: item.notes,
      section: "coaching",
    });
  for (const item of state.bodyData.filter(own))
    push({
      id: `body-${item.id}`,
      type: "Mesure",
      date: item.date,
      title: "Mesure corporelle",
      description: `${item.weight} kg`,
      section: "progress",
    });
  for (const item of state.programs.filter(own))
    push({
      id: `program-${item.id}`,
      type: "Programme",
      date: item.startDate,
      title: item.name,
      section: "coaching",
    });
  for (const item of state.bookings.filter(own))
    push({
      id: `booking-${item.id}`,
      type: "Planning",
      date: item.startTime,
      title: item.type === "trial" ? "Séance découverte" : "Séance de coaching",
      description:
        {
          confirmed: "Confirmée",
          completed: "Terminée",
          cancelled: "Annulée",
          rejected: "Refusée",
          pending: "En attente",
        }[item.status] || item.status,
      section: "calendar",
    });
  if (
    getClient360AdminSections(state.currentClub, state.user || {}).some(
      (s) => s.id === "billing",
    )
  ) {
    for (const item of state.subscriptions.filter(own))
      push({
        id: `subscription-${item.id}`,
        type: "Abonnement",
        date: item.startDate,
        title: item.planName,
        section: "administrative",
        admin: "billing",
      });
    for (const item of state.payments.filter(own))
      push({
        id: `payment-${item.id}`,
        type: "Paiement",
        date: item.date,
        title: "Paiement enregistré",
        description: `${item.amount.toFixed(2)} €`,
        section: "administrative",
        admin: "billing",
      });
  }
  return entries
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, Math.min(limit, 200)));
}
export { getClient360Facts };
