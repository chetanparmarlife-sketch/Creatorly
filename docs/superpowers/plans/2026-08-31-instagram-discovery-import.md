# Instagram Discovery Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import every deduplicated Instagram profile with at least 1,000 followers from the supplied CSV, retain useful profile and engagement fields, and expose those metrics in Creatorly discovery and creator detail.

**Architecture:** Extend the existing private JSONL-to-Convex import pipeline instead of committing the 165 MB source CSV. Keep scrape-control fields out of storage, group Instagram metrics under one optional object, and retain the existing repository follower rule at both preparation and ingestion boundaries.

**Tech Stack:** Python 3 CSV preparation, Convex schema/mutations, React 19, TypeScript, Vitest/unittest.

**Spec:** User request in this thread dated 2026-08-31.

## Global Constraints

- Include only profiles with at least 1,000 followers.
- Preserve useful follower, following, post, engagement, comment, like, and view metrics.
- Do not store scraping status, scraping progress, Firebase-storage status, or scrape timing fields.
- Do not commit the raw CSV or contact-bearing JSONL.
- Do not mutate a hosted Convex deployment until the target deployment is confirmed.

---

### Task 1: CSV adapter and private JSONL

**Files:**
- Modify: `scripts/prepare_creator_import.py`
- Modify: `scripts/test_prepare_creator_import.py`
- Create: `data/instagram-profile-import-report.json`

**Interfaces:**
- Consumes: `prepare_rows(source: Path, contacts_verified: bool = False)`
- Produces: JSONL rows with `instagramMetrics`, `biography`, profile metadata, contacts, and no scrape-control fields.

- [ ] **Step 1: Add fixture tests for the supplied column names**

```python
row = {"Username": "maya", "Followers": "1,250", "Following": "230", "Average Comments": "18"}
self.assertEqual(prepare_instagram_profile_row(row)["instagramMetrics"]["averageComments"], 18)
```

- [ ] **Step 2: Run the Python tests and confirm the new adapter test fails**

Run: `python3 scripts/test_prepare_creator_import.py`

- [ ] **Step 3: Implement header detection, numeric parsing, deduplication, and the 1,000-follower cutoff**

```python
if "Followers" in fieldnames and "Username" in fieldnames:
    return prepare_instagram_profile_rows(source, contacts_verified)
```

- [ ] **Step 4: Generate the private JSONL and public aggregate report**

Run: `python3 scripts/prepare_creator_import.py '/Users/chetan/Downloads/Web Scraped Instagram Profile.csv' --output data/private/instagram-profile-import.jsonl --report data/instagram-profile-import-report.json --contacts-verified`

- [ ] **Step 5: Verify every output profile is eligible and excluded columns are absent**

Run a streaming audit that asserts `followerCount >= 1000`, unique handles, and no keys containing `scrap`, `firebase`, or `progress`.

### Task 2: Convex metric storage and ingestion

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/importCreators.ts`
- Test: `src/creatorImport.test.ts`

**Interfaces:**
- Consumes: staged rows produced by Task 1.
- Produces: optional `biography`, demographics, and `instagramMetrics` fields on `creators`; contact verification status travels explicitly from staging.

- [ ] **Step 1: Add tests for the metric mapping and profile patch payload**

```ts
expect(profile.instagramMetrics?.averageComments).toBe(18);
expect(profile.followerCount).toBeGreaterThanOrEqual(1000);
```

- [ ] **Step 2: Extend both `creators` and `creatorImportStaging` validators**

```ts
instagramMetrics: v.optional(v.object({
  followingCount: v.optional(v.number()),
  postCount: v.optional(v.number()),
  averageLikes: v.optional(v.number()),
  averageComments: v.optional(v.number()),
  engagementRatePercent: v.optional(v.number()),
}))
```

- [ ] **Step 3: Patch or insert the complete profile payload during ingestion**

```ts
const profileFields = { biography: row.biography, instagramMetrics: row.instagramMetrics };
```

- [ ] **Step 4: Run TypeScript and import tests**

Run: `npx tsc -b && npx vitest run src/creatorImport.test.ts`

### Task 3: Discovery and creator profile metrics

**Files:**
- Modify: `convex/creators.ts`
- Modify: `src/types.ts`
- Modify: `src/components/CreatorResult.tsx`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/styles.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: optional `instagramMetrics` and `biography` from Convex creator documents.
- Produces: typed search/detail results and visible engagement summaries without changing the established visual system.

- [ ] **Step 1: Add a rendering test for average comments and engagement rate**

```ts
expect(screen.getByText("18 avg comments")).toBeInTheDocument();
expect(screen.getByText("3.4% engagement")).toBeInTheDocument();
```

- [ ] **Step 2: Return the new fields from search, browse, and detail queries**

```ts
instagramMetrics: creator.instagramMetrics,
biography: creator.biography,
```

- [ ] **Step 3: Show compact metrics in discovery and a full performance section in detail**

```tsx
<span className="creator-engagement">{formatFollowers(metrics.averageComments)} avg comments</span>
```

- [ ] **Step 4: Run the focused React tests**

Run: `npx vitest run src/App.integration.test.tsx`

### Task 4: Full verification and hosted-import boundary

**Files:**
- Modify only if verification finds a defect.

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: validated local import artifacts and a clear hosted-deployment status.

- [ ] **Step 1: Run repository checks**

Run: `npx tsc -b`, `npx eslint .`, `npx vitest run`, and `python3 scripts/test_prepare_creator_import.py`.

- [ ] **Step 2: Confirm raw/contact data remains ignored**

Run: `git check-ignore -v data/private/instagram-profile-import.jsonl`.

- [ ] **Step 3: Inspect the configured Convex target without changing it**

Read only the deployment class (`dev` or `prod`) from `.env.local`; do not print secrets.

- [ ] **Step 4: Stop before a hosted import if deployment identity is not explicit**

Report the prepared profile count and ask for the single concrete choice: import into the configured development deployment or production deployment.
