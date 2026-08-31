# Creatorly Production Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven production correctness gaps in pricing, creator search, credit accounting, configuration, Convex typing, secret-file ignores, and integration coverage.

**Architecture:** Keep the existing React and Convex structure. Derive pricing labels from numeric catalog values, centralize shared billing constants under `convex/lib`, use generated Convex API references in the workspace provider, and add focused tests around the connected data provider path.

**Tech Stack:** React 19, TypeScript, Vite, Convex, Vitest, Testing Library, ESLint

**Spec:** User request in the 2026-08-31 conversation.

## Global Constraints

- Keep the existing visual style.
- Do not deploy.
- Complete the pricing money bug first.
- Verify every item using the exact evidence requested where practical.
- Finish with `npx tsc -b`, `npx eslint .`, and `npx vitest run`.

---

### Task 1: Correct annual pricing

**Files:**
- Modify: `src/components/PricingView.tsx`
- Test: connected-provider pricing integration test

**Interfaces:**
- Consumes: `BillingPurchase` with `billingCycle`.
- Produces: numeric monthly plan prices and annual display derived as monthly price times ten.

- [ ] Store plan prices as numbers and format rupee values for display.
- [ ] Render the annual per-month equivalent as the headline and the annual total underneath paid plans.
- [ ] Keep Free at ₹0 without an annual billing line.
- [ ] Verify monthly and annual UI states and checkout arguments.

### Task 2: Exclude demo creators from every search path

**Files:**
- Modify: `convex/creators.ts`
- Test: focused Convex search behavior or equivalent automated regression coverage

**Interfaces:**
- Consumes: creator documents and existing search filters.
- Produces: `passesFilters` that rejects demo creators while preserving the existing follower threshold behavior for real creators.

- [ ] Move demo exclusion into `passesFilters`.
- [ ] Route both text and non-text result filtering through that shared predicate.
- [ ] Verify a demo-name query returns no result and a real creator still returns.

### Task 3: Centralize credit policy

**Files:**
- Create: `convex/lib/creditPolicy.ts`
- Modify: `convex/unlocks.ts`
- Modify: `convex/creators.ts`
- Modify: `convex/extensionApi.ts`
- Modify: `convex/billingWebhooks.ts`

**Interfaces:**
- Produces: `STARTING_CREDIT_BALANCE`, `CONTACT_UNLOCK_COST`, and `CONTACT_ACCESS_WINDOW_MS`.
- Consumes: all production Convex balance fallbacks, unlock charges, and unlock expiry calculations.

- [ ] Replace every production `creditBalance ??` literal with `STARTING_CREDIT_BALANCE`.
- [ ] Replace duplicated unlock cost and access window literals with shared constants.
- [ ] Verify repository searches show no production literal duplicates.

### Task 4: Fail closed when production configuration is missing

**Files:**
- Modify: `src/main.tsx`
- Test: build and rendered-entry verification with `VITE_CONVEX_URL` absent and present

**Interfaces:**
- Consumes: `import.meta.env.PROD` and `VITE_CONVEX_URL`.
- Produces: a plain configuration error in production and the existing demo providers in development.

- [ ] Add a production-only missing-configuration branch and loud console error.
- [ ] Verify an unset production build contains and renders the error path.
- [ ] Verify a configured production build takes the connected app path.

### Task 5: Use generated Convex workspace references

**Files:**
- Modify: `src/features/workspace/WorkspaceData.tsx`

**Interfaces:**
- Consumes: `api` from `convex/_generated/api`.
- Produces: typed `api.module.function` references for every workspace query and mutation.

- [ ] Replace all `makeFunctionReference` declarations with generated API references.
- [ ] Remove handwritten `FunctionReference` casts and obsolete helper types.
- [ ] Run TypeScript successfully.
- [ ] Temporarily rename one referenced Convex export, record the compile failure, restore it, and rerun TypeScript.

### Task 6: Ignore environment files

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Produces: ignore rules for `.env` and `.env.*` with `.env.example` explicitly allowed.

- [ ] Add the ignore rules without removing existing local environment rules.
- [ ] Verify `git check-ignore -v .env` reports the matching rule.

### Task 7: Cover connected Convex provider flows

**Files:**
- Modify: `src/App.integration.test.tsx` or add a focused integration test beside it

**Interfaces:**
- Consumes: `ConvexDataProvider`, `ConvexWorkspaceDataProvider`, and a mocked Convex client.
- Produces: one unlock test proving balance/contact behavior and one annual pricing checkout-argument test.

- [ ] Add a reusable connected-provider mock harness.
- [ ] Add the unlock integration test.
- [ ] Add the pricing toggle and checkout integration test.
- [ ] Run the complete Vitest suite and record the new test count.

### Task 8: Final verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces: clean TypeScript, ESLint, and Vitest results with captured terminal output.

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Review the final diff for scope, accidental changes, and deployment activity.
