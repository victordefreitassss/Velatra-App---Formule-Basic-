# SaaS plan and organization suspension authority — P0-01

Scope: the Owner SaaS plan/suspension bypass only. Base: `origin/main` at
`4473c536e5a432e5a339066aaf8a6a2d26f92b75`. No production data, roles,
Stripe configuration, Storage Rules or deployment is changed by this PR.

## Root cause and exploit

The `clubs/{clubId}` update rule protected only `accountType` and
`saasPlanId`. A same-club Owner could therefore update the historical
`plan`, `isActive` or `canAddStaff`, including while the organization was
suspended. For example, `updateDoc(clubRef, {plan: 'premium', isActive: true})`
passed the former rule. Hiding the Super Admin console did not protect the
underlying SDK write. Most server routes also checked only the user's own
suspension, and missing club activation was treated as active in several
places. The console's legacy initialization wrote `isActive: true` when
that value was absent.

## Inventory and source of truth

| Stored field / structure | Consumer and meaning | Authority |
| --- | --- | --- |
| `clubs.plan` (`basic`, `classic`, `premium`) | Historical commercial grant; platform console statistics and plan controls. App's historical plan variables do not currently gate paid routes. | Trusted platform server command |
| `clubs.saasPlanId` | Offer identifier used by `productExperience.ts` and the static SaaS entitlement catalog. Existing explicit offers are preview-only for non-Manager runtime; this fix does not provision a new SaaS subscription. | Existing server/migration architecture; all client writes refused |
| `clubs.accountType` | Explicit Solo/Studio organization type, including Manager scope. | Server registration and guarded account-type migration |
| `clubs.canAddStaff` | Historical staff creation grant. Explicit Studio retains its existing staff policy; Solo/legacy staff creation requires the server grant. | Trusted platform server command; checked again inside staff provisioning transaction |
| `clubs.settings.canAddStaff` | Declared legacy shape; not read as an authorization source. | Preserved, immutable through clients |
| `clubs.isActive` | Canonical organization activation/suspension. Only boolean `true` grants active tenant access. | Trusted platform server command |
| `users.isSuspended` | Individual user suspension, distinct from organization suspension. | Existing user administration; not changed by this fix |
| `plans`, `subscriptions`, `payments`, `invoices`, `stripeSecrets` | Member-facing billing and Stripe payments, **not** the organization's SaaS subscription. | Existing billing/Stripe backend; unchanged payment semantics |
| `settings.payment.stripeConnected` / `stripeAccountId` | Member-payment connector state, distinct from SaaS entitlements. | Existing Stripe connect/disconnect API; redundant frontend status writes removed |

There is no organization SaaS billing status or Stripe SaaS subscription
provisioner in this repository. Aliases such as `planId`, `subscription`,
`subscriptionStatus`, `billingStatus`, `entitlement`, `entitlements`,
`features`, `active`, `suspended`, `suspensionStatus`, and `organizationStatus`
are not consumed as organization authority. The client update allowlist
rejects additions, edits and deletions of these fields, including on legacy
club documents. Unknown future top-level fields are also denied by default.
Client caches and mutable UI state cannot authorize the backend: it reloads
the canonical club/profile; staff provisioning ignores claimed plan, type,
entitlements or staff flags in the request body.

`functions/index.js` does not mutate organization SaaS state. The account-type
migration changes only `accountType` and preserves protected field
fingerprints, including suspension. It has not been executed by this fix.

## Rules and frontend

`firestore.rules` allows only public/business club updates: name, public
email/phone/address/description/hours/links, logo, color, public coaches,
and supported settings. Nested settings diffs allow the established
onboarding, program duration, finances, loyalty, booking and payment settings;
payment diffs allow only accepted methods/auto collection. Removing a settings
map cannot delete a protected legacy staff or Stripe status field.

Owner retains these updates while active. Manager/Coach/Member receive no new
club-setting privilege. Even the verified Super Admin browser cannot directly
mutate SaaS state. Club status and the user's own profile remain readable
while suspended so the app can show the suspension screen and observe an
administrator's reactivation. Tenant business reads/writes require an active
organization. Global libraries/system notices are not tenant business data.

`AdminDashboard.tsx` routes plan, activation, staff grant and legacy initialization
through `POST /api/admin/clubs/:clubId/saas`; it no longer writes these fields
with the client SDK. Legacy initialization preserves explicit suspension and
sets absent/malformed activation to **false**, never true. The console filters
and presentation no longer infer active from absent data.

`organizationAccess.ts` centralizes the strict activation predicate. App,
capabilities, Home/Pulse and the existing server readers use this predicate.
A live suspension clears tenant state, removes tenant listeners and shows
`Compte Suspendu` for Owner, Manager, Coach and Member. The club status listener
stays attached to observe a later authorized reactivation.

## Authorized server path

The existing Express API verifies the Firebase ID token. Its middleware loads
the live user/organization and refuses suspended/missing/malformed activation
for tenant requests. The platform command additionally requires:

- the existing hard-coded verified platform identity;
- a live, unsuspended `superadmin` profile, reread inside the transaction;
- a validated command containing only historical `plan`, boolean `isActive`,
  boolean `canAddStaff`, or a standalone legacy initialization request.

The Admin SDK transaction updates the club and records the command in the
existing `admin_audit_logs`. Arbitrary entitlements/billing fields and caller
identity/role claims in the payload are rejected. An Owner cannot change a
plan through this command. No parallel Stripe subscription flow is introduced.
Registration sets a server-selected basic plan and explicit activation; client
claims cannot select a paid plan or staff grant. Existing mutation transactions
that already read a club also check its activation (staff/member provisioning,
CRM conversion, bookings, workout completion).

## Security and non-regression tests

`tests/saasAuthority.rules.test.ts` reproduces the audit with all four tenant
roles: canonical/legacy plan fields, entitlements, billing, suspension and
aliases; nested writes, field deletions, document replacement, merge and mixed
public/commercial updates. Verified Super Admin SDK SaaS writes are denied.
Owner public information, branding, business settings and partial nested merges
still succeed without changing authority. Missing/null/string/numeric activation
and fabricated cached entitlement flags fail closed.

`tests/saasAuthorityHttp.test.ts` checks rejected tenant commands, validated
Super Admin commands, stale/suspended/demoted administrator profiles,
active → authorized suspension → rejected tenant reactivation → continued API
blocking → authorized reactivation, and safe legacy initialization. A forged
local plan/type/staff flag cannot provision legacy staff without a live server
grant. Registration tests also verify server-selected defaults against a
forged premium request.

The existing RootApp browser regression adds the same live activation cycle
for all four roles, including absent/malformed activation, retained identity,
cleared tenant arrays, removed data listeners and restored authorized access.
Existing test fixture edits declare their intended active clubs explicitly;
the compiled API runtime test includes the new shared helper.

## Release constraints / remaining risks

This is a code/Rules correction, not a production remediation attestation.
The fix becomes effective in production only after a coordinated release of
the frontend/API and this Firestore rules file to **both** configured databases
(`(default)` and `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878`). No deploy is
performed here. Clubs with missing/malformed activation will fail closed;
the platform administrator must explicitly review and activate legitimate
legacy clubs. The legacy initializer does not activate them automatically.

The SaaS entitlement catalog's future commercial provisioning remains outside
scope. Other audit P0/P1/P2 findings, Storage access/download URL revocation,
role administration and destructive administration workflows are not fixed by
this PR. Stripe webhooks retain their existing server payment semantics and
cannot reactivate an organization or change its SaaS plan.

## Final validation

- `npm run lint` (`tsc --noEmit`): PASS.
- `npm run build`: PASS; existing >500 kB bundle warning remains.
- `npm run test:emulators`: PASS, 783 tests plus 5 CI/emulator isolation guards,
  only against local `demo-velatra`.
- Focused Rules regression: PASS, 134 tests.
- `node scripts/qa/role-format-experiences-browser.mjs`: PASS, 365 checks,
  including 16 suspension/activation checks in the actual RootApp using isolated
  Firebase fixtures. No external/production data request is permitted.
- `git diff --check`: PASS.

## Changed files

- `App.tsx`
- `components/experienceHomeSelectors.ts`
- `docs/SAAS-PLAN-SUSPENSION-AUTHORITY.md`
- `firestore.rules`
- `organizationAccess.ts`
- `pages/AdminDashboard.tsx`
- `pages/SettingsPage.tsx`
- `productCapabilities.ts`
- `productExperience.ts`
- `pulse/pulseEngine.ts`
- `scripts/qa/role-format-experiences-browser.mjs`
- `server.ts`
- `server/billing.ts`
- `server/bookings.ts`
- `server/clubRegistration.ts`
- `server/completeWorkout.ts`
- `server/convertProspect.ts`
- `server/createMember.ts`
- `server/notifications.ts`
- `server/onboarding.ts`
- `server/organizationAuthority.ts`
- `server/staffFacts.ts`
- `server/teamManagement.ts`
- `tests/accountTypeMigration.test.ts`
- `tests/appShellHelpers.test.ts`
- `tests/billing.test.ts`
- `tests/bookings.test.ts`
- `tests/client360.test.ts`
- `tests/clubRegistration.test.ts`
- `tests/coachingFollowupHttp.test.ts`
- `tests/completeWorkout.test.ts`
- `tests/convertProspect.test.ts`
- `tests/createMember.test.ts`
- `tests/firestore.rules.test.ts`
- `tests/granularAuthorization.rules.test.ts`
- `tests/granularAuthorizationHttp.test.ts`
- `tests/memberAccessHttp.test.ts`
- `tests/notificationsEngine.test.ts`
- `tests/productCapabilities.test.ts`
- `tests/productExperience.test.ts`
- `tests/pulse.rules.test.ts`
- `tests/retention.rules.test.ts`
- `tests/retentionHttp.test.ts`
- `tests/saasAuthority.rules.test.ts`
- `tests/saasAuthorityHttp.test.ts`
- `tests/sales.rules.test.ts`
- `tests/salesEngine.test.ts`
- `tests/salesHttp.test.ts`
- `tests/serverRuntime.test.ts`
- `tests/studioManagerActivation.test.ts`
