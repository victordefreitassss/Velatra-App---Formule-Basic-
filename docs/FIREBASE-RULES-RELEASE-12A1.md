# Firebase Rules release 12A.1

## Release record

- Date: 2026-10-01
- Project: `velatra-75daa`
- Released Git HEAD: `82b5e2e830def992796677b9c2ab7e15bfadc864`
- Firebase CLI: `15.31.0`
- Scope: Firestore Security Rules for `(default)` and `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878`, plus the Firebase Storage ruleset `velatra-75daa.firebasestorage.app`.
- Local rules SHA-256 at HEAD:
  - `firestore.rules`: `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083`
  - `storage.rules`: `6cc0b318cc22e0796914f94a8bd6cd8863d1df28b02adf7e1f2a4d4246d44f5b`
- Previous rules at `97ed9be35fc8a3174883944ff6b6d49816714119` (calculated directly from Git):
  - `firestore.rules`: `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a`
  - `storage.rules`: `78bfbd2be0c008b99932933fdf71eb901962ea8edb8551b6349042d42cf9d2b4`

## Production state before deployment

Read from Firebase Rules API before publishing. The API returned the active release, ruleset and ruleset source. All three targets used the previous rules' hashes above.

| Target | Active release | Active ruleset | Release created | Source SHA-256 |
| --- | --- | --- | --- | --- |
| Firestore `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/ddd68205-1617-4026-b1b4-c6d26a358c82` | `2026-03-06T19:36:02.910921Z` | `firestore.rules`: `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a` |
| Firestore `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/ab5769eb-b7af-4d86-930e-b81550baa710` | `2026-06-09T13:21:55.335056Z` | `firestore.rules`: `8b8cf5dcc83c0f1b692d34d0622be196926dacccfcc46db5239927fd9222f03a` |
| Storage `velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/rulesets/e7341ce3-b966-479c-9750-482e8718e827` | `2026-03-31T16:36:27.470932Z` | `storage.rules`: `78bfbd2be0c008b99932933fdf71eb901962ea8edb8551b6349042d42cf9d2b4` |

Production was **not already up to date**.

## Pre-release validation

All validation ran against the merged HEAD and the local Auth, Firestore and Storage emulators. No production data was used for tests.

- `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed. Vite printed its existing large-chunk advisory.
- `npm run test:emulators`: passed, 330/330 application/security tests and 5/5 CI checks; zero failures or skipped tests.
- `git diff --check`: passed.
- Rules protections covered by emulator tests: Owner management and permitted deletion; Studio Manager team/assignment/CRM/planning/follow-up; Manager denial for Stripe, secrets, sensitive billing, Owner/role mutation, destructive deletion and cross-club access; Coach assignment boundaries; Member self access; protected `accountType`/`saasPlanId` and financial data; Storage contracts, Owner assets and sensitive deletes.

## Deployment

Deployed: **YES**, because none of the three active source hashes matched the release HEAD.

Exact command:

```sh
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules,storage --project velatra-75daa --non-interactive
```

The CLI compiled and released Storage once and Firestore Rules twice, corresponding to both configured Firestore databases. No Hosting or Functions target was included.

## Independent verification after deployment

Read again from Firebase Rules API. The source bytes from every active ruleset were SHA-256 hashed locally. All three sources equal the corresponding file at release HEAD.

| Target | Active release | Active ruleset | Release created | Source SHA-256 | Match |
| --- | --- | --- | --- | --- | --- |
| Firestore `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/fc9428bf-a356-48a8-81a2-f1b904c3bc48` | `2026-03-06T19:36:02.910921Z` | `firestore.rules`: `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083` | YES |
| Firestore `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/40404dce-5752-4227-829b-4b92235eb3ab` | `2026-06-09T13:21:55.335056Z` | `firestore.rules`: `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083` | YES |
| Storage `velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/rulesets/4238f04a-7834-4112-b477-078df217709e` | `2026-03-31T16:36:27.470932Z` | `storage.rules`: `6cc0b318cc22e0796914f94a8bd6cd8863d1df28b02adf7e1f2a4d4246d44f5b` | YES |

**Exact match: YES (3/3 active sources match the release HEAD).**

## Rollback procedure

Do not roll back without a confirmed rules regression. If one is confirmed, use the previous source commit, inspect the planned diff, and deploy only the same two rule targets:

```sh
git worktree add /tmp/velatra-rules-rollback 97ed9be35fc8a3174883944ff6b6d49816714119
cd /tmp/velatra-rules-rollback
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules,storage --project velatra-75daa --non-interactive
```

Verify all three active sources again through Firebase Rules API and record their release/ruleset IDs and hashes. Previous source hashes are documented above.

## Production data boundary

Confirmation: no production user, Auth account, Manager, role, club, `accountType`, `saasPlanId`, client, prospect, subscription, payment, credit, Stripe object/webhook, CRM, coaching or planning data was read or changed. Validation used emulators. No production Stripe operation was performed. The only production changes were the Firestore Rules and Firebase Storage Rules releases listed above.
