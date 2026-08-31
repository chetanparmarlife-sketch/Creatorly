# Creatorly Core Workflow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline in the primary session. Subagents are not authorized for this task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Creatorly's existing production features into a truthful, fast discovery-to-campaign workflow.

**Architecture:** Keep Convex as the authorization and data boundary. Add small typed frontend contracts for campaign drafts, selection, freshness, and auth continuation; reuse existing Lumen components and workspace APIs. Discovery is the intentional authenticated starting screen. Complete and verify each task before starting the next.

**Tech Stack:** React 19, TypeScript, Vite, Convex, Convex Auth, Resend-compatible email HTTP API, Vitest, Testing Library, Chrome Manifest V3.

**Spec:** `docs/superpowers/specs/2026-08-31-creatorly-core-workflow-hardening.md`

## Global Constraints

- Keep the current Lumen visual style and its 44px control minimum.
- Do not invent campaign budget, platforms, dates, payment state, or data freshness.
- Do not deploy an email flow until a production sender and API key are configured.
- Do not expose one workspace's selections, campaigns, contacts, or summaries to another workspace.
- Hide unavailable discovery platforms. Investor-facing future products may appear only as non-clickable rows marked `Planned`.
- Shared inbox and connected live reporting remain a later provider-backed phase.

---

### Task 1: Connect the extension to production

**Files:**
- Modify: `extension/background.js`
- Modify: `extension/popup.js`
- Modify: `extension/manifest.json`
- Modify: `extension/README.md`
- Create: `extension/production-config.node.mjs`

**Interfaces:**
- Produces: one production API origin, `https://effervescent-toucan-379.convex.site`, used by the extension background worker and side panel.

- [x] Add a Node assertion that fails while any shipped extension file contains `quirky-partridge-485` or an API origin different from production.
- [x] Run `node extension/production-config.node.mjs` and confirm failure.
- [x] Replace the old API origin in the worker, popup, permissions, and documentation.
- [x] Run the assertion, `node extension/profile-url.node.mjs`, TypeScript, lint, and Vitest.
- [x] Commit item 1 independently.

### Task 2: Require real email verification

**Files:**
- Modify: `convex/auth.ts`
- Create: `convex/lib/authEmail.tsx`
- Modify: `src/data/AppData.tsx`
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/components/VerificationView.tsx`
- Modify: `src/types.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and Convex Auth's password `verify` provider.
- Produces: `signUp` requesting an OTP, `verifyEmail(email, code)`, resend behavior, and checkout continuation only after OTP verification.

- [x] Add tests for signup → code entry → verified account and paid-plan continuation after verification.
- [x] Configure `Password({ verify: Email(...) })`; send a six-digit OTP through the server using the configured sender.
- [x] Store `isEmailVerified: false` at account creation and set it only after Convex Auth confirms verification.
- [x] Replace demo copy with code entry, resend, expiry, error, and change-email states.
- [ ] Verify a real email round-trip in development and production before marking complete.
- [ ] Commit item 2 independently.

### Task 3: Remove invented campaign defaults

**Files:**
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/workspace.css`
- Modify: `src/types.ts`
- Modify: `convex/campaigns.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `CampaignDraft` with explicit `name`, `goal`, `platforms`, `currency`, optional `budget`, optional `startsAt`, optional `endsAt`, and optional group ID.

- [x] Add a test proving campaign creation stores only values entered by the user.
- [x] Add platform checkboxes, currency, optional budget, and date fields to the existing campaign form.
- [x] Reject empty platforms, negative budgets, and end dates before start dates on the server.
- [x] Remove the hard-coded INR 500,000 and three-platform values.
- [x] Verify creation for agency and brand workspaces, then commit item 3.

### Task 4: Preserve payment results and loading states

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/PaymentResultView.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/CampaignExecution.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: payment-result routes that render before onboarding, plus explicit `loading | ready | missing | error` campaign states.

- [x] Add tests for a new paid user returning to success/failure and for missing/failed campaign loads.
- [x] Let authenticated payment-result routes render before the onboarding guard.
- [x] On success, offer `Continue workspace setup`; on failure, offer `Return to pricing`.
- [x] Separate campaign loading from null and rejected results with retry actions.
- [x] Verify all states and commit item 4.

### Task 5: Add direct and bulk campaign actions

**Files:**
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/workspace.css`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Modify: `convex/campaigns.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `addCreators(workspaceId, campaignId, creatorIds)` as one authorized, duplicate-safe mutation and a discovery selection bar.

- [x] Test selecting multiple discovery rows and adding them to an existing campaign.
- [x] Add row checkboxes, select-page, clear-selection, Save to CRM, and Add to campaign actions.
- [x] Make the server mutation idempotent and reject cross-workspace IDs.
- [x] Keep the single-row Save action for fast use.
- [x] Verify keyboard, mobile, empty-campaign, and duplicate states, then commit item 5.

### Task 6: Show source and freshness

**Files:**
- Modify: `convex/creators.ts`
- Modify: `src/types.ts`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Test: `src/CreatorResult.test.tsx`

**Interfaces:**
- Produces: `sourceLabel`, `lastUpdatedAt`, and metric provenance on search and detail results.

- [x] Test that creator results show `Creatorly database`, the actual update date, and `Supplied metrics`.
- [x] Return stored `lastUpdatedAt` without manufacturing a new timestamp.
- [x] Show source/freshness beside profile identity and explain supplied versus live metrics.
- [x] Show private CRM origins separately from Creatorly data.
- [x] Verify missing-date behavior and commit item 6.

### Task 7: Hide unavailable platforms and label future products

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/components/LandingPage.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: an available-platform list containing Instagram and YouTube, plus a static non-interactive list of future products.

- [x] Test that discovery exposes Instagram and YouTube but not empty TikTok or X repository filters.
- [x] Preserve TikTok and X platform types for private CRM and campaign data without presenting them as available Discovery repositories.
- [x] Show AI Agents, Inbox, Automations, Reports, and Integrations after Campaigns as non-clickable sidebar rows with `Planned` on the right.
- [x] Keep History and Settings in their own section after the planned-product separator.
- [x] Keep future add-ons described honestly on the marketing page.
- [x] Verify desktop/mobile navigation and commit item 7.

### Task 8: Shorten onboarding

**Files:**
- Modify: `src/components/OnboardingView.tsx`
- Modify: `convex/workspaces.ts`
- Modify: `convex/schema.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: a three-step flow: workspace, goals, first action. Team invitations move to settings; planned channels disappear from onboarding.

- [x] Test completing onboarding in three steps for agency, brand, and talent workspaces.
- [x] Remove Team and Channels steps while retaining current workspace kind, role defaults, and goals.
- [x] Change the stored onboarding-step validator and map legacy step values safely.
- [x] Land on Discover or Campaigns according to the chosen first action; Discovery remains the default authenticated route.
- [x] Verify reload persistence and commit item 8.

### Later phase: Shared inbox and live reporting

This phase starts only after the user selects approved messaging and social-data providers and supplies production credentials. It requires consent and template rules, inbound webhooks, message ownership, delivery state, social metric snapshots, reporting attribution, and provider-specific tests. Do not represent it as shipped during Tasks 1–8.

## Final Verification

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Run extension Node tests.
- [ ] Walk the complete verified-signup → discovery → bulk campaign workflow at 1440px and 390px.
- [ ] Deploy Convex functions only when schema/server changes have passed canary checks; do not deploy the website unless separately requested.

## Self-Review

- Spec coverage: items 1–8 have independent tests and commits; the later Inbox and Reports phase remains correctly provider-gated.
- Placeholder scan: every current-phase task names its behavior, files, tests, and completion gate.
- Type consistency: campaign drafts, bulk adds, and creator freshness each have one typed interface.
- Execution: the user requested sequential inline execution, so no subagents or parallel task work is used.
