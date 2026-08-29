# Discovery and Creator Detail Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Creatorly's discovery and creator detail views around the supplied mobile references while preserving the existing Lumen product system and unlock journey.

**Architecture:** Keep the existing data provider and routes. Reshape `SearchView`, `CreatorResult`, and `CreatorDetail` into reusable, responsive sections, then add scoped CSS overrides so desktop keeps the existing application shell while mobile adopts the reference's dense list and sticky actions.

**Tech Stack:** React 19, TypeScript, Vite, Lucide React, plain CSS, Vitest, Testing Library

**Spec:** User-provided discovery and creator-detail screenshots in this task

## Global Constraints

- Keep Creatorly's Lumen tokens: white/black/blue/green, Plus Jakarta Sans, 4px spacing grid, border-first depth.
- Preserve current search, filter, unlock, history, pricing, and contact behavior.
- Use native buttons, inputs, and selects with visible focus states and readable labels.
- Do not add a new UI dependency or invent profile facts that the data model does not provide.

---

### Task 1: Discovery composition

**Files:**
- Modify: `src/components/SearchView.tsx`
- Modify: `src/components/CreatorResult.tsx`
- Modify: `src/styles.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `data.search(query, filters)` and `navigate({ name: "creator", creatorId })`
- Produces: accessible category shortcuts, search/filter controls, and creator rows with existing result data

- [ ] **Step 1: Add an integration assertion for discovery shortcuts and creator result metadata**

```tsx
expect(screen.getByRole("button", { name: /browse lifestyle creators/i })).toBeInTheDocument();
expect(await screen.findByRole("button", { name: /Maya Kapoor/i })).toHaveTextContent("Lifestyle");
```

- [ ] **Step 2: Run the focused integration test and verify the new assertions fail**

Run: `npm test -- --run src/App.integration.test.tsx`

Expected: FAIL because the category shortcut does not exist yet.

- [ ] **Step 3: Implement category shortcuts, reference-shaped filter pills, and mobile creator rows**

Use the existing search/filter state. Category shortcuts call `setCategory`, selects stay native, and each creator result remains one semantic button.

- [ ] **Step 4: Run the focused integration test**

Run: `npm test -- --run src/App.integration.test.tsx`

Expected: PASS.

### Task 2: Creator profile composition

**Files:**
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/styles.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `data.getDetail(creatorId)`, `data.search("", {})`, `data.unlock(creatorId)`
- Produces: profile cover/identity, platform metrics, profile facts, similar creators, and the existing locked/unlocked contact flow

- [ ] **Step 1: Add an integration assertion for creator facts and similar profiles**

```tsx
expect(await screen.findByRole("heading", { name: /creator profile/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /similar creators/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused integration test and verify it fails**

Run: `npm test -- --run src/App.integration.test.tsx`

Expected: FAIL because the profile composition has not been added.

- [ ] **Step 3: Load the selected profile and candidate creators in parallel**

Use `Promise.all([data.getDetail(creatorId), data.search("", {})])`, then rank candidates sharing the selected creator's first category before follower count.

- [ ] **Step 4: Implement the profile hero, social metric, profile facts, similar rows, and sticky mobile contact action**

Keep `Reveal N contacts`, credit rules, `ContactCard`, and upgrade routing intact. Similar creator rows navigate through the existing creator route.

- [ ] **Step 5: Run the focused integration test**

Run: `npm test -- --run src/App.integration.test.tsx`

Expected: PASS.

### Task 3: Verification

**Files:**
- Modify: `src/styles.css` only if visual fixes are needed

**Interfaces:**
- Consumes: the completed responsive views
- Produces: buildable, lint-clean screens verified at desktop and mobile widths

- [ ] **Step 1: Run all automated checks**

Run: `npm run lint && npm test -- --run && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Start the Vite app and inspect discovery and creator detail at desktop and mobile widths**

Run: `npm run dev -- --host 127.0.0.1`

Expected: no overlap, clipped labels, horizontal page scroll, unreadable text, or blocked primary actions.

- [ ] **Step 3: Fix any visual defects and repeat automated checks**

Run: `npm run lint && npm test -- --run && npm run build`

Expected: all commands exit 0 after the final visual fixes.
