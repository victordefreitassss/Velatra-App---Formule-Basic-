import { it } from "node:test";
import assert from "node:assert/strict";
import type { AppState, User } from "../types.ts";
import {
  canOpenMember,
  getMemberSpaces,
  getMemberSpace,
  getMemberTimeline,
} from "../components/member360/member360Model.ts";
import { getClient360Facts } from "../components/client360.ts";
import {
  createClient360LocationState,
  getClient360AdminSection,
  getClient360Section,
  resolveClient360Member,
} from "../components/dashboardNavigation.ts";
const member = {
  id: 7,
  role: "member",
  firebaseUid: "member",
  clubId: "a",
  name: "Client synthétique",
  assignedCoachUid: "coach",
  createdAt: "2026-09-01",
  coachingNotesHistory: [
    { id: "note", date: "2026-09-20", content: "Note réelle" },
  ],
} as User;
const fixture = (
  role: User["role"] = "owner",
  accountType: "solo" | "studio" = "studio",
) =>
  ({
    user: { id: 1, role, clubId: "a", firebaseUid: role },
    currentClub: {
      id: "a",
      accountType,
      isActive: true,
      ownerId: "owner",
      canAddStaff: true,
    },
    users: [member],
    programs: [
      {
        id: 1,
        clubId: "b",
        memberId: 7,
        name: "FOREIGN",
        startDate: "2026-09-30",
      },
      {
        id: 2,
        clubId: "a",
        memberId: 7,
        name: "Programme",
        startDate: "2026-09-02",
      },
    ],
    bookings: [
      {
        id: "booking",
        clubId: "a",
        memberId: 7,
        status: "confirmed",
        type: "coaching",
        startTime: "2026-10-10",
      },
      {
        id: "foreign",
        clubId: "b",
        memberId: 7,
        status: "confirmed",
        startTime: "2026-10-01",
      },
    ],
    logs: [
      {
        id: 1,
        clubId: "b",
        memberId: 7,
        date: "2026-09-30",
        dayName: "FOREIGN",
      },
      {
        id: 2,
        clubId: "a",
        memberId: 7,
        date: "2026-09-05",
        dayName: "Séance",
      },
      {
        id: 3,
        clubId: "a",
        memberId: 8,
        date: "2026-09-28",
        dayName: "OTHER MEMBER",
      },
    ],
    bodyData: [
      { id: 1, clubId: "a", memberId: 7, date: "2026-09-07", weight: 72 },
      { id: 2, clubId: "b", memberId: 7, date: "2026-09-30", weight: 99 },
    ],
    subscriptions: [
      {
        id: "s",
        clubId: "a",
        memberId: 7,
        status: "active",
        planName: "Formule",
        startDate: "2026-09-03",
      },
    ],
    payments: [
      { id: "p", clubId: "a", memberId: 7, amount: 50, date: "2026-09-04" },
    ],
  }) as unknown as AppState;
for (const [role, type] of [
  ["owner", "solo"],
  ["owner", "studio"],
  ["manager", "studio"],
  ["coach", "studio"],
] as const)
  it(`preserves ${type} ${role} spaces and capability-scoped timeline`, () => {
    const state = fixture(role, type);
    assert.equal(canOpenMember(member, state), true);
    assert.deepEqual(
      getMemberSpaces(state).map(([id]) => id),
      [
        "overview",
        "coaching",
        "progress",
        "followup",
        "calendar",
        "communication",
        "documents",
        "management",
      ],
    );
    const events = getMemberTimeline(member, state);
    assert.ok(events.length > 0);
    assert.ok(!JSON.stringify(events).includes("FOREIGN"));
    assert.ok(!JSON.stringify(events).includes("OTHER MEMBER"));
    assert.equal(
      events.some((e) => e.type === "Paiement"),
      role !== "manager",
    );
    for (let i = 1; i < events.length; i++)
      assert.ok(Date.parse(events[i - 1].date) >= Date.parse(events[i].date));
    assert.equal(getMemberTimeline(member, state, 2).length, 2);
  });
it("excludes foreign records with colliding numeric member IDs from every fact", () => {
  const facts = getClient360Facts(member, fixture(), Date.parse("2026-10-01"));
  assert.equal(facts.nextBooking?.id, "booking");
  assert.equal(facts.activeProgram?.name, "Programme");
  assert.equal(facts.lastActivity?.id, 2);
  assert.equal(facts.lastBodyRecord?.weight, 72);
});
it("fails closed for revoked assignment, foreign tenant, missing member, disabled club and member role", () => {
  for (const state of [
    {
      ...fixture("coach"),
      user: { ...fixture("coach").user!, firebaseUid: "other" },
    },
    { ...fixture(), users: [] },
    {
      ...fixture(),
      currentClub: { ...fixture().currentClub!, isActive: false },
    },
    fixture("member"),
  ]) {
    assert.equal(canOpenMember(member, state), false);
    assert.deepEqual(getMemberTimeline(member, state), []);
  }
  assert.equal(canOpenMember({ ...member, clubId: "other" }, fixture()), false);
});
it("rejects malformed dates and never fabricates timeline events", () => {
  const state = fixture();
  state.logs = [{ ...state.logs[0], clubId: "a", date: "not-a-date" }];
  const events = getMemberTimeline(member, state);
  assert.ok(events.every((e) => Number.isFinite(Date.parse(e.date))));
});
it("keeps all existing contexts and consolidates sections without losing destinations", () => {
  for (const section of [
    "onboarding",
    "retention",
    "coaching",
    "progress",
    "followup",
    "nutrition",
    "calendar",
    "communication",
    "administrative",
    "overview",
  ] as const) {
    const ctx = createClient360LocationState(7, section);
    assert.equal(getClient360Section(ctx), section);
    assert.equal(
      resolveClient360Member([member], "a", ctx, fixture().user)?.id,
      7,
    );
  }
  for (const admin of ["profile", "billing", "documents"] as const)
    assert.equal(
      getClient360AdminSection(
        createClient360LocationState(7, "administrative", false, admin),
      ),
      admin,
    );
  assert.equal(getMemberSpace("retention", "profile"), "followup");
  assert.equal(getMemberSpace("onboarding", "profile"), "followup");
  assert.equal(getMemberSpace("nutrition", "profile"), "coaching");
  assert.equal(getMemberSpace("administrative", "documents"), "documents");
  assert.equal(
    getClient360Section({ velatraPage: "users", client360Section: "made-up" }),
    undefined,
  );
});
