importScripts("profile-url.js");

const API_URL = "https://effervescent-toucan-379.convex.site";
const { detectCreatorProfile } = CreatorlyProfileUrl;

async function enableSidePanel() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
}

async function updateBadge(tabId, url, reportedProfile) {
  const profile = reportedProfile || detectCreatorProfile(url);
  chrome.runtime.sendMessage({ type: "CREATORLY_ACTIVE_PROFILE_CHANGED", tabId, profile }).catch(() => undefined);
  if (!profile) return chrome.action.setBadgeText({ tabId, text: "" });
  const stored = await chrome.storage.sync.get("connectionKey");
  if (!stored.connectionKey) return chrome.action.setBadgeText({ tabId, text: "?" });
  try {
    const params = new URLSearchParams({ platform: profile.platform, handle: profile.handle });
    const response = await fetch(`${API_URL}/extension/profile?${params}`, { headers: { Authorization: `Bearer ${stored.connectionKey}` } });
    const result = await response.json();
    await chrome.action.setBadgeText({ tabId, text: result.isSaved ? "S" : result.found ? result.isUnlocked ? "✓" : "•" : "" });
  } catch {
    await chrome.action.setBadgeText({ tabId, text: "!" });
  }
}

chrome.runtime.onInstalled.addListener(() => void enableSidePanel());
chrome.runtime.onStartup.addListener(() => void enableSidePanel());
void enableSidePanel();

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "CREATORLY_PROFILE_CHANGED" || !sender.tab?.id) return;
  void updateBadge(sender.tab.id, sender.tab.url || "", message.profile);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.url || changeInfo.status === "complete") && tab.url) void updateBadge(tabId, tab.url);
});
chrome.tabs.onActivated.addListener(async info => {
  const tab = await chrome.tabs.get(info.tabId);
  if (tab.url) void updateBadge(info.tabId, tab.url);
});
