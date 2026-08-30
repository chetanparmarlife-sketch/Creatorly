# Creator Side Panel and Social Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the extension popup with a persistent creator-profile side panel that follows supported profile navigation and shows every stored social profile through a real, clickable URL.

**Architecture:** A shared extension URL parser recognizes Instagram, YouTube, LinkedIn, X, and Twitter profile URLs. Chrome's Side Panel API keeps one panel open while the active tab changes; the content script reports in-page URL changes and the panel fetches the matching Creatorly profile. Creator records retain their current primary platform fields for compatibility and gain optional structured social profiles and profile facts, which the dashboard and extension render consistently.

**Tech Stack:** Chrome Manifest V3 Side Panel API, plain JavaScript/HTML/CSS extension, React 19, TypeScript, Convex.

**Spec:** User brief and reference screenshot supplied on 2026-08-30 at `/var/folders/l8/8hr6_6913pggyk6bvf0n279w0000gn/T/codex-clipboard-dbbb8d05-3d46-4db3-861c-7977e8a7aae6.png`.

## Global Constraints

- The browser action opens the side panel; it does not open a popup.
- Chrome 114 is the minimum supported version because `chrome.sidePanel` was introduced there.
- Supported creator URLs are Instagram profiles, YouTube `@handle` channels, LinkedIn `/in/` profiles, and X/Twitter profiles.
- Social actions use complete `https://` URLs and open the external profile in a new tab.
- Never label a representative contact as creator-direct; show manager, agent, assistant, or PR representative roles accurately.
- Existing creator data remains valid while new profile facts stay optional.

---

### Task 1: Shared profile URL detection

**Files:**
- Create: `extension/profile-url.js`
- Create: `extension/profile-url.node.mjs`
- Modify: `extension/content.js`
- Modify: `extension/background.js`

**Interfaces:**
- Produces: `CreatorlyProfileUrl.detectCreatorProfile(value)` returning `{ platform, handle, url } | null`.
- Produces: `CreatorlyProfileUrl.canonicalProfileUrl(platform, handle)` returning a complete HTTPS URL.

- [ ] **Step 1: Write parser cases for supported and reserved URLs.**
- [ ] **Step 2: Run `node --test extension/profile-url.node.mjs` and confirm failure.**
- [ ] **Step 3: Implement the parser and use it in content/background scripts.**
- [ ] **Step 4: Re-run the parser test and confirm it passes.**

### Task 2: Persistent Chrome side panel

**Files:**
- Modify: `extension/manifest.json`
- Create: `extension/sidepanel.html`
- Create: `extension/sidepanel.js`
- Modify: `extension/popup.css`
- Modify: `extension/background.js`

**Interfaces:**
- Consumes: `CreatorlyProfileUrl.detectCreatorProfile` from Task 1.
- Produces: action-click side panel behavior and `CREATORLY_ACTIVE_PROFILE_CHANGED` messages.

- [ ] **Step 1: Replace `action.default_popup` with `side_panel.default_path` and add the `sidePanel` permission.**
- [ ] **Step 2: Enable `openPanelOnActionClick` during install/startup.**
- [ ] **Step 3: Build the scrollable creator dossier and listen for active-tab/profile changes.**
- [ ] **Step 4: Confirm the manifest parses and all extension JavaScript passes `node --check`.**

### Task 3: Creator profile data and real social links

**Files:**
- Modify: `src/types.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/creators.ts`
- Modify: `convex/extensionApi.ts`
- Modify: `src/lib/demoData.ts`

**Interfaces:**
- Produces: `SocialProfile` with `platform`, `handle`, `url`, optional follower count and verification.
- Produces: optional creator facts `contentLanguages`, `profileType`, `contentQuality`, and `managementType`.

- [ ] **Step 1: Extend platform and creator types without breaking current records.**
- [ ] **Step 2: Add optional schema fields with URL-bearing social profile objects.**
- [ ] **Step 3: Return complete social profiles and management facts from dashboard and extension queries.**
- [ ] **Step 4: Add representative social/profile data to demo creators.**

### Task 4: Dashboard creator dossier

**Files:**
- Modify: `src/components/CreatorDetail.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `CreatorDetailData.creator.socialProfiles` and optional creator facts from Task 3.
- Produces: clickable social cards, content language, location, profile type, content quality, and truthful manager fallback copy.

- [ ] **Step 1: Render each available social account as an external link with its follower/subscriber count.**
- [ ] **Step 2: Render the reference profile facts using stored values or clear unavailable labels.**
- [ ] **Step 3: Change contact copy based on direct versus representative contacts.**
- [ ] **Step 4: Verify desktop and narrow layouts through existing integration tests and a production build.**

### Task 5: Verification and extension guidance

**Files:**
- Modify: `extension/README.md`

**Interfaces:**
- Documents: installation, one-click side-panel behavior, supported profile sites, and connection setup.

- [ ] **Step 1: Document the side-panel workflow and Chrome version requirement.**
- [ ] **Step 2: Run `node --test extension/profile-url.node.mjs`.**
- [ ] **Step 3: Run `npm run test:run`, `npm run lint`, and `npm run build`.**
- [ ] **Step 4: Inspect the side panel in Chrome if an interactive browser is available; otherwise report that manual browser loading remains.**
