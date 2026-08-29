# Creatorly M1 Build Specification

This is the first testable slice extracted from the full Creatorly product plan supplied on 29 August 2026.

## Goal

A new user can create an account, search a curated set of Instagram and YouTube creators, spend 5 starter credits, and reveal role-labelled contact details. The same backend also supports an unpacked Chrome extension that detects supported profile pages.

## Required in M1

- Password signup and login. Email verification is auto-completed for M1.
- Every account starts on the Free plan with 25 credits.
- Search by creator name or handle, with platform filtering and ranking by exact, normalized, then fuzzy match.
- Results show avatar, display name, handle, platform, follower count, location, contact count, and best-match state.
- Creator detail supports locked, insufficient-credit, and unlocked states.
- Unlocking costs 5 credits, is atomic, and grants 30 days of repeat access.
- Free and Basic accounts reveal creator-direct contacts. Pro accounts can also reveal manager, agent, assistant, and PR contacts.
- Seed data contains real-looking demonstration records, clearly marked as demo data rather than verified real contacts.
- Chrome extension detects Instagram and YouTube profile handles, checks availability, and links into the dashboard. It must not claim shared sign-in until extension auth is actually verified.
- Responsive desktop and mobile UI with loading, empty, failure, hover, focus, active, and disabled states.
- CHANGELOG records the work session and verification results.

## Deferred from M1

- Real payment processing, email verification, onboarding wizard, pricing checkout, history, settings, notifications, contact requests, admin dashboard, and a full dataset import.
- Chrome Web Store publishing.
- Team workspaces and shared credits remain outside v1.

## Acceptance test

In a private browser session, a stranger can sign up, search for a seeded creator, open the creator page, unlock the contact card, close and reopen the page, and still see the card without a second charge. A developer-loaded extension recognizes at least one Instagram profile and opens the matching dashboard record.
