# Creatorly Core Workflow Hardening

Creatorly must turn its existing discovery, private CRM, and campaign tracker
into one honest production workflow. The work proceeds in order: connect the
extension to production, require real email verification, remove invented
campaign values, preserve payment outcomes, add direct and bulk campaign
actions, show data source and freshness, hide unavailable products, shorten
onboarding, with Discovery as the intentional authenticated starting screen.

The existing Lumen visual system remains unchanged: white and soft-grey
surfaces, black structure, blue selection, Plus Jakarta Sans, 44px controls,
and written status labels. Production copy must not call simulated behavior
real. Creatorly currently has India-focused Instagram, YouTube, and Facebook discovery;
empty repository platforms must stay hidden. Future products may appear in
the sidebar only as non-clickable rows explicitly marked `Planned`.

The core journey is:

`Sign up → verify email → workspace → discover → select creators → save/add to
campaign → execute next actions → review delivery and campaign health`.

Campaign creation must collect the real client/division, platforms, currency,
budget, and dates. No money, platform, or schedule value may be invented.
Payment success and failure must remain visible before onboarding continues.
Loading, empty, missing, and error states must be distinct.

Shared inbox and live provider reporting remain a later phase because they
require messaging providers, social-platform access, consent rules, and new
external credentials. The current phase may show recorded campaign activity
and manually entered live links, but must not imply connected messaging or
live social metrics.
