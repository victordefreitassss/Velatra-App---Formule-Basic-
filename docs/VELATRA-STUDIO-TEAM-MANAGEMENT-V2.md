# Studio Team Management V2

## Architecture and model

The Studio Team route extends the existing `TeamPage`, role authorization, product capabilities, `apiFetch`, tenant-aware `staffReader`, Client360 navigation and Retain hook. Legacy organizations keep their existing staff administration. Studio Coach retains the `coach` role; there is no second employee role or permission system.

`users/{firebaseUid}` and `clubs/{clubId}` remain authoritative. `users.assignedCoachUid` is the canonical Coach ↔ Member relation. Existing `assignedMemberIds` and historical record synchronization are preserved, but workload never trusts that cache.

The only new persisted field is optional `users.teamSettings` on Coach profiles:

```ts
{
  capacity: number | null; // Integer 0..1000; null means unknown
  available: boolean;
  specialties: string[]; // Up to 8, max 60 characters each
  weeklyAvailability: { day: number; start: string; end: string }[];
  revision: number; // Optimistic concurrency for settings
}
```

Missing settings normalize to unknown capacity, available, no specialties/windows and revision 0. No backfill or production migration is required. Existing `status` and `isSuspended` fields carry operational access status. Missing optional dates display as unavailable.

## API and permissions

| Action | Studio Owner | Studio Manager | Studio Coach | Member |
| --- | --- | --- | --- | --- |
| `GET /api/team` | Tenant | Tenant | Own profile and assigned clients | Denied |
| Change capacity/specialties/status | Yes | Coach targets only | Denied | Denied |
| Change availability/windows | Yes | Coach targets only | Own profile only | Denied |
| Assign/reassign/remove Coach | Yes | Yes | Denied | Denied |
| Create Coach | Existing permission | Existing permission | Denied | Denied |
| Create Manager | Existing Owner permission | Denied | Denied | Denied |

The existing verified Super Admin platform console remains the privileged administration path. No tenant override or new Super Admin impersonation path is added. A role change or privilege promotion is not a Team V2 settings operation.

`GET /api/team` and `PATCH /api/team/coaches/:coachUid` reread actor, tenant and target inside a Firestore transaction. Suspended actors, inactive clubs, invalid Owner identity, cross-tenant targets and request tenant overrides are rejected. Responses project only team identities, status, settings, counts and optional interaction dates; they exclude email, private notes, health and Stripe data. Coach settings allow only availability/windows plus `expectedRevision`. Stale settings return 409.

Assignment reuses `POST /api/assign-member-coach`. Team confirmations include `expectedCoachUid` to reject stale assignments. The existing member, old/new Coach cache and historical record migration are preserved. New assignments and member creation/CRM conversion validate the actual assigned member count, target availability and capacity before transaction writes. Concurrent use of the last place cannot silently exceed capacity. Existing same-Coach assignment retries and removal remain possible. Failed member creation compensates its temporary Auth account through the existing creation flow.

The existing Firestore Rules already forbid client SDK updates to `teamSettings` and canonical assignment fields. Rules and index files are unchanged. The new queries use only scalar equality filters with a limit; Firestore supports [merging indexes for equality filters](https://firebase.google.com/docs/firestore/query-data/index-overview#use_index_merging). No new composite index is declared. No Firebase deployment was performed.

## Workload and availability

- Counts include all assigned clients, including paused clients; this is explicit in the UI. Followed clients exclude orphan Coach references. Average is calculated over active Coach profiles only.
- Capacity null: no invented ratio or spare-capacity KPI; manual assignment remains possible with an explicit warning. Capacity 0: no new assignment; no division by zero.
- Ratios at least 85% are near capacity, 100% full, above 100% overloaded. Lowering capacity can expose overload without dropping existing assignments.
- Paused, suspended or explicitly unavailable Coach profiles cannot receive new assignments. Visual workload labels never grant permission.
- Weekly windows use the existing Planning timezone, Europe/Paris. The next declared window is operational availability, not a bookable/free calendar slot. No bookings are created or changed.
- KPIs, Coach cards/detail, comparison, search, status/availability filters and sorting use the scoped Team snapshot. Detail reuses existing Retain assessments, with separate loading/error/partial-data messaging, and the existing Client360 route.
- Data clears on role/tenant change, loading and error; stale responses are discarded. Refresh occurs on focus, staff changes and every 60 seconds. Source overflow above 10,000 tenant profiles returns an explicit error rather than misleading partial KPIs.

## Verification

- `npm run lint` (TypeScript), `npm run build`, `git diff --check`.
- `npm run test:emulators`: 683 application tests plus 5 emulator guard tests, all passed, on `demo-velatra` only. New coverage includes model edge cases, tenant/role authorization, response projection, revocation, validation, stale/concurrent settings and assignments, creation quota compensation, assignment removal and SDK write denial.
- `node scripts/qa/team-browser.mjs`: 19 Owner/Manager/Coach/Member and UX/scope cases at 390/820/1440px, with synthetic local APIs and external browser requests blocked. Validates confirmation/cancellation before writes, self-only Coach controls and no horizontal overflow. Added to Mobile Browser Regression CI with screenshots/results artifacts.
- `node scripts/qa/studio-manager-activation-browser.mjs`: 44 checks passed with zero failures. The existing fixture is updated for Team API projection and current navigation. It exercises Client360, programme editor, Planning, CRM, staff provisioning and denied destinations using synthetic data.

## V3 limits and release

Bulk reassignment is deferred because the current API operates per client; adding a partial-success bulk flow is a separate design decision. There is no workload history/trend because no authoritative series exists. Calendar conflict/free-slot calculation, financial plan details, automatic allocation and new Retain scoring are outside this increment. Large-tenant aggregated/paginated snapshots beyond the explicit source bound are a future extension.

Production behavior requires releasing the application/server through the normal reviewed PR flow. This change adds no production data write during development, no Firebase Rules release, no Stripe operation and no role provisioning. The feature PR is left open for review.
