const DEFAULT_DASHBOARD_URL = "https://my-build-week-project.vercel.app";
const DEFAULT_API_URL = "https://quirky-partridge-485.convex.site";
const content = document.querySelector("#content");
const urlInput = document.querySelector("#dashboard-url");
const keyInput = document.querySelector("#connection-key");
const balance = document.querySelector("#balance");
const workspaceContext = document.querySelector("#workspace-context");
let currentProfile = null;
let currentResult = null;

async function settings() {
  const stored = await chrome.storage.sync.get(["dashboardUrl", "connectionKey"]);
  return {
    dashboardUrl: String(stored.dashboardUrl || DEFAULT_DASHBOARD_URL).replace(/\/$/, ""),
    connectionKey: String(stored.connectionKey || ""),
  };
}

async function openPath(path) {
  const config = await settings();
  await chrome.tabs.create({ url: `${config.dashboardUrl}${path}` });
}

async function openDashboard(profile) {
  const path = profile
    ? `/search?${new URLSearchParams({ q: profile.handle, platform: profile.platform })}`
    : "/search";
  await openPath(path);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function role(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

function initials(value) {
  return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function formatFollowers(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(".0", "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 100_000 ? 0 : 1).replace(".0", "")}K`;
  return new Intl.NumberFormat("en-IN").format(count);
}

async function copy(value, button) {
  await navigator.clipboard.writeText(value);
  button.dataset.copied = "true";
  const originalLabel = button.getAttribute("aria-label");
  button.setAttribute("aria-label", "Copied");
  window.setTimeout(() => {
    delete button.dataset.copied;
    button.setAttribute("aria-label", originalLabel);
  }, 1100);
}

function updateBalance(value) {
  balance.innerHTML = Number.isFinite(value)
    ? `<b>${value}</b><small>credits</small>`
    : `<b>—</b><small>credits</small>`;
}

function updateWorkspaceContext(result) {
  if (!result?.authenticated) {
    workspaceContext.className = "workspace-context is-disconnected";
    workspaceContext.innerHTML = `<span class="workspace-dot"></span><span><small>Active CRM</small><strong>Connect Creatorly</strong></span><b>Not connected</b>`;
    return;
  }
  if (!result.workspace) {
    workspaceContext.className = "workspace-context is-warning";
    workspaceContext.innerHTML = `<span class="workspace-dot"></span><span><small>Active CRM</small><strong>No active workspace</strong></span><button id="choose-workspace">Open dashboard ↗</button>`;
    document.querySelector("#choose-workspace").onclick = () => openPath("/app");
    return;
  }
  workspaceContext.className = "workspace-context";
  workspaceContext.innerHTML = `<span class="workspace-dot"></span><span><small>Active CRM</small><strong>${escapeHtml(result.workspace.name)}</strong></span><b>${escapeHtml(result.workspace.kind)} workspace</b>`;
}

function crmActionHtml(result) {
  const hasWorkspace = Boolean(result.workspace);
  const canSave = Boolean(result.workspace?.canSave);
  const buttonLabel = result.isSaved ? "Already in CRM" : !hasWorkspace ? "Choose a workspace first" : !canSave ? "Read-only workspace" : "Save to active CRM";
  return `<section class="crm-action ${result.isSaved ? "is-saved" : ""}">
    <span class="crm-action-icon">${result.isSaved ? "✓" : "+"}</span>
    <span><small>Workspace record</small><strong>${result.isSaved ? "Saved to this CRM" : "Keep this creator with your team"}</strong><em>${result.isSaved ? escapeHtml(result.workspace?.name || "Active workspace") : "Add stage, owner, notes, and campaign work in Creatorly."}</em></span>
    <button id="crm-save" ${result.isSaved || !hasWorkspace || !canSave ? "disabled" : ""}>${buttonLabel}</button>
  </section>`;
}

function bindCrmSave() {
  const button = document.querySelector("#crm-save");
  if (!button || button.disabled) return;
  button.onclick = () => saveToCrm(false);
}

function creatorCardHtml(result, openState) {
  const creator = result.creator;
  const category = creator.categories?.[0] || "Creator profile";
  const location = creator.location || creator.handle;
  const portrait = creator.profileImageUrl
    ? `<img src="${escapeHtml(creator.profileImageUrl)}" alt="" />`
    : escapeHtml(initials(creator.displayName));
  return `
    <section class="creator-card">
      <div class="creator-cover"><span class="intelligence-label">Creator intelligence</span><span class="source-label">${escapeHtml(creator.platform)} profile</span><i></i><i></i><i></i></div>
      <div class="creator-identity">
        <span class="portrait">${portrait}</span>
        <div class="creator-copy">
          <div class="creator-labels">${creator.isVerified ? `<span class="verified-chip">✓ Verified profile</span>` : `<span>Indexed profile</span>`}</div>
          <h1>${escapeHtml(creator.displayName)}</h1><p>⌖ ${escapeHtml(location)}</p>
        </div>
      </div>
      <div class="creator-chips"><span>${escapeHtml(category)}</span><span>${escapeHtml(creator.categories?.[1] || creator.platform)}</span></div>
      <div class="signal-rail" aria-label="Contact readiness"><span class="done"><i>1</i>Matched</span><b></b><span class="done"><i>2</i>Indexed</span><b></b><span class="${openState ? "done" : "current"}"><i>3</i>${openState ? "Contact open" : "Unlock route"}</span></div>
    </section>`;
}

function metricsHtml(result) {
  const creator = result.creator;
  const contacts = result.availableContactCount + result.hiddenProContactCount;
  return `
    <section class="creator-metrics" aria-label="Creator profile summary">
      <article class="metric"><span class="metric-icon">${creator.platform === "youtube" ? "▶" : "◎"}</span><strong>${formatFollowers(creator.followerCount)}</strong><small>${creator.platform === "youtube" ? "Subscribers" : "Followers"}</small></article>
      <article class="metric"><span class="metric-icon">↗</span><strong>${contacts} ${contacts === 1 ? "contact" : "contacts"}</strong><small>${escapeHtml(creator.categories?.slice(0, 2).join(" · ") || "Contact routes")}</small></article>
    </section>`;
}

const SOCIAL_LABELS = { instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", twitter: "X / Twitter" };
const SOCIAL_ICONS = { instagram: "◎", youtube: "▶", linkedin: "in", twitter: "𝕏" };

function socialsHtml(result) {
  const profiles = result.creator.socialProfiles || [];
  if (!profiles.length) return "";
  return `<section class="dossier-section social-section"><div class="section-heading"><span><small>Audience map</small><h2>Social profiles</h2></span><b>${profiles.length} linked</b></div><div class="social-grid">${profiles.map(profile => `
    <a class="social-card social-${escapeHtml(profile.platform)}" href="${escapeHtml(profile.url)}" target="_blank" rel="noreferrer">
      <span class="social-card-icon">${SOCIAL_ICONS[profile.platform] || "↗"}</span>
      <span><small>${SOCIAL_LABELS[profile.platform] || profile.platform}</small><strong>${Number.isFinite(profile.followerCount) ? formatFollowers(profile.followerCount) : `@${escapeHtml(profile.handle)}`}</strong><em>${Number.isFinite(profile.followerCount) ? profile.platform === "youtube" ? "subscribers" : "followers" : "Open profile"}</em></span>
      <b aria-hidden="true">↗</b>
    </a>`).join("")}</div></section>`;
}

function factsHtml(result) {
  const creator = result.creator;
  const facts = [
    ["Language", creator.contentLanguages?.join(", ") || "Not supplied"],
    ["Primary location", creator.location || "Not supplied"],
    ["Profile type", creator.profileType || "Creator"],
    ["Content quality", creator.contentQuality || "Not rated"],
  ];
  return `<section class="dossier-section facts-section"><div class="section-heading"><span><small>Profile evidence</small><h2>At a glance</h2></span></div><dl class="profile-facts">${facts.map(([label, value], index) => `<div><dt><i>${index + 1}</i>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`;
}

function routeHtml(result) {
  const representative = result.creator.managementType === "talent_managed" || result.contacts?.some(contact => contact.contactType !== "creator_direct");
  return `<section class="management-strip"><span class="route-icon">${representative ? "M" : "D"}</span><span><small>${representative ? "Talent managed" : "Self managed"}</small><strong>${representative ? "Representative route confirmed" : `Direct route to ${escapeHtml(result.creator.displayName)}`}</strong><em>${representative ? "Manager or agent details appear after unlock" : "Official partnership contact when available"}</em></span><b>✓</b></section>`;
}

function renderConnect() {
  content.innerHTML = `<section class="state"><span class="wrong-icon">↗</span><h1>Connect your account</h1><p>Create a connection key in Dashboard → Settings, then paste it below.</p><button class="primary" id="show-settings">Open connection settings</button></section>`;
  document.querySelector("#show-settings").onclick = () => { document.querySelector("details").open = true; };
}

function renderWrongPage() {
  content.innerHTML = `<section class="state"><span class="wrong-icon">⌖</span><h1>Open a creator profile</h1><p>Creatorly follows Instagram, YouTube, LinkedIn, X, and Twitter profile pages while this panel stays open.</p><button class="primary" id="browse">Browse creator discovery</button></section>`;
  document.querySelector("#browse").onclick = () => openDashboard();
  chrome.action.setBadgeText({ text: "" });
}

function renderMissing(profile, result) {
  const hasWorkspace = Boolean(result.workspace);
  const canSave = Boolean(result.workspace?.canSave);
  const label = result.isSaved ? "Already in CRM" : !hasWorkspace ? "Choose a workspace first" : !canSave ? "Read-only workspace" : "Add privately to CRM";
  content.innerHTML = `<section class="state missing-profile"><span class="wrong-icon">+</span><span class="private-chip">Private workspace profile</span><h1>@${escapeHtml(profile.handle)} is not in Creatorly data</h1><p>You can still add this social profile privately to ${escapeHtml(result.workspace?.name || "your CRM")}. It will not change Creatorly's global database.</p><button class="primary ${result.isSaved ? "saved-button" : ""}" id="private-save" ${result.isSaved || !hasWorkspace || !canSave ? "disabled" : ""}>${label}</button><button class="secondary" id="search">Search Creatorly data</button></section>`;
  const privateSave = document.querySelector("#private-save");
  if (!privateSave.disabled) privateSave.onclick = () => saveToCrm(true);
  document.querySelector("#search").onclick = () => openDashboard(profile);
}

function contactsHtml(contacts) {
  return contacts.map(contact => `
    <article class="contact">
      <div class="contact-head"><div><span class="role">${role(contact.contactType)}</span><h3>${escapeHtml(contact.name)}</h3></div><span class="verification">✓ Checked contact</span></div>
      ${contact.whatsapp || contact.phone ? `<div class="contact-actions">${contact.whatsapp ? `<a class="chat-action" href="https://wa.me/${escapeHtml(String(contact.whatsapp).replace(/\D/g, ""))}" target="_blank" rel="noreferrer">Chat on WhatsApp ↗</a>` : ""}${contact.phone ? `<a class="call-action" href="tel:${escapeHtml(contact.phone)}">Call</a>` : ""}</div>` : ""}
      ${contact.email ? `<button class="copy" data-copy="${escapeHtml(contact.email)}" aria-label="Copy email ${escapeHtml(contact.email)}"><small>Email</small><span>${escapeHtml(contact.email)}</span></button>` : ""}
      ${contact.phone ? `<button class="copy" data-copy="${escapeHtml(contact.phone)}" aria-label="Copy phone ${escapeHtml(contact.phone)}"><small>Phone</small><span>${escapeHtml(contact.phone)}</span></button>` : ""}
      ${contact.whatsapp ? `<button class="copy" data-copy="${escapeHtml(contact.whatsapp)}" aria-label="Copy WhatsApp ${escapeHtml(contact.whatsapp)}"><small>WhatsApp</small><span>${escapeHtml(contact.whatsapp)}</span></button>` : ""}
      ${contact.contextualNotes ? `<p>${escapeHtml(contact.contextualNotes)}</p>` : ""}
      <button class="report-contact" data-report-contact="${escapeHtml(contact.id)}">Report wrong contact</button>
    </article>`).join("");
}

function bindCopies() {
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", () => copy(button.dataset.copy, button)));
  document.querySelectorAll("[data-report-contact]").forEach(button => button.addEventListener("click", () => reportContact(button.dataset.reportContact, button)));
}

async function reportContact(contactId, button) {
  button.disabled = true;
  button.textContent = "Reporting…";
  const config = await settings();
  const response = await fetch(`${DEFAULT_API_URL}/extension/report-contact`, { method: "POST", headers: { Authorization: `Bearer ${config.connectionKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ contactId }) });
  button.textContent = response.ok ? "Report received" : "Could not report · try again";
  button.disabled = response.ok;
}

function renderUnlocked(result) {
  const days = Math.max(1, Math.ceil((result.expiresAt - Date.now()) / 86_400_000));
  content.innerHTML = `
    <div class="creator-view">
      ${creatorCardHtml(result, true)}
      ${crmActionHtml(result)}
      ${routeHtml(result)}
      ${socialsHtml(result)}
      <section class="contacts-view">
        <div class="contacts-title"><span><small>Unlocked route</small><h2>Ready for outreach</h2></span><b>${days} days left</b></div>
        <div class="contacts">${contactsHtml(result.contacts)}</div>
      </section>
      ${factsHtml(result)}
      <button class="secondary" id="view">Open full creator profile ↗</button>
    </div>`;
  bindCopies();
  bindCrmSave();
  document.querySelector("#view").onclick = () => openPath(`/creator/${result.creator.id}`);
  chrome.action.setBadgeText({ text: "✓" });
}

function renderLocked(result) {
  const needsPro = result.availableContactCount === 0 && result.hiddenProContactCount > 0;
  const verificationPending = result.availableContactCount === 0 && result.hiddenProContactCount === 0 && result.pendingContactCount > 0;
  const noCredits = result.creditBalance < 5;
  const contacts = result.availableContactCount + result.hiddenProContactCount;
  const buttonLabel = verificationPending ? "Unavailable while verification is in progress" : needsPro ? "Upgrade to Pro" : noCredits ? "Add credits" : "Unlock contact · 5 credits";
  const statusLabel = verificationPending ? "Unavailable" : needsPro ? "Pro required" : noCredits ? "Credits required" : "Ready to unlock";
  const statusClass = verificationPending || needsPro || noCredits ? "warning" : "blue";
  content.innerHTML = `
    <div class="creator-view">
      ${creatorCardHtml(result, false)}
      ${crmActionHtml(result)}
      ${routeHtml(result)}
      ${socialsHtml(result)}
      <section class="access-card">
        <div class="access-heading"><span><small>Next action</small><strong>${needsPro ? "Unlock the representative" : "Open the partnership route"}</strong><em>${verificationPending ? "Imported contact · verification in progress" : `${contacts} verified route${contacts === 1 ? "" : "s"} available for 30 days`}</em></span><span class="status-pill ${statusClass}">${statusLabel}</span></div>
        <div class="button-row"><button class="primary" id="primary">${buttonLabel}</button><button class="secondary icon-action" id="view" aria-label="Open full creator profile">↗</button></div>
      </section>
      ${factsHtml(result)}
    </div>`;
  document.querySelector("#view").onclick = () => openPath(`/creator/${result.creator.id}`);
  bindCrmSave();
  const primary = document.querySelector("#primary");
  primary.disabled = verificationPending;
  primary.onclick = verificationPending ? null : needsPro || noCredits ? () => openPath("/pricing") : unlock;
  chrome.action.setBadgeText({ text: "•" });
}

function renderResult(result, profile) {
  currentResult = result;
  updateBalance(result.creditBalance);
  updateWorkspaceContext(result);
  if (!result.authenticated) return renderConnect();
  if (!result.found) return renderMissing(profile, result);
  if (result.isUnlocked) return renderUnlocked(result);
  renderLocked(result);
}

async function saveToCrm(privateProfile) {
  const button = document.querySelector(privateProfile ? "#private-save" : "#crm-save");
  if (!button || !currentProfile) return;
  button.disabled = true;
  button.textContent = privateProfile ? "Adding privately…" : "Saving…";
  const config = await settings();
  const endpoint = privateProfile ? "/extension/save-private" : "/extension/save";
  const body = privateProfile
    ? { platform: currentProfile.platform, handle: currentProfile.handle }
    : { creatorId: currentResult.creator.id, platform: currentProfile.platform, handle: currentProfile.handle };
  const response = await fetch(`${DEFAULT_API_URL}${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${config.connectionKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) {
    button.disabled = false;
    button.textContent = result.error || "Could not save · try again";
    return;
  }
  await fetchProfile(currentProfile);
}

async function fetchProfile(profile) {
  const config = await settings();
  if (!config.connectionKey) return renderConnect();
  const response = await fetch(`${DEFAULT_API_URL}/extension/profile?${new URLSearchParams({ platform: profile.platform, handle: profile.handle })}`, { headers: { Authorization: `Bearer ${config.connectionKey}` } });
  if (!response.ok) throw new Error("Creatorly could not check this profile.");
  renderResult(await response.json(), profile);
}

async function unlock() {
  const button = document.querySelector("#primary");
  button.disabled = true;
  button.textContent = "Unlocking…";
  const config = await settings();
  const response = await fetch(`${DEFAULT_API_URL}/extension/unlock`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.connectionKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ creatorId: currentResult.creator.id }),
  });
  const result = await response.json();
  if (!response.ok) {
    button.disabled = false;
    button.textContent = result.error || "Try again";
    return;
  }
  await fetchProfile(currentProfile);
}

async function detect() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return renderWrongPage();
  try {
    const profile = await chrome.tabs.sendMessage(tab.id, { type: "CREATORLY_PROFILE" }).catch(() => CreatorlyProfileUrl.detectCreatorProfile(tab.url || ""));
    if (!profile?.handle) return renderWrongPage();
    currentProfile = profile;
    await fetchProfile(profile);
  } catch (error) {
    content.innerHTML = `<section class="state"><span class="wrong-icon">!</span><h1>Could not connect</h1><p>${escapeHtml(error.message)}</p><button class="primary" id="retry">Try again</button></section>`;
    document.querySelector("#retry").onclick = detect;
  }
}

document.querySelector("#open-dashboard").onclick = () => openDashboard();
document.querySelector("#save-url").onclick = async () => {
  const dashboardUrl = urlInput.value.trim().replace(/\/$/, "");
  const connectionKey = keyInput.value.trim();
  if (!/^https?:\/\//.test(dashboardUrl)) return;
  await chrome.storage.sync.set({ dashboardUrl, connectionKey });
  document.querySelector("details").open = false;
  void detect();
};
settings().then(config => { urlInput.value = config.dashboardUrl; keyInput.value = config.connectionKey; });
chrome.runtime.onMessage.addListener(message => {
  if (message?.type !== "CREATORLY_ACTIVE_PROFILE_CHANGED") return;
  if (!message.profile?.handle) return renderWrongPage();
  const nextKey = `${message.profile.platform}:${message.profile.handle.toLowerCase()}`;
  const currentKey = currentProfile ? `${currentProfile.platform}:${currentProfile.handle.toLowerCase()}` : "";
  if (nextKey === currentKey) return;
  currentProfile = message.profile;
  content.innerHTML = `<section class="state detecting"><span class="loader"></span><h1>Loading profile…</h1><p>Updating this side panel without closing it.</p></section>`;
  void fetchProfile(message.profile).catch(error => {
    content.innerHTML = `<section class="state"><span class="wrong-icon">!</span><h1>Could not load profile</h1><p>${escapeHtml(error.message)}</p><button class="primary" id="retry">Try again</button></section>`;
    document.querySelector("#retry").onclick = detect;
  });
});
chrome.tabs.onActivated.addListener(() => void detect());
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => { if (changeInfo.url) void detect(); });
void detect();
