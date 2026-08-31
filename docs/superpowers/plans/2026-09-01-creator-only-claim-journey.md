# Creator-Only Claim Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give creator-only users a focused claim experience, make claiming visible on the homepage, use benefit-led language, and serve reliable stored profile images.

**Architecture:** Route creator-only accounts to the claim workspace before rendering any brand tools. Add a creator path to the existing homepage and replace provider terminology with public-facing language. Copy claimed profile images into Convex storage so short-lived social image URLs never reach the public profile.

**Tech Stack:** React, TypeScript, Convex, Vitest

**Spec:** Conversation request dated 2026-09-01.

## Global Constraints

- Creator-only accounts must not see brand discovery, CRM, campaign, history, pricing, or workspace settings.
- Global admins and users with persona `both` retain brand workspace access.
- Creator-facing copy must explain outcomes, not providers, APIs, authentication internals, or scraping.
- Keep the existing Creatorly landing-page visual system.
- Deploy only after all checks pass.

---

### Task 1: Creator-only access boundary

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/claim/ClaimProfileView.tsx`
- Test: `src/App.integration.test.tsx`
- Test: `src/CreatorClaim.integration.test.tsx`

**Interfaces:**
- Consumes: `Viewer.persona` and `Viewer.role`.
- Produces: creator-only users render `ClaimProfileView`; admins and `both` users keep workspace access.

- [ ] Add a failing integration test that signs up a creator and attempts to open `/app/discover`.
- [ ] Add the route boundary before the brand workspace shell.
- [ ] Replace the claim header’s brand-workspace control with sign-out.
- [ ] Run the focused route tests.

### Task 2: Creator homepage path and human copy

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.css`
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/features/claim/ClaimProfileView.tsx`
- Modify: `src/lib/metricProvenance.ts`
- Modify: `convex/creators.ts`
- Test: `src/App.integration.test.tsx`
- Test: `src/CreatorClaim.integration.test.tsx`
- Test: `src/metricProvenance.test.ts`

**Interfaces:**
- Produces: homepage `#for-creators` path and CTA to `/claim`; public copy uses “Public profile” and “Recently refreshed.”

- [ ] Add failing copy and navigation assertions.
- [ ] Add the creator profile passport section and responsive styles.
- [ ] Replace provider and API language across creator-facing screens.
- [ ] Run focused landing and claim tests.

### Task 3: Reliable claimed profile images

**Files:**
- Modify: `convex/profileImageMigration.ts`
- Modify: `convex/creatorClaims.ts`
- Test: `src/profileImagePolicy.test.ts`
- Test: `src/creatorClaimSecurity.test.ts`

**Interfaces:**
- Produces: `profileImageMigration:copyCreatorImage({ creatorId })`, an internal action that validates, stores, and commits one image.

- [ ] Add a focused internal action and commit mutation for one creator image.
- [ ] Schedule the copy after claim publication and maintenance refresh.
- [ ] Verify the Aditi production creator receives a Convex storage image URL.

### Task 4: Full verification and release

**Files:**
- Modify only files required by failures caused by Tasks 1–3.

**Interfaces:**
- Produces: tested code and a verified production release.

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Run `git diff --check`.
- [ ] Deploy Convex, repair Aditi’s image, commit, push, and confirm Vercel production is ready.
