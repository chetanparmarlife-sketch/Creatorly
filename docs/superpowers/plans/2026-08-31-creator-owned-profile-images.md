# Creator-Owned Profile Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline in the primary session. Subagents are not authorized for this task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy 151,924 reachable profile pictures from the external Opportune bucket into Creatorly's Convex file storage and update creator records safely.

**Architecture:** A single persistent migration-state row owns a cursor over the creators table. An internal action loads one bounded page, validates and copies images in small concurrent groups, then an internal mutation atomically patches successful creator records, records progress, and schedules the next batch. Failed images keep their existing URL and can be retried in another pass.

**Tech Stack:** Convex internal queries/actions/mutations, Convex file storage, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-creator-owned-profile-images.md`

## Global Constraints

- Accept downloads only from `https://storage.googleapis.com/opportune-production.appspot.com/`.
- Accept only `image/jpeg`, `image/png`, or `image/webp`, with a maximum size of 1 MiB.
- Keep the old `profileImageUrl` unless the new Convex file and URL are both available.
- Store `profileImageStorageId` so Creatorly can manage and delete its own files later.
- Run exactly one scheduled migration chain at a time.
- Do not delete creators, contacts, metrics, unlocks, or source images.

---

### Task 1: Migration schema and URL policy

**Files:**
- Create: `convex/lib/profileImagePolicy.ts`
- Modify: `convex/schema.ts`
- Test: `src/profileImagePolicy.test.ts`

**Interfaces:**
- Produces: `isAllowedProfileImageSource(url: string): boolean`, `isAllowedProfileImageType(type: string): boolean`, `MAX_PROFILE_IMAGE_BYTES`, optional `creators.profileImageStorageId`, and the `profileImageMigrationState` table.

- [x] Write tests proving only the exact HTTPS Opportune bucket and approved image MIME types pass.
- [x] Run `npx vitest run src/profileImagePolicy.test.ts` and confirm the new module is missing.
- [x] Implement the pure validation helpers and 1 MiB size constant.
- [x] Add `profileImageStorageId: v.optional(v.id("_storage"))` to creators.
- [x] Add a singleton migration-state table with cursor, status, processed, migrated, failed, pass number, timestamps, and optional last error.
- [x] Run the focused test and `npx tsc -b`.

### Task 2: Resumable migration functions

**Files:**
- Create: `convex/profileImageMigration.ts`

**Interfaces:**
- Produces: internal `start`, `loadPage`, `runBatch`, `commitBatch`, `status`, and `resetForRetry` functions.
- Consumes: the policy helpers and schema fields from Task 1.

- [x] Implement `start` as an internal mutation that refuses a second running job, initializes the singleton state, and schedules `runBatch`.
- [x] Implement `loadPage` as an internal query that reads a bounded creator page from the saved cursor and returns only IDs plus approved external URLs that do not have a storage ID.
- [x] Implement `runBatch` as an internal action that validates HTTP status, MIME type, and a 1 MiB blob limit, stores valid blobs with `ctx.storage.store`, obtains URLs with `ctx.storage.getUrl`, and reports per-item failures without throwing away successful copies.
- [x] Implement `commitBatch` as an internal mutation that patches successful creators with both the storage ID and URL, advances the cursor, records counts, and schedules the next batch only while pages remain.
- [x] Implement read-only `status`; include counts and status but never source URLs.
- [x] Implement restart support so another pass begins at cursor `null` while already-migrated creators are skipped.
- [x] Run `npx tsc -b`, `npx eslint .`, and `npx vitest run`.

### Task 3: Production canary and full migration

**Files:**
- Modify: generated Convex bindings through `npx convex deploy` only.

**Interfaces:**
- Consumes: all Task 2 internal functions.
- Produces: Creatorly-owned storage URLs on creator documents.

- [x] Deploy the schema and internal migration functions to production.
- [x] Start with a 10-image canary and verify migrated URLs use the Convex deployment host and all ten return an image response.
- [x] Start the resumable batch chain and monitor status at least once per minute.
- [x] If failures remain after the first pass, run at most two retry passes; no retries were needed.
- [x] Verify migration status is complete and no scheduled migration remains.

### Task 4: Production audit and handoff

**Files:**
- Modify: `data/instagram-profile-import-report.json`

**Interfaces:**
- Consumes: final migration status.
- Produces: recorded migrated/failed counts and reproducible verification evidence.

- [x] Audit all production creator rows and count records with Convex storage IDs versus external URLs.
- [x] Fetch ten sampled Convex image URLs and confirm successful image responses.
- [x] Re-run repository totals and the 1,000-follower floor audit to prove unrelated data is unchanged.
- [x] Record final owned-image and failure counts in the import report without recording URLs.
- [x] Run `npx tsc -b`, `npx eslint .`, `npx vitest run`, and the Python import tests.
- [ ] Commit and push the migration code and report; do not deploy unrelated frontend changes.

## Self-Review

- Spec coverage: ownership, source allowlist, size/type checks, resumability, single-chain locking, fallback preservation, retry bounds, and production auditing are covered.
- Placeholder scan: no deferred implementation steps or unspecified error handling remain.
- Type consistency: `profileImageStorageId`, migration status fields, batch size, and policy helper names match across tasks.
- Execution: the user's explicit “yes do it” selects inline execution.
