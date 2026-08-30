# Product Trust and Reliability Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the listed order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sessions durable, prevent unsafe contact sales, describe the current repository honestly, and fix the reported onboarding and mobile polish defects.

**Architecture:** Keep Convex as the source of truth for users, unlocks, onboarding progress, and contact reports. Keep the UI defensive too: loading auth is distinct from signed out, only verified contact rows can be unlocked or returned, and incomplete data features are removed instead of presented as working filters.

**Tech Stack:** React 19, TypeScript, Vite, Convex, `@convex-dev/auth`, Vitest, Testing Library

**Spec:** `docs/specs/2026-08-30-product-trust-reliability.md`

## Global Constraints

- Complete tasks in the order in the spec.
- Do not expose or charge for `pending_verification` or `unverified` contacts.
- Use plain, accurate copy for imported contacts and repository scope.
- Preserve the existing Lumen interface system and 44px minimum action height.

---

### Task 1: Persistent auth state

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/data/AppData.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `AppData.authLoading: boolean`, backed by Convex Auth's initial token restoration state.

- [ ] Add a failing integration test that renders an authenticated route while `authLoading` is true and asserts that neither signup nor landing content is shown.
- [ ] Pass `isLoading` from `useConvexAuth` through `ConvexDataProvider`, use explicit browser `localStorage` for refresh-token persistence, and render a neutral loading view until token restoration finishes.
- [ ] Run `npm run test:run -- src/App.integration.test.tsx` and `npm run build`.
- [ ] On the connected deployment, inspect persisted auth keys and exercise repeated hard reloads. Record that the one-hour wait and browser-restart check require real elapsed time if not completed.

### Task 2: Verified-only unlocks and contact reports

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/creators.ts`
- Modify: `convex/unlocks.ts`
- Create: `convex/contactFlags.ts`
- Modify: `src/types.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `src/lib/demoData.ts`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/components/ContactCard.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `AppData.reportWrongContact(contactId: string): Promise<{ status: "created" | "already_reported" }>`.
- Produces: `CreatorDetailData.pendingContactCount` and verified-only `availableContactCount` / `contacts`.

- [ ] Add failing tests showing pending contacts cannot be unlocked, do not reduce balance, and do not reveal email; add a report test that asserts a persisted flag.
- [ ] Add indexed `contactFlags` rows keyed by reporting user and contact, and an authenticated mutation that inserts one flag per user/contact pair.
- [ ] Filter detail payloads and unlock eligibility to active `verified` contacts; reject the mutation before any credit write when none are eligible.
- [ ] Render unavailable copy for pending-only creators and a report action on every revealed contact card.
- [ ] Run the targeted tests and `npx convex dev --once` so schema and functions typecheck together.

### Task 3: Honest contact copy

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/PricingView.tsx`
- Modify: `src/components/AuthScreen.tsx`
- Modify: other user-facing files found by the audit where “verified” means contact verification rather than platform/account status.

**Interfaces:**
- Consumes: repository status from `data/creator-import-report.json` (`pending_verification`).

- [ ] Replace contact-verification promises with “imported contacts, verification in progress” or exact role/access descriptions.
- [ ] Run `rg -n -i 'verified' src extension` and review every user-facing match; retain only truthful platform, account, or actual verified-row labels.
- [ ] Run the UI tests and production build.

### Task 4: Search coverage guidance

**Files:**
- Modify: `src/components/SearchView.tsx`
- Modify: `src/styles.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: one shared scope string shown above search and in named-query zero results.

- [ ] Add a failing test for a `MrBeast` zero result that expects India/Instagram/repository scope guidance.
- [ ] Add the scope line above the input and reuse it in the zero-result state.
- [ ] Run the targeted test.

### Task 5: Remove the unreliable follower filter

**Files:**
- Modify: `src/components/SearchView.tsx`
- Modify: `src/types.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `convex/creators.ts`
- Modify: `src/lib/demoData.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Removes: customer-facing `followerBand` selection and its raw null/enum label.

- [ ] Add an assertion that no Followers dropdown or “Count not supplied” option appears.
- [ ] Remove follower-band state and query plumbing from the customer-facing search path while preserving follower display values as data.
- [ ] Run search tests and build.

### Task 6: Durable onboarding step

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/users.ts`
- Modify: `src/types.ts`
- Modify: `src/data/AppData.tsx`
- Modify: `src/lib/demoData.ts`
- Modify: `src/components/OnboardingView.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `Viewer.onboardingStep: 1 | 2 | 3 | 4` and `AppData.updateOnboardingStep(step)`.

- [ ] Add a remount test that advances to step 3, remounts, and still shows DemoPay.
- [ ] Persist every forward/back transition to the user record; initialize the component from the viewer field.
- [ ] Run the targeted test and Convex typecheck/deploy command.

### Task 7: Hero labels

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.css`

**Interfaces:**
- Produces: semantic status text with no button role, pointer cursor, or raised/pressed state.

- [ ] Replace `kbd`/pill affordances for MATCHED and PRO ACCESS with plain status labels.
- [ ] Check computed cursor and semantics in the browser.

### Task 8: Mobile and share polish

**Files:**
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/components/LandingPage.css`
- Modify: `src/styles.css`
- Modify: `index.html`
- Create: `public/favicon.svg`
- Create: `public/og-image.svg`

**Interfaces:**
- Produces: generic signup examples, 44px mobile nav action, unclipped 390px filters, favicon, `og:title`, and `og:image`.

- [ ] Replace personal/company placeholders with generic examples.
- [ ] Raise the mobile “Find a contact” height to 44px and make the filters scroll without clipping Location.
- [ ] Add favicon and Open Graph tags/assets using the deployed canonical URL.
- [ ] Run tests, lint, and build.
- [ ] Start the app, capture 390px screenshots of search and signup, and inspect Open Graph metadata with a preview checker or equivalent metadata fetch.

## Self-review

- Spec coverage: all eight numbered requirements map one-to-one to Tasks 1–8.
- Placeholder scan: no deferred implementation placeholders are present.
- Type consistency: onboarding and contact-report interfaces are named once and consumed consistently in later tasks.
