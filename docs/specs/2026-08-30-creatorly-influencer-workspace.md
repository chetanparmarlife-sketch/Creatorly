# Creatorly Influencer Workspace Product Blueprint

**Status:** Planning baseline for the next Creatorly product phase  
**Date:** 2026-08-30  
**Supersedes:** The earlier constraint that teams and shared workspaces were out of scope

## Product statement

Creatorly is the operating workspace for influencer-marketing teams at agencies and brands. A team can discover creators, reveal and save business contacts, move creators through a campaign, communicate from a shared business channel, coordinate approvals and deliverables, and report results without splitting the work across spreadsheets, personal WhatsApp accounts, and disconnected tools.

The creator database is the entry point and strongest product advantage. The workspace around it is what turns a search result into an executed campaign.

## Reference interpretation

The supplied Instantly screens are a reference for product structure, density, onboarding rhythm, and operational clarity. They are not a feature specification and are not to be copied literally.

Use these reference patterns:

- A clear journey from account creation to a first useful result.
- Persistent product navigation with a contextual secondary panel.
- Full-width operational tables, filters, drawers, and useful empty states.
- Guided tours and contextual assistance that do not replace the primary workflow.
- One consistent system across discovery, outreach, CRM, reporting, billing, and settings.

Do not copy these weaknesses:

- A large set of unlabeled module icons that users must memorize.
- Generic loading tables and empty states with no useful next action.
- An AI drawer that covers the work the user is trying to complete.
- Reward-credit onboarding questions that do not create product value.
- Separate tools that feel connected only through navigation.

## Primary users

### Agency campaign manager

Runs several clients and campaigns, assigns creators to teammates, tracks outreach and deliverables, and needs a clean client-ready report.

### Brand influencer lead

Builds a creator roster, evaluates fit and safety, manages approvals, and needs reliable campaign performance and spending visibility.

### Outreach or creator partnerships specialist

Finds creators, reveals contacts, sends messages, follows up, records replies, and moves creators through the pipeline.

### Reviewer or stakeholder

Reviews shortlists, content, and results without changing sensitive campaign or contact data.

## Product promise

**Find the right creators, move every relationship forward, and run the entire campaign from one shared workspace.**

## Core journey

1. Create an agency or brand workspace.
2. Invite teammates and choose roles.
3. Search creators across Instagram, TikTok, YouTube, and X.
4. Open a creator profile, inspect fit signals, and reveal available business contacts.
5. Save the creator to a list or campaign.
6. Assign an owner and move the creator through the campaign rail.
7. Contact the creator through an approved shared business channel.
8. Track negotiation, agreement, deliverables, approvals, publishing, payment, and results.
9. Automate safe follow-ups and internal reminders.
10. Share a campaign report with the client or brand team.

## Information architecture

The authenticated product uses the Lumen visual system: a fixed 256px black sidebar, a sticky white top bar, a soft-grey canvas, white bordered surfaces, black primary actions, and electric-blue selection.

### Main navigation

1. **Home** — priorities, active campaigns, overdue work, recent creator replies, and performance summary.
2. **Discover** — creator database, natural-language search, platform filters, saved searches, and contact availability.
3. **Creators** — the workspace's saved creator roster, lists, owners, notes, tags, and relationship history.
4. **Campaigns** — campaign portfolio, campaign rail, budgets, deliverables, approvals, and creator-level execution.
5. **Inbox** — shared WhatsApp conversations first; email and social messaging can be added through the same model later.
6. **Automations** — trigger/action rules, approval gates, run history, and failures.
7. **Reports** — campaign, creator, channel, team, and client-facing results.
8. **Agents** — optional AI helpers for research, shortlisting, follow-up drafts, operations, and reporting.
9. **Integrations** — social data, WhatsApp, storage, and analytics connections.
10. **Settings** — workspace, members, permissions, fields, pipeline, billing, data, and audit logs.

## Signature interaction: the campaign rail

The campaign rail is the product's defining control surface. It connects the complete creator lifecycle in one horizontal sequence:

`Discovered → Shortlisted → Contacted → Replied → Negotiating → Contracted → Creating → In review → Scheduled → Live → Paid`

Every creator row on the rail shows:

- Creator identity and primary platform.
- Relationship owner.
- Current stage and time in stage.
- Last inbound or outbound message.
- Next action and due date.
- Agreed fee and currency when permitted.
- Deliverable progress.
- Content approval state.
- Live post and current performance once published.

The rail is not a decorative Kanban board. Users can switch between rail, table, calendar, and compact review views without changing the underlying campaign record.

## Feature scope

### 1. Workspace and permissions

- Workspace types: agency, brand, talent team.
- Roles: owner, admin, campaign manager, contributor, reviewer.
- Agency workspaces can contain client accounts; brand workspaces can contain brands or regions.
- Every saved creator, campaign, message, automation run, and approval belongs to one workspace.
- Contact values and commercial fields use role-based permissions.
- Important actions create audit events.

### 2. Creator discovery and profiles

- Search Instagram, TikTok, YouTube, and X creators.
- Filter by platform, category, location, language, audience size, engagement, recent activity, contact availability, audience signals, and saved state.
- Creator profile combines identity, social accounts, audience/performance evidence, contacts, saved lists, relationship history, campaigns, and notes.
- Global creator data remains separate from each workspace's private notes, tags, owners, stages, and contact access.
- Teams can save searches and share shortlists.
- Data freshness and source labels must be visible.

### 3. Creator CRM

- Save a creator directly from discovery.
- Create lists and custom pipeline views.
- Assign owner, stage, tags, priority, next action, and follow-up date.
- Add notes, tasks, files, and activity records.
- Detect duplicates by canonical creator identity and social account.
- Import and export CSV with validation and an error report.

### 4. Campaign operations

- Campaign brief, client/brand, goals, dates, platforms, market, currency, budget, and team.
- Add creators from discovery, lists, CSV, or another campaign.
- Track stage, rate, deliverables, usage rights, exclusivity, due dates, content, approvals, live links, payment status, and owner per creator.
- Internal approval and client/brand review states.
- Campaign dashboard with progress, risks, spending, deliverables, and live performance.
- Reusable campaign templates.

### 5. Shared WhatsApp and inbox

- Connect a business WhatsApp provider through a provider adapter rather than hard-coding one vendor.
- The first adapter should target Meta's official WhatsApp Business platform; confirm current API and policy details immediately before implementation.
- Import approved message templates, display the messaging window state, and require approval where the provider requires a template.
- Send from a shared workspace identity, route replies to one conversation, and assign an owner.
- Record message delivery, read, reply, and failure events.
- Do not send any first-time or bulk outbound message without a clear human confirmation.
- Personal WhatsApp session automation and unofficial scraping are out of scope.

### 6. Automations

- Trigger examples: creator saved, stage changed, reply received, task overdue, content submitted, post live, metric threshold reached.
- Action examples: assign owner, create task, move stage, send approved template, draft a follow-up, notify teammate, request review, add tag.
- Every automation has a test mode, approval policy, run log, failure reason, and pause control.
- Sending, deletion, payment, and contract changes require explicit human gates.

### 7. Social data and reporting

- Connect official APIs for Instagram, TikTok, YouTube, and X where the customer's permissions and each platform's access rules allow it.
- Store timestamped metric snapshots rather than overwriting past values.
- Distinguish creator-provided, platform-provided, estimated, and manually entered data.
- Campaign reports cover output, reach, engagement, views, spend, cost metrics, creator comparisons, and deliverable completion.
- Client links are read-only, expiring, and workspace-controlled.

### 8. AI agents

AI is contextual assistance, not the home screen and not an autonomous decision-maker.

Initial agents:

- **Discovery agent:** turns a brief into suggested filters and a reviewable shortlist.
- **Research agent:** summarizes creator fit using cited profile and campaign data.
- **Campaign operations agent:** identifies overdue work and drafts next actions.
- **Reply assistant:** drafts replies but does not send without the required approval.
- **Reporting agent:** explains campaign results and drafts a client summary from recorded metrics.

Each run shows the input, data used, proposed action, approval state, result, and error history.

## Onboarding

The onboarding flow should create usable workspace state, not collect marketing trivia.

1. **Workspace:** agency, brand, or talent team; workspace name and website.
2. **Goals:** discover creators, manage campaigns, centralize outreach, report results, or all four.
3. **Team:** invite now or skip; choose the user's role.
4. **Channels:** connect social data and WhatsApp now or defer with a clear explanation.
5. **First result:** import creators, start a discovery search, or create a campaign from a template.

The progress indicator reflects real setup completion. The final screen lands on the selected first action with example filters or a campaign shell already prepared.

## Core data model

| Entity | Purpose |
|---|---|
| `workspaces` | Agency/brand/talent tenant and settings |
| `workspaceMembers` | Membership, role, status, and invitation |
| `clients` | Agency client or brand division |
| `creators` | Canonical global creator identity |
| `creatorSocialProfiles` | Platform accounts and current public metrics |
| `contacts` | Role-labelled creator contact points |
| `savedCreators` | Workspace-private creator record, owner, stage, tags, notes |
| `creatorLists` / `creatorListMembers` | Reusable shortlists and segments |
| `campaigns` | Campaign brief, ownership, dates, budget, and status |
| `campaignCreators` | Creator's execution state inside a campaign |
| `deliverables` | Required content, dates, links, and state |
| `approvals` | Internal/client review decisions and history |
| `tasks` | Assigned operational work |
| `channelConnections` | Encrypted provider references and connection state |
| `messageThreads` / `messages` | Shared conversation history and delivery state |
| `messageTemplates` | Provider-approved reusable outreach |
| `automationRules` / `automationRuns` | Trigger/action definitions and audit history |
| `socialMetricSnapshots` | Timestamped platform and manual performance data |
| `activityEvents` | Workspace audit and timeline events |
| `agentDefinitions` / `agentRuns` | AI helper configuration, proposals, approvals, and results |

## Architecture rules

- Keep canonical creator data global and workspace relationship data private.
- Add `workspaceId` to every tenant-owned entity and enforce membership in every query and mutation.
- Replace the growing all-in-one frontend data context with feature-level APIs and hooks.
- Use server-authorized mutations for contact access, messages, stage changes, approvals, and credit changes.
- Treat external providers as adapters so one provider can be replaced without changing campaign or CRM records.
- Store provider secrets only on the server; the browser receives connection status, never raw credentials.
- Use idempotency keys for provider webhooks and outbound sends so retries cannot duplicate actions.
- Record immutable activity events for sensitive changes.
- Use official APIs and visible data-source labels; do not imply access the product does not have.

## Release plan

### Release 1 — Workspace, discovery, CRM, and campaign foundation

A team can create a workspace, discover creators, reveal and save contacts, organize a creator roster, create a campaign, add creators, assign ownership, and move them through the campaign rail.

### Release 2 — Campaign execution

Deliverables, content submissions, approvals, tasks, budget tracking, calendar, and campaign dashboard.

### Release 3 — WhatsApp and shared inbox

Official business connection, approved templates, one-to-one sending, inbound webhooks, ownership, and conversation states.

### Release 4 — Safe automations

Trigger/action rules, approval gates, test mode, run history, retries, and failure recovery.

### Release 5 — Social integrations and reporting

Permissioned platform connections, metric snapshots, campaign attribution, client reports, and exports.

### Release 6 — Contextual agents

Discovery, research, campaign operations, reply drafting, and reporting agents with visible evidence and approval.

## Release 1 acceptance test

In a fresh browser session, an agency user can sign up, create a workspace, invite a teammate, search an Instagram/TikTok/YouTube/X creator, open the creator profile, unlock an available contact, save the creator to a list, create a campaign, add that creator, assign an owner, move the creator from Shortlisted to Contacted, add a next action, and see the complete activity history after reloading. A reviewer can view the campaign but cannot reveal contacts or change commercial fields.

## Explicitly deferred

- Unofficial social scraping or personal WhatsApp automation.
- Payments to creators, contracts, tax forms, and escrow.
- Automatic outbound messaging without a human-controlled policy.
- Marketplace matching between creators and brands.
- Mobile native apps.
- Claims of verified performance where the source is estimated or manually entered.

## Success measures

- Time from signup to first saved creator.
- Searches that produce at least one saved creator.
- Saved creators added to a campaign.
- Campaign creators with an owner and next action.
- Median time spent in each campaign stage.
- Reply rate by channel and template.
- On-time deliverable and approval rate.
- Weekly active workspaces and active campaign managers.

