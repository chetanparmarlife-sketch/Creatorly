# Advanced Discovery Filters Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current workspace. Do not add filters for data Creatorly does not store.

**Goal:** Help brand and agency operators turn a campaign brief into a trustworthy creator shortlist faster.

**Architecture:** Extend the existing Discovery sidebar rather than creating a second filter surface. Keep server-backed filtering for platform, category, location, verification, and follower range; add precise audience controls, execution presets, explicit result priority, and removable applied-filter chips. Fix the existing Convex browse path so verification is honored during browsing as well as text search.

**Tech Stack:** React 19, TypeScript, Convex, Vitest, Testing Library, CSS.

**Spec:** `.interface-design/system.md` — Discovery command and filter sidebar patterns, plus the user's request in this thread.

## Global Constraints

- Use only stored creator fields; do not imply engagement, rate, or contact readiness data exists.
- Keep the fixed 280px contextual sidebar and the established 4px spacing system.
- Filters apply automatically and must remain keyboard accessible.
- Preserve existing platform, category, audience, location, verification, and table-sort behavior.

---

### Task 1: Make verified browsing trustworthy

**Files:**
- Modify: `convex/creators.ts`
- Modify: `src/data/AppData.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `browseCreators({ verifiedOnly?: boolean })`
- Produces: `creators:browsePage` accepting `verifiedOnly` and excluding unverified rows before results are returned.

- [ ] Add `verifiedOnly` to `BrowseArgs`, the Convex provider call, and `browsePage` arguments.
- [ ] Use verified follower indexes for platform-only and repository-wide browsing; apply verification conditions to combined filter branches.
- [ ] Add a Discovery journey assertion that unverified rows disappear when “Verified profiles only” is enabled.
- [ ] Run the focused integration test.

### Task 2: Add execution-focused controls

**Files:**
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/workspace.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: existing `platform`, `category`, `location`, `verifiedOnly`, `sort`, and follower-range query arguments.
- Produces: exact minimum/maximum audience inputs, audience presets, result-priority selection, and removable active-filter chips.

- [ ] Preserve the audience-band selector and add optional numeric “Minimum” and “Maximum” follower inputs; exact values override the selected band.
- [ ] Add campaign shortcuts for Emerging (under 100K), Growth (100K–500K), and Major reach (1M+).
- [ ] Add a Result priority disclosure with Largest audience, Emerging first, Creator A–Z, and Market A–Z options.
- [ ] Show each applied filter as a removable chip above the table.
- [ ] Validate that maximum audience is greater than minimum before querying and show an inline error.
- [ ] Add focused interaction tests for a precise range, a shortcut, result priority, chip removal, and clear-all.

### Task 3: Verify and ship

**Files:**
- Modify only if checks find a defect.

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: a production-ready frontend and Convex function bundle.

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run focused Discovery tests and the full test suite; separate pre-existing failures from regressions.
- [ ] Commit the scoped files, push `main`, deploy Convex production functions, and confirm the Vercel production deployment reaches Ready.
