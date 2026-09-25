# Firestore security audit

## Scope

- Project: `velatra-75daa`.
- Production client: `(default)` database, Standard edition, `eur3`.
- AI Studio/local client: `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878`, Enterprise edition, `europe-west1`.
- Application records contain legacy numeric member IDs. The app now uses explicit `assignedCoachUid` on member profiles and member-scoped records, plus a server-maintained `assignedMemberIds` index on coach profiles.
- This audit and the emulator suite do not read or change production documents. Rules are not deployed by this file.

## Changes under review

- Coaches can query only profiles with their own `assignedCoachUid` and role `member`.
- Coach queries for programs, nutrition, tracking, bookings, notifications, messages, and other member-scoped collections now include the assigned coach UID. Rules reject unfiltered same-club reads and verify record assignment on direct reads and writes.
- Members can read their own profile and records. Profile updates cannot change role, club, Firebase UID, or assigned coach. Club owners retain access to their club roster and records.
- An authenticated server endpoint maintains assignment indexes and backfills assignment metadata onto existing member records. Owners can assign or unassign members from the member edit screen; reassignment also migrates record metadata.
- New client writes to member-scoped collections attach the assignment metadata. Client-side profile creation is denied; the authenticated server endpoint creates profiles and numeric IDs.
- Git-tracked Firebase configuration maps the same rules to both known databases. A deployment must be scoped to Firestore rules only.

## Emulator red-team results

- Adherent reading own and another profile: allowed / denied as expected.
- Coach querying assigned and unassigned member profiles: assigned results only; direct reads of other members and coaches denied.
- Coach reading assigned program records: allowed; other-member, cross-club, and unfiltered club reads denied.
- Same assigned-member filtering is tested across all 14 member-scoped collections.
- Owner roster and record reads: allowed.
- Forged assignment on a new record and member attempts to change role or coach: denied.
- Existing checks plus new Firestore Rules Emulator tests pass locally.

## Remaining limitations and operational risks

1. **Legacy assignments require an owner decision.** Existing member accounts without an authoritative `assignedCoachUid` will remain visible to owners and invisible to coaches until an owner assigns a coach. This avoids guessing who should see sensitive health and progress information.
2. **Schema validation is incomplete.** Member records have stricter ownership checks, but field types, allowed keys, document sizes, and required fields are not exhaustively validated for every legacy collection.
3. **Club operations remain club-scoped.** Coaches may read operational collections such as exercises, schedules, shared files, and tasks where the existing product treats those as team resources. This audit focuses on per-member profile, health, program, nutrition, payment, and progress records.
4. **Production behavior needs an authenticated smoke test.** Emulator tests prove rule behavior but cannot confirm every production Firebase identity, Firestore index, Vercel environment variable, or real account workflow.

## Security score

{"score":7,"summary":"The critical same-club cross-coach exposure is addressed in the proposed Firestore rules and covered by emulator tests across member-scoped collections. Deployment still depends on a reviewed rules-only release, legacy coach assignments must be explicitly migrated by the owner, and schema validation plus production smoke tests remain incomplete.","findings":[{"check":"Business logic vs. rules / unauthorized read","severity":"resolved in proposed rules; verify after deployment","issue":"Previously any coach in the club could read other members' profiles and records. Proposed rules require the authenticated coach UID to match the assigned UID, while members are restricted to their own records and owners retain club access.","recommendation":"Deploy the tested rules to the two configured databases, then validate with real coach/member accounts without exposing account credentials."},{"check":"Assignment migration","severity":"major operational","issue":"Legacy member profiles without assignedCoachUid are not automatically attributed to a coach, so those members remain owner-only until an owner chooses an assignment.","recommendation":"Use the owner assignment control to assign each existing member deliberately; do not infer assignments from club membership."},{"check":"Schema and resource validation","severity":"major","issue":"Ownership is enforced, but field allowlists, types, size bounds, and required-field checks are not exhaustive across the legacy document schemas.","recommendation":"Add collection-specific schema constraints incrementally, backed by tests for current client write shapes."},{"check":"Deployment and production verification","severity":"moderate","issue":"The repository now has explicit mappings, but production rules and Vercel environment behavior still require a successful scoped deployment and post-deployment verification.","recommendation":"Deploy only Firestore rules, confirm the deployed rules for each configured database, then smoke-test owner, coach, and member flows."}]}
