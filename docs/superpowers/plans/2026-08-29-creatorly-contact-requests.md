# Creatorly Contact Requests and Fulfillment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let marketers request missing Instagram/YouTube contacts and let authorized admins fulfill matching requests by creating a creator and verified contact.

**Architecture:** Authenticated users create deduplicated requests through Convex. Admin-only queries and mutations enforce `users.role === "admin"` on the server, not only in navigation. Fulfillment creates one repository creator/contact pair, marks every pending request for the normalized platform handle fulfilled, and records that email delivery remains pending until a provider is configured.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, Convex, Lucide, plain CSS tokens.

**Spec:** User-provided product spec sections 3.4 Requesting Missing Contacts, 7.1 Contact Request Fulfillment, 2.7 Admin Dashboard, and 2.10 RequestContactModal.

## Global Constraints

- Only signed-in users may create requests.
- The same user cannot create two pending requests for the same normalized platform handle.
- Only server-confirmed admins may read or fulfill the request queue.
- Fulfillment marks every matching pending request fulfilled and links it to one creator.
- No email is claimed as sent without a configured provider; `notificationSent` remains false.
- Contact values created in automated tests use `example.test` and are not real contacts.
- Existing Creatorly palette, typography, quiet layered depth, and 4px spacing grid remain unchanged.

---

### Task 1: Request and admin backend

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/contactRequests.ts`
- Create: `convex/admin.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `contactRequests:create({ platform, handle, notes? }) -> { status: "created" | "already_pending", requestId }`.
- Produces: `admin:listRequests({}) -> AdminContactRequest[]`, guarded by the current user's admin role.
- Produces: `admin:fulfillRequest({ requestId, creator, contact }) -> { creatorId, fulfilledCount }`, guarded by the current user's admin role.
- Produces: internal `admin:promoteByEmail({ email })` for CLI-only admin setup.

- [x] Add optional request notes, normalized handle, and a status index without invalidating existing records.
- [x] Normalize and validate request handles, then deduplicate pending requests per user/platform/handle.
- [x] Add a reusable server admin assertion.
- [x] List pending requests newest first with requester identity.
- [x] Fulfill all matching requests atomically while inserting one non-demo creator and one active contact.
- [x] Add exact public TypeScript contracts for request and admin data.

### Task 2: Data providers and request modal

**Files:**
- Modify: `src/data/AppData.tsx`
- Modify: `src/lib/demoData.ts`
- Create: `src/components/RequestContactModal.tsx`
- Modify: `src/components/SearchView.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `AppData.requestContact`, `AppData.listAdminRequests`, and `AppData.fulfillRequest` for Convex and local demo.
- Produces: an accessible native `<dialog>` opened from the zero-results state with platform, handle, optional notes, submit, success, and error states.

- [x] Write a failing journey that searches an absent handle and submits a request.
- [x] Add provider methods and versioned local-demo request storage.
- [x] Build the modal with explicit labels, Escape/close behavior, pending state, and a confirmation explaining notification status.
- [x] Replace the zero-results dead end with a clear Request Contact action prefilled from search.
- [x] Run the request journey until it passes.

### Task 3: Admin queue and fulfillment UI

**Files:**
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Create: `src/components/AdminView.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `/admin` route visible only when `viewer.role === "admin"`.
- Consumes: `AppData.listAdminRequests` and `AppData.fulfillRequest`.

- [x] Make the demo signup email `admin@creatorly.test` create an admin role solely for local verification.
- [x] Add a failing admin journey proving a pending request can be fulfilled.
- [x] Add guarded Admin navigation and route handling; non-admin users see an access-denied state.
- [x] Build a request queue with selected-request detail and a fulfillment form for creator name, follower count, location, contact role, name, email, notes, and access tier.
- [x] Show exact success counts and refresh the queue after fulfillment.
- [x] Run request/admin journeys until they pass.

### Task 4: Verification and release

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.interface-design/system.md`

**Interfaces:**
- Proves: request creation/deduplication, server role enforcement, matching-request fulfillment, and notification honesty.

- [x] Run lint, all tests, frontend build, Convex TypeScript, extension syntax, and dependency audit.
- [x] Push Convex functions to development and production.
- [x] Verify production user request creation and deduplication with a labeled QA account.
- [x] Verify non-admin production access is rejected.
- [x] Deploy Vercel and smoke-test `/admin` plus the production Convex bundle target.
- [x] Record exact outcomes and admin-promotion instructions.
- [ ] Commit and push the completed slice.

## Self-review

- Spec coverage: user request entry, confirmation, queue, creator/contact creation, role gating, bulk matching fulfillment, and fulfillment status are included. Automated email is intentionally not claimed because no email provider exists; the database flag remains false for later delivery.
- Placeholder scan: no implementation placeholders remain.
- Type consistency: request inputs, `AdminContactRequest`, provider method names, and route names match across tasks.
