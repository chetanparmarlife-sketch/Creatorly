# Changelog

## 2026-08-31 — Repository follower minimum

### Changed

- Enforced a minimum of 1,000 supplied followers for every future repository import and admin-added repository creator.
- Removed 10,736 existing imported profiles below the minimum while preserving linked saved creators as private workspace snapshots.
- Updated discovery filters and product copy to the production range of 1,000–9,996 followers.
- The active production repository now contains 6,973 imported profiles and 7,524 contacts.

### Verified

- Production audit returns zero non-demo profiles below 1,000 followers.
- The minimum stored imported follower count is 1,000 and the maximum is 9,996.

## 2026-08-30 — Campaign execution Release 2

### Added

- Campaign dashboard with creator progress, committed spend, remaining budget, deliverable completion, review queue, and overdue risk.
- Shared Rail, Table, Calendar, and Review views backed by the same campaign execution records.
- Creator-level agreed-fee tracking, operational tasks, deliverable planning, due dates, and channel/format metadata.
- Review-asset URL submission, explicit approve/request-changes decisions, and append-only approval history.
- Role-checked Convex mutations and immutable workspace activity events for execution changes.
- Responsive evidence drawer that becomes a mobile review sheet.

### Product boundaries

- Review assets are linked by URL; Creatorly does not upload or store the content file in Release 2.
- Fees and budget are tracking fields only; no payment, escrow, contract, or tax workflow is claimed.

## 2026-08-30 — Agency workspace Release 1

### Added

- Agency and brand workspace foundation with owner, admin, campaign manager, member, and reviewer roles.
- Five-step workspace onboarding focused on goals, team setup, channels, and the first useful action.
- Creator discovery across Instagram, TikTok, YouTube, and X/Twitter with saved-profile actions.
- Creator CRM for relationship stage, owner, priority, tags, and next-action tracking.
- Campaign creation and an 11-stage execution rail from Discovered through Paid.
- Operational home dashboard and workspace activity history.
- Explicit Planned labels for social-network and WhatsApp integrations that are not connected yet.

### Verified

- ESLint, 21 unit and UI integration tests, frontend production build, and Convex TypeScript checks pass.
- End-to-end UI coverage includes signup, creator discovery, CRM save, campaign creation, creator assignment, and stage movement.

## 2026-08-29 — Real Instagram creator import

### Added

- Cleaned and imported 17,709 Instagram creator profiles with 19,166 contact records into production Convex.
- Replaced the demo-first search empty state with real creator discovery and initial results.
- Added category, follower range, location, platform, and verified-profile filters.
- Matched follower bands to the supplied values after confirming the filename's 10K–20K range is inaccurate; the maximum supplied count is 9,996 and 5,023 counts are zero or missing.
- Restart-safe private staging import and cleanup scripts, plus a non-sensitive quality report.
- Indexed creator handle and display-name search so the larger repository does not require a full database scan.
- Honest contact labels: imported records show `Pending verification`; fictional demo records show `Demo verified`.

### Data quality

- Merged 1,618 exact duplicate rows and preserved distinct contact methods.
- Replaced 13,790 unreliable category-like creator names with their exact Instagram handle.
- Removed 43 malformed email values and rejected 674 unusable rows.
- Kept private email and phone values out of tracked files; `data/private/` is ignored by Git.
- Deferred YouTube creator creation because the supplied channel URLs need a separate identity-mapping pass.

### Verified

- Production import totals match the cleanup report exactly.
- Four non-sensitive production samples returned the expected handles, follower counts, locations, and only `pending_verification` contacts.
- Temporary production staging is empty after the completed import.

## 2026-08-29 — Full demo product flow

### Added

- Marketing homepage, login/signup routes, simulated verification, and four-step onboarding.
- Pricing page with Free, Basic, and Pro plans plus 50/100-credit packs through DemoPay.
- Atomic plan allocations and credit purchases with transaction audit records.
- Profile, notification, cancellation, and extension connection settings.
- In-app payment and fulfilled-request notifications.
- Mobile navigation, low-credit state, History filters, expiry warnings, and admin user summaries.
- Revocable extension keys and full popup lookup, unlock, reveal, copy, upgrade, request, and badge states.

### Verified

- ESLint, frontend and Convex TypeScript builds, and Vite production build pass.
- 14 unit and UI integration tests pass.
- Extension popup, content script, and service worker syntax checks pass.
- Dependency audit reports 0 known vulnerabilities.
- Visual browser verification remains blocked by the installed browser helper referencing a missing older runtime file.

### External dependencies still required

- Real payments need Stripe or Razorpay credentials.
- Real outbound email needs an email provider.
- Imported contacts still need independent verification before they can be labelled verified.
- Chrome Web Store publishing and final unpacked-extension interaction checks need manual Chrome access.

## 2026-08-29 — M4 Contact request and admin fulfillment slice

### Added

- Missing-result Request Contact dialog with platform, handle, optional notes, pending, error, duplicate, and success states.
- Normalized per-user duplicate suppression for pending creator requests.
- Server-guarded `/admin` fulfillment queue with creator and role-labelled contact creation.
- Matching pending requests are fulfilled together and linked to the repository creator.
- CLI-only `admin:promoteByEmail` command; local demo uses `admin@creatorly.test` for verification.
- Admin screen is lazy-loaded as a separate 6.4 KB JavaScript chunk.

### Verified

- Unit and UI integration tests: 12 passing, including request submission and admin fulfillment journeys.
- Production request creation returned `created`; its duplicate returned `already_pending` with the same request ID.
- Production non-admin queue access returned `Admin access required.`
- Development admin verification promoted a QA account, fulfilled one request, removed it from the queue, and made the creator searchable.
- Vercel production `/admin` returns HTTP 200 and its bundle points to production Convex.
- No automated email is claimed: fulfilled requests retain `notificationSent: false` until a provider is connected.
- ESLint, frontend build, Convex TypeScript, extension syntax, and dependency audit: pass; 0 known vulnerabilities.

## 2026-08-29 — M4 History slice

### Added

- Responsive `/history` dashboard with Active, Expired, and All status filters plus creator-name search.
- Joined Convex history query that keeps the newest unlock window per creator and derives expiration at read time.
- No-charge return to active contact cards and direct five-credit renewal for expired records.
- Backwards-compatible local demo history records with unlock and expiration timestamps.

### Verified

- Unit and UI integration tests: 10 passing, including active re-access and expired renewal journeys.
- Production Convex check returned one active `@maya_creates` record with valid unlock/expiry dates and `creditsSpent: 5`.
- Production repeat unlock returned `already_unlocked`; balance remained 20.
- Vercel production `/history` route returns HTTP 200 and its bundle points to the production Convex deployment.
- ESLint, frontend build, Convex TypeScript, extension syntax, and dependency audit: pass; 0 known vulnerabilities.

## 2026-08-29 — M0 foundation and M1 core slice

### Added

- Vite, React, TypeScript, Vitest, ESLint, and Git project foundation.
- Convex schema for users, creators, contacts, unlocks, credit transactions, and contact requests.
- Convex Auth password provider, mandatory `auth.config.ts`, signup credit transaction, and auth HTTP routes.
- Six fictional demo creators with Basic and Pro contact variants.
- Smart creator search and platform filtering.
- Signup, login, dashboard search, creator detail, five-credit unlock, contact reveal, copy controls, and 30-day persistence UI.
- Local demo fallback so the complete flow remains testable before cloud account setup.
- Unpacked Chrome extension for Instagram and YouTube profile detection.
- Creatorly interface tokens and contact-signal visual system.

### Verified

- ESLint: pass.
- Unit and UI integration tests at M1 release: 8 passing.
- Frontend TypeScript and production Vite build: pass.
- Convex function TypeScript check: pass.
- Extension JavaScript syntax checks: pass.
- Dependency audit: 0 known vulnerabilities after upgrading `@convex-dev/auth` to `0.0.95`.
- Local server: `/` and `/creator/maya-creates` return HTTP 200.
- Vercel production deployment: Ready; `/` and `/creator/maya-creates` both return HTTP 200 at the public alias `https://my-build-week-project.vercel.app`.
- Vercel error scan: no runtime errors found after smoke requests.
- Public GitHub repository connected to Vercel: `https://github.com/chetanparmarlife-sketch/Creatorly`.
- Convex development and production deployments created, configured with separate authentication keys, and seeded with six demo creators.
- Production backend round-trip: signup and sign-in succeeded; `maya.creates.official` matched `@maya_creates`; the first unlock revealed one contact and changed the balance from 25 to 20; the repeat unlock returned `already_unlocked` and did not charge again.
- The production Vercel bundle points to `https://effervescent-toucan-379.convex.cloud`, not the development deployment.
- Browser automation: not completed because the installed browser plugin points to a missing older runtime file. No visual browser claim is made.

### Known limitations

- Automated QA accounts use `codex.qa.*@example.test` and must not be counted as real user signups.
- Real creator contacts were not supplied; all current contact values are explicit demo records under `example.test`.
- Desktop/mobile visual review and unpacked-extension testing still require a manual Chrome check.
