# Creatorly M1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline in this session; sub-agent execution skills are not installed. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the smallest real Creatorly flow: password signup, creator search, a five-credit unlock, persistent 30-day contact access, and an unpacked profile-detection extension.

**Architecture:** A Vite React client talks directly to Convex queries and mutations through generated typed endpoints. Convex owns authentication, creator/contact records, credit transactions, and unlock records; pure matching and permission helpers remain separately testable. The Chrome extension is a small Manifest V3 client that detects a profile URL and opens the corresponding dashboard search while backend session sharing remains explicitly unclaimed until verified.

**Tech Stack:** React, TypeScript, Vite, Vitest, Convex, `@convex-dev/auth` Password provider, Lucide icons, plain CSS tokens, Chrome Manifest V3, Vercel.

**Spec:** `docs/specs/creatorly-m1.md`

## Global Constraints

- Build M1 only; every item listed as deferred in the spec remains out of this release.
- Stack remains GitHub, Convex, and Vercel.
- Unlock cost is exactly 5 credits and access lasts exactly 30 days.
- New accounts receive exactly 25 Free-plan credits.
- Demo contacts must be labelled as demo data and never presented as verified real-world contacts.
- Use native controls, visible keyboard focus, 44px hit targets, reduced-motion support, and responsive layouts.
- Never log password, auth token, private key, email, phone, or WhatsApp values.

---

### Task 1: Project foundation and test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css`
- Create: `src/lib/creatorMatching.ts`, `src/lib/creatorMatching.test.ts`
- Create: `.gitignore`, `.env.example`

**Interfaces:**
- Produces: `normalizeCreatorQuery(value: string): string` and `rankCreatorMatch(query, creator): number | null`.

- [ ] Initialize Git and install React, Vite, Vitest, Convex, Convex Auth, Lucide, and testing dependencies.
- [ ] Write tests proving suffix stripping, punctuation removal, exact ranking, normalized ranking, fuzzy name ranking, and no-match behavior.
- [ ] Implement the two matching helpers until those tests pass.
- [ ] Add strict TypeScript, Vite, and Vitest configuration.
- [ ] Run `npm test -- --run` and `npm run build`.

### Task 2: Convex schema, password auth, and seed data

**Files:**
- Create: `convex/schema.ts`, `convex/convex.config.ts`, `convex/auth.ts`, `convex/auth.config.ts`
- Create: `convex/users.ts`, `convex/creators.ts`, `convex/unlocks.ts`, `convex/seed.ts`

**Interfaces:**
- Produces: `api.users.viewer`, `api.creators.search`, `api.creators.getById`, `api.creators.findByProfile`, `api.unlocks.unlock`, and `api.seed.run`.
- `api.creators.getById` returns public creator data, unlock state, permitted contacts, hidden-contact count, credit balance, and expiry.
- `api.unlocks.unlock({ creatorId })` returns `{ status: "unlocked" | "already_unlocked", expiresAt, creditBalance }` or throws a clear insufficient-credit error.

- [ ] Define indexed tables for users, creators, contacts, unlock records, credit transactions, and contact requests.
- [ ] Configure `@convex-dev/auth` with the Password provider and required `auth.config.ts`.
- [ ] Create the current app user on first authenticated read with Free tier, 25 credits, and an initial signup credit transaction.
- [ ] Implement search ranking and public-safe result projection.
- [ ] Implement an atomic unlock mutation that reuses active records and charges only once.
- [ ] Seed at least six varied Instagram/YouTube creators and clearly fictional `example.test` contact values.
- [ ] Create a real Convex development deployment, generate auth keys headlessly, set deployment variables, run code generation, and seed it.

### Task 3: Authentication shell

**Files:**
- Create: `src/App.tsx`, `src/components/AuthScreen.tsx`, `src/components/AppShell.tsx`
- Create: `src/components/Logo.tsx`, `src/components/Icons.tsx`

**Interfaces:**
- `AuthScreen` switches between sign-up and sign-in while using `useAuthActions().signIn("password", FormData)`.
- `AppShell` receives the current route and renders the credit balance and plan badge.

- [ ] Build sign-up fields for name, agency, work email, and password with browser validation.
- [ ] Build sign-in fields for email and password with a visible error state.
- [ ] Route authenticated people to search and signed-out people to the auth screen.
- [ ] Verify a real signup/sign-out/sign-in round trip against Convex.

### Task 4: Search and creator detail core flow

**Files:**
- Create: `src/components/SearchView.tsx`, `src/components/CreatorResult.tsx`
- Create: `src/components/CreatorDetail.tsx`, `src/components/ContactCard.tsx`
- Create: `src/hooks/useRoute.ts`, `src/lib/format.ts`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- `useRoute()` maps `/search` and `/creator/:id` without adding a router dependency.
- `CreatorDetail` calls `api.unlocks.unlock`, then reacts to the updated query result.

- [ ] Build the debounced search field and All/Instagram/YouTube filter.
- [ ] Render ranked results, best-match state, creator metadata, and informative empty/loading states.
- [ ] Build locked preview with exact price and balance, including a disabled insufficient-credit action.
- [ ] Build unlocked role-labelled contact cards, expiry countdown, safe contact links, and copy feedback.
- [ ] Show Pro-only contact count without leaking restricted contact values.
- [ ] Verify unlock persistence and that repeated clicks do not double-charge.

### Task 5: Chrome extension companion

**Files:**
- Create: `extension/manifest.json`, `extension/popup.html`, `extension/popup.css`, `extension/popup.js`
- Create: `extension/content.js`, `extension/README.md`, `public/extension/icon.svg`

**Interfaces:**
- The content script answers `{ type: "CREATORLY_PROFILE" }` with `{ platform, handle } | null`.
- The popup opens `${dashboardUrl}/search?q=${encodeURIComponent(handle)}&platform=${platform}`.

- [ ] Detect supported Instagram profile and YouTube handle/channel URLs while excluding feeds and settings pages.
- [ ] Build detecting, profile-found, and wrong-page popup states.
- [ ] Store a configurable dashboard URL and open the matching dashboard search.
- [ ] Document developer-mode installation and the M1 auth limitation honestly.

### Task 6: Verification, release notes, and deployment

**Files:**
- Create: `CHANGELOG.md`, `README.md`, `.interface-design/system.md`
- Modify: any files implicated by failed checks.

**Interfaces:**
- Produces a public Vercel URL, a linked Git repository when GitHub CLI access exists, and documented extension install steps.

- [ ] Run unit tests, TypeScript checks, production build, and lint.
- [ ] Start the app and verify signup, search, detail, unlock, refresh, sign-out, and sign-in in a real browser.
- [ ] Capture and inspect desktop and mobile screenshots; fix layout or contrast defects.
- [ ] Load the unpacked extension and verify detection on supported and unsupported pages if local Chrome automation permits it.
- [ ] Add exact test outcomes and known limitations to CHANGELOG and README.
- [ ] Deploy Convex production functions and Vercel, then smoke-test the public URL logged out.
