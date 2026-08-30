# Creatorly

Creatorly is a creator-contact discovery product for influencer marketing agencies. The current build covers the complete demo journey from landing and onboarding through search, plan selection, unlock, history, settings, request fulfilment, and the Chrome extension.

Release 1 also adds the workspace foundation for agencies and brands: workspace onboarding, creator discovery, a saved-creator CRM, campaign creation, and an 11-stage campaign execution rail.

Release 2 adds campaign execution: dashboard, rail, table, calendar, review queue, creator fees, tasks, deliverables, linked content submissions, and append-only approval history.

## What works

- Password signup/sign-in adapter for Convex Auth
- Separate seeded Convex development and production deployments
- Local demo fallback when Convex is not configured
- Smart handle matching: exact, punctuation/suffix-normalized, display name, and partial name
- Instagram/YouTube filter, six clearly fictional demo records, and 6,973 eligible imported Instagram creator profiles
- Atomic Convex unlock mutation with a 30-day access record and credit audit transaction
- Basic/Free versus Pro contact gating without leaking restricted values
- Responsive search, locked, insufficient-access, and revealed contact states
- Unlock History with Active/Expired/All filters, creator search, no-charge active re-access, and five-credit renewal
- Missing-contact request dialog with normalized duplicate suppression
- Server-guarded admin fulfillment queue that creates role-labelled creator contacts and fulfills every matching request
- Manifest V3 Chrome extension that detects Instagram and YouTube `@handle` profile pages
- Marketing landing page, simulated verification, and plan onboarding
- Pricing and credit packs through clearly labelled DemoPay simulation
- Profile, notification, cancellation, and extension connection settings
- In-app fulfilment and payment notifications
- Mobile navigation, advanced History filters, expiration warnings, and admin user summaries
- Embedded extension availability, unlock, contact reveal, copy, upgrade, and request states
- Agency or brand workspace setup with role-ready tenant boundaries
- Creator discovery across Instagram, TikTok, YouTube, and X/Twitter
- Saved-creator CRM with relationship stages, ownership, priority, and next actions
- Campaign workspace with a horizontal execution rail from Discovered through Paid
- Operational home dashboard with live workspace activity
- Campaign command center with Dashboard, Rail, Table, Calendar, and Review modes
- Deliverable planning, due dates, linked content submissions, change requests, and approvals
- Creator fee and budget tracking plus campaign task management

Instagram, TikTok, YouTube, X/Twitter, and WhatsApp connections are shown as **Planned** during onboarding. Release 1 does not claim those external APIs are connected yet.

Release 2 stores links to review assets; it does not upload creator files. Fees and budget are operational tracking only—Creatorly does not send creator payments or provide escrow.

The active imported repository contains 6,973 creator profiles and 7,524 contact records. Imported contacts are labelled **Pending verification** until independently checked; only fictional records use the **Demo verified** label.

## Real creator import

The supplied 20,001-row CSV was cleaned and imported into production without committing private contact values to Git. The private intermediate file lives under ignored `data/private/`.

- 17,709 creator profiles and 19,166 contact records were originally imported
- The active repository keeps only profiles with at least 1,000 supplied followers: 6,973 profiles and 7,524 contacts remain
- 1,618 exact duplicate rows merged
- 13,790 category-like names replaced with the exact Instagram handle
- 43 malformed email values removed
- 674 unusable rows rejected: 60 invalid Instagram handles and 614 rows without a valid contact
- 13,650 profiles have category data available for discovery filters
- The source filename says 10K–20K, but every supplied follower count is below 10K; rows below 1,000 are excluded from storage
- Every imported contact is marked `pending_verification`; the import does not claim the data is verified

The non-sensitive audit is in [data/creator-import-report.json](data/creator-import-report.json). YouTube URLs were not turned into creator records because the source uses mixed channel URL formats; that mapping remains pending rather than guessing identities.

## Run locally

```bash
npm install
npm run dev
```

Without `VITE_CONVEX_URL`, Creatorly runs in clearly labelled local demo mode and stores the demo account, balance, and unlocks in that browser only.

## Convex environments

The public Vercel app uses the production Convex deployment at `https://effervescent-toucan-379.convex.cloud`. Local development uses the development deployment selected in the ignored `.env.local` file.

To update the development deployment and reload its six fictional demo creators:

```bash
npx convex login
npx convex dev --once --run seed:run
```

The authentication keys and `SITE_URL` are already configured separately on development and production. Never commit `.auth-keys.json` or `.env.local`.

## Chrome extension

See [extension/README.md](extension/README.md). Connect it with a revocable key created in Dashboard → Settings. The popup can query availability, unlock contacts, show credit state, copy contact values, and link to pricing or contact requests.

## Admin access

Admin access is enforced by Convex, not only hidden in the interface. Sign up with the intended admin email first, then promote it from the project directory:

```bash
npx convex run admin:promoteByEmail '{"email":"you@creatorly.com"}' --prod
```

Sign out and back in to refresh the navigation. Local demo mode uses `admin@creatorly.test` as its test-only admin account.

Fulfillment updates the request and repository immediately and sends an in-app notification. External email delivery is simulated because no email provider has been supplied.

## Quality checks

```bash
npm run lint
npm run test:run
npm run build
npx tsc -p convex/tsconfig.json
npm audit
```

The integration tests cover signup → smart search → creator detail → unlock → remount → persistent access, History access/renewal, missing-contact submission, and admin fulfillment. Production checks also pass request creation, normalized duplicate suppression, and server-side rejection of non-admin users. `codex.qa.*@example.test` records are automated QA and must not be counted as real signups.

The Release 1 integration test covers signup → discovery → save to CRM → campaign creation → creator assignment → campaign stage movement.
The Release 2 continuation covers creator fee → task → deliverable → review URL → changes requested → approval.

## Scope

The extracted M1 specification is in [docs/specs/creatorly-m1.md](docs/specs/creatorly-m1.md). The Release 1 workspace specification and execution plan are in [docs/specs/2026-08-30-creatorly-influencer-workspace.md](docs/specs/2026-08-30-creatorly-influencer-workspace.md) and [docs/superpowers/plans/2026-08-30-creatorly-workspace-discovery-crm.md](docs/superpowers/plans/2026-08-30-creatorly-workspace-discovery-crm.md). Real payment processing, outbound email, social data synchronization, WhatsApp messaging, independent verification of imported contacts, YouTube channel mapping, and Chrome Web Store publishing remain pending.
