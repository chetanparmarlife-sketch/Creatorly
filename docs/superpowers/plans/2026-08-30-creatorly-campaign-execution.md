# Creatorly Campaign Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Release 2 so an agency campaign manager can plan creator deliverables, review submitted content, record decisions, manage tasks and fees, and understand campaign risk from one operational dashboard.

**Architecture:** Extend the workspace-private campaign model with deliverables, approval history, and campaign tasks. Keep the existing campaign rail as the signature navigation model, and add dashboard, table, calendar, and review modes that read the same campaign records. Demo mode persists to local storage; Convex mode uses role-checked functions and immutable activity events.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Convex, Convex Auth, Vitest, Testing Library, CSS, Lucide icons, Plus Jakarta Sans

**Spec:** `docs/specs/2026-08-30-creatorly-influencer-workspace.md`

## Global Constraints

- Every deliverable, approval, and task belongs to one workspace and one campaign.
- Every Convex query and mutation verifies workspace membership; reviewer mutations are rejected.
- Approval history is append-only; a later decision does not overwrite an earlier decision.
- Uploaded content is represented by a user-entered review URL in Release 2; file storage is not claimed or simulated.
- Budget usage is calculated from recorded agreed fees; no payment or escrow capability is implied.
- Calendar dates come from deliverable and task due dates, not generated estimates.
- Rail, table, calendar, and review modes share the same campaign creator and deliverable data.
- Keep the Lumen palette: black actions, electric-blue selection, white surfaces, fine grey borders, and written statuses.
- Preserve all Release 1 discovery, CRM, campaign creation, and stage movement behavior.
- Commit only if the user explicitly requests commits.

---

### Task 1: Add the campaign execution domain

**Files:**
- Modify: `src/types.ts`
- Modify: `convex/schema.ts`
- Test: `src/features/workspace/CampaignExecution.test.tsx`

**Interfaces:**

```ts
export type DeliverableStatus = "planned" | "awaiting_content" | "in_review" | "changes_requested" | "approved" | "scheduled" | "live";
export type ApprovalDecision = "pending" | "approved" | "changes_requested";
export type CampaignTaskStatus = "open" | "done" | "cancelled";

export type CampaignDeliverable = {
  id: string;
  campaignCreatorId: string;
  title: string;
  channel: Platform;
  format: string;
  dueAt?: number;
  status: DeliverableStatus;
  submissionUrl?: string;
  liveUrl?: string;
  approvals: CampaignApproval[];
};
```

- [ ] **Step 1: Write the failing execution test**

Create a UI test that opens a campaign, adds a deliverable, submits a review URL, requests changes, approves it, adds a task, records a creator fee, and verifies the dashboard totals.

Run: `npm test -- --run src/features/workspace/CampaignExecution.test.tsx`
Expected: FAIL because campaign execution controls do not exist.

- [ ] **Step 2: Add schema tables and indexes**

Add `deliverables` with `workspaceId`, `campaignId`, `campaignCreatorId`, title, channel, format, due date, status, submission/live URLs, and timestamps. Add `approvals` with deliverable, decision, reviewer, note, and timestamp. Extend `tasks` with optional `campaignCreatorId`. Add campaign and review-queue indexes.

- [ ] **Step 3: Add shared frontend types**

Add `CampaignDeliverable`, `CampaignApproval`, and `CampaignTask`. Extend `CampaignCreator` with `deliverables`, and extend `Campaign` with `tasks`.

- [ ] **Step 4: Run type checks**

Run: `npm run build && npx tsc -p convex/tsconfig.json --noEmit`
Expected: both pass.

---

### Task 2: Build role-checked campaign execution APIs

**Files:**
- Create: `convex/campaignExecution.ts`
- Modify: `convex/campaigns.ts`
- Modify: `convex/lib/workspaceAuth.ts`

**Interfaces:**

```ts
campaignExecution.addDeliverable({ workspaceId, campaignId, campaignCreatorId, title, channel, format, dueAt? })
campaignExecution.submitContent({ workspaceId, deliverableId, submissionUrl })
campaignExecution.decideApproval({ workspaceId, deliverableId, decision, note? })
campaignExecution.addTask({ workspaceId, campaignId, campaignCreatorId?, title, dueAt? })
campaignExecution.setTaskStatus({ workspaceId, taskId, status })
campaignExecution.setCreatorFee({ workspaceId, campaignCreatorId, agreedFee })
campaignExecution.getCampaign({ workspaceId, campaignId })
```

- [ ] **Step 1: Implement URL and amount validation**

Accept only `http:` or `https:` content URLs. Reject negative fees and blank deliverable/task titles with stable Convex errors.

- [ ] **Step 2: Implement deliverable state transitions**

New deliverables begin `planned`. Submission sets `in_review`. Changes requested sets `changes_requested`. Approval sets `approved`. Every transition appends an activity event.

- [ ] **Step 3: Implement append-only approvals**

Insert a new approval record for every decision. Never patch or delete earlier approval records.

- [ ] **Step 4: Implement task and fee mutations**

Use campaign-manager roles for commercial fields and task creation. Record previous and next fee values in activity history.

- [ ] **Step 5: Return a complete campaign aggregate**

Return campaign creators with deliverables and approval history plus campaign tasks. Locked contact values remain absent.

- [ ] **Step 6: Run Convex checks**

Run: `npx tsc -p convex/tsconfig.json --noEmit`
Expected: pass.

---

### Task 3: Extend the feature-level workspace data adapter

**Files:**
- Modify: `src/features/workspace/WorkspaceData.tsx`

**Interfaces:**

```ts
getCampaignExecution(workspaceId: string, campaignId: string): Promise<Campaign | null>;
addDeliverable(workspaceId: string, campaignId: string, campaignCreatorId: string, input: DeliverableInput): Promise<void>;
submitDeliverable(workspaceId: string, campaignId: string, deliverableId: string, submissionUrl: string): Promise<void>;
decideDeliverable(workspaceId: string, campaignId: string, deliverableId: string, decision: ApprovalDecision, note?: string): Promise<void>;
addCampaignTask(workspaceId: string, campaignId: string, input: CampaignTaskInput): Promise<void>;
setCampaignTaskStatus(workspaceId: string, campaignId: string, taskId: string, status: CampaignTaskStatus): Promise<void>;
setCampaignCreatorFee(workspaceId: string, campaignId: string, campaignCreatorId: string, agreedFee: number): Promise<void>;
```

- [ ] **Step 1: Add demo persistence methods**

Update the existing campaign object in `creatorly.campaigns.v1`; preserve unrelated creators, deliverables, tasks, and approvals.

- [ ] **Step 2: Add Convex function references**

Map Convex IDs and nested approval/deliverable records into the shared frontend domain types.

- [ ] **Step 3: Keep both adapters behaviorally aligned**

Demo and Convex methods must produce identical visible status changes and activity descriptions.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --run src/features/workspace/CampaignExecution.test.tsx`
Expected: the data flow reaches the new controls; remaining failures are view-related.

---

### Task 4: Build the campaign execution dashboard and views

**Files:**
- Create: `src/features/workspace/CampaignExecution.tsx`
- Create: `src/features/workspace/campaign-execution.css`
- Modify: `src/features/workspace/WorkspaceViews.tsx`

**Interfaces:**

```ts
type CampaignView = "dashboard" | "rail" | "table" | "calendar" | "review";

interface CampaignExecutionProps {
  workspace: WorkspaceSummary;
  campaign: Campaign;
  savedCreators: SavedCreator[];
  onRefresh(): Promise<void>;
}
```

- [ ] **Step 1: Build the dashboard focal view**

Show creator progress, committed spend, remaining budget, deliverable completion, review queue, overdue work, and the next five tasks. Values are derived from the campaign aggregate.

- [ ] **Step 2: Preserve and enrich the rail**

Keep the 11 canonical stages. Creator cards show fee, deliverable progress, next action, and the most urgent written risk state.

- [ ] **Step 3: Build table and calendar modes**

The table is the dense operational view. The calendar groups dated deliverables and tasks by day and clearly labels overdue items.

- [ ] **Step 4: Build the review queue**

Show only submitted deliverables awaiting a decision or changes. The primary action opens the evidence drawer.

- [ ] **Step 5: Build the evidence drawer**

The 480–560px right drawer shows creator, deliverable, review URL, due date, decision history, and note. Approve and Request changes are explicit actions with written results.

- [ ] **Step 6: Add responsive behavior**

Below 980px, view tabs scroll horizontally, metric cards become two columns, and the drawer becomes a full-width sheet.

- [ ] **Step 7: Run the focused test and build**

Run: `npm test -- --run src/features/workspace/CampaignExecution.test.tsx && npm run build`
Expected: pass.

---

### Task 5: Add deliverable, task, and fee editing

**Files:**
- Modify: `src/features/workspace/CampaignExecution.tsx`
- Modify: `src/features/workspace/campaign-execution.css`
- Test: `src/features/workspace/CampaignExecution.test.tsx`

- [ ] **Step 1: Add creator operations drawer**

Selecting a creator opens one panel for agreed fee, next task, and deliverables. Do not split these into unrelated modal dialogs.

- [ ] **Step 2: Add deliverable form**

Require title, channel, and format. Due date is optional. Save returns to the creator operations summary with the new item visible.

- [ ] **Step 3: Add content submission form**

Require an `http:` or `https:` review URL. Explain that Creatorly links to the review asset and does not upload the file in Release 2.

- [ ] **Step 4: Add fee and task controls**

Accept a zero or positive fee and show it against the campaign currency. Tasks include title, optional creator, optional due date, and open/done states.

- [ ] **Step 5: Complete the interaction test**

Assert visible statuses and totals after every mutation rather than checking implementation details.

Run: `npm test -- --run src/features/workspace/CampaignExecution.test.tsx`
Expected: pass.

---

### Task 6: Release verification and documentation

**Files:**
- Modify: `.interface-design/system.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Save the campaign execution patterns**

Document the campaign view switcher, evidence drawer, budget strip, review status language, and mobile sheet behavior.

- [ ] **Step 2: Update product documentation**

List Release 2 capabilities and state that content is linked by URL, fees are tracking-only, and no creator payment is performed.

- [ ] **Step 3: Run the complete gate**

Run: `npm run lint && npm test -- --run && npm run build && npx tsc -p convex/tsconfig.json --noEmit && git diff --check`
Expected: all commands pass.

- [ ] **Step 4: Verify responsive browser behavior**

Run the local app in demo mode. Inspect the campaign dashboard, rail, calendar, and evidence drawer at desktop and 390×844 mobile sizes. Confirm no browser console errors.
