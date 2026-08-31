# Creatorly Lumen Interface System

## Direction

Creatorly uses **Lumen**: a bright, restrained operating desk for agency teams who need to find, verify, and act on creator contacts quickly. Brand screens are calm and comfortably spaced; admin screens compress the same components into precise queues and evidence panels.

The product signature expands the **contact signal rail** into a campaign execution rail: discovered → shortlisted → contacted → replied → negotiating → contracted → creating → in review → scheduled → live → paid. It uses black structure, blue selection, and written semantic states to show progress without decorative color.

## Tokens

- Canvas `#FFFFFF`; secondary canvas and inset surface `#FAFAFA`
- Ink `#0A0A0B`; soft ink `#1A1A1F`; muted `#8A8A8E`; eyebrow `#9B9BA0`
- Hairline `#ECECEC`; stronger control edge `#D9D9DC`
- Action blue `#2E6BFF`; selected blue `#EAF0FF`
- Success `#1FA971`; warning `#F5821F`; danger `#F0506E`
- Depth is border-first. Cards use a hairline and, at most, `0 1px 3px rgba(10,10,11,.04)`.
- No gradients, glass effects, warm cream, coral, violet, peach, or heavy elevation.

## Type and spacing

- Interface, display, and working text: Plus Jakarta Sans Variable
- Machine values and IDs: monospace, 11–12px, 500 weight
- Page title: 24–32px / 700; section title: 18–20px / 600; body: 14px / 400
- 4px base spacing unit with 8, 12, 16, 24, 32, and 48px steps
- Inputs and primary buttons: 44–48px high, 10px radius
- Cards and panels: 14–16px radius, 20–24px padding
- Status chips: 20–24px high, full radius, 10–11px semibold, always with written text
- Dynamic balances, prices, timers, and table numbers use tabular numerals

## Shell and hierarchy

- Desktop application shell: fixed 72px black primary rail plus a 280px white contextual sidebar; the contextual panel changes with the selected primary destination
- Desktop utility bar: 68px sticky/fixed white surface with a bottom hairline
- Content canvas: `#FAFAFA`, 24–32px gutters, up to 1440px working width
- Below 980px, the shell becomes a 64px black top bar with an accessible two-column menu
- Search focal point: 60px search control followed by filters and a flat result table
- Creator detail focal point: unlock decision while locked, contact values while open
- Pricing focal point: Pro may use the single black feature surface; all other plans stay white

## Reusable patterns

- Primary button — 44px minimum height · black fill · white 13px semibold text · 10px radius
- Secondary button — 44px minimum height · white fill · grey hairline · black text · 10px radius
- Input — 46px minimum height · white fill · grey hairline · blue border and 3px soft-blue ring on focus
- Brand card — white · 1px hairline · 15px radius · 24px padding
- Admin queue row — 52–64px high · blue-soft selected state · precise 11–13px hierarchy
- Modal — 480–640px centered white surface · 14–16px radius · neutral dim backdrop · restrained shadow
- Selected filter or row — action-blue text with `#EAF0FF` background
- Success, warning, and danger states use both words and semantic color; color is never the only signal
- Discovery command — one natural-language search bar, precise platform/category/location/follower filters, and a dense creator result table
- Discovery filter sidebar — 64px header · 56px disclosure rows · selected value shown as 9px muted metadata · one useful section open by default · controls expand inline on demand · blue only for open or active state
- Creator CRM row — creator identity, platform, audience, relationship stage, owner, next action, and an explicit written verification state
- Similar creators — an explainable profile-fit list, never a generic “recommended” carousel. Rank shared niche first, then comparable audience, platform, market, language, profile type, management style, production quality, and engagement. Show the strongest two reasons as written blue-soft chips; do not expose an unexplained score.
- Similar creator row — 92px minimum height · 48px portrait · creator name at 12px semibold · audience and platform at 10px muted · up to two 20px reason chips · native button with visible hover and focus states. Use a 330px sticky sidebar on desktop and a full-width section after the main profile content below 760px.
- Similar creator states — show up to four strong matches, exclude the current profile, deduplicate the candidate pool, and use “No strong profile matches yet” when evidence is insufficient. Selecting a match opens that creator’s full profile.
- Visual similarity boundary — profile metadata cannot establish visual style. Do not claim a visual match until recent post images or reviewed visual-style tags are stored and compared.
- Campaign rail — horizontally scrollable 280px stage columns with compact creator cards; stage names remain visible while moving work
- Workspace onboarding — five focused steps for workspace, goals, team, channels, and first result; external channels are labelled Planned until connected
- Campaign view switcher — compact black selected tab across Dashboard, Rail, Table, Calendar, and Review; every mode reads the same execution record
- Budget strip — committed fees and remaining campaign budget use tabular numerals and plain tracking language, never payment language
- Evidence drawer — 520px right-side review surface containing the linked asset, due date, decision controls, and append-only review history
- Review language — Planned, In review, Changes requested, Approved, Scheduled, and Live are always written; blue means selected or processing, green means approved, and red means action required
- Mobile review sheet — below 980px the evidence drawer becomes a bottom sheet capped at 88vh, while campaign view tabs remain horizontally scrollable

## Landing page pattern

- Hero promise: “Go from shortlist to the right inbox in 5 minutes.” The supporting copy names the searchable profile count, partnership role, verification, and outreach context.
- Signature proof module: a flat contact-path panel showing profile matched → role confirmed → contact ready, followed by the verified contact card.
- Page argument: clear promise → live proof → outreach gap → three-step process → one repeated “Find my first contact” action.
- Public navigation stays minimal: How it works, Pricing, Sign in, and one black primary action.
