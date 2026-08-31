# Creatorly Public Conversion Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve paid-plan intent through account creation and make Creatorly’s public pages responsive, navigable, honest, and touch-friendly.

**Architecture:** Extend the typed client route with validated signup context stored in the URL, then pass that context through signup and verification to the existing Dodo checkout action. Reuse Creatorly’s current logo, button, color, and spacing language for public navigation, contextual messages, mobile auth, and 44px touch targets.

**Tech Stack:** React 19, TypeScript, Vite, Convex, Vitest, Testing Library, CSS, Playwright CLI

**Spec:** User request in the 2026-08-31 conversation.

## Global Constraints

- Keep the existing visual style.
- Do not deploy.
- Complete paid-plan intent preservation first.
- After each item, report its verification evidence.
- Finish with `npx tsc -b`, `npx eslint .`, and `npx vitest run`.

---

### Task 1: Preserve paid-plan intent through checkout

**Files:**
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/components/PricingView.tsx`
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/components/VerificationView.tsx`
- Modify: `src/App.tsx`
- Test: `src/ConvexProviders.integration.test.tsx`

**Interfaces:**
- Produces: validated `plan`, `cycle`, and signup `reason` query parameters on typed signup and verification routes.
- Consumes: `BillingPurchase` and `AppData.createCheckout` for the selected core plan.

- [ ] Add route parsing and serialization for `/signup?plan=pro&cycle=annual` and the corresponding verification URL.
- [ ] Send logged-out paid-plan clicks to the exact signup URL.
- [ ] Display the selected plan and cycle in the signup panel.
- [ ] Carry the selection through the simulated verification screen and open the matching checkout.
- [ ] Add an integration test proving pro-annual survives reload and reaches checkout unchanged.

### Task 2: Give homepage previews one consistent action

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.css`
- Modify: `src/components/AuthScreen.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: all three preview buttons route to `/signup?reason=workspace`.
- Consumes: the signup reason to render “Create a workspace to continue”.

- [ ] Wire Add creators, Open saved creator, and Create campaign to the same route.
- [ ] Show the workspace-required message on signup.
- [ ] Verify each button on desktop and phone.

### Task 3: Remove public test billing copy

**Files:**
- Modify: `src/components/PricingView.tsx`
- Verify: rendered public `/pricing` DOM

**Interfaces:**
- Produces: public pricing without legacy/test account copy.
- Consumes: existing signed-in Settings billing state for legacy-account guidance.

- [ ] Remove the legacy Dodo note from PricingView.
- [ ] Verify neither forbidden string exists in public rendered source.

### Task 4: Put phone auth forms above the fold

**Files:**
- Modify: `src/styles.css`
- Verify: 390×844 signup and login screenshots

**Interfaces:**
- Produces: phone auth layout with the marketing story hidden and form panel first.

- [ ] Hide the marketing panel below 768px.
- [ ] Tighten phone panel spacing without changing desktop layout.
- [ ] Verify the first field is visible without scrolling on both routes.

### Task 5: Add public pricing navigation

**Files:**
- Modify: `src/components/PricingView.tsx`
- Modify: `src/styles.css`
- Verify: desktop and phone pricing screenshots

**Interfaces:**
- Produces: public logo-to-home and Log in actions at both widths.

- [ ] Add a public-only pricing top bar using the existing Logo and button styles.
- [ ] Verify it is visible and usable at 1440px and 390px.

### Task 6: Enforce phone tap targets

**Files:**
- Modify: `src/components/LandingPage.css`
- Modify: `src/styles.css` if the audit finds shared controls below 44px
- Verify: browser measurements at 390px

**Interfaces:**
- Produces: at least 44×44 hit areas for all homepage actions while retaining current text sizes.

- [ ] Set padding/minimum dimensions for Start free, See how it works, and the three preview actions.
- [ ] Audit remaining visible phone controls.
- [ ] Record the measured heights of the five named controls.

### Task 7: Final verification

**Files:**
- Verify all changed files and generated screenshots.

**Interfaces:**
- Produces: clean TypeScript, ESLint, Vitest, responsive screenshots, and measurements.

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Run `git diff --check` and confirm no deployment command ran.
