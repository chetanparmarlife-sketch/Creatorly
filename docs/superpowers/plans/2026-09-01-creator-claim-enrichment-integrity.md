# Creator Claim Enrichment Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve and correctly label Apify claim data, prevent false verification badges, and let an admin explicitly verify a published claim contact.

**Architecture:** Keep claimant-edited profile categories separate from Apify's Instagram business category. Mark published creator metrics with their actual source, synchronize late enrichment into untouched form fields, and add a server-authorized admin mutation for contact verification.

**Tech Stack:** React, TypeScript, Convex, Vitest

**Spec:** Conversation request dated 2026-09-01.

## Global Constraints

- Existing claimant edits remain authoritative for editable profile fields.
- Apify snapshot data must not be described as supplied or live data.
- A contact remains unavailable until an admin explicitly verifies it.
- Deploy only after the complete verification suite passes.

---

### Task 1: Preserve enrichment provenance

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/creatorClaims.ts`
- Modify: `convex/creators.ts`
- Modify: `convex/lib/apifyClaim.ts`
- Modify: `src/types.ts`
- Test: `src/apifyClaim.test.ts`
- Test: `src/creatorClaimSecurity.test.ts`

**Interfaces:**
- Produces: `creators.metricProvenance: "supplied" | "live" | "apify"` and `creatorClaims.enrichedBusinessCategoryName?: string`.

- [ ] Add a failing mapper/publication test for the Apify business category and provenance.
- [ ] Store the scraped category separately and publish it into `instagramMetrics.businessCategoryName`.
- [ ] Persist `metricProvenance: "apify"` on an approved claimed creator and return it from creator queries.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Merge late enrichment into the claim form

**Files:**
- Modify: `src/features/claim/ClaimProfileView.tsx`
- Test: `src/ClaimProfileView.test.tsx`

**Interfaces:**
- Consumes: claim updates returned by `getMyCreatorClaim()`.
- Produces: untouched empty form fields adopt late Apify values without replacing user edits.

- [ ] Add a failing component test where enrichment completes after the wizard mounts.
- [ ] Track fields edited by the claimant and merge refreshed claim values only into untouched fields.
- [ ] Poll while enrichment is queued or running, then stop on complete or failed.
- [ ] Run the focused component test and confirm it passes.

### Task 3: Add explicit admin contact verification

**Files:**
- Modify: `convex/creatorClaims.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `src/components/AdminView.tsx`
- Modify: `src/types.ts`
- Test: `src/creatorClaimSecurity.test.ts`

**Interfaces:**
- Produces: an admin contact-confirmation requirement on `creatorClaims:review` and internal-only `creatorClaims:republishFromEnrichment` maintenance for existing published claims.

- [ ] Add a failing security test for admin authorization and contact status updates.
- [ ] Require explicit admin contact confirmation and publish confirmed contacts as verified.
- [ ] Expose the submitted contact and confirmation checkbox in the admin claim review UI.
- [ ] Add an internal repair command for existing published claims.
- [ ] Run focused tests and confirm they pass.

### Task 4: Verification

**Files:**
- Modify only files required by failures caused by Tasks 1–3.

**Interfaces:**
- Consumes: all changes above.
- Produces: a type-safe, lint-clean, tested claim flow.

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Run `git diff --check` and review the final diff for unrelated changes.
