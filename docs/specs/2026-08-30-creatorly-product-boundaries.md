# Creatorly Product Boundaries

**Status:** Approved direction for the next core-product phase  
**Date:** 2026-08-30

## Product definition

Creatorly is a creator discovery and campaign workspace for agencies and brands.

The core product is:

1. **Creatorly Discovery** — Creatorly's own searchable creator and contact repository.
2. **Browser Extension** — Creatorly discovery and contact access on supported social profiles.
3. **Private Creator CRM** — each workspace's saved and uploaded creators, contacts, notes, owners, stages, lists, and activity.
4. **Campaign Workspace** — campaign rosters, stages, tasks, deliverables, approvals, fees, and results.

AI agents, the shared inbox, WhatsApp sending, and automations are later add-ons. They may use core-product records, but they are not the product's current home screen and must not be presented as live before they are built.

## Data ownership

### Creatorly-owned data

Creatorly owns and maintains the canonical discovery repository:

- Creator identity and canonical social profiles.
- Public profile facts and timestamped public metrics.
- Creatorly-sourced business contacts and verification state.
- Repository source, freshness, and evidence metadata.
- Contact unlock eligibility and credit pricing.

This data is global. An agency or brand can search it, unlock permitted contacts, and save a reference into its workspace, but cannot overwrite the canonical repository.

### Workspace-owned data

Each agency or brand owns its private operating data:

- Creators saved from Creatorly Discovery.
- Creators uploaded by CSV or added manually.
- Private contacts uploaded or entered by the workspace.
- Lists, tags, notes, owner, priority, relationship stage, and next action.
- Campaigns, campaign creator state, fees, tasks, deliverables, approvals, and activity.
- Future messages, inbox threads, automations, and agent runs.

Workspace data must always include `workspaceId` and must never be returned without membership authorization.

## Creator identity model

A CRM creator is not always a Creatorly repository creator.

- A discovered creator has a `repositoryCreatorId` and displays a **Creatorly data** source label.
- An uploaded creator belongs only to one workspace and displays an **Uploaded by your team** source label.
- A manually entered creator belongs only to one workspace and displays a **Added manually** source label.
- If an uploaded social profile matches the canonical repository, Creatorly proposes a link. It never merges private data into the global repository automatically.
- Private notes and contacts remain private even after a repository link is accepted.

## Core product journeys

### Discovery to CRM

1. Search Creatorly's repository.
2. Open a canonical creator profile and review source/freshness labels.
3. Unlock an eligible Creatorly contact when needed.
4. Save the creator to the active workspace.
5. Add workspace-private owner, stage, tags, notes, and next action.

### Upload to CRM

1. Upload a CSV or choose manual entry.
2. Map creator, platform, handle, contact, and CRM fields.
3. Validate rows and show duplicate or error results before import.
4. Create workspace-private CRM records.
5. Propose canonical repository links when platform identity matches.
6. Export an import report without exposing another workspace's data.

### Extension to CRM

1. Open the extension on a supported creator profile.
2. Match the profile against Creatorly Discovery.
3. Show repository availability, source, and contact state.
4. Unlock permitted Creatorly contacts.
5. Save the profile to the active workspace CRM, or add it privately when no repository match exists.

## Agency and brand modes

Agency and brand workspaces share the same discovery, CRM, extension, and campaign engine. The difference is how work is grouped and reviewed.

### Agency workspace

- Groups work by client.
- Campaigns may belong to a client.
- Team members can work across several clients.
- Client-facing review and reporting are read-only and scoped to that client.
- Default language: client, campaign manager, client review.

### Brand workspace

- Groups work by brand, product line, market, or region.
- Campaigns may belong to one of those internal divisions.
- Reviewers are internal stakeholders or approved agency collaborators.
- Default language: brand, campaign owner, stakeholder review.

Workspace kind must be persisted during onboarding. The application must not silently create every workspace as `agency`.

## Packaging

### Core product

- Creatorly Discovery.
- Contact availability and unlocks.
- Chrome extension.
- Private CRM with save, CSV import/export, and manual creator entry.
- Lists and relationship management.
- Campaign execution already present in the repository.

### Later add-ons

- **Shared Inbox add-on:** official WhatsApp Business first, then other approved channels.
- **AI Agents add-on:** discovery assistance, research summaries, operations proposals, reply drafts, and reporting narratives.
- **Automation add-on:** approved trigger/action rules with run history and human gates.
- **Reporting/Data add-on:** connected social metrics, snapshots, attribution, and client links.

## Current-code findings

- `creators`, `creatorSocialProfiles`, and `contacts` are already global, which is correct for Creatorly Discovery.
- `savedCreators`, campaigns, tasks, deliverables, approvals, and activity already use `workspaceId`, which is the correct private boundary.
- `savedCreators.creatorId` is required, so uploaded or manual-only CRM creators cannot exist yet.
- The extension is user-token scoped and can match, unlock, reveal, and report contacts, but cannot save a creator to an active workspace.
- Onboarding collects workspace kind, name, role, goals, and invite values but does not persist them. `ensureWorkspace` currently defaults every new workspace to `agency`.
- The `clients` table exists, but there is no completed client/division API or user interface.
- Inbox, automations, reports, agents, and integrations are correctly disabled in product navigation, but the landing page incorrectly presents AI agents as live core functionality.
- The project has two discovery interfaces: legacy `/search` and workspace `/app/discover`. The core product should converge on the workspace route.

## Non-negotiable rules

- Never label workspace uploads as Creatorly repository data.
- Never let workspace edits overwrite canonical Creatorly creator or contact records.
- Never expose one workspace's private creators, contacts, notes, campaigns, or messages to another workspace.
- Never imply AI agents, inbox sending, social synchronization, or verification is live when it is planned.
- Always show source and freshness for Creatorly data and origin for workspace data.
- Use official provider APIs for future inbox and social connections.

## Acceptance outcome for the next phase

An agency or brand can complete onboarding with the correct workspace type, search Creatorly's repository, save a discovered creator, upload a private creator CSV, manually add a creator, see source labels in one CRM, resolve or keep proposed repository matches, and save a supported social profile from the extension into the active workspace. A user from another workspace cannot read any uploaded record. The landing page describes this shipped core honestly and labels AI agents and inbox as add-ons coming later.
