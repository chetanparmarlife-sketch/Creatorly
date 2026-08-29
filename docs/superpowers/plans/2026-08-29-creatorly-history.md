# Creatorly History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a History page where a signed-in marketer can filter past creator unlocks, reopen active contacts without charge, and re-unlock expired access for 5 credits.

**Architecture:** Convex exposes one authenticated history query that joins each user unlock to its creator and collapses repeated records to the newest access window. The existing `AppData` abstraction receives the same capability for Convex and local demo modes, while a route-level React view owns filtering and navigation. Re-unlock continues through the existing atomic unlock mutation.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, Convex, Lucide, plain CSS tokens.

**Spec:** Product spec sections 2.1 Dashboard Navigation and 2.12 History Page in the user-provided source of truth.

## Global Constraints

- Unlock cost remains exactly 5 credits.
- Active access remains exactly 30 days from unlock.
- Active history opens the full creator contact card without another charge.
- Expired access shows a re-unlock action and charges only through the existing atomic mutation.
- History filters are Active, Expired, and All; items are newest first.
- Current M1/M4 design tokens and responsive 4px spacing system remain unchanged.
- Automated QA accounts and fictional `example.test` contacts must never be presented as real users or contacts.

---

### Task 1: History data contract and providers

**Files:**
- Modify: `src/types.ts`
- Modify: `convex/unlocks.ts`
- Modify: `src/lib/demoData.ts`
- Modify: `src/data/AppData.tsx`

**Interfaces:**
- Produces: `UnlockHistoryItem` with creator preview, `unlockedAt`, `expiresAt`, `creditsSpent`, and derived `status`.
- Produces: public `unlocks:listHistory({})` query returning newest records first and collapsing repeated creator unlocks to the newest record.
- Produces: `AppData.getHistory(): Promise<UnlockHistoryItem[]>` in both Convex and demo modes.

- [x] Add the `UnlockHistoryItem` TypeScript contract.
- [x] Add an authenticated Convex query that joins unlock records to creators, removes missing creators, keeps the newest record per creator, and derives active/expired from `expiresAt` at read time.
- [x] Change demo unlock persistence from expiry-only values to objects containing `unlockedAt`, `expiresAt`, and `creditsSpent`, while reading the old expiry-only shape for backwards compatibility.
- [x] Add demo and Convex `getHistory` adapters.
- [x] Run `npx tsc -p convex/tsconfig.json` and `npm run build`.

### Task 2: History route, navigation, and interface

**Files:**
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Create: `src/components/HistoryView.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `AppData.getHistory()` and the existing `{ name: "creator", creatorId }` navigation contract.
- Produces: `{ name: "history" }` route at `/history`.
- Produces: accessible Search and History navigation with the current route marked by `aria-current="page"`.

- [x] Add `/history` route parsing and URL generation.
- [x] Add Search and History top-navigation actions and accurate active state.
- [x] Build loading, error, empty, active, and expired history states with native buttons and tab semantics.
- [x] Make the active-access count the visual focal point; use verified green only for active access and coral only for re-unlock.
- [x] Open active items in Creator Detail and re-unlock expired items through the existing atomic mutation.
- [x] Add desktop, tablet, and mobile CSS using the existing Creatorly tokens, radii, typography, and 4px grid.

### Task 3: Journey test, release checks, and deployment

**Files:**
- Modify: `src/App.integration.test.tsx`
- Modify: `CHANGELOG.md`
- Modify: `README.md`

**Interfaces:**
- Proves: signup → unlock → History → active filter → reopen contact without a second charge.
- Proves: empty History before the first unlock.

- [x] Write the History journey assertions first and run them to confirm the absent feature fails.
- [x] Implement Tasks 1 and 2 until the journey passes.
- [x] Run lint, all tests, frontend build, Convex TypeScript, extension syntax, and dependency audit.
- [x] Push Convex functions to development and production, then deploy Vercel production.
- [x] Smoke-test `/history` and confirm the production bundle still points to the production Convex deployment.
- [x] Record exact outcomes and remaining browser-automation limitation in README and CHANGELOG.
- [x] Commit and push the completed History slice.

## Self-review

- Spec coverage: filters, dates, active/expired state, countdown, view action, and 5-credit re-unlock path are covered. Date-range filtering is intentionally deferred because the specified History tabs and creator-name search are the smallest testable slice; the current six-record dataset does not justify a date-picker dependency.
- Placeholder scan: no implementation placeholders remain.
- Type consistency: `UnlockHistoryItem`, `getHistory`, `unlocks:listHistory`, and the `history` route names match across tasks.
