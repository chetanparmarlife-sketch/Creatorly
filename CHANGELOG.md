# Changelog

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
- Unit and UI integration tests: 8 passing.
- Frontend TypeScript and production Vite build: pass.
- Convex function TypeScript check: pass.
- Extension JavaScript syntax checks: pass.
- Dependency audit: 0 known vulnerabilities after upgrading `@convex-dev/auth` to `0.0.95`.
- Local server: `/` and `/creator/maya-creates` return HTTP 200.
- Vercel production deployment: Ready; `/` and `/creator/maya-creates` both return HTTP 200. Branded alias: `https://creatorly-build-week.vercel.app`.
- Vercel error scan: no runtime errors found after smoke requests.
- Public GitHub repository connected to Vercel: `https://github.com/chetanparmarlife-sketch/Creatorly`.
- Browser automation: not completed because the installed browser plugin points to a missing older runtime file. No visual browser claim is made.

### Blocked account steps

- Convex cloud project, live password round-trip, and seed push require `npx convex login` by the project owner.
- Real creator contacts were not supplied; all current contact values are explicit demo records under `example.test`.
