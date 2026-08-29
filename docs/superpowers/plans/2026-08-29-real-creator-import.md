# Real Creator Import Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the supplied 20,001-row CSV and safely load its usable Instagram creators and contact methods into Creatorly.

**Architecture:** A local preparation script reads the source CSV without copying it into Git, normalizes and validates fields, merges exact duplicate handles, and writes ignored JSONL staging data plus a non-sensitive quality report. Convex imports the staging rows, then an internal batched migration upserts creators and pending-verification contact records.

**Tech Stack:** Python standard-library CSV parser, Convex staging import, TypeScript internal mutations, Vitest.

**Spec:** Creatorly full product specification supplied in conversation; source `/Users/chetan/Downloads/List 1_Age_18_24 - 20K - 10000-20000 (2).csv.csv`.

## Global Constraints

- Never commit source emails or phone numbers to Git.
- Never label imported contact details as verified without independent verification.
- Reject records without a recoverable Instagram handle or valid email/Indian WhatsApp number.
- Merge exact duplicate handles but preserve distinct punctuation variants.
- Preserve every unique valid contact combination within a duplicate group.
- Keep the six fictional demo records visibly labelled as demo data.

---

### Task 1: Deterministic preparation

**Files:**
- Create: `scripts/prepare_creator_import.py`
- Create: `scripts/test_prepare_creator_import.py`
- Modify: `.gitignore`

**Interfaces:**
- Consumes the supplied CSV path.
- Produces ignored `data/private/creator-import.jsonl` and public `data/creator-import-report.json`.

- [ ] Test direct, nested, shared-text, and invalid Instagram URLs.
- [ ] Test email and Indian WhatsApp normalization.
- [ ] Test category-name replacement and duplicate merging.
- [ ] Implement the parser and run its unit tests.
- [ ] Generate the staging file and quality report.

### Task 2: Convex staging and migration

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/importCreators.ts`

**Interfaces:**
- Consumes rows in `creatorImportStaging`.
- Produces `creators` and `contacts` with `isDemo: false` and `verificationStatus: "pending_verification"`.

- [ ] Add staging fields and indexes.
- [ ] Add a batched upsert mutation that is safe to rerun.
- [ ] Deduplicate contacts by creator and normalized contact values.
- [ ] Add import status counts and a staging cleanup mutation.
- [ ] Run Convex TypeScript checks.

### Task 3: Production import and verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] Deploy the schema and migration functions.
- [ ] Import ignored JSONL into production staging.
- [ ] Run batches until no staging rows remain.
- [ ] Verify imported creator/contact counts and representative searches.
- [ ] Verify locked searches do not return contact values.
- [ ] Record rejected rows and pending-verification limitations.
