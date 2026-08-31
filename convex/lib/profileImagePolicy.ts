const PROFILE_IMAGE_SOURCE_HOST = "storage.googleapis.com";
const PROFILE_IMAGE_SOURCE_PREFIX = "/opportune-production.appspot.com/scrapedInstagramInfluencers/";
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MAX_PROFILE_IMAGE_BYTES = 1_048_576;

export function isAllowedProfileImageSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === PROFILE_IMAGE_SOURCE_HOST
      && url.pathname.startsWith(PROFILE_IMAGE_SOURCE_PREFIX);
  } catch {
    return false;
  }
}

export function isAllowedProfileImageType(value: string) {
  return PROFILE_IMAGE_TYPES.has(value.split(";", 1)[0].trim().toLowerCase());
}
