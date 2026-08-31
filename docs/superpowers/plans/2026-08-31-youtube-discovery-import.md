# YouTube Discovery Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline in the primary session; subagents are not authorized. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import every deduplicated YouTube channel with at least 1,000 subscribers and expose its useful channel, engagement, pricing, and audience data in Creatorly Discovery.

**Architecture:** Extend the existing private CSV-to-JSONL staging pipeline with a YouTube adapter. Generalize Convex staging ingestion by platform while keeping missing legacy platform values equivalent to Instagram, then add a small Instagram/YouTube selector and YouTube detail metrics.

**Tech Stack:** Python 3 CSV preparation, Convex schema/internal mutations, React 19, TypeScript, Vitest/unittest.

**Spec:** `docs/superpowers/specs/2026-08-31-youtube-discovery-import.md`

## Global Constraints

- Include only channels with at least 1,000 subscribers.
- Deduplicate by `channel_id`.
- Never commit the raw CSV, raw YouTube API response, or private JSONL.
- Do not overwrite unrelated uncommitted files or hunks.
- Do not deploy the website without explicit approval.

---

### Task 1: YouTube CSV preparation

**Files:**
- Modify: `scripts/prepare_creator_import.py`
- Modify: `scripts/test_prepare_creator_import.py`
- Create: `data/youtube-profile-import-report.json`

**Interfaces:**
- Consumes: `prepare_rows(source: Path, contacts_verified: bool = False)`
- Produces: platform-aware JSONL profiles containing `youtubeChannelId`, `youtubeMetrics`, and no raw API payload.

- [ ] Add a fixture with a base channel row followed by blank-identity audience continuation rows.
- [ ] Verify the fixture initially fails.
- [ ] Detect YouTube headers, forward-associate audience rows, reject channels below 1,000 subscribers, and deduplicate by channel ID.
- [ ] Extract custom handle, topics, country, language, image, description, performance, rates, and audience percentages.
- [ ] Run Python tests and generate the private JSONL plus aggregate report.
- [ ] Stream-audit minimum subscribers, unique channel IDs, URLs, and excluded raw fields.

### Task 2: Platform-aware Convex ingestion

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/importCreators.ts`
- Modify: `src/creatorImport.test.ts`

**Interfaces:**
- Consumes: staged rows where `platform` is `instagram` or `youtube`; missing platform remains Instagram for old rows.
- Produces: YouTube creators, stable social-profile URLs, and `youtubeMetrics` stored in Convex.

- [ ] Add TypeScript tests for YouTube payload mapping and the 1,000-subscriber boundary.
- [ ] Add reusable `youtubeMetrics` validators to creators and staging.
- [ ] Match existing creators by platform and YouTube channel ID before handle fallback.
- [ ] Upsert a `creatorSocialProfiles` YouTube row using `/channel/{channelId}`.
- [ ] Extend audit queries to report platform, channel ID, and YouTube metric presence.
- [ ] Run TypeScript and focused import tests.

### Task 3: Discovery and creator detail

**Files:**
- Modify: `src/types.ts`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/features/workspace/workspace.css`
- Modify: `src/styles.css`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: platform-filtered search results and `youtubeMetrics` from Convex.
- Produces: an Instagram/YouTube Discovery selector and YouTube-specific detail metrics.

- [ ] Add tests proving the platform selector sends `youtube` and renders YouTube results.
- [ ] Add a compact two-option platform selector using existing Lumen controls.
- [ ] Update repository copy to describe Instagram and YouTube coverage.
- [ ] Render YouTube channel, view, engagement, pricing, and audience metrics only when present.
- [ ] Keep every phone control at least 44px high and hide empty metric blocks.
- [ ] Run React tests, TypeScript, and lint.

### Task 4: Production import and verification

**Files:**
- Do not commit generated private JSONL.
- Commit only the aggregate report and implementation files.

**Interfaces:**
- Consumes: validated YouTube JSONL and deployed ingestion functions.
- Produces: production creators discoverable through Convex queries.

- [ ] Review the diff and separate unrelated local changes by hunk.
- [ ] Run `npx tsc -b`, `npx eslint .`, `npx vitest run`, and Python import tests.
- [ ] Commit and push the YouTube implementation without unrelated edits.
- [ ] Deploy Convex functions from the exact clean commit.
- [ ] Import JSONL to production staging and run ingestion until no pending rows remain.
- [ ] Run production audit samples, verify search/browse, and migrate imported profile images to Convex storage.
- [ ] Stop before website deployment and report the remaining website-release requirement.
