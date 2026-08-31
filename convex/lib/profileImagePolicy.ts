const INSTAGRAM_IMAGE_SOURCE_HOST = "storage.googleapis.com";
const INSTAGRAM_IMAGE_SOURCE_PREFIX = "/opportune-production.appspot.com/scrapedInstagramInfluencers/";
const YOUTUBE_IMAGE_SOURCE_HOST = "yt3.ggpht.com";
const FACEBOOK_IMAGE_SOURCE_SUFFIX = ".fbcdn.net";
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MAX_PROFILE_IMAGE_BYTES = 1_048_576;

export function isAllowedProfileImageSource(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return (url.hostname === INSTAGRAM_IMAGE_SOURCE_HOST
        && url.pathname.startsWith(INSTAGRAM_IMAGE_SOURCE_PREFIX))
      || (url.hostname === YOUTUBE_IMAGE_SOURCE_HOST
        && url.pathname.length > 1)
      || (url.hostname.startsWith("scontent-")
        && url.hostname.endsWith(FACEBOOK_IMAGE_SOURCE_SUFFIX)
        && url.pathname.length > 1);
  } catch {
    return false;
  }
}

export function isAllowedProfileImageType(value: string) {
  return PROFILE_IMAGE_TYPES.has(value.split(";", 1)[0].trim().toLowerCase());
}
