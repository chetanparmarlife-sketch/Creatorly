# Product Trust and Reliability Spec

The implementation must complete the eight numbered requirements supplied in the 2026-08-30 user request, in order:

1. Persist Convex Auth sessions across access-token refreshes, repeated hard reloads, and browser restarts.
2. Never charge for or reveal a contact unless its contact verification status is `verified`; allow users to report a revealed wrong contact and persist the report.
3. Remove user-facing claims that imported contacts are verified while the repository remains pending verification.
4. State the repository scope above search and in the zero-result state.
5. Remove the follower filter while imported follower counts are incomplete or unreliable.
6. Persist onboarding progress and restore step 3 after a hard refresh.
7. Present non-interactive hero statuses as labels, not controls.
8. Replace personal signup placeholders, use 44px mobile tap targets, prevent 390px filter clipping, and add favicon/Open Graph metadata.

Verification must include automated tests, a production build, user-facing `verified` copy audit, 390px browser screenshots of search and signup, and a link-preview metadata check. Any verification that depends on waiting an hour or restarting the user's browser must be reported honestly if it cannot be completed in this session.
