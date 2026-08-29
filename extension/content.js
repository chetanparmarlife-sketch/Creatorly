const INSTAGRAM_RESERVED = new Set([
  "accounts", "about", "developer", "direct", "directory", "emails",
  "explore", "legal", "p", "privacy", "reel", "reels", "stories", "web",
]);

function detectCreatorProfile(url) {
  const host = url.hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "instagram.com") {
    const handle = parts[0]?.replace(/^@/, "");
    if (!handle || parts.length > 1 || INSTAGRAM_RESERVED.has(handle.toLowerCase())) {
      return null;
    }
    return { platform: "instagram", handle };
  }

  if (host === "youtube.com") {
    const handle = parts[0];
    if (!handle?.startsWith("@") || parts.length > 1) return null;
    return { platform: "youtube", handle: handle.slice(1) };
  }

  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "CREATORLY_PROFILE") return false;
  sendResponse(detectCreatorProfile(new URL(window.location.href)));
  return true;
});
