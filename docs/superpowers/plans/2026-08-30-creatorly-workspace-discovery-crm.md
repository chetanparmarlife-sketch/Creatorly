# Creatorly Workspace, Discovery, and CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first usable influencer-marketing workspace: multi-user workspace setup, creator discovery across four platforms, saved creator CRM, and campaign creator tracking through the campaign rail.

**Architecture:** Extend the existing React/Vite and Convex application. Preserve the canonical creator/contact database, add a tenant layer for workspace-owned state, and split new frontend data access by product domain instead of expanding the existing `AppData` context. Use a Lumen fixed sidebar and contextual secondary navigation across the new authenticated routes.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Convex, Convex Auth, Vitest, Testing Library, CSS, Lucide icons, Plus Jakarta Sans

**Spec:** `docs/specs/2026-08-30-creatorly-influencer-workspace.md`

## Global Constraints

- Keep existing search, contact unlock, history, admin, and billing behavior working while the new workspace layer is introduced.
- Canonical creator and public social data remain global; lists, owners, notes, CRM stages, campaigns, and activity are workspace-private.
- Every tenant query and mutation must verify active workspace membership on the server.
- Never expose locked contact values through list, search, activity, or campaign APIs.
- Support Instagram, TikTok, YouTube, and X in the product model; do not claim live provider data until a real integration is connected.
- Use black primary buttons and electric blue only for links, focus, selection, and active filters.
- Use written labels for status; color cannot be the only status signal.
- Preserve user changes already present in `LandingPage.tsx` and `LandingPage.css` unless a later task explicitly replaces them.
- Commit after each task only when checks for that task pass.

---

### Task 1: Lock the tenant and campaign domain model

**Files:**
- Modify: `convex/schema.ts`
- Modify: `src/types.ts`
- Create: `src/features/workspaces/types.ts`
- Create: `src/features/campaigns/types.ts`
- Test: `src/features/campaigns/types.test.ts`

**Interfaces:**

```ts
export type WorkspaceRole = "owner" | "admin" | "manager" | "contributor" | "reviewer";
export type WorkspaceKind = "agency" | "brand" | "talent";
export type CreatorPlatform = "instagram" | "tiktok" | "youtube" | "twitter";
export type CampaignStage =
  | "discovered" | "shortlisted" | "contacted" | "replied"
  | "negotiating" | "contracted" | "creating" | "in_review"
  | "scheduled" | "live" | "paid";

export const CAMPAIGN_STAGES: readonly CampaignStage[];
export function canManageCampaign(role: WorkspaceRole): boolean;
export function canRevealContacts(role: WorkspaceRole): boolean;
```

- [ ] **Step 1: Write failing domain tests**

Test the exact stage order and permission matrix: owner/admin/manager can manage campaigns; contributor can update assigned work but not workspace settings; reviewer is read-only and cannot reveal contacts.

Run: `npm test -- --run src/features/campaigns/types.test.ts`  
Expected: FAIL because the new domain module does not exist.

- [ ] **Step 2: Add the schema tables**

Add `workspaces`, `workspaceMembers`, `clients`, `savedCreators`, `creatorLists`, `creatorListMembers`, `campaigns`, `campaignCreators`, `tasks`, and `activityEvents`. Add indexes beginning with workspace ownership, including `by_workspace`, `by_workspace_user`, `by_workspace_creator`, `by_campaign_stage`, and `by_workspace_created_at`.

- [ ] **Step 3: Expand the platform type**

Replace the two-platform application type with `instagram | tiktok | youtube | twitter`. Keep compatibility for existing creator records and add display metadata in one shared map.

- [ ] **Step 4: Implement domain constants and permission helpers**

Keep permission decisions in pure functions so UI affordances and backend tests use the same named rules; backend authorization must still be enforced independently.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/features/campaigns/types.test.ts && npm run build`  
Expected: tests pass and the app builds.

Commit: `feat: add workspace and campaign domain model`

### Task 2: Add workspace authorization and bootstrap APIs

**Files:**
- Create: `convex/lib/workspaceAuth.ts`
- Create: `convex/workspaces.ts`
- Modify: `convex/users.ts`
- Test: `convex/workspaces.test.ts`

**Interfaces:**

```ts
export async function requireWorkspaceMember(ctx, workspaceId): Promise<WorkspaceMember>;
export async function requireWorkspaceRole(ctx, workspaceId, allowedRoles): Promise<WorkspaceMember>;

workspaces.create({ name, kind, website? }) -> { workspaceId }
workspaces.listMine() -> WorkspaceSummary[]
workspaces.getCurrent({ workspaceId }) -> WorkspaceDetail
workspaces.inviteMember({ workspaceId, email, role }) -> { invitationId }
workspaces.updateMemberRole({ workspaceId, memberId, role }) -> void
```

- [ ] **Step 1: Write failing authorization tests**

Cover anonymous access, a non-member, an active member, a reviewer attempting an admin mutation, and an owner changing a member role.

Run: `npm test -- --run convex/workspaces.test.ts`  
Expected: FAIL because the workspace APIs do not exist.

- [ ] **Step 2: Implement shared authorization helpers**

Return a stable `NOT_AUTHENTICATED`, `NOT_A_MEMBER`, or `INSUFFICIENT_ROLE` application error. Do not accept a user ID from the browser.

- [ ] **Step 3: Implement atomic workspace creation**

Create the workspace and owner membership in one mutation. Persist the user's `activeWorkspaceId` only after both records exist.

- [ ] **Step 4: Implement membership and invitations**

Store invitation status without claiming that an email was sent. Surface it as “Invite created” until a real email provider is connected.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run convex/workspaces.test.ts && npx tsc -p convex/tsconfig.json --noEmit`  
Expected: authorization tests and Convex type checks pass.

Commit: `feat: add workspace membership and authorization`

### Task 3: Introduce workspace routing and the Lumen product shell

**Files:**
- Modify: `src/hooks/useRoute.ts`
- Modify: `src/App.tsx`
- Create: `src/components/workspace/WorkspaceShell.tsx`
- Create: `src/components/workspace/WorkspaceShell.css`
- Create: `src/components/workspace/WorkspaceSwitcher.tsx`
- Test: `src/components/workspace/WorkspaceShell.test.tsx`

**Interfaces:**

```ts
type WorkspaceRoute =
  | "home" | "discover" | "creators" | "campaigns" | "inbox"
  | "automations" | "reports" | "agents" | "integrations" | "settings";

interface WorkspaceShellProps {
  route: WorkspaceRoute;
  workspace: WorkspaceSummary;
  onNavigate(route: WorkspaceRoute): void;
  children: React.ReactNode;
}
```

- [ ] **Step 1: Write failing navigation tests**

Assert labeled navigation, active state, keyboard access, workspace switcher, user menu, desktop sidebar, and mobile drawer behavior.

Run: `npm test -- --run src/components/workspace/WorkspaceShell.test.tsx`  
Expected: FAIL because the shell does not exist.

- [ ] **Step 2: Add workspace routes without breaking existing URLs**

Map `/app/:workspaceId/discover`, `/creators`, `/campaigns`, and `/campaigns/:campaignId`. Redirect legacy authenticated `/search` to the active workspace's Discover page only when an active workspace exists.

- [ ] **Step 3: Build the shell**

Use the required fixed 256px black sidebar, white 68px sticky top bar, and soft-grey main canvas. Use text labels beside icons on desktop. Keep Inbox, Automations, Reports, Agents, and Integrations visible but marked “Planned” until their releases ship.

- [ ] **Step 4: Add responsive behavior**

Below 980px, replace the fixed sidebar with an accessible menu drawer; preserve route labels and focus return.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/components/workspace/WorkspaceShell.test.tsx src/App.integration.test.tsx && npm run build`  
Expected: shell tests, existing journeys, and build pass.

Commit: `feat: add workspace navigation shell`

### Task 4: Replace generic onboarding with workspace setup

**Files:**
- Modify: `src/components/OnboardingView.tsx`
- Create: `src/features/onboarding/WorkspaceOnboarding.tsx`
- Create: `src/features/onboarding/onboardingState.ts`
- Test: `src/features/onboarding/WorkspaceOnboarding.test.tsx`

**Interfaces:**

```ts
interface WorkspaceOnboardingDraft {
  kind: "agency" | "brand" | "talent" | null;
  name: string;
  website: string;
  goals: Array<"discover" | "campaigns" | "outreach" | "reporting">;
  role: WorkspaceRole;
  invites: Array<{ email: string; role: WorkspaceRole }>;
  firstAction: "discover" | "import" | "campaign";
}
```

- [ ] **Step 1: Write failing flow tests**

Cover forward/back navigation, refresh-safe draft state, required fields, skip behavior for invitations/connections, final workspace creation, and redirect to the selected first action.

Run: `npm test -- --run src/features/onboarding/WorkspaceOnboarding.test.tsx`  
Expected: FAIL because the workspace onboarding flow does not exist.

- [ ] **Step 2: Implement the five value-creating steps**

Build Workspace, Goals, Team, Channels, and First result. Use a progress bar and “Step n of 5”; do not award credits for survey responses.

- [ ] **Step 3: Persist and restore the draft**

Use local storage only for the incomplete browser draft. Clear it after the server confirms workspace creation.

- [ ] **Step 4: Connect workspace creation and invitations**

Create the workspace once, then create pending invitations. If one invitation fails, keep the workspace and show the exact failed address with a retry action.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/features/onboarding/WorkspaceOnboarding.test.tsx src/App.integration.test.tsx && npm run build`  
Expected: onboarding and existing integration tests pass.

Commit: `feat: add value based workspace onboarding`

### Task 5: Upgrade creator discovery for workspace use

**Files:**
- Modify: `convex/creators.ts`
- Create: `convex/savedCreators.ts`
- Create: `src/features/discovery/DiscoveryPage.tsx`
- Create: `src/features/discovery/DiscoveryFilters.tsx`
- Create: `src/features/discovery/CreatorResultsTable.tsx`
- Create: `src/features/creators/CreatorDrawer.tsx`
- Test: `src/features/discovery/DiscoveryPage.test.tsx`

**Interfaces:**

```ts
creators.search({ workspaceId, query, platforms, followerRange?, location?, contactAvailable?, cursor? })
  -> { creators: CreatorSearchResult[]; nextCursor?: string }

savedCreators.save({ workspaceId, creatorId, listId?, ownerMemberId? }) -> { savedCreatorId; alreadySaved }
savedCreators.setContactAccess({ workspaceId, creatorId }) -> existing unlock result
```

- [ ] **Step 1: Write failing discovery tests**

Cover the four platform filters, query reset, pagination, empty results, error retry, creator drawer, locked contact state, successful unlock, save-to-workspace, and already-saved state.

Run: `npm test -- --run src/features/discovery/DiscoveryPage.test.tsx`  
Expected: FAIL because the discovery workspace page does not exist.

- [ ] **Step 2: Add workspace-aware search results**

Return only non-sensitive creator fields plus `isSaved`, saved list count, and permitted contact-availability metadata. Never include a locked value.

- [ ] **Step 3: Implement idempotent save behavior**

The unique logical key is `workspaceId + creatorId`. A repeated save returns the existing record and cannot create duplicates.

- [ ] **Step 4: Build the discovery interface**

Use a collapsible filter sidebar, full-width results table, selected-row blue state, and 480px creator drawer. The primary action is “Save creator”; “Reveal contact” remains a controlled secondary action.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/features/discovery/DiscoveryPage.test.tsx src/lib/creatorMatching.test.ts && npm run build`  
Expected: discovery and matching tests pass.

Commit: `feat: add workspace creator discovery`

### Task 6: Build saved creator lists and CRM views

**Files:**
- Modify: `convex/savedCreators.ts`
- Create: `convex/creatorLists.ts`
- Create: `src/features/creators/CreatorsPage.tsx`
- Create: `src/features/creators/CreatorListSidebar.tsx`
- Create: `src/features/creators/CreatorCrmTable.tsx`
- Test: `src/features/creators/CreatorsPage.test.tsx`

**Interfaces:**

```ts
savedCreators.list({ workspaceId, listId?, ownerId?, stage?, query?, cursor? })
savedCreators.update({ workspaceId, savedCreatorId, ownerId?, relationshipStage?, priority?, nextAction?, nextActionAt?, tags? })
creatorLists.create({ workspaceId, name, description? })
creatorLists.addMembers({ workspaceId, listId, savedCreatorIds })
```

- [ ] **Step 1: Write failing CRM tests**

Cover list creation, creator assignment, filter by owner/stage, inline stage change, next action, reviewer restrictions, duplicate list membership, and persistent activity history.

Run: `npm test -- --run src/features/creators/CreatorsPage.test.tsx`  
Expected: FAIL because the creator CRM does not exist.

- [ ] **Step 2: Implement server APIs and activity events**

Every owner, stage, priority, and next-action mutation writes a matching activity event containing actor, previous value, next value, and timestamp.

- [ ] **Step 3: Build list navigation and the CRM table**

Use a secondary sidebar for All creators, My creators, Follow-ups, and custom lists. Table columns: creator, platforms, relationship stage, owner, last activity, next action, contact state, and row menu.

- [ ] **Step 4: Add bulk actions with confirmation**

Support add to list, assign owner, and add tag. Do not include bulk contact reveal or bulk outbound messaging.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/features/creators/CreatorsPage.test.tsx && npm run build`  
Expected: CRM tests and build pass.

Commit: `feat: add saved creator crm`

### Task 7: Build campaigns and the campaign rail

**Files:**
- Create: `convex/campaigns.ts`
- Create: `src/features/campaigns/CampaignsPage.tsx`
- Create: `src/features/campaigns/CreateCampaignDialog.tsx`
- Create: `src/features/campaigns/CampaignDetailPage.tsx`
- Create: `src/features/campaigns/CampaignRail.tsx`
- Create: `src/features/campaigns/CampaignCreatorTable.tsx`
- Test: `src/features/campaigns/CampaignDetailPage.test.tsx`

**Interfaces:**

```ts
campaigns.create({ workspaceId, name, clientId?, goal, platforms, startsAt?, endsAt?, currency, budget? })
campaigns.list({ workspaceId, status?, ownerId?, cursor? })
campaigns.addCreators({ workspaceId, campaignId, savedCreatorIds })
campaigns.moveCreator({ workspaceId, campaignCreatorId, stage, nextAction?, nextActionAt? })
campaigns.assignCreator({ workspaceId, campaignCreatorId, ownerMemberId })
campaigns.getDetail({ workspaceId, campaignId })
```

- [ ] **Step 1: Write failing campaign tests**

Cover campaign creation, adding saved creators, preventing duplicates, stage order, moving a creator, assignment, next action, reviewer read-only behavior, refresh persistence, and activity timeline.

Run: `npm test -- --run src/features/campaigns/CampaignDetailPage.test.tsx`  
Expected: FAIL because campaign screens and APIs do not exist.

- [ ] **Step 2: Implement campaign APIs**

Validate workspace membership for the campaign and every saved creator. Use atomic updates for stage changes and matching activity events.

- [ ] **Step 3: Build the campaign portfolio**

Show active campaigns first with client/brand, owner, dates, creator progress, budget usage when available, overdue count, and status. The empty state creates a real campaign.

- [ ] **Step 4: Build the campaign rail and table switcher**

The rail groups creator cards by the canonical stages. The table uses the same records and supports denser operations. Both open the existing creator drawer rather than duplicating creator details.

- [ ] **Step 5: Run checks and commit**

Run: `npm test -- --run src/features/campaigns/CampaignDetailPage.test.tsx && npm run build`  
Expected: campaign tests and build pass.

Commit: `feat: add campaign rail and creator tracking`

### Task 8: Add the operational home and complete release verification

**Files:**
- Create: `convex/home.ts`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/NextActions.tsx`
- Create: `src/features/home/ActiveCampaigns.tsx`
- Modify: `src/App.integration.test.tsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.interface-design/system.md`

**Interfaces:**

```ts
home.getSummary({ workspaceId }) -> {
  activeCampaignCount: number;
  savedCreatorCount: number;
  creatorsAwaitingAction: number;
  overdueActions: NextAction[];
  recentActivity: ActivityEvent[];
  activeCampaigns: CampaignSummary[];
}
```

- [ ] **Step 1: Extend the integration test with the release journey**

Test signup → workspace onboarding → Discover → save creator → create list → create campaign → add creator → assign owner → move stage → reload → confirm activity. Add a separate reviewer permission test.

Run: `npm test -- --run src/App.integration.test.tsx`  
Expected: FAIL until the home page and complete route wiring are present.

- [ ] **Step 2: Build the operational home**

Lead with overdue and upcoming work, followed by active campaigns and recent activity. Avoid vanity metrics and decorative charts with no data.

- [ ] **Step 3: Record the design system and product limits**

Update `.interface-design/system.md` with the Lumen tokens, fixed black navigation, creator drawer, campaign rail, table density, status language, and the rule that AI remains contextual. Document that social and WhatsApp connections are planned, not live.

- [ ] **Step 4: Run the complete local gate**

Run: `npm run lint && npm test -- --run && npm run build && npx tsc -p convex/tsconfig.json --noEmit`  
Expected: every command exits successfully.

- [ ] **Step 5: Verify representative screens in a browser**

Inspect signup, onboarding, Discover, creator drawer, Creators CRM, campaign rail/table, and Home at 1440px, 1024px, and 390px widths. Check keyboard navigation, focus visibility, drawer/menu focus return, overflow, table fallback, loading, empty, error, and permission states.

- [ ] **Step 6: Update handoff records and commit**

Record exact command and browser results in `CHANGELOG.md`. Update `README.md` with routes, roles, data boundaries, and planned integrations.

Commit: `feat: ship workspace discovery and campaign foundation`

## Following implementation plans

Write these as separate plans only after Release 1 is verified in the browser:

1. `Creatorly Campaign Execution` — deliverables, content review, approvals, tasks, budget, and calendar.
2. `Creatorly WhatsApp and Shared Inbox` — provider adapter, OAuth/embedded signup, templates, webhooks, conversations, and sending approvals.
3. `Creatorly Automation Runtime` — trigger/action definitions, test mode, approval gates, idempotent runs, retries, and audit logs.
4. `Creatorly Social Metrics and Reports` — platform adapters, snapshot ingestion, attribution, exports, and client links.
5. `Creatorly Contextual Agents` — cited discovery/research, operations proposals, reply drafts, report narratives, and human approval.
