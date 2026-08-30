const { detectCreatorProfile } = CreatorlyProfileUrl;

let lastUrl = window.location.href;

function announceProfile() {
  const profile = detectCreatorProfile(window.location.href);
  chrome.runtime.sendMessage({ type: "CREATORLY_PROFILE_CHANGED", profile }).catch(() => undefined);
}

setInterval(() => {
  if (window.location.href === lastUrl) return;
  lastUrl = window.location.href;
  announceProfile();
}, 700);

document.addEventListener("click", event => {
  const link = event.target.closest?.("a[href]");
  const profile = link ? detectCreatorProfile(link.href) : null;
  if (profile) chrome.runtime.sendMessage({ type: "CREATORLY_PROFILE_CHANGED", profile }).catch(() => undefined);
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CREATORLY_PROFILE") return false;
  sendResponse(detectCreatorProfile(window.location.href));
  return true;
});
