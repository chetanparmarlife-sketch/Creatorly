# Creatorly Full Product Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the deferred Creatorly web and Chrome extension flows using clearly labelled mock payment and notification services where external providers are unavailable.

**Architecture:** Extend the existing Vite/React application and Convex backend rather than replacing the working search and unlock loop. New account, billing, notification, and extension APIs remain server-authorized; mock DemoPay creates the same credit audit records a real webhook would create so it can later be swapped safely.

**Tech Stack:** React 19, TypeScript, Vite, Convex, Convex Auth, Vitest, Manifest V3 Chrome extension.

**Spec:** `docs/specs/creatorly-m1.md` plus the full product specification supplied in the 2026-08-29 conversation.

## Global Constraints

- Keep teams and shared credits out of scope.
- Payment is a labelled DemoPay simulation; do not claim real revenue.
- Existing creator records remain labelled demo data until a real repository is supplied.
- Every credit change creates a `creditTransactions` audit record.
- Contact values are never returned before an active unlock or above the user's tier.
- Preserve the Creatorly contact-desk visual system and mobile accessibility.

---

### Task 1: Account, billing, and notification backend

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/users.ts`
- Create: `convex/billing.ts`
- Create: `convex/notifications.ts`
- Modify: `convex/admin.ts`

**Interfaces:**
- Produces `users:updateProfile`, `users:updateNotifications`, `billing:purchaseCredits`, `billing:changePlan`, `billing:listTransactions`, `notifications:listMine`, and admin user summaries.

- [ ] Add subscription dates, onboarding state, cancellation state, and in-app notification records to the schema.
- [ ] Add authenticated profile and notification preference mutations with validation.
- [ ] Add atomic DemoPay plan and credit transactions.
- [ ] Add notification queries and mark-read behavior.
- [ ] Create fulfilment notifications when an admin completes a request.
- [ ] Run Convex TypeScript checks.

### Task 2: Routing, landing, onboarding, and verification

**Files:**
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AuthScreen.tsx`
- Create: `src/components/LandingPage.tsx`
- Create: `src/components/OnboardingView.tsx`
- Create: `src/components/VerificationView.tsx`

**Interfaces:**
- Produces public landing/login/signup routes and authenticated onboarding state transitions.

- [ ] Add public and authenticated route definitions.
- [ ] Build the marketing landing page with honest demo copy.
- [ ] Split login/signup states and add a password-help message.
- [ ] Add verification and four-step onboarding screens; clearly label simulated email verification.
- [ ] Add responsive tests for route transitions.

### Task 3: Pricing, mock checkout, and payment callback

**Files:**
- Create: `src/components/PricingView.tsx`
- Create: `src/components/DemoCheckout.tsx`
- Create: `src/components/PaymentResultView.tsx`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/data/AppData.tsx`

**Interfaces:**
- Consumes the billing mutations from Task 1.
- Produces plan selection, credit top-ups, and a reusable “Get credits” route.

- [ ] Build Free, Basic, and Pro comparison cards.
- [ ] Build DemoPay confirmation for plan changes and 50/100-credit packs.
- [ ] Connect insufficient-balance and restricted-contact actions to pricing.
- [ ] Show a callback summary after successful mock payment.
- [ ] Test credit purchase and plan upgrade journeys.

### Task 4: Settings, account menu, mobile navigation, and notifications

**Files:**
- Create: `src/components/SettingsView.tsx`
- Create: `src/components/NotificationCenter.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes account and notification APIs from Task 1.

- [ ] Add profile, notification, security guidance, and cancellation sections.
- [ ] Add accessible account and notification menus.
- [ ] Add Pricing and Settings navigation.
- [ ] Add a mobile navigation menu rather than hiding navigation.
- [ ] Add low-credit and expiration-warning states.

### Task 5: History and admin completion

**Files:**
- Modify: `src/components/HistoryView.tsx`
- Modify: `src/components/AdminView.tsx`
- Modify: `convex/admin.ts`

**Interfaces:**
- Adds platform/date/sort filters, existing-creator linking, user management, and notification status.

- [ ] Add platform, date range, and sort controls to History.
- [ ] Add 24-hour expiration warnings.
- [ ] Add admin user summaries and creator lookup/linking support.
- [ ] Report fulfilment notification delivery honestly as in-app delivery.

### Task 6: Full extension flow

**Files:**
- Modify: `extension/manifest.json`
- Modify: `extension/popup.html`
- Modify: `extension/popup.css`
- Modify: `extension/popup.js`
- Create: `extension/options.html`
- Create: `extension/options.js`

**Interfaces:**
- Uses a user-provided extension access token and Convex HTTP routes for profile lookup and unlock.

- [ ] Add a secure extension connection flow from Settings.
- [ ] Add detecting, locked, unlocked, insufficient-credit, upgrade, missing, and wrong-page states.
- [ ] Add balance, copy, request, pricing, and dashboard actions.
- [ ] Add toolbar availability badge updates.
- [ ] Verify extension scripts parse and document unpacked installation.

### Task 7: Quality, documentation, and deployment

**Files:**
- Modify: `src/App.integration.test.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.interface-design/system.md`

- [ ] Add integration coverage for billing, settings, navigation, and notifications.
- [ ] Run lint, tests, frontend build, Convex TypeScript, extension syntax, and dependency audit.
- [ ] Perform browser checks at desktop and mobile widths if browser tooling is available.
- [ ] Update the feature inventory and clearly list external-provider limitations.
- [ ] Deploy Convex and Vercel only after all local checks pass.
