# Agency and brand operations implementation plan

**Goal:** Complete campaign grouping for agency and brand workspaces without creating separate campaign engines.

## Data boundary

- Keep every client, division, collaborator, and campaign scoped by `workspaceId`.
- Agencies use client records. Brands use internal division records with a type: brand, product line, market, or region.
- Campaigns may belong to one client or one division, never both.
- Reviewer and collaborator assignments belong to a specific client or division.

## Backend

- Extend client records with update timestamps.
- Add brand divisions and group collaborator tables.
- Add `divisionId` to campaigns and validate grouping against workspace type.
- Add list/create group and list/add collaborator functions.
- Return group labels with campaign queries.

## Interface

- Add an agency/brand-specific grouping bar to Campaigns.
- Add group creation and collaborator management in a compact panel.
- Require a group when groups exist; allow unassigned campaigns during migration.
- Filter campaign cards by client or division and show the group on each card.
- Export a scoped CSV report for the selected client or division.

## Verification

- Typecheck and run automated tests.
- Verify agency and brand flows in the browser.
- Upload Convex functions only after user approval.
