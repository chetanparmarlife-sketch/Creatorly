# Creatorly Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close four claim, email-verification, and temporary-bypass security gaps without changing Creatorly's visual style or deploying.

**Architecture:** Keep claim enrichment isolated to `creatorClaims`; only admin approval may copy claim data into `creators`. Use one shared verified-email predicate for all protected operations, convert claim proof submission to an action for the Instagram network check, and keep user-facing recovery links beside existing error messages.

**Tech Stack:** TypeScript, Convex, React, Vitest, Testing Library, ESLint

**Spec:** User-provided four-item security brief dated 2026-08-31.

## Global Constraints

- Fix the canonical-creator overwrite first.
- Keep the existing visual style.
- Do not deploy.
- After each item, record how it was verified.
- Finish with `npx tsc -b`, `npx eslint .`, and `npx vitest run`.

---

### Task 1: Isolate claim enrichment

**Files:**
- Modify: `convex/creatorClaims.ts`
- Test: `src/creatorClaimSecurity.test.ts`

**Interfaces:**
- Consumes: Apify `ClaimEnrichmentResult`
- Produces: claim-only `enriched*` writes; canonical writes remain inside admin `review`

- [ ] Remove the `claim.creatorId` patch from `applyEnrichment`.
- [ ] Add a regression contract proving enrichment does not patch `creators` and admin approval remains the only claim-to-creator path.
- [ ] Search all Convex code for creator inserts and patches and classify their authorization.
- [ ] Run the focused regression test.

### Task 2: Make ownership wording truthful and verify Instagram bio

**Files:**
- Modify: `convex/creatorClaims.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/lib/apifyClaim.ts`
- Modify: `src/types.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `src/features/claim/ClaimProfileView.tsx`
- Modify: `src/features/claim/demoClaimData.ts`
- Modify: `src/components/AdminView.tsx`
- Test: `src/apifyClaim.test.ts`
- Test: `src/creatorClaimSecurity.test.ts`

**Interfaces:**
- Consumes: `verificationMethod`, `verificationCode`, and Apify profile biography
- Produces: `ownership_claimed_by_user`, `ownership_asserted_by_claimant`, and `ownership_verified_instagram_bio`

- [ ] Rename the misleading state and audit event everywhere.
- [ ] Make `submitVerification` an action that re-runs Apify for `instagram_bio` and checks the exact challenge code case-insensitively.
- [ ] Keep business email and website backlink asserted-only and label them as not automatically checked.
- [ ] Show the assertion or automatic verification clearly in the admin queue.
- [ ] Test a matching biography and a non-matching biography.

### Task 3: Enforce verified email

**Files:**
- Create: `convex/lib/emailVerification.ts`
- Modify: `convex/unlocks.ts`
- Modify: `convex/billing.ts`
- Modify: `convex/billingCustomers.ts`
- Modify: `convex/creatorClaims.ts`
- Modify: `convex/users.ts`
- Create: `src/lib/emailVerification.ts`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/components/HistoryView.tsx`
- Modify: `src/components/PricingView.tsx`
- Modify: `src/features/claim/ClaimProfileView.tsx`
- Test: `src/emailVerification.test.ts`

**Interfaces:**
- Consumes: `emailVerificationTime` or legacy `isEmailVerified`
- Produces: one `isEmailVerified` predicate and the message `Verify your email first...`

- [ ] Add the shared predicate and apply it before unlock, checkout, and claim mutations have side effects.
- [ ] Return both verification fields from the checkout-user query.
- [ ] Add existing-style UI prompts that link to the verification screen.
- [ ] Test both accepted verification fields and the unverified rejection contract.

### Task 4: Bound temporary bypass

**Files:**
- Modify: `convex/lib/authEmail.ts`
- Modify: `convex/auth.ts`
- Test: `src/authEmail.test.ts`

**Interfaces:**
- Consumes: Resend configuration and `AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL`
- Produces: configuration-first mode resolution with a 72-hour maximum bypass

- [ ] Preserve `Date.parse` invalid-date behavior.
- [ ] Return `enabled` before considering bypass when Resend is configured.
- [ ] Throw when a valid future bypass exceeds 72 hours.
- [ ] Warn on every signup while temporary bypass mode is active, including its expiry.
- [ ] Test unconfigured 24-hour bypass, configured 24-hour bypass, and a 2030 date.

### Task 5: Full verification

**Files:**
- Verify all modified production and test files.

**Interfaces:**
- Consumes: completed Tasks 1-4
- Produces: compiler, linter, and test evidence

- [ ] Run focused tests for each security item.
- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Review `git diff` and confirm no deployment command ran.
