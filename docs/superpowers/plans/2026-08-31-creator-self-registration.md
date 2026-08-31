# Creator Self-Registration Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints. This document intentionally contains no implementation code.

**Goal:** Build a public “Claim your Creatorly profile” flow where a creator submits an Instagram URL or handle, completes creator-controlled commercial information, verifies ownership, and publishes a trusted profile to Discovery.

**Architecture:** Keep creator-submitted data in a private claim draft until ownership is verified and publication checks pass. Match the submitted Instagram identity to an existing `creators` record where possible; otherwise create a provisional record. Enrichment is handled by a queued scraping adapter with source timestamps and provenance—not Instagram sign-in, OAuth, or Meta APIs.

**Tech Stack:** React 19, TypeScript, Vite, Convex Auth, Convex database/functions/storage/scheduler, Vitest, Testing Library, Vercel.

**Spec:** User brief in the 31 August 2026 conversation, including the clarified Instagram-only, scraping-first scope.

## Global constraints

- Planning only in this document; no product code is included.
- MVP accepts only an Instagram profile URL or Instagram handle.
- Do not request Instagram credentials or connect the creator’s Instagram account.
- Do not use Instagram OAuth, Meta Login, or Meta APIs in this release.
- Shopify and affiliate connections appear only as “coming later”; no connection flow is built.
- Business email, WhatsApp, manager details, media kits, and audience screenshots remain private unless the creator explicitly allows brand access.
- A claim must never overwrite a live creator profile before ownership verification and publication review complete.
- Every scraped, creator-entered, and admin-edited field records its provenance and last-updated time.
- Existing brand and agency accounts must continue using the current onboarding and workspace flow unchanged.

---

## Recommended release boundaries

Treat this as four independently testable sub-projects:

1. **Claim foundation:** creator account type, public routes, Instagram identity matching, autosaved drafts.
2. **Profile completion:** contacts, manager, categories, languages, location, assets, rates, and contact preference.
3. **Ownership and publishing:** verification challenges, review queue, conflict handling, and safe merge into Discovery.
4. **Enrichment and future connections:** scraping pipeline first; Shopify, affiliate accounts, and social sign-in later.

The first three form the MVP. Do not block the MVP on Shopify, affiliate networks, or social OAuth.

## Target user journey

1. Creator opens `/claim` without signing in.
2. Creator enters an Instagram URL or handle.
3. Creatorly normalizes the handle and shows one of three outcomes: existing match, possible matches requiring confirmation, or new provisional profile.
4. Creator creates a creator account or signs in. Creator accounts bypass agency onboarding and do not receive a brand workspace.
5. Creatorly creates a private claim draft and queues Instagram enrichment.
6. Creator completes business contacts, manager details, categories, languages, location, rates, media kit, audience screenshots, and brand-contact preference.
7. Creator completes an available ownership challenge.
8. Creator previews the brand-facing profile and submits it.
9. Low-risk verified claims publish automatically; conflicts and suspicious claims enter admin review.
10. Creator receives a dashboard for profile completeness, verification state, publication state, and future edits.

## Status model

Use explicit states so the UI and operations team always know what happens next:

| Status | Meaning | User action |
|---|---|---|
| `draft` | Claim exists but required profile fields are incomplete | Complete profile |
| `enrichment_pending` | Instagram scraping is queued or running | Continue entering owned data |
| `ready_for_verification` | Minimum required fields exist | Choose verification method |
| `verification_pending` | A challenge has been issued | Complete challenge |
| `verified` | Ownership proof passed | Review and submit |
| `review_required` | Duplicate, conflict, or risk rule needs staff review | Wait or respond to request |
| `published` | Claimed data is active in Discovery | Maintain profile |
| `rejected` | Evidence failed or policy was violated | View reason and appeal |
| `suspended` | Published claim was later restricted | Contact support |

Verification challenge states should be separate: `issued`, `checking`, `passed`, `failed`, `expired`, and `cancelled`.

## Data ownership rules

- **Creator-controlled:** business contact, manager, categories, languages, location, rates, media kit, audience screenshots, contact permission.
- **Scraped:** Instagram identity, follower count, biography, profile image, engagement metrics, post statistics, and public business contact when legally available.
- **System-controlled:** verification state, trust badges, moderation state, risk flags, provenance, timestamps, and publication state.
- **Admin-controlled:** dispute resolution, duplicate merges, suspension, rejection reason, and evidence review.
- Creator-controlled values may override scraped descriptive fields after verification, but raw scraped observations remain in history for audit.

---

### Task 1: Lock MVP policy and acceptance rules

**Files:**
- Create: `docs/specs/2026-08-31-creator-self-registration.md`

**Produces:** A product contract used by every later task.

- [ ] Define the minimum publishable profile: verified Instagram identity, display name, at least one category, one language, country, brand-contact preference, and accepted terms.
- [ ] Decide whether a verified creator can publish with no business contact when “brands cannot contact me” is selected. Recommended: yes.
- [ ] Define whether indicative rates are optional. Recommended: optional, because forcing rates will reduce completion and can become stale.
- [ ] Define media-kit limits: PDF only for MVP, maximum 20 MB, one active file, replaceable with history.
- [ ] Define audience-screenshot limits: JPEG/PNG/WebP, maximum 8 MB each, maximum 10 active screenshots.
- [ ] Define auto-publish rules: only exact Instagram match or new handle, successful ownership verification, no competing verified claim, and no risk flags.
- [ ] Define manual-review rules: duplicate profiles, handle reassignment, conflicting business email, repeated failed verification, suspicious uploads, or an existing verified owner.
- [ ] Define retention: expired verification challenges for 90 days, rejected evidence for 180 days, audit events retained permanently unless legal policy requires otherwise.
- [ ] Review the policy with product, operations, legal/privacy, and security owners before schema work begins.

**Acceptance gate:** Every required field, optional field, verification outcome, publication outcome, and dispute outcome has one written rule.

### Task 2: Add creator identity without breaking buyer accounts

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/auth.ts`
- Modify: `convex/users.ts`
- Modify: `src/types.ts`
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.integration.test.tsx`
- Test: `src/ConvexProviders.integration.test.tsx`

**Produces:** A creator account can register and sign in without creating an agency workspace.

- [ ] Add an optional user persona with existing users defaulting to `buyer` and claim registrations using `creator`.
- [ ] Add a creator-specific signup reason so the current buyer signup copy does not ask for an agency name.
- [ ] Keep email verification and password security consistent with the existing Convex Auth flow.
- [ ] Route creator users to the claim dashboard after authentication and buyer users to their existing onboarding or workspace.
- [ ] Prevent a creator account from entering buyer-only workspace routes unless it later creates or joins a workspace.
- [ ] Allow one login to become both a creator and a workspace member later without duplicating the user record.
- [ ] Test new creator signup, returning creator login, existing buyer login, email verification, refresh restoration, and direct-route protection.
- [ ] Commit the creator-persona foundation separately.

**Acceptance gate:** Existing brand/agency onboarding tests still pass, and a creator can register without entering a company or agency name.

### Task 3: Create the claim data model and access boundary

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/lib/creatorClaimAuth.ts`
- Create: `convex/creatorClaims.ts`
- Create: `src/features/claim/claimTypes.ts`
- Test: `src/creatorClaims.test.ts`

**Produces:** Private, resumable claim drafts with strict owner-only access.

- [ ] Add `creatorClaims` with owner user, optional matched creator, normalized Instagram handle, canonical Instagram URL, lifecycle status, completeness score, contact preference, submission timestamps, and publication timestamps.
- [ ] Add `creatorClaimProfiles` for creator-controlled biography, categories, languages, country, city, postal code, and management type.
- [ ] Add `creatorClaimContacts` for business email, WhatsApp, manager name, manager email, manager WhatsApp, relationship type, and verification state.
- [ ] Add `creatorClaimRates` as repeatable records with deliverable type, currency, minimum, maximum, negotiable flag, notes, and update time.
- [ ] Add `creatorClaimAuditEvents` with actor, event type, safe metadata, timestamp, and previous/new status.
- [ ] Index claims by owner, normalized Instagram handle, matched creator, and status; enforce one active claim per user/Instagram identity pair.
- [ ] Centralize authorization so only the owner and authorized admins can read drafts, contacts, verification evidence, rates, or assets.
- [ ] Ensure public creator queries cannot accidentally return claim drafts or private evidence.
- [ ] Test unauthorized reads/writes, cross-user access, duplicate active claims, valid resume, and status-transition rules.
- [ ] Commit schema and authorization together.

**Acceptance gate:** A second authenticated user cannot read or mutate any field, asset, or evidence belonging to another creator’s claim.

### Task 4: Build Instagram handle intake and duplicate matching

**Files:**
- Create: `src/features/claim/ClaimLanding.tsx`
- Create: `src/features/claim/InstagramClaimStep.tsx`
- Create: `src/features/claim/claimValidation.ts`
- Create: `src/features/claim/claim.css`
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Modify: `src/data/AppData.tsx`
- Modify: `convex/creatorClaims.ts`
- Test: `src/ClaimProfile.integration.test.tsx`
- Test: `src/claimValidation.test.ts`

**Produces:** A public Instagram-only claim entry point that safely resolves existing profiles.

- [ ] Add public `/claim` and authenticated `/claim/profile` routes, with return-to-claim behavior through signup and email verification.
- [ ] Accept `@handle`, `handle`, `instagram.com/handle`, and supported Instagram URL variants.
- [ ] Reject post, reel, story, hashtag, and malformed URLs; strip query strings and normalize case without losing the display handle.
- [ ] Match against `creatorSocialProfiles.by_platform_handle` first, then `creators.by_normalized_handle` restricted to Instagram.
- [ ] Show an exact match with enough public context to avoid claiming the wrong person, but never expose private contacts.
- [ ] Show possible duplicate matches for admin resolution instead of silently creating a second creator.
- [ ] Create a provisional creator reference only after authentication and explicit confirmation.
- [ ] Queue enrichment without blocking the creator from continuing the form.
- [ ] Rate-limit anonymous handle checks and authenticated claim creation by IP/session and user.
- [ ] Test every supported input form, duplicate paths, malformed URLs, refresh/resume, and rate-limit messaging.
- [ ] Commit the complete handle-intake slice.

**Acceptance gate:** A creator can start with only an Instagram handle, and the system never requires Instagram login or Meta authorization.

### Task 5: Build the resumable profile-completion wizard

**Files:**
- Create: `src/features/claim/ClaimWizard.tsx`
- Create: `src/features/claim/ProfileDetailsStep.tsx`
- Create: `src/features/claim/BusinessContactStep.tsx`
- Create: `src/features/claim/RatesStep.tsx`
- Create: `src/features/claim/ClaimReviewStep.tsx`
- Modify: `src/features/claim/claim.css`
- Modify: `src/data/AppData.tsx`
- Modify: `convex/creatorClaims.ts`
- Test: `src/ClaimProfile.integration.test.tsx`

**Produces:** Creator-owned profile completion with autosave and clear privacy controls.

- [ ] Use a short stepper: Instagram, profile, business, assets and rates, verification, review.
- [ ] Autosave each step after validation and show saved, saving, and retry states.
- [ ] Allow multiple categories and languages using controlled vocabularies plus an admin-review path for unsupported values.
- [ ] Use searchable country and city inputs; postal code is optional and never shown publicly by default.
- [ ] Capture self-managed or managed status and show manager fields only when managed is selected.
- [ ] Validate email syntax, normalized phone/WhatsApp format, currencies, non-negative rates, and maximum greater than minimum.
- [ ] Offer contact choices: direct contact allowed, manager only, or not contactable.
- [ ] Explain that business contacts are private and follow Creatorly’s brand-access rules; never render them in the public preview.
- [ ] Show profile completeness based only on meaningful required/optional fields, not on future integrations.
- [ ] Test conditional manager fields, invalid contacts/rates, autosave recovery, contact permissions, and browser refresh between steps.
- [ ] Commit the wizard as one independently usable draft flow.

**Acceptance gate:** A creator can leave and resume without losing data, and contact permission changes immediately affect the preview.

### Task 6: Add media-kit and audience-proof uploads

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/creatorClaimAssets.ts`
- Create: `src/features/claim/ClaimAssetsStep.tsx`
- Modify: `src/features/claim/ClaimWizard.tsx`
- Modify: `src/data/AppData.tsx`
- Test: `src/ClaimAssets.integration.test.tsx`

**Produces:** Private storage for creator evidence with safe file handling.

- [ ] Add asset records for `media_kit` and `audience_screenshot`, including owner, claim, storage ID, original filename, content type, byte size, moderation state, and timestamps.
- [ ] Generate short-lived upload URLs only for the authenticated claim owner.
- [ ] Verify file type and size on the server after upload; reject mismatches between extension and content type.
- [ ] Keep raw asset URLs private and return temporary download URLs only to the owner or authorized admin.
- [ ] Add upload progress, retry, replace, remove, and accessible preview states.
- [ ] Make screenshot labels optional but useful: platform, metric type, and captured date.
- [ ] Add malware/content scanning as a production gate before staff or brands can download files.
- [ ] Test expired upload URLs, unauthorized asset access, oversized files, invalid types, replacement, deletion, and refresh recovery.
- [ ] Commit assets separately from verification.

**Acceptance gate:** No uploaded file is publicly addressable, and removing an asset removes both the record and stored object through a recoverable cleanup process.

### Task 7: Add Instagram scraping as a provider-independent enrichment queue

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/creatorEnrichment.ts`
- Create: `convex/lib/instagramEnrichmentProvider.ts`
- Modify: `convex/http.ts` only if an external scraper needs a signed callback
- Modify: `convex/creatorClaims.ts`
- Test: `src/creatorEnrichment.test.ts`

**Produces:** Reliable Instagram enrichment without Meta APIs or account connection.

- [ ] Add enrichment jobs with claim, normalized handle, provider, attempt count, status, scheduled time, safe error code, and completion time.
- [ ] Define one provider interface so the scraping vendor can change without changing claim or publishing logic.
- [ ] Fetch only public data permitted by the chosen provider and applicable platform/legal rules; do not bypass login, access controls, or rate limits.
- [ ] Store raw provider responses outside the live creator record or retain only approved fields, according to privacy policy.
- [ ] Map accepted values into a proposed enrichment snapshot with per-field provenance and observed time.
- [ ] Retry transient failures with capped backoff; send permanent failures to an operations queue without blocking creator-entered data.
- [ ] Never let scraped contact data overwrite creator-controlled contact data.
- [ ] Refresh stale metrics on a controlled schedule after publication and clearly label their last-updated date.
- [ ] Test success, private/missing profile, renamed handle, provider timeout, malformed payload, retry exhaustion, and idempotent callback processing.
- [ ] Commit enrichment behind a disabled production flag until provider/legal review is approved.

**Acceptance gate:** Replaying the same provider result cannot duplicate profiles, jobs, contacts, or metrics.

### Task 8: Implement ownership verification without social sign-in

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/creatorVerification.ts`
- Create: `src/features/claim/VerificationStep.tsx`
- Modify: `src/features/claim/ClaimWizard.tsx`
- Modify: `src/data/AppData.tsx`
- Test: `src/CreatorVerification.integration.test.tsx`

**Produces:** Expiring, auditable ownership challenges that do not require Instagram account connection.

- [ ] Make temporary Instagram bio code the primary MVP method after the scraper can read the public biography.
- [ ] Generate a short, non-guessable display code; store only a hash, expiration, attempt count, and safe evidence metadata.
- [ ] Let the creator request a check, confirm the current public bio through the enrichment adapter, and remove the code after verification.
- [ ] Offer business-email verification only when enrichment found a publicly listed business address; send the challenge to that address rather than accepting an arbitrary email.
- [ ] Offer website-backlink verification only when the creator has a public website; require a link to a claim-specific Creatorly URL and verify the final HTTPS page.
- [ ] Defer “send an email from the public address” until Creatorly has a secured inbound-email service; use a link/code sent to the discovered address for MVP.
- [ ] Keep social account sign-in explicitly deferred.
- [ ] Limit attempts, expire challenges, prevent challenge reuse, and route repeated failures or conflicting claims to review.
- [ ] Add clear instructions, pending checks, retry timing, success state, and accessible failure reasons.
- [ ] Test expired codes, wrong bio, stale scrape, email mismatch, unsafe website redirects, backlink removal, repeated attempts, and competing claims.
- [ ] Commit each verification method behind its own feature flag.

**Acceptance gate:** No method can verify an arbitrary handle, email, or website supplied only by the claimant without independent public evidence.

### Task 9: Publish verified claims into the canonical creator profile

**Files:**
- Create: `convex/creatorClaimPublishing.ts`
- Modify: `convex/creators.ts`
- Modify: `convex/schema.ts`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Test: `src/CreatorPublishing.integration.test.tsx`

**Produces:** Safe, traceable publication into Discovery.

- [ ] Re-check claim ownership, challenge status, required fields, contact consent, and moderation state in one server-side publish transaction.
- [ ] Merge with the matched creator using platform identity IDs, never display name alone.
- [ ] Write creator-owned fields and their provenance; keep scraped metrics and their separate observed timestamps.
- [ ] Sync allowed business and manager contacts into `contacts` only after publication, using the creator’s contact preference.
- [ ] Mark the creator verified with a specific “creator claimed” trust source rather than overloading one generic boolean internally.
- [ ] Recalculate discovery indexes for category, location, engagement, and platform after publication.
- [ ] Show “Claimed by creator” and freshness on the profile without exposing private evidence.
- [ ] Preserve saved creator/campaign references when merging duplicates.
- [ ] Make publication idempotent and write an audit event for every changed canonical field.
- [ ] Test exact match merge, provisional publish, duplicate conflict, repeated publish, contact permission, saved-profile preservation, and Discovery visibility.
- [ ] Commit publishing only after the migration and rollback procedure is reviewed.

**Acceptance gate:** Publishing twice produces the same canonical creator, social profile, contacts, and claim state.

### Task 10: Add creator dashboard and ongoing maintenance

**Files:**
- Create: `src/features/claim/ClaimDashboard.tsx`
- Create: `src/features/claim/ClaimStatus.tsx`
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Modify: `src/data/AppData.tsx`
- Modify: `convex/creatorClaims.ts`
- Test: `src/ClaimDashboard.integration.test.tsx`

**Produces:** A clear post-registration home for creators.

- [ ] Show publication status, profile completeness, verification method, last enrichment time, profile views if available later, and next required action.
- [ ] Allow updates to creator-controlled fields while keeping published data live until the updated draft passes validation.
- [ ] Require re-verification for Instagram handle changes and sensitive business-contact changes.
- [ ] Let creators pause brand contact without unpublishing the profile.
- [ ] Let creators request unpublishing and account deletion with a clear retention explanation.
- [ ] Display Shopify and affiliate connections as non-interactive “coming later” items; do not collect tokens or account IDs.
- [ ] Test published edits, sensitive edits, contact pause, unpublish request, account deletion request, and future-integration placeholders.
- [ ] Commit the dashboard independently.

**Acceptance gate:** A creator can understand the current state and next action without contacting support.

### Task 11: Add admin review, disputes, and operational tools

**Files:**
- Modify: `src/components/AdminView.tsx`
- Create: `convex/creatorClaimAdmin.ts`
- Modify: `convex/notifications.ts`
- Test: `src/CreatorClaimAdmin.integration.test.tsx`

**Produces:** A safe review queue for ambiguous or risky claims.

- [ ] Add queues for new conflicts, failed verification, duplicate matches, suspicious assets, appeals, and unpublish requests.
- [ ] Show side-by-side existing profile, creator-entered draft, scraped snapshot, verification evidence, and audit history.
- [ ] Allow approve-and-merge, request more evidence, reject with a reason, transfer after dispute resolution, suspend, and restore.
- [ ] Require a written reason for destructive or trust-changing actions.
- [ ] Prevent admins from silently editing creator-entered contacts; corrections must create audit events.
- [ ] Notify creators when more evidence is requested, a claim is approved/rejected, or publication status changes.
- [ ] Test admin authorization, each state transition, duplicate merge preservation, notification delivery, and immutable audit history.
- [ ] Commit operations tooling before enabling broad public traffic.

**Acceptance gate:** Every claim can be resolved without direct database editing.

### Task 12: Security, privacy, abuse prevention, and observability gate

**Files:**
- Create: `docs/creator-claim-operations.md`
- Modify: `convex/http.ts`
- Modify: relevant claim and asset functions from earlier tasks
- Test: all claim security and integration suites

**Produces:** A production-ready risk and operations baseline.

- [ ] Threat-model account takeover, impersonation, duplicate claims, malicious files, scraping abuse, contact harvesting, code guessing, SSRF through website verification, and admin misuse.
- [ ] Add per-IP, per-user, per-handle, and per-method rate limits with safe user-facing cooldowns.
- [ ] Allow outbound fetches only to validated HTTPS hosts and block private/internal IP ranges and unsafe redirects.
- [ ] Redact business contacts, challenge codes, upload URLs, and provider payloads from logs.
- [ ] Add structured events for funnel completion, enrichment failures, verification pass/fail, review age, publication, and dispute rate.
- [ ] Define alerts for callback signature failures, verification spikes, storage scanning failures, queue backlog, and publication errors.
- [ ] Complete privacy-policy and terms updates covering creator-submitted data, scraping, verification evidence, contact sharing, retention, and deletion.
- [ ] Run accessibility checks for keyboard flow, labels, errors, focus movement, progress announcements, and mobile layouts.
- [ ] Run the full automated suite, production build, schema deployment dry run, and rollback rehearsal.
- [ ] Commit the operational documentation and release gates.

**Acceptance gate:** Security, privacy, legal, product, and operations owners explicitly approve the public launch.

### Task 13: Controlled rollout

**Files:**
- Modify: the project’s existing feature-flag/config location chosen during implementation
- Update: `docs/creator-claim-operations.md`

**Produces:** A measurable launch with a rollback path.

- [ ] Deploy schema and inactive backend functions first.
- [ ] Enable internal staff accounts and test claims against seeded and real duplicate profiles.
- [ ] Invite 10 known creators and review completion, verification time, enrichment accuracy, and support questions.
- [ ] Expand to 100 invited creators only after no critical privacy, merge, or verification issues remain.
- [ ] Enable the public `/claim` entry point with rate limits and daily review capacity confirmed.
- [ ] Track start-to-submit rate, verification success, time to publish, duplicate rate, manual-review rate, profile completeness, creator edits, and brand contact outcomes.
- [ ] Roll back by disabling new claim creation while preserving drafts and published profiles; never delete claims during rollback.

**Acceptance gate:** Public launch proceeds only when verification accuracy, operational queue age, and privacy incidents remain within the written thresholds from Task 1.

## Deferred roadmap

These are deliberately excluded from the MVP:

- Instagram social sign-in or OAuth.
- Meta APIs.
- Shopify connection.
- Affiliate-network connections.
- Automated bank or payout onboarding.
- Creator inbox and brand messaging.
- Public media-kit hosting.
- Automated audience screenshot extraction.
- Multi-user talent-management teams.

Add them only after the claim/publish model is stable, because each introduces separate permissions, token storage, revocation, and compliance work.

## Verification strategy summary

| Method | MVP | Independent evidence | Main risk |
|---|---:|---|---|
| Temporary Instagram bio code | Yes | Public bio read by scraper | Stale/cached bio |
| Code/link sent to discovered business email | Yes | Address discovered publicly | Shared inbox or stale address |
| Creator sends email from public address | Later | Secured inbound email headers | Spoofing and inbound-email operations |
| Website backlink | Yes | Server fetches public HTTPS page | SSRF and compromised website |
| Instagram social sign-in | Later | OAuth identity | Explicitly out of current scope |

## Definition of done

- A creator can start with only an Instagram URL or handle.
- No Instagram credentials, Meta API, or social connection is requested.
- The creator can complete and resume every requested profile field.
- Private contacts and uploaded evidence are inaccessible to other creators and the public.
- At least one independent ownership method must pass before publishing.
- Exact matches merge without breaking saved creators or campaigns.
- Conflicts enter a usable admin queue rather than overwriting data.
- Published profiles display creator-claimed trust and provenance.
- All security, integration, accessibility, and regression tests pass.
- Schema, functions, application, monitoring, and rollback procedure are verified in production staging before public launch.
