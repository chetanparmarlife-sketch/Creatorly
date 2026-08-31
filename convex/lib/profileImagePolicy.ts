const YOUTUBE_IMAGE_SOURCE_HOST = "yt3.ggpht.com";
const FACEBOOK_IMAGE_SOURCE_SUFFIX = ".fbcdn.net";
const INSTAGRAM_IMAGE_SOURCE_SUFFIX = ".cdninstagram.com";
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProfileImageSourceEnvironment = {
  PROFILE_IMAGE_SOURCE_HOST?: string;
  PROFILE_IMAGE_SOURCE_PREFIX?: string;
};

export const MAX_PROFILE_IMAGE_BYTES = 1_048_576;

export function isAllowedProfileImageSource(
  value: string,
  environment: ProfileImageSourceEnvironment = process.env,
) {
  const configuredHost = environment.PROFILE_IMAGE_SOURCE_HOST?.trim();
  const configuredPrefix = environment.PROFILE_IMAGE_SOURCE_PREFIX?.trim();
  if (!configuredHost || !configuredPrefix) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return (url.hostname === configuredHost
        && url.pathname.startsWith(configuredPrefix))
      || (url.hostname === YOUTUBE_IMAGE_SOURCE_HOST
        && url.pathname.length > 1)
      || ((url.hostname.startsWith("scontent-") || url.hostname.startsWith("scontent."))
        && url.hostname.endsWith(FACEBOOK_IMAGE_SOURCE_SUFFIX)
        && url.pathname.length > 1)
      || ((url.hostname.startsWith("scontent-") || url.hostname.startsWith("scontent."))
        && url.hostname.endsWith(INSTAGRAM_IMAGE_SOURCE_SUFFIX)
        && url.pathname.length > 1);
  } catch {
    return false;
  }
}

export function isAllowedProfileImageType(value: string) {
  return PROFILE_IMAGE_TYPES.has(value.split(";", 1)[0].trim().toLowerCase());
}
