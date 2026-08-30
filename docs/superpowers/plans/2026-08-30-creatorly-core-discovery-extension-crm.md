# Creatorly Core Discovery, Extension, and CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an honest core product where Creatorly Discovery uses Creatorly-owned data, while agencies and brands can save, upload, and manage private creators in a workspace CRM and use the extension to add profiles to that CRM.

**Architecture:** Keep canonical repository data in the existing global `creators`, `creatorSocialProfiles`, and `contacts` tables. Add workspace-owned creator identity, social profile, and contact tables, then keep `savedCreators` as the relationship record used by campaigns. Connect discovery and the extension to the active workspace without allowing workspace edits to mutate global repository records.

**Tech Stack:** React 19, TypeScript, Vite, Convex, Convex Auth, Vitest, Testing Library, Chrome Manifest V3 extension.

**Spec:** `docs/specs/2026-08-30-creatorly-product-boundaries.md`

## Global Constraints

- Creatorly Discovery searches only Creatorly-owned canonical data.
- Every customer-uploaded creator, contact, note, and CRM field is workspace-private and authorized by `workspaceId`.
- Workspace imports never write into `creators`, `creatorSocialProfiles`, or `contacts`.
- Workspace kind from onboarding must be persisted; do not default brand workspaces to agency.
- Every creator shown in CRM has a visible origin: `creatorly_repository`, `csv_upload`, `manual_entry`, or `browser_extension`.
- The extension uses an active workspace and never saves data into another workspace.
- AI agents, inbox, WhatsApp, automations, and connected reporting remain disabled add-ons during this plan.
- Use official provider APIs in later add-on plans; no personal WhatsApp automation or social scraping.

## File Structure

- `convex/schema.ts` — add workspace creator identity, private profile/contact, import job, and active workspace fields.
- `convex/workspaceCreators.ts` — save repository creators, manual entry, list CRM creators, and propose repository links.
- `convex/creatorImports.ts` — validate import batches, commit valid rows, and return error reports.
- `convex/workspaces.ts` — persist onboarding workspace kind and select active workspace.
- `convex/extensionApi.ts` — resolve active workspace and save matched/unmatched browser profiles.
- `src/types.ts` — define source-aware CRM and import contracts.
- `src/features/workspace/WorkspaceData.tsx` — expose workspace creator and import APIs.
- `src/features/workspace/CreatorImport.tsx` — CSV mapping, preview, validation, and result UI.
- `src/features/workspace/CreatorForm.tsx` — manual creator entry.
- `src/features/workspace/WorkspaceViews.tsx` — source-aware discovery and CRM views.
- `src/components/OnboardingView.tsx` — persist workspace kind, name, role, and optional invite.
- `src/components/LandingPage.tsx` — describe shipped core and future add-ons honestly.
- `extension/background.js` / `extension/sidepanel.html` / `extension/popup.js` — active workspace selection and Save to CRM.
- `src/App.integration.test.tsx` — end-to-end core journeys and tenant isolation UI checks.
- `convex/workspaceCreators.test.ts` / `convex/creatorImports.test.ts` — server behavior tests using the repository's Convex test harness once added.

---

### Task 1: Persist the real agency or brand workspace from onboarding

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/OnboardingView.tsx`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Modify: `convex/workspaces.ts`
- Modify: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: authenticated `Viewer` and the current onboarding form values.
- Produces: `completeWorkspaceOnboarding(input: WorkspaceOnboardingInput): Promise<WorkspaceSummary>`.

- [ ] **Step 1: Add the onboarding contract and failing tests**

```ts
export type WorkspaceOnboardingInput = {
  name: string;
  kind: WorkspaceKind;
  role: WorkspaceRole;
  goals: string[];
  inviteEmail?: string;
};
```

Add integration cases asserting that choosing Brand creates a workspace with `kind: "brand"`, and choosing Agency creates `kind: "agency"`. Assert that a remount keeps the selected kind and does not create a second workspace.

- [ ] **Step 2: Run the tests and confirm the current default fails**

Run: `npm run test:run -- src/App.integration.test.tsx`  
Expected: FAIL because `ensureWorkspace` always creates `{ kind: "agency" }`.

- [ ] **Step 3: Add one server-authorized onboarding mutation**

```ts
export const completeSetup = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("agency"), v.literal("brand"), v.literal("talent")),
    role: role,
    goals: v.array(v.string()),
    inviteEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Reuse the user's active workspace when it exists; otherwise create one.
    // Create/update the active membership, optional invitation, and user onboarding state atomically.
  },
});
```

Store `goals` on `workspaces`. Store the selected user's membership role, except the creator must remain `owner`; keep the chosen operating role as `defaultCampaignRole` on the workspace if it differs. Set `users.activeWorkspaceId`, `onboardingCompleted`, and `onboardingStep: 5` in the same mutation.

- [ ] **Step 4: Replace the frontend-only onboarding values with the mutation**

The final action calls `completeWorkspaceOnboarding({ name: workspaceName, kind, role, goals: selectedGoals, inviteEmail: invite || undefined })`. Remove the unconditional agency default from `ensureWorkspace`; it may only recover legacy users when no onboarding workspace exists.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:run -- src/App.integration.test.tsx && npm run lint && npm run build && npx tsc -p convex/tsconfig.json`  
Expected: all checks pass.

```bash
git add src/types.ts src/components/OnboardingView.tsx src/features/workspace/WorkspaceData.tsx convex/workspaces.ts src/App.integration.test.tsx
git commit -m "fix: persist agency and brand onboarding"
```

### Task 2: Add workspace-owned creator identity without mixing repository data

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/workspaceCreators.ts`
- Modify: `src/types.ts`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Test: `convex/workspaceCreators.test.ts`

**Interfaces:**
- Consumes: a repository creator ID or private creator fields plus an authorized workspace ID.
- Produces: `WorkspaceCreator`, `saveRepositoryCreator`, `createPrivateCreator`, and `listWorkspaceCreators`.

- [ ] **Step 1: Define source-aware CRM types and failing authorization tests**

```ts
export type WorkspaceCreatorOrigin =
  | "creatorly_repository"
  | "csv_upload"
  | "manual_entry"
  | "browser_extension";

export type WorkspaceCreator = {
  id: string;
  workspaceId: string;
  repositoryCreatorId?: string;
  origin: WorkspaceCreatorOrigin;
  displayName: string;
  primaryPlatform: Platform;
  handle: string;
  followerCount?: number;
  location?: string;
  categories: string[];
  sourceLabel: string;
};
```

Test that a member can list their own workspace creators, a different workspace member receives an authorization error, and creating a private creator does not add a row to the global `creators` table.

- [ ] **Step 2: Add normalized workspace tables**

```ts
workspaceCreators: defineTable({
  workspaceId: v.id("workspaces"),
  repositoryCreatorId: v.optional(v.id("creators")),
  origin: v.union(
    v.literal("creatorly_repository"),
    v.literal("csv_upload"),
    v.literal("manual_entry"),
    v.literal("browser_extension"),
  ),
  displayName: v.string(),
  primaryPlatform: platform,
  handle: v.string(),
  normalizedHandle: v.string(),
  followerCount: v.optional(v.number()),
  location: v.optional(v.string()),
  categories: v.array(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_workspace", ["workspaceId"])
  .index("by_workspace_repository", ["workspaceId", "repositoryCreatorId"])
  .index("by_workspace_profile", ["workspaceId", "primaryPlatform", "normalizedHandle"]),

workspaceCreatorProfiles: defineTable({
  workspaceId: v.id("workspaces"),
  workspaceCreatorId: v.id("workspaceCreators"),
  platform,
  handle: v.string(),
  normalizedHandle: v.string(),
  url: v.optional(v.string()),
  followerCount: v.optional(v.number()),
}).index("by_creator", ["workspaceCreatorId"]),

workspaceCreatorContacts: defineTable({
  workspaceId: v.id("workspaces"),
  workspaceCreatorId: v.id("workspaceCreators"),
  name: v.string(),
  role: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  source: v.union(v.literal("csv_upload"), v.literal("manual_entry"), v.literal("browser_extension")),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_creator", ["workspaceCreatorId"]),
```

Add optional `workspaceCreatorId` to `savedCreators` during migration. Keep the existing `creatorId` temporarily so the deployed schema accepts old rows.

- [ ] **Step 3: Implement repository save and private creation mutations**

`saveRepositoryCreator` copies display fields into a workspace snapshot, stores `repositoryCreatorId`, sets origin to `creatorly_repository`, and creates one `savedCreators` row. `createPrivateCreator` writes only to workspace tables and creates the CRM relationship row. Both mutations use `requireWorkspaceRole`.

- [ ] **Step 4: Backfill current saved creators**

Create an internal mutation that reads each legacy `savedCreators.creatorId`, creates or reuses the matching `workspaceCreators` row, and patches `workspaceCreatorId`. It must be idempotent: rerunning it creates no duplicates.

- [ ] **Step 5: Switch CRM reads to workspace creator identity**

Return a source-aware row from `listWorkspaceCreators`. For repository-linked records, include current canonical public fields separately as `repositorySnapshot`; never overwrite private fields during the read.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:run && npm run lint && npm run build && npx tsc -p convex/tsconfig.json`  
Expected: all checks pass and tenant-isolation tests pass.

```bash
git add convex/schema.ts convex/workspaceCreators.ts convex/workspaceCreators.test.ts src/types.ts src/features/workspace/WorkspaceData.tsx
git commit -m "feat: separate workspace creators from discovery data"
```

### Task 3: Build private CSV import, manual entry, and export

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/creatorImports.ts`
- Create: `src/features/workspace/CreatorImport.tsx`
- Create: `src/features/workspace/CreatorForm.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/workspace.css`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Test: `convex/creatorImports.test.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: CSV rows mapped to `CreatorImportRow`.
- Produces: preview results, committed private CRM creators, downloadable error CSV, and private CRM export.

- [ ] **Step 1: Define the import contract and failing tests**

```ts
export type CreatorImportRow = {
  rowNumber: number;
  displayName: string;
  platform: Platform;
  handle: string;
  followerCount?: number;
  location?: string;
  categories?: string[];
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
};

export type CreatorImportPreview = {
  valid: CreatorImportRow[];
  duplicates: Array<CreatorImportRow & { existingWorkspaceCreatorId: string }>;
  errors: Array<{ rowNumber: number; field: string; message: string }>;
};
```

Test invalid handles, invalid email, unsupported platform, within-file duplicates, existing workspace duplicates, and isolation between two workspaces.

- [ ] **Step 2: Add import job storage**

Add `creatorImportJobs` with `workspaceId`, `createdBy`, filename, status, row counts, and timestamps. Add `creatorImportRows` with normalized row data, validation status, error array, and optional committed `workspaceCreatorId`.

- [ ] **Step 3: Build preview and commit mutations**

`preview` validates but does not create CRM records. `commit` accepts an import job ID and explicit duplicate policy: `skip`, `update_private_fields`, or `create_separate`. Default to `skip`. Repository matches are stored as suggestions, not automatic merges.

- [ ] **Step 4: Build the import UI**

The CRM primary action becomes **Add creators** with three choices: **Search Creatorly**, **Upload CSV**, and **Add manually**. CSV import shows mapping, first 20 preview rows, valid/duplicate/error counts, and a final confirmation. It must state: “Uploaded creators and contacts stay private to this workspace.”

- [ ] **Step 5: Add source labels and private export**

CRM rows display **Creatorly data**, **CSV upload**, **Manual**, or **Extension**. Export includes workspace-owned CRM fields and private contacts only for authorized roles. It does not export locked Creatorly repository contacts unless current access rules permit them.

- [ ] **Step 6: Verify and commit**

Run: `npm run test:run && npm run lint && npm run build && npx tsc -p convex/tsconfig.json`  
Expected: import, manual entry, duplicate handling, export, and isolation tests pass.

```bash
git add convex/schema.ts convex/creatorImports.ts convex/creatorImports.test.ts src/features/workspace/CreatorImport.tsx src/features/workspace/CreatorForm.tsx src/features/workspace/WorkspaceViews.tsx src/features/workspace/workspace.css src/features/workspace/WorkspaceData.tsx src/App.integration.test.tsx
git commit -m "feat: add private creator CRM imports"
```

### Task 4: Make workspace discovery explicitly Creatorly-owned

**Files:**
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `convex/creators.ts`
- Modify: `convex/savedCreators.ts`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useRoute.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: canonical repository search and the active workspace.
- Produces: one discovery route with source/freshness labels and a source-safe Save to CRM action.

- [ ] **Step 1: Add failing product-truth tests**

Assert that discovery displays “Creatorly database”, a result detail displays a source/freshness label, saving creates a `creatorly_repository` workspace creator, and editing its CRM stage does not change the global creator row.

- [ ] **Step 2: Converge `/search` and `/app/discover`**

Use `/app/discover` as the authenticated discovery route. Redirect authenticated legacy `/search` traffic to it while preserving `q` and `platform`. Keep the public landing and authentication routes unchanged.

- [ ] **Step 3: Correct discovery copy and states**

Replace “Demo repository · official connections planned” with a truthful source chip such as “Creatorly database · 17,709 profiles” and a separate coverage note using the real imported-data limits. Do not imply TikTok, YouTube, or X coverage when no records are available.

- [ ] **Step 4: Use the new repository-save mutation**

Replace direct `savedCreators:save({ creatorId })` calls with `workspaceCreators:saveRepositoryCreator({ workspaceId, repositoryCreatorId })`. The button state is based on the returned workspace creator link.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:run && npm run lint && npm run build`  
Expected: one discovery journey passes and copy accurately reflects current coverage.

```bash
git add src/features/workspace/WorkspaceViews.tsx src/components/CreatorDetail.tsx convex/creators.ts convex/savedCreators.ts src/App.tsx src/hooks/useRoute.ts src/App.integration.test.tsx
git commit -m "feat: clarify Creatorly-owned discovery"
```

### Task 5: Add active-workspace CRM actions to the extension

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/users.ts`
- Modify: `convex/extensionApi.ts`
- Modify: `extension/background.js`
- Modify: `extension/sidepanel.html`
- Modify: `extension/popup.js`
- Modify: `extension/popup.css`
- Modify: `extension/README.md`
- Test: `extension/profile-url.node.mjs`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: extension token, active workspace, platform, and handle.
- Produces: repository match state and `saveToWorkspace` for matched or unmatched profiles.

- [ ] **Step 1: Add failing extension authorization tests**

Test that a valid token without active workspace membership cannot save, a member can save to the active workspace, a matched profile uses `creatorly_repository`, and an unmatched profile uses `browser_extension` without creating a global repository row.

- [ ] **Step 2: Return active workspace context from the extension profile query**

```ts
type ExtensionWorkspace = {
  id: string;
  name: string;
  kind: "agency" | "brand" | "talent";
  role: WorkspaceRole;
};
```

Resolve `users.activeWorkspaceId`, then call `requireWorkspaceMember`. Return workspace name and whether the current profile is already saved.

- [ ] **Step 3: Implement `saveToWorkspace`**

Matched profiles call the same repository-save helper used by web discovery. Unmatched supported profiles create a workspace-private creator with the exact platform and normalized handle. Do not create or update `creators` from extension data.

- [ ] **Step 4: Add Save to CRM UI**

Show **Save to [workspace name]** after profile detection. After saving, show **Saved to CRM** and a link to the workspace creator record. Keep unlock and report-contact actions separate from saving.

- [ ] **Step 5: Verify and commit**

Run: `node extension/profile-url.node.mjs && npm run test:run && npm run lint && npm run build && npx tsc -p convex/tsconfig.json`  
Expected: extension parsing, save states, web journeys, and server types pass.

```bash
git add convex/schema.ts convex/users.ts convex/extensionApi.ts extension/background.js extension/sidepanel.html extension/popup.js extension/popup.css extension/README.md extension/profile-url.node.mjs src/App.integration.test.tsx
git commit -m "feat: save extension profiles to workspace CRM"
```

### Task 6: Complete the agency and brand grouping baseline

**Files:**
- Modify: `convex/schema.ts`
- Create: `convex/workspaceGroups.ts`
- Modify: `src/types.ts`
- Create: `src/features/workspace/WorkspaceGroups.tsx`
- Modify: `src/features/workspace/WorkspaceViews.tsx`
- Modify: `src/features/workspace/WorkspaceData.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: workspace kind and authorized group data.
- Produces: client groups for agencies and brand/division/region groups for brands.

- [ ] **Step 1: Replace the agency-only `clients` assumption with a neutral group contract**

```ts
export type WorkspaceGroupKind = "client" | "brand" | "product_line" | "region";
export type WorkspaceGroup = {
  id: string;
  workspaceId: string;
  kind: WorkspaceGroupKind;
  name: string;
  website?: string;
  status: "active" | "archived";
};
```

Use a new `workspaceGroups` table or migrate `clients` with a required `kind`. During migration, existing client rows become `kind: "client"`.

- [ ] **Step 2: Add server-enforced kind rules**

Agency workspaces may create `client`; brand workspaces may create `brand`, `product_line`, or `region`; talent workspaces may create none in this release. Reject invalid combinations on the server.

- [ ] **Step 3: Add grouping to campaigns and filters**

Campaigns receive optional `workspaceGroupId`. Agency copy says Client; brand copy says Brand / division. Home, Campaigns, and Reports-ready query responses include the group label.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:run && npm run lint && npm run build && npx tsc -p convex/tsconfig.json`  
Expected: agency and brand grouping tests pass without duplicating campaign logic.

```bash
git add convex/schema.ts convex/workspaceGroups.ts src/types.ts src/features/workspace/WorkspaceGroups.tsx src/features/workspace/WorkspaceViews.tsx src/features/workspace/WorkspaceData.tsx src/App.integration.test.tsx
git commit -m "feat: tailor workspace grouping for agencies and brands"
```

### Task 7: Reposition the product around shipped core features

**Files:**
- Modify: `src/components/LandingPage.tsx`
- Modify: `src/components/LandingPage.css`
- Modify: `src/components/AppShell.tsx`
- Modify: `README.md`
- Modify: `docs/specs/2026-08-30-creatorly-influencer-workspace.md`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: the feature status established by Tasks 1–6.
- Produces: truthful marketing and navigation that distinguish core product from add-ons.

- [ ] **Step 1: Add copy assertions before rewriting the page**

Assert that the landing page names **Creator discovery**, **Private creator CRM**, **Chrome extension**, and **Campaign workspace**. Assert that it does not say “4 agents online” or “Your agent team is ready.” Assert that AI agents and Shared Inbox are labelled add-ons or coming later.

- [ ] **Step 2: Replace the agent-led hero**

Use this message hierarchy:

```text
Eyebrow: Creator discovery and campaign workspace
Headline: Find creators. Build your private CRM. Run every campaign in one place.
Body: Search Creatorly's creator database, save or upload your own roster, and move partnerships from shortlist to live content.
Primary action: Start free
Secondary proof: Chrome extension included
```

The product preview should show a Creatorly search result being saved into a private CRM, not unbuilt agents running autonomously.

- [ ] **Step 3: Present add-ons separately**

Add one restrained section titled **Extend your workspace when you are ready** with Shared Inbox, AI Agents, Automations, and Connected Reporting. Every unbuilt item carries a written **Coming later** status.

- [ ] **Step 4: Align product navigation and README**

Keep disabled add-on navigation below a divider, labelled **Add-ons**. Update README's opening statement and scope so the repository no longer calls AI agents the shipped core.

- [ ] **Step 5: Run full release verification**

Run: `npm run test:run && npm run lint && npm run build && npx tsc -p convex/tsconfig.json && npm audit`  
Expected: all checks pass with no critical vulnerabilities.

Verify manually at 1440px, 1024px, and 390px:

- Agency onboarding persists agency.
- Brand onboarding persists brand.
- Discovery is visibly Creatorly-owned.
- Repository save creates a Creatorly-sourced CRM row.
- CSV and manual creators remain private and carry origin labels.
- Extension saves matched and unmatched profiles to the active workspace.
- A second workspace cannot read the first workspace's imported creator.
- Campaigns accept both discovered and uploaded creators.
- AI agents and Inbox are visibly later add-ons, not live claims.

- [ ] **Step 6: Commit**

```bash
git add src/components/LandingPage.tsx src/components/LandingPage.css src/components/AppShell.tsx README.md docs/specs/2026-08-30-creatorly-influencer-workspace.md src/App.integration.test.tsx
git commit -m "docs: position discovery and CRM as Creatorly core"
```

## Deferred Add-on Plans

After this plan passes production verification, write separate plans in this order:

1. **Creatorly Shared Inbox Add-on** — official WhatsApp Business adapter, templates, inbound webhooks, assignment, conversation states, and human send confirmation.
2. **Creatorly AI Agents Add-on** — discovery suggestions, cited research, campaign operation proposals, reply drafts, and report narratives with approval and run history.
3. **Creatorly Automation Add-on** — trigger/action rules, test mode, approval gates, retries, failures, and audit history.
4. **Creatorly Connected Reporting Add-on** — official social adapters, timestamped metric snapshots, attribution, exports, and client links.
