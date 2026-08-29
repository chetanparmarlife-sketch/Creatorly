# Lumen Full-App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the supplied Lumen visual direction to every Creatorly screen without changing product behavior.

**Architecture:** Keep the existing React view structure and make the redesign systemic through shared semantic CSS tokens and the existing reusable shell and controls. Convert the authenticated shell to a fixed black sidebar plus white utility bar, then restyle public, brand, detail, form, table, modal, and admin surfaces from the same tokens.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Lucide icons, Plus Jakarta Sans Variable

**Spec:** User-provided Lumen visual direction in the 2026-08-29 task conversation.

## Global Constraints

- Use `#FFFFFF`, `#FAFAFA`, `#0A0A0B`, `#1A1A1F`, `#8A8A8E`, `#9B9BA0`, `#ECECEC`, `#2E6BFF`, `#EAF0FF`, `#1FA971`, `#F5821F`, and `#F0506E` as the shared palette.
- Use Plus Jakarta Sans for interface type and monospace only for IDs, references, and machine values.
- Keep cards flat with fine grey borders, 14–16px radii, and no decorative gradients or heavy shadows.
- Keep the Brand Portal comfortable and the Admin Portal denser.
- Preserve existing routes, behavior, labels, keyboard access, and responsive coverage.

---

### Task 1: Shared Lumen foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Existing global CSS class names and React view markup.
- Produces: Shared Lumen color, type, radius, focus, button, form, status, card, and responsive tokens.

- [ ] **Step 1: Add the requested font package**

Run: `npm install @fontsource-variable/plus-jakarta-sans`

Expected: package and lockfile include Plus Jakarta Sans Variable.

- [ ] **Step 2: Load the font at the application entry point**

Add `import "@fontsource-variable/plus-jakarta-sans";` to `src/main.tsx` and remove the former display/body font imports once CSS no longer uses them.

- [ ] **Step 3: Replace the global theme with semantic Lumen tokens**

Set canvas, surface, ink, muted, hairline, action, semantic, focus, radius, and border-only depth tokens in `src/styles.css`; bind existing component classes to those tokens.

- [ ] **Step 4: Verify compilation**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

### Task 2: Authenticated shell and navigation

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/styles.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: Existing `AppShell` props and route callbacks.
- Produces: Fixed 256px black desktop sidebar, sticky white utility bar, and accessible mobile menu.

- [ ] **Step 1: Keep navigation semantics while grouping shell regions**

Preserve the existing buttons and accessible labels; add only structural class hooks needed for the sidebar and utility bar.

- [ ] **Step 2: Implement desktop and mobile shell layouts**

Use a 256px fixed sidebar above 980px, a 68px utility bar over the content column, and collapse to the existing mobile menu below 980px.

- [ ] **Step 3: Run the integration tests**

Run: `npm test -- --run`

Expected: all user journeys still pass, including search, history, pricing, settings, and admin navigation.

### Task 3: Brand, product, and admin surfaces

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Shared Lumen tokens from Task 1 and all existing view class names.
- Produces: Consistent public landing/auth, search/history/detail, pricing/settings, onboarding/state, modal/drawer, and denser admin treatments.

- [ ] **Step 1: Restyle public and brand screens**

Apply comfortable spacing, restrained white/grey surfaces, black primary actions, blue links, and flat workflow previews to landing, auth, onboarding, verification, and payment states.

- [ ] **Step 2: Restyle operational screens**

Apply compact tables, 52–60px rows, clear metadata hierarchy, blue selections, semantic written status chips, and right-side/detail patterns to search, history, creator detail, settings, pricing, and admin.

- [ ] **Step 3: Remove legacy visual language**

Replace coral, violet, warm cream, decorative circles, tilted cards, gradients, blur glass, and heavy elevation with Lumen equivalents.

- [ ] **Step 4: Check responsive behavior**

Verify desktop and mobile widths for horizontal overflow, readable form controls, reachable navigation, and stacked grids.

### Task 4: Verification and design record

**Files:**
- Modify: `.interface-design/system.md`
- Modify: `index.html`

**Interfaces:**
- Consumes: Completed Lumen implementation.
- Produces: Recorded design rules, matching browser chrome color, and a verified build.

- [ ] **Step 1: Update the saved design system**

Record Lumen tokens, Plus Jakarta Sans, border-only depth, 4px spacing, the fixed sidebar, brand/admin density split, and reusable control measurements.

- [ ] **Step 2: Run automated checks**

Run: `npm run lint && npm test -- --run && npm run build`

Expected: all commands exit successfully.

- [ ] **Step 3: Verify in the browser**

Inspect representative public, brand, and admin routes at desktop and mobile sizes; correct any visual breakage before handoff.
