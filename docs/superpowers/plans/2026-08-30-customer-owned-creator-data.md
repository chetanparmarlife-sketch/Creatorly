# Customer-Owned Creator Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agency or brand import, manually add, manage, and export workspace-private creators without mutating Creatorly's global discovery database.

**Architecture:** Extend `savedCreators` so a CRM record may reference either a global `creatorId` or an embedded private creator snapshot. All private operations require workspace membership and only query rows by `workspaceId`. CSV parsing and preview stay client-side; validated rows are sent to one workspace-scoped batch mutation that performs a second duplicate check before inserting.

**Tech Stack:** React 19, TypeScript, Convex, Vitest, Testing Library, existing Lumen CSS system.

**Spec:** `docs/specs/2026-08-30-creatorly-product-boundaries.md`

## Global Constraints

- Customer uploads must remain private and must never modify Creatorly's global `creators`, `creatorSocialProfiles`, or `contacts` tables.
- Every private creator operation must require an authorized `workspaceId`.
- Source labels must read `Creatorly data`, `Uploaded by your team`, or `Added manually`.
- CSV import must preview valid, duplicate, and error rows before insert.
- Import errors must be downloadable without exposing another workspace's data.
- Use the existing Lumen system: white/soft-grey surfaces, hairline borders, black primary actions, electric-blue selection, no gradients.

---

### Task 1: Private creator model and CSV validation

**Files:**
- Modify: `src/types.ts`
- Create: `src/features/workspace/creatorImport.ts`
- Test: `src/features/workspace/creatorImport.test.ts`

**Interfaces:**
- Produces: `PrivateCreatorInput`, `CreatorSource`, `CreatorImportPreviewRow`, `parseCreatorCsv(text, existing)` and `creatorDuplicateKey(input)`.
- Duplicate identity: normalized `platform + handle`; email is a fallback when no handle is present.

- [ ] **Step 1: Write failing parser tests**

```ts
expect(parseCreatorCsv("name,platform,handle,email\nMaya,instagram,@Maya,hello@maya.test", [])).toMatchObject({
  rows: [{ status: "ready", input: { displayName: "Maya", platform: "instagram", handle: "@Maya" } }],
});
expect(parseCreatorCsv("name,platform\n,instagram", []).rows[0].status).toBe("error");
expect(parseCreatorCsv("name,platform,handle\nMaya,instagram,@maya", [{ platform: "instagram", handle: "@maya" }]).rows[0].status).toBe("duplicate");
```

- [ ] **Step 2: Run the parser test and confirm it fails**

Run: `npm run test:run -- src/features/workspace/creatorImport.test.ts`

- [ ] **Step 3: Implement quoted-field CSV parsing, header aliases, normalization, validation, and duplicate keys**

Required columns and rules:

```ts
type PrivateCreatorInput = {
  displayName: string;
  platform?: Platform;
  handle?: string;
  followerCount?: number;
  location?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  tags?: string[];
};
```

Name is required. Platform must be one of Instagram, TikTok, YouTube, or X when present. Follower count must be a non-negative integer. At least one of handle, email, phone, or WhatsApp is required. Detect duplicates within the file and against existing workspace creators.

- [ ] **Step 4: Run the parser tests**

Run: `npm run test:run -- src/features/workspace/creatorImport.test.ts`

### Task 2: Workspace-private Convex storage

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/savedCreators.ts`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `PrivateCreatorInput` and `CreatorSource` from Task 1.
- Produces: `importPrivateCreators(workspaceId, source, rows)` returning `{ imported, duplicates, errors }` and source/contact fields from `listSavedCreators`.

- [ ] **Step 1: Make `savedCreators.creatorId` optional and add private fields**

```ts
repositoryCreatorId?: Id<"creators">;
source: "creatorly" | "csv_upload" | "manual";
privateCreator?: {
  displayName: string;
  platform?: Platform;
  handle?: string;
  normalizedHandle?: string;
  followerCount?: number;
  location?: string;
};
privateContact?: { email?: string; phone?: string; whatsapp?: string };
```

Keep the existing optional notes and tags on the workspace row. Add workspace duplicate indexes for normalized platform/handle and normalized email.

- [ ] **Step 2: Add a workspace-authorized batch mutation**

The mutation must call `requireWorkspaceRole(ctx, workspaceId, campaignManagers)`, query only `savedCreators` rows in that workspace, classify duplicates again, insert private records, and write activity events. It must never insert or patch global creator tables.

- [ ] **Step 3: Update discovery save and list mapping**

Discovery saves set source `creatorly` and retain the global reference. List returns a uniform `SavedCreator` whose source and private contact fields are explicit.

- [ ] **Step 4: Implement the equivalent local-demo provider behavior**

Use the existing workspace local-storage key. Duplicate checks must only inspect the active demo workspace data.

### Task 3: Import and manual-entry CRM interface

**Files:**
- Create: `src/features/workspace/CreatorImportPanel.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/workspace.css`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: parser and workspace data methods from Tasks 1–2.
- Produces: accessible `Upload CSV` and `Add manually` flows in Creator CRM.

- [ ] **Step 1: Write a failing integration test**

The test opens CRM, chooses Add creators, enters a manual creator with a private email, saves it, confirms the `Added manually` label, reloads, and confirms the record remains. A second test uploads a CSV with ready, duplicate, and invalid rows, reviews the preview, imports only ready rows, and downloads the error report.

- [ ] **Step 2: Build the import panel**

Use a centered 600px modal with tabs for `Upload CSV` and `Add manually`. CSV mode has: file drop/control, column guidance, preview counts, row-level status, `Download errors`, and `Import ready rows`. Manual mode uses native labelled inputs and a black `Add private creator` action.

- [ ] **Step 3: Add clear CRM source and contact columns**

Every row must show one written source label. Private contacts are visible only in CRM rows returned by the active workspace query; no legacy creator-detail route is used for private records.

- [ ] **Step 4: Add loading, empty, validation, duplicate, success, and close states**

The import button is disabled when there are no ready rows. Escape and backdrop close the dialog. All interactive controls retain at least a 40px hit area and visible focus.

### Task 4: CRM export and regression verification

**Files:**
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/creatorImport.ts`
- Test: `src/features/workspace/creatorImport.test.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces: `exportCreatorsCsv(items)` and an `Export CSV` action that exports only the current workspace's loaded CRM records.

- [ ] **Step 1: Write export escaping tests**

```ts
expect(exportCreatorsCsv([{ displayName: "Maya, Studio", notes: "Said \"yes\"" }])).toContain('"Maya, Studio"');
expect(exportCreatorsCsv([{ displayName: "Maya, Studio", notes: "Said \"yes\"" }])).toContain('"Said ""yes"""');
```

- [ ] **Step 2: Add the CRM export action**

Export creator, source, platform, handle, audience, location, private contact, stage, owner, next action, priority, tags, and notes. The filename is `creatorly-crm-YYYY-MM-DD.csv`.

- [ ] **Step 3: Run focused and full checks**

Run:

```bash
npm run test:run -- src/features/workspace/creatorImport.test.ts src/App.integration.test.tsx
npm run test:run
npm run lint
npm run build
npx tsc -p convex/tsconfig.json --noEmit
```

- [ ] **Step 4: Review the data boundary**

Search the private-import path for writes to `creators`, `creatorSocialProfiles`, and `contacts`; expected result is none. Confirm every backend read/write begins with workspace authorization and uses `workspaceId`.

