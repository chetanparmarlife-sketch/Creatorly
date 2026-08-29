# Creatorly Interface System

## Direction

Creatorly should feel like a focused campaign desk: fast, credible, and built for an agency marketer who has a shortlist open and needs the correct point of contact now.

The signature is the **contact signal rail**: profile matched → record checked → contact open. It repeats on authentication, search context, creator detail, locked state, and unlocked state.

## Tokens

- Canvas `#f3f3ed`, paper `#fffefa`, inset control `#edede5`
- Ink `#1d1d19`, soft ink `#56564f`, muted ink `#85857c`
- Signal coral `#ee5b45` for match/unlock actions only
- Verified green `#237355` for available, checked, and active-access states
- Shadows are subtle and layered; borders are reserved for input outlines and quiet separation.

## Type and spacing

- Display: Bricolage Grotesque Variable, tight tracking, 670–750 weight
- Working text: DM Sans Variable, 500–750 weight
- 4px base spacing unit
- Inputs and primary buttons: 48px high, 8–9px radius
- Cards: 11–15px radius; nested controls use a smaller radius
- Dynamic credit counts and timers use tabular numerals

## Hierarchy

- Search screen focal point: 66px inset search field
- Creator detail focal point: unlock decision when locked, actual contact values when open
- Color carries meaning; most structure remains neutral
- Desktop working width: 1160px; mobile gutters: 14px

## Request and admin patterns

- Missing-contact dialog: 560px paper surface over a dimmed canvas; the requested handle stays the focal field and success switches to verified green.
- Admin fulfillment: 300px request queue beside a flexible paper work panel; the selected handle anchors the form and coral is reserved for queue/action signals.
- Admin forms reuse 46–48px inset controls, 8px control radius, 11px fieldset radius, and the existing 4px spacing grid.
