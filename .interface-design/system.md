# Creatorly Lumen Interface System

## Direction

Creatorly uses **Lumen**: a bright, restrained operating desk for agency teams who need to find, verify, and act on creator contacts quickly. Brand screens are calm and comfortably spaced; admin screens compress the same components into precise queues and evidence panels.

The product signature remains the **contact signal rail** — profile matched → record checked → contact open — now expressed through black structure, blue selection, and written green verification states.

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

- Desktop application shell: fixed 256px black sidebar with white navigation text
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

## Landing page pattern

- Hero promise: “Go from shortlist to the right inbox in 5 minutes.” The supporting copy names the searchable profile count, partnership role, verification, and outreach context.
- Signature proof module: a flat contact-path panel showing profile matched → role confirmed → contact ready, followed by the verified contact card.
- Page argument: clear promise → live proof → outreach gap → three-step process → one repeated “Find my first contact” action.
- Public navigation stays minimal: How it works, Pricing, Sign in, and one black primary action.
