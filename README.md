# Creatorly

Creatorly is a creator-contact discovery prototype for influencer marketing agencies. M1 proves one loop: create an account, search a creator, spend 5 of 25 starter credits, and keep access to the role-labelled contact card for 30 days.

## What works

- Password signup/sign-in adapter for Convex Auth
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

## Connect Convex

This machine was not signed in to Convex during the build, so the cloud deployment could not be created. To finish the connection:

```bash
npx convex login
npx convex dev --once --run seed:run
```

The second command creates/selects the project, generates the official files under `convex/_generated`, pushes the schema and functions, writes `VITE_CONVEX_URL` to `.env.local`, and seeds the six demo creators. Follow the Convex Auth skill’s headless key setup before testing password signup:

1. Generate `JWT_PRIVATE_KEY` and `JWKS` with `jose`.
2. Set those values plus `SITE_URL` on the selected deployment.
3. Run `npx convex dev --once` again.

Never commit `.auth-keys.json` or `.env.local`.

## Chrome extension

See [extension/README.md](extension/README.md). M1 detects the profile and opens a matching dashboard search. Embedded contact reveal and shared extension authentication are deferred until the cloud Convex session is verified.

## Quality checks

```bash
npm run lint
npm run test:run
npm run build
npx tsc -p convex/tsconfig.json
npm audit
```

The integration test covers signup → smart search → creator detail → unlock → remount → persistent access and unchanged 20-credit balance.

## Scope

The extracted M1 specification is in [docs/specs/creatorly-m1.md](docs/specs/creatorly-m1.md). Pricing, payments, history, settings, contact requests, admin fulfillment, notifications, email verification, and the full dataset are deliberately deferred.
