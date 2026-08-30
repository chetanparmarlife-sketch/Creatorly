(function exposeProfileUrl(root) {
  const INSTAGRAM_RESERVED = new Set([
    "accounts", "about", "developer", "direct", "directory", "emails",
    "explore", "legal", "p", "privacy", "reel", "reels", "stories", "web",
  ]);
  const X_RESERVED = new Set([
    "compose", "explore", "home", "i", "intent", "login", "messages",
    "notifications", "search", "settings", "share", "tos",
  ]);

  function canonicalProfileUrl(platform, handle) {
    const clean = String(handle || "").trim().replace(/^@/, "");
    if (!clean) return "";
    if (platform === "instagram") return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
    if (platform === "youtube") return `https://www.youtube.com/@${encodeURIComponent(clean)}`;
    if (platform === "linkedin") return `https://www.linkedin.com/in/${encodeURIComponent(clean)}/`;
    if (platform === "twitter") return `https://x.com/${encodeURIComponent(clean)}`;
    return "";
  }

  function detectCreatorProfile(value) {
    try {
      const url = value instanceof URL ? value : new URL(value);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const parts = url.pathname.split("/").filter(Boolean);
      let platform = "";
      let handle = "";

      if (host === "instagram.com" && parts.length === 1 && !INSTAGRAM_RESERVED.has(parts[0].toLowerCase())) {
        platform = "instagram";
        handle = parts[0];
      } else if (host === "youtube.com" && parts.length === 1 && parts[0].startsWith("@")) {
        platform = "youtube";
        handle = parts[0].slice(1);
      } else if (host === "linkedin.com" && parts.length === 2 && parts[0].toLowerCase() === "in") {
        platform = "linkedin";
        handle = parts[1];
      } else if ((host === "x.com" || host === "twitter.com") && parts.length === 1 && !X_RESERVED.has(parts[0].toLowerCase())) {
        platform = "twitter";
        handle = parts[0];
      }

      if (!platform || !handle) return null;
      handle = decodeURIComponent(handle).replace(/^@/, "");
      return { platform, handle, url: canonicalProfileUrl(platform, handle) };
    } catch {
      return null;
    }
  }

  root.CreatorlyProfileUrl = { canonicalProfileUrl, detectCreatorProfile };
})(typeof self !== "undefined" ? self : globalThis);
