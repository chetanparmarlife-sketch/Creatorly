# Extension-to-CRM Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Creatorly extension show its active workspace and save matched or unmatched social profiles into that workspace's private CRM.

**Architecture:** The extension token resolves the signed-in user and their active workspace on every request. The profile endpoint returns workspace identity and saved state. Two token-authenticated mutations save a canonical Creatorly reference or create a private workspace record, while duplicate checks remain scoped to the active workspace.

**Tech Stack:** Convex TypeScript queries/mutations and HTTP actions, Chrome Manifest V3 extension, plain JavaScript, HTML, and CSS.

**Spec:** `docs/specs/2026-08-30-creatorly-product-boundaries.md`

## Global Constraints

- Customer-owned creator data must stay scoped to `workspaceId`.
- Unmatched extension profiles must never create or modify global `creators`, `creatorSocialProfiles`, or `contacts` rows.
- Matched profiles save a reference to Creatorly data and use the `Creatorly data` source.
- The extension must always show the connected workspace and a written saved state.
- Use the existing Lumen interface tokens and controls.

---

### Task 1: Extension workspace context

**Files:**
- Modify: `convex/extensionApi.ts`
- Test: `src/lib/extensionCrm.test.ts`

**Interfaces:**
- Produces: `workspaceForToken(ctx, token)` and profile response fields `workspace`, `isSaved`, `savedCreatorId`.

- [ ] Write tests for workspace context and duplicate identity behavior.
- [ ] Run the focused tests and confirm they fail.
- [ ] Resolve the token user's active, authorized workspace and add saved state to matched and unmatched profile responses.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Save matched and unmatched profiles

**Files:**
- Modify: `convex/extensionApi.ts`
- Modify: `convex/http.ts`
- Test: `src/lib/extensionCrm.test.ts`

**Interfaces:**
- Produces: `saveMatched({ token, creatorId })` and `savePrivate({ token, platform, handle, displayName? })` HTTP-backed mutations.

- [ ] Add duplicate-key tests for matched and private records.
- [ ] Add the matched save mutation with workspace-scoped duplicate detection.
- [ ] Add the unmatched private mutation using only `savedCreators` and `activityEvents`.
- [ ] Expose `/extension/save` and `/extension/save-private` POST routes.
- [ ] Run focused and full tests.

### Task 3: Extension save interface

**Files:**
- Modify: `extension/popup.js`
- Modify: `extension/popup.html`
- Modify: `extension/popup.css`
- Modify: `extension/background.js`
- Modify: `extension/manifest.json`

**Interfaces:**
- Consumes: profile response workspace/saved state and the two save endpoints.
- Produces: visible workspace context, written CRM state, matched save action, and unmatched private-add action.

- [ ] Add a persistent workspace strip below the extension header.
- [ ] Add a save card to matched locked and unlocked views.
- [ ] Replace the unmatched request action with `Add privately to CRM`.
- [ ] Refresh the current profile after saving so the state becomes `Already in CRM`.
- [ ] Update badge semantics to show saved profiles.

### Task 4: Verification and privacy audit

**Files:**
- Verify: `convex/extensionApi.ts`
- Verify: `convex/http.ts`
- Verify: `extension/*`

**Interfaces:**
- Produces: verified extension-to-CRM workflow ready for Convex upload and extension reload.

- [ ] Run `npm test -- --run`, `npm run lint`, and `npm run build`.
- [ ] Run `npx tsc -p convex/tsconfig.json --noEmit`.
- [ ] Confirm the private save path contains no write to global creator/contact tables.
- [ ] Run extension JavaScript syntax checks and inspect the final extension surface.
