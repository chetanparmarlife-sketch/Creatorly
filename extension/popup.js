const DEFAULT_DASHBOARD_URL = "https://creatorly-build-week.vercel.app";
const content = document.querySelector("#content");
const urlInput = document.querySelector("#dashboard-url");

async function dashboardUrl() {
  const result = await chrome.storage.sync.get("dashboardUrl");
  return String(result.dashboardUrl || DEFAULT_DASHBOARD_URL).replace(/\/$/, "");
}

async function openDashboard(profile) {
  const base = await dashboardUrl();
  const target = profile
    ? `${base}/search?${new URLSearchParams({ q: profile.handle, platform: profile.platform })}`
    : `${base}/search`;
  await chrome.tabs.create({ url: target });
}

function renderFound(profile) {
  content.innerHTML = `
    <section class="profile-card">
      <span class="platform">${profile.platform} profile detected</span>
      <h1>@${profile.handle}</h1>
      <p>Continue to Creatorly to check the demo contact set and unlock available details.</p>
      <div class="signal">● Handle ready to search</div>
      <button class="primary" id="find-contact">Find this contact</button>
    </section>`;
  document.querySelector("#find-contact").addEventListener("click", () => openDashboard(profile));
}

function renderWrongPage() {
  content.innerHTML = `
    <section class="state">
      <span class="wrong-icon">?</span>
      <h1>Open a creator profile</h1>
      <p>Go to an Instagram profile or a YouTube @handle page, then open Creatorly again.</p>
    </section>`;
}

async function detect() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return renderWrongPage();
  try {
    const profile = await chrome.tabs.sendMessage(tab.id, { type: "CREATORLY_PROFILE" });
    if (profile?.handle) renderFound(profile);
    else renderWrongPage();
  } catch {
    renderWrongPage();
  }
}

document.querySelector("#open-dashboard").addEventListener("click", () => openDashboard());
document.querySelector("#save-url").addEventListener("click", async () => {
  const value = urlInput.value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(value)) return;
  await chrome.storage.sync.set({ dashboardUrl: value });
  document.querySelector("details").open = false;
});

dashboardUrl().then((value) => { urlInput.value = value; });
void detect();
