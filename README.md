# Creatorly

Creatorly is a creator-contact discovery prototype for influencer marketing agencies. M1 proves one loop: create an account, search a creator, spend 5 of 25 starter credits, and keep access to the role-labelled contact card for 30 days.

## What works

- Password signup/sign-in adapter for Convex Auth
- Separate seeded Convex development and production deployments
- Local demo fallback when Convex is not configured
- Smart handle matching: exact, punctuation/suffix-normalized, display name, and partial name
- Instagram/YouTube filter and six clearly fictional demo records
- Atomic Convex unlock mutation with a 30-day access record and credit audit transaction
- Basic/Free versus Pro contact gating without leaking restricted values
- Responsive search, locked, insufficient-access, and revealed contact states
- Unlock History with Active/Expired/All filters, creator search, no-charge active re-access, and five-credit renewal
- Missing-contact request dialog with normalized duplicate suppression
- Server-guarded admin fulfillment queue that creates role-labelled creator contacts and fulfills every matching request
- Manifest V3 Chrome extension that detects Instagram and YouTube `@handle` profile pages

Demo emails use the reserved `example.test` domain. They are not real creator contacts.

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

See [extension/README.md](extension/README.md). M1 detects the profile and opens a matching dashboard search. Embedded contact reveal and shared extension authentication remain deferred from M1.

## Admin access

Admin access is enforced by Convex, not only hidden in the interface. Sign up with the intended admin email first, then promote it from the project directory:

```bash
npx convex run admin:promoteByEmail '{"email":"you@creatorly.com"}' --prod
```

Sign out and back in to refresh the navigation. Local demo mode uses `admin@creatorly.test` as its test-only admin account.

Fulfillment updates the request and repository immediately. Email delivery is not connected yet, so fulfilled records keep `notificationSent: false` and the admin interface reports notifications as pending.

## Quality checks

```bash
npm run lint
npm run test:run
npm run build
npx tsc -p convex/tsconfig.json
npm audit
```

The integration tests cover signup → smart search → creator detail → unlock → remount → persistent access, History access/renewal, missing-contact submission, and admin fulfillment. Production checks also pass request creation, normalized duplicate suppression, and server-side rejection of non-admin users. `codex.qa.*@example.test` records are automated QA and must not be counted as real signups.

Automated visual browser checking was unavailable because the installed browser helper points to a missing older runtime file. HTTP checks and the full UI integration test pass, but desktop/mobile visual review and loading the unpacked extension still need a manual Chrome check.

## Scope

The extracted M1 specification is in [docs/specs/creatorly-m1.md](docs/specs/creatorly-m1.md). Pricing, payments, settings, automated notifications, email verification, and the full dataset remain deferred.
