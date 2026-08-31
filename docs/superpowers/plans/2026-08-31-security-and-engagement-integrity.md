# Security and Engagement Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove a private image-source identifier, make email verification fail closed, and prevent mixed-basis engagement filtering.

**Architecture:** Image-source matching reads its private Instagram host and path from Convex environment variables while retaining fixed public YouTube and Facebook policies. Authentication validates production email settings before provider construction and never marks an account verified because configuration is missing. Engagement values become `{ percent, basis }`; Discovery stores, returns, labels, indexes, and filters the basis explicitly.

**Tech Stack:** TypeScript, React, Convex, Vitest

**Spec:** User-provided three-item security and data-integrity request in this session.

## Global Constraints

- Keep the existing visual style.
- Do not deploy production code.
- Preserve HTTPS-only, exact-host, path-prefix, six-digit-code, and 15-minute-expiry rules.
- Stop after code changes and verification.

---

### Task 1: Private profile-image source policy

**Files:**
- Modify: `convex/lib/profileImagePolicy.ts`
- Modify: `src/profileImagePolicy.test.ts`
- Modify: `docs/superpowers/specs/2026-08-31-creator-owned-profile-images.md`
- Modify: `docs/superpowers/plans/2026-08-31-creator-owned-profile-images.md`

**Interfaces:**
- Consumes: `PROFILE_IMAGE_SOURCE_HOST`, `PROFILE_IMAGE_SOURCE_PREFIX`
- Produces: `isAllowedProfileImageSource(value, environment?)`

- [ ] Add failing tests for configured, missing, HTTP, path-mismatch, and lookalike-host cases.
- [ ] Read the source host and prefix at call time and fail closed when either is absent.
- [ ] Redact the private identifier from documentation.
- [ ] Run `npx vitest run src/profileImagePolicy.test.ts` and a repository-wide case-insensitive search.

### Task 2: Fail-closed email verification

**Files:**
- Modify: `convex/lib/authEmail.ts`
- Modify: `convex/auth.ts`
- Test: `src/authEmail.test.ts`

**Interfaces:**
- Consumes: `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, deployment environment markers
- Produces: a runtime configuration assertion and profiles whose `isEmailVerified` is always false at signup

- [ ] Add failing tests for missing production configuration and unchanged code format.
- [ ] Validate production configuration before auth provider construction.
- [ ] Keep development configuration optional without claiming verification succeeded.
- [ ] Run the focused auth tests and exercise missing configuration against the development path.

### Task 3: Engagement basis integrity

**Files:**
- Modify: `convex/lib/engagement.ts`
- Modify: `convex/lib/creatorImportMapping.ts`
- Modify: `convex/importCreators.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/creators.ts`
- Modify: `src/types.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `src/lib/demoData.ts`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Test: relevant import, Discovery, and engagement tests

**Interfaces:**
- Produces: `creatorEngagementRatePercent(source): { percent: number; basis: "followers" | "views" } | undefined`
- Produces: `engagementRateBasis` on stored and returned creator records

- [ ] Add tests for follower-basis supplied rates and view-basis YouTube rates.
- [ ] Store the rate and basis during imports and backfill.
- [ ] Restrict engagement filtering to one explicit basis at a time; use platform selection to resolve the basis.
- [ ] Label each Discovery value with its basis.
- [ ] Run the backfill in the allowed non-production development environment and verify representative records.

### Task 4: Full verification

**Files:**
- Verify all changed files above.

- [ ] Run `npx tsc -b`.
- [ ] Run `npx eslint .`.
- [ ] Run `npx vitest run`.
- [ ] Report each item’s focused verification and the final command output.
