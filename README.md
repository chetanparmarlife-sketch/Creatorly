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

## Quality checks

```bash
npm run lint
npm run test:run
npm run build
npx tsc -p convex/tsconfig.json
npm audit
```

The integration test covers signup → smart search → creator detail → unlock → remount → persistent access and unchanged 20-credit balance. A production-backend check also passed signup, sign-in, normalized search, contact reveal, and repeat-unlock protection. Its `codex.qa.*@example.test` record is automated QA and must not be counted as a real signup.

Automated visual browser checking was unavailable because the installed browser helper points to a missing older runtime file. HTTP checks and the full UI integration test pass, but desktop/mobile visual review and loading the unpacked extension still need a manual Chrome check.

## Scope

The extracted M1 specification is in [docs/specs/creatorly-m1.md](docs/specs/creatorly-m1.md). Pricing, payments, history, settings, contact requests, admin fulfillment, notifications, email verification, and the full dataset are deliberately deferred.
