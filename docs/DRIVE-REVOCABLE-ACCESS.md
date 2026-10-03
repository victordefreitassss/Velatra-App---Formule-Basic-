# Drive: revocable file access (P0 #2 only)

## Cause and reproduction before this change

Both `DrivePage` and the client Drive section in `MembersPage` uploaded through the Firebase SDK, called `getDownloadURL`, and persisted its bearer URL in `driveFiles.url`. The preview anchors opened that URL directly. Removing a member from `sharedWith` denied future Firestore/Storage SDK reads but did not invalidate the Storage object's `firebaseStorageDownloadTokens`. Copying the already-known `https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media&token=TOKEN` into an anonymous client still returned bytes. The new HTTP emulator regression reproduces that token bypass before private publication.

## Access architecture after this change

- Keep the SDK resumable upload, progress, MIME allowlist and 25 MiB ceiling, but write to `driveUploads/{clubId}/{authenticatedUid}/{fileId}/{originalName}`. These are unpublished temporary objects; their SDK-generated token is never stored in Firestore or shared by the app.
- `POST /api/drive/files/:fileId/finalize` verifies the current profile, organization and staff role; derives the source path from the verified UID; validates any folder's tenant; copies to the existing `drive/...` shape with an empty download-token field and private/no-store caching. It pins the source generation and refuses overwrite. It deletes the temporary object before creating the authoritative Firestore record. Publication retries cannot overwrite content or change an existing share.
- The permanent `drive/...` namespace denies client reads, token lookup, creation and overwrite. Deletion remains allowed for the same uploader/staff, Owner and verified platform administrator as before. Temporary SDK uploads deny reads/overwrite; legitimate uploads remain direct to Storage, avoiding Vercel request-body limits.
- `GET /api/drive/files/:fileId/content` passes through existing Firebase token verification and profile middleware, then rereads the live profile, active organization, authoritative file record and current `sharedWith`. A moved/deleted/suspended profile fails even with an unexpired token. Ordinary cross-tenant users fail. Existing staff read scope is preserved; verified platform administrators retain their explicit exception, but inactive target organizations fail.
- No public/signed URL or token in a query grants access. The API streams the pinned object generation with no-store/CDN-no-store headers. Responses are capped at 2 MiB; frontend requests subsequent byte ranges with authentication and an ETag generation precondition. Each chunk rechecks permissions, preserving larger downloads under Vercel's 4.5 MB payload ceiling.
- Both Drive preview surfaces ignore `file.url`, including legacy records. Every click fetches again. Preview/download uses a browser-local Blob URL for bytes already received, then releases it. Attachment-only types download with the correct filename.
- Firestore allows share/revoke/rename/folder edits but makes file identity, physical path, uploader and content attributes server-owned. Renaming the display filename leaves the physical key unchanged.

The backend defaults to `velatra-75daa.firebasestorage.app`; a server-only `FIREBASE_STORAGE_BUCKET` override must match the frontend bucket. It uses `(default)` Firestore, consistent with existing API authorization. Emulator mode uses `demo-velatra.appspot.com`. Do not connect a secondary database preview to production default API records as a validation shortcut.

## Existing objects: mandatory manual release step

Changing Rules or the frontend alone does **not** invalidate tokens already distributed. The token inventory and apply utility are manual, never executed by app startup/CI. Operator-only read observations are recorded below; no production write has been performed.

Use server-side ADC for `velatra-75daa`; no credential in argv or the frontend. Store manifests outside Git, in a private directory. Default mode reads metadata only, including object versions, and stores token fingerprints rather than usable tokens:

```sh
npx tsx scripts/migrations/revoke-drive-tokens.ts \
  --project velatra-75daa --manifest /PRIVATE_DIRECTORY/drive-token-inventory.json
```

Review every selected physical path (including orphan/historical `drive/` paths) and create `/PRIVATE_DIRECTORY/approved-drive-paths.json` as an explicit JSON array of exact approved paths. No selection is inferred from names or roles. Apply only the approved subset:

```sh
npx tsx scripts/migrations/revoke-drive-tokens.ts \
  --project velatra-75daa --manifest /PRIVATE_DIRECTORY/drive-token-inventory.json \
  --apply --paths-json /PRIVATE_DIRECTORY/approved-drive-paths.json \
  --receipt /PRIVATE_DIRECTORY/drive-token-selection-receipt.json
```

For an unversioned private bucket with no archived generations, the utility rewrites each selected object at the same path, preserves bytes/custom metadata/content attributes, strips its token, and sets private/no-store caching. Source and destination generation **and metageneration** preconditions reject concurrent changes. The CRC32C/size/token/cache postcheck fails closed. An already-neutralized object is a no-op; reexecution requires a fresh receipt filename. No Firestore, Auth, roles, Stripe, other Storage prefixes or application data are modified.

The utility refuses versioning, archived/duplicate generations, public bucket IAM, public object ACLs, protected objects/holds or unsupported customer encryption. These require a separately reviewed procedure, not an unsafe rewrite: revoke the `firebaseStorageDownloadTokens` metadata on **every readable generation** with generation/metageneration-pinned metadata PATCH operations, preserving unrelated metadata and bytes. Review bucket/project IAM, uniform access, inherited public access prevention and any public ACLs first. A token cleanup cannot secure an anonymously readable bucket. Do not restore token-bearing historical/soft-deleted versions without stripping tokens first. The inventory is not complete proof of project-level IAM absence.

After apply, rerun the inventory to a new filename: all readable Drive objects must be token-free. Independently attempt each privately recorded former Firebase URL, anonymously, including any known generation-specific URLs: no file bytes must be returned. Verify legitimate API downloads, rename and deletion with a test-only organization. No temporary upload token can refer to a published object; failed uploads may leave unpublished temporary objects requiring an explicitly approved lifecycle/cleanup policy.

## Coordinated release (not executed here)

1. Validate the dedicated PR/CI and server account Storage read/create/delete/rewrite permissions on an isolated bucket. Prepare the private inventory and approved selection. Confirm bucket access/version history conditions above.
2. Schedule a short **Drive-only maintenance window**. Keep other product surfaces running. Do not roll out a frontend that depends on the new routes before its matching backend/Rules.
3. During that window, deploy the matching Firestore Rules to both configured databases and Storage Rules, then the matching frontend/API release. Old clients attempting Drive uploads/direct reads fail closed during the transition. Force reload old tabs after release. Do not revert to Rules that allow token lookup on the permanent namespace: Firebase can regenerate tokens on authorized metadata reads.
4. Still during the window, run only the approved token neutralization. Complete the inventory, former-URL probes, authenticated share/revoke/tenant/removed-user smoke checks and a file exceeding 4.5 MB on the actual Vercel preview/release runtime.
5. Reopen Drive only after those checks pass. Do not declare production P0 #2 closed until all formerly public Drive URLs have been neutralized and the matching Rules/backend/frontend are live. If rollout fails, retain restrictive Rules and pause Drive rather than reintroducing bearer URLs.

## Security tests and practical limits

`driveAccessHttp.test.ts` uses real local Auth/Firestore/Storage emulators and the actual Express app: private publication, staging URL invalidation, active shares/staff/Owner, no auth, forged auth, foreign tenant, removed/moved/suspended profile, suspended organization, immediate revoke on the same URL/token/range, ETag/ranges/large files, rename, deletion and actual legacy bearer URL neutralization. `driveMigration.test.ts` covers default read-only behavior, explicit apply requirements, token-redacted inventory, stale generation refusal and rewrite preconditions. `driveClient.test.ts` exercises the real frontend helper: stale bearer URL ignored, no cached-byte reuse after revoke, authenticated ETag chunk assembly, mid-download revocation and missing session. The Storage Rules suite checks direct bytes/token lookup denial, temporary uploads, immutable paths and valid share/revoke/rename; existing Manager coverage follows the new staging contract.

Revocation stops **future server-authorized retrieval**. It cannot erase bytes already downloaded, browser-local Blob copies, screenshots, external caches created before this release, or an in-flight chunk already authorized. Existing long-lived intermediary caching cannot be undone by merely changing an origin header. Old access through unrelated features (avatars, contracts, videos etc.) is outside this Drive-only PR. No P0 #3 or P1/P2 changes are included.

Primary references: [Firebase direct SDK downloads](https://firebase.google.com/docs/storage/web/download-files), [GCS rewrite and preconditions](https://docs.cloud.google.com/storage/docs/json_api/v1/objects/rewrite), [GCS caching metadata](https://docs.cloud.google.com/storage/docs/metadata), [Vercel payload limits](https://vercel.com/docs/functions/limitations).

## Rules audit (proposed Drive rules only)

```json
{"score":5,"summary":"Published Drive bytes/token lookup and path/content creation are server-only; the backend rereads live identity, tenant, organization and ACL. Client share/rename updates cannot redirect file identity. This score describes the proposed code, not an unexecuted production migration.","findings":[]}
```

## Read-only configuration check, 2026-10-03

The production bucket configuration was read without accessing file bytes or changing data/IAM: versioning disabled; uniform bucket-level access disabled; public access prevention inherited; no `allUsers`/`allAuthenticatedUsers` bucket IAM, bucket ACL or default-object ACL detected. Individual object ACLs, historical generations and project-level inherited IAM still require the private inventory/release review above. At this initial configuration check, no token inventory or apply command had been executed against production; the later READ ONLY inventory is recorded below.

## PR #44 follow-up verification, 2026-10-03

The original Retain browser suite passed 417 checks on both unchanged main and the unchanged PR HEAD locally, but failed intermittently in CI before any Retain API request. A physical-click acknowledgement exposed clicks reaching the fixed app navigation instead of the intended button. Only the QA helper changes: wait for a stable bounding box and a center point that wins `elementFromPoint` hit testing, then perform one physical mouse click and verify that the intended button received it. Retain routing, product behavior, timeouts and page assertions remain unchanged; no DOM-invoked click or blind click retry masks a navigation failure.

The prepared migration's default READ ONLY mode ran against `velatra-75daa.firebasestorage.app`. It found zero `drive/` objects and zero download tokens. A second independent listing confirmed the existing bucket is unversioned and contains zero objects including archived versions; `driveFiles` also contains zero documents in both configured Firestore databases. The exact affected-path list is `[]`. Consequently no apply command, object rewrite, data/IAM change or deployment was performed. There is no existing production URL/token available for an anonymous before/after probe; the actual token invalidation regression is validated on the isolated emulators. This empty inventory must not be described as a production token-removal operation. New files will use the authenticated API only once the matching PR frontend/backend/Rules are released. Refresh the inventory if files are created before that release.
