const DEFAULT_DASHBOARD_URL = "https://my-build-week-project.vercel.app";
const DEFAULT_API_URL = "https://effervescent-toucan-379.convex.site";
const content = document.querySelector("#content");
const urlInput = document.querySelector("#dashboard-url");
const keyInput = document.querySelector("#connection-key");
const balance = document.querySelector("#balance");
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
    ? `<i></i><b>${value}</b> credits`
    : `<i></i><b>—</b> credits`;
}

function creatorCardHtml(result, openState) {
  const creator = result.creator;
  const category = creator.categories?.[0] || "Creator profile";
  const location = creator.location || creator.handle;
  return `
    <section class="creator-card">
      <div class="creator-cover" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="creator-identity">
        <span class="portrait" aria-hidden="true">${escapeHtml(initials(creator.displayName))}</span>
        <div class="creator-copy">
          <div class="creator-labels"><span>${escapeHtml(creator.platform)}</span>${creator.isVerified ? `<span class="verified-chip">✓ Verified</span>` : ""}</div>
          <h1>${escapeHtml(creator.displayName)}</h1>
          <p>⌖ ${escapeHtml(location)}</p>
        </div>
      </div>
      <div class="creator-chips"><span>✣ ${escapeHtml(category)}</span><span>✓ ${creator.isVerified ? "Platform verified" : "Profile checked"}</span></div>
      <div class="signal-rail" aria-label="Contact readiness"><span class="done">Matched</span><span class="done">Checked</span><span class="${openState ? "done" : "current"}">${openState ? "Contact open" : "Unlock"}</span></div>
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

function renderConnect() {
  content.innerHTML = `<section class="state"><span class="wrong-icon">↗</span><h1>Connect your account</h1><p>Create a connection key in Dashboard → Settings, then paste it below.</p><button class="primary" id="show-settings">Open connection settings</button></section>`;
  document.querySelector("#show-settings").onclick = () => { document.querySelector("details").open = true; };
}

function renderWrongPage() {
  content.innerHTML = `<section class="state"><span class="wrong-icon">⌖</span><h1>Open a creator profile</h1><p>Visit an Instagram profile or a YouTube @handle page, then open Creatorly again.</p><button class="primary" id="browse">Browse creator discovery</button></section>`;
  document.querySelector("#browse").onclick = () => openDashboard();
  chrome.action.setBadgeText({ text: "" });
}

function renderMissing(profile) {
  content.innerHTML = `<section class="state"><span class="wrong-icon">+</span><h1>Contact not available yet</h1><p>@${escapeHtml(profile.handle)} is not in the Creatorly repository.</p><button class="primary" id="request">Request this contact</button><button class="secondary" id="search">Search dashboard</button></section>`;
  document.querySelector("#request").onclick = () => openPath(`/search?q=${encodeURIComponent(profile.handle)}&platform=${profile.platform}&request=1`);
  document.querySelector("#search").onclick = () => openDashboard(profile);
}

function contactsHtml(contacts) {
  return contacts.map(contact => `
    <article class="contact">
      <div class="contact-head"><div><span class="role">${role(contact.contactType)}</span><h3>${escapeHtml(contact.name)}</h3></div><span class="verification">${contact.verificationStatus === "verified" ? "✓ Verified" : "Pending"}</span></div>
      ${contact.email ? `<button class="copy" data-copy="${escapeHtml(contact.email)}" aria-label="Copy email ${escapeHtml(contact.email)}"><small>Email</small><span>${escapeHtml(contact.email)}</span></button>` : ""}
      ${contact.phone ? `<button class="copy" data-copy="${escapeHtml(contact.phone)}" aria-label="Copy phone ${escapeHtml(contact.phone)}"><small>Phone</small><span>${escapeHtml(contact.phone)}</span></button>` : ""}
      ${contact.whatsapp ? `<button class="copy" data-copy="${escapeHtml(contact.whatsapp)}" aria-label="Copy WhatsApp ${escapeHtml(contact.whatsapp)}"><small>WhatsApp</small><span>${escapeHtml(contact.whatsapp)}</span></button>` : ""}
      ${contact.contextualNotes ? `<p>${escapeHtml(contact.contextualNotes)}</p>` : ""}
    </article>`).join("");
}

function bindCopies() {
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", () => copy(button.dataset.copy, button)));
}

function renderUnlocked(result) {
  const days = Math.max(1, Math.ceil((result.expiresAt - Date.now()) / 86_400_000));
  content.innerHTML = `
    <div class="creator-view">
      ${creatorCardHtml(result, true)}
      ${metricsHtml(result)}
      <section class="contacts-view">
        <div class="contacts-title"><span><small>Contact details</small><h2>Ready for outreach</h2></span><b>${days} days left</b></div>
        <div class="contacts">${contactsHtml(result.contacts)}</div>
      </section>
      <button class="secondary" id="view">Open full creator profile ↗</button>
    </div>`;
  bindCopies();
  document.querySelector("#view").onclick = () => openPath(`/creator/${result.creator.id}`);
  chrome.action.setBadgeText({ text: "✓" });
}

function renderLocked(result) {
  const needsPro = result.availableContactCount === 0 && result.hiddenProContactCount > 0;
  const noCredits = result.creditBalance < 5;
  const contacts = result.availableContactCount + result.hiddenProContactCount;
  const buttonLabel = needsPro ? "Upgrade to Pro" : noCredits ? "Add credits" : "Unlock contact · 5 credits";
  const statusLabel = needsPro ? "Pro required" : noCredits ? "Credits required" : "Ready to unlock";
  const statusClass = needsPro || noCredits ? "warning" : "blue";
  content.innerHTML = `
    <div class="creator-view">
      ${creatorCardHtml(result, false)}
      ${metricsHtml(result)}
      <section class="access-card">
        <div class="access-heading"><span><strong>Contact access</strong><small>${contacts} verified route${contacts === 1 ? "" : "s"} found</small></span><span class="status-pill ${statusClass}">${statusLabel}</span></div>
        <div class="button-row"><button class="primary" id="primary">${buttonLabel}</button><button class="secondary icon-action" id="view" aria-label="Open full creator profile">↗</button></div>
      </section>
    </div>`;
  document.querySelector("#view").onclick = () => openPath(`/creator/${result.creator.id}`);
  document.querySelector("#primary").onclick = needsPro || noCredits ? () => openPath("/pricing") : unlock;
  chrome.action.setBadgeText({ text: "•" });
}

function renderResult(result, profile) {
  currentResult = result;
  updateBalance(result.creditBalance);
  if (!result.authenticated) return renderConnect();
  if (!result.found) return renderMissing(profile);
  if (result.isUnlocked) return renderUnlocked(result);
  renderLocked(result);
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
    const profile = await chrome.tabs.sendMessage(tab.id, { type: "CREATORLY_PROFILE" });
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
void detect();
