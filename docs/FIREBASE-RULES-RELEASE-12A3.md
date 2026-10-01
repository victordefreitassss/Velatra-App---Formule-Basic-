# Firebase Rules release 12A.3

## Release record

- Date: 2026-10-01 (UTC).
- Project: `velatra-75daa`.
- Released source HEAD: `295e101dddf8df376071b07c9e9ce9d055caa756`.
- Firebase CLI: `15.31.0`.
- `main` was synchronized with `origin/main`, exactly at this HEAD, with a clean working tree before deployment.
- Scope: Firestore Rules for `(default)` and `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878`, plus Storage Rules for `velatra-75daa.firebasestorage.app`.

Local SHA-256 hashes, identical for the working files and the committed sources:

| File | SHA-256 |
| --- | --- |
| `firestore.rules` | `c1f22c0c59bc2bebd3e9c21445c11c39a41837b0a35ffc2cebcc98bd742d3c06` |
| `storage.rules` | `06bd96bd9b4d6b638661c8c2ea0596ad28e6914d15b3dbbec0bfed0195c7674b` |

## Production state before deployment

Firebase Rules API observation: `2026-10-01T09:51:09.669Z`. None of the three active source hashes matched the release HEAD. Production still used the 12A.1 rules.

| Target | Active release | Active ruleset | Source SHA-256 |
| --- | --- | --- | --- |
| Firestore `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/fc9428bf-a356-48a8-81a2-f1b904c3bc48` | `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083` |
| Firestore `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/40404dce-5752-4227-829b-4b92235eb3ab` | `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083` |
| Storage `velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/rulesets/4238f04a-7834-4112-b477-078df217709e` | `6cc0b318cc22e0796914f94a8bd6cd8863d1df28b02adf7e1f2a4d4246d44f5b` |

Production already up to date before deployment: **NO**.

## Validation

The following checks had already passed on the exact release HEAD during this release mission, before Firebase authentication was completed. They were not rerun when resuming the cloud release; their existing results were retained and their logs inspected.

- `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed, with Vite's large-chunk advisory.
- `npm run test:emulators`: passed, **342/342 application/security tests and 5/5 CI checks**, zero failures, cancellations or skipped tests. Tests used local Auth, Firestore and Storage emulators with `demo-velatra`.
- `git diff --check`: passed; checked again before the documentation commit.

## Deployment

Deployment performed: **YES**. Exact command, executed from the clean release HEAD:

```sh
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules,storage --project velatra-75daa --non-interactive
```

The CLI exited successfully, compiled both rule files and released Storage Rules once and Firestore Rules for both configured databases. No global deployment, Hosting, Functions or Auth deployment was performed.

## Independent verification after deployment

Firebase Rules API observation: `2026-10-01T09:52:01.104Z`.

For each exact target, the active release was fetched with `GET`, its referenced ruleset and complete source were fetched with `GET`, and the active release was fetched again to confirm that its ruleset reference and update time remained stable. Each ruleset contained exactly the expected source file. SHA-256 was computed over its exact UTF-8 source bytes, including whitespace and the final newline, and compared with the committed file at the release HEAD. These API reads were separate from the deploy command and performed no writes. Both the before and after observations used nine GET requests, with no credential or source contents included in the reports.

| Target | Active release | Active ruleset | Release updated (UTC) | Source SHA-256 | Match |
| --- | --- | --- | --- | --- | --- |
| Firestore `(default)` | `projects/velatra-75daa/releases/cloud.firestore` | `projects/velatra-75daa/rulesets/bb532e3c-383f-4277-9046-abd934a0fbdc` | `2026-10-01T09:51:47.798584Z` | `c1f22c0c59bc2bebd3e9c21445c11c39a41837b0a35ffc2cebcc98bd742d3c06` | YES |
| Firestore `ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/releases/cloud.firestore/ai-studio-b80dc370-7dfb-4c83-8d03-6fe42e41a878` | `projects/velatra-75daa/rulesets/755d7794-54bb-4692-990b-185ccb33a184` | `2026-10-01T09:51:48.024752Z` | `c1f22c0c59bc2bebd3e9c21445c11c39a41837b0a35ffc2cebcc98bd742d3c06` | YES |
| Storage `velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/releases/firebase.storage/velatra-75daa.firebasestorage.app` | `projects/velatra-75daa/rulesets/465e928c-02eb-49b2-b247-11dcaeea873d` | `2026-10-01T09:51:46.156714Z` | `06bd96bd9b4d6b638661c8c2ea0596ad28e6914d15b3dbbec0bfed0195c7674b` | YES |

**Exact source match: YES, 3/3 active targets match the release HEAD.**

## Rollback procedure

Rollback was **not executed**. Use it only for a confirmed rules regression. The previous production source commit is `1af25e0604e8a58fe0ad3902b0f82e693e3f0c2b`; its rule hashes were calculated directly from Git and match the before-deployment sources above:

- `firestore.rules`: `7f42b36b2e486f74e350054053ac1a5241fc63644128be5724449491bbfdb083`.
- `storage.rules`: `6cc0b318cc22e0796914f94a8bd6cd8863d1df28b02adf7e1f2a4d4246d44f5b`.

If a regression is confirmed, prepare an isolated checkout of this previous commit, verify its rule files, configuration and hashes, then deploy only the same rule targets:

```sh
git worktree add --detach /tmp/velatra-rules-rollback-12a3 1af25e0604e8a58fe0ad3902b0f82e693e3f0c2b
cd /tmp/velatra-rules-rollback-12a3
shasum -a 256 firestore.rules storage.rules
npx --yes firebase-tools@15.31.0 deploy --only firestore:rules,storage --project velatra-75daa --non-interactive
```

After any rollback, independently read all three active releases and referenced ruleset sources through Firebase Rules API, verify their hashes against the previous source commit and record the resulting ruleset IDs. Do not treat the CLI's success output alone as verification.

## Production data boundary

No production business data was read for testing or modified. No Manager was created; no User, Club, role, `accountType`, `saasPlanId` or account was changed or deleted. No CRM, Planning, Billing or Stripe operation was performed. Permission testing used emulators. The only production mutations in this release were the two Firestore Rules releases and the Storage Rules release recorded above. The documentation PR changes only this Markdown file; it adds no application code or configuration changes.
