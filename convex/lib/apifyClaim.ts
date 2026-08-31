export type ClaimEnrichmentResult = {
  displayName?: string;
  biography?: string;
  categories?: string[];
  country?: string;
  city?: string;
  websiteUrl?: string;
  businessEmail?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  engagementRatePercent?: number;
  profileImageUrl?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  isBusinessAccount?: boolean;
};

type ApifyPost = { likesCount?: unknown; commentsCount?: unknown };
type ApifyProfile = {
  username?: unknown;
  fullName?: unknown;
  biography?: unknown;
  followersCount?: unknown;
  followsCount?: unknown;
  postsCount?: unknown;
  businessCategoryName?: unknown;
  externalUrl?: unknown;
  businessEmail?: unknown;
  profilePicUrl?: unknown;
  profilePicUrlHD?: unknown;
  verified?: unknown;
  private?: unknown;
  isBusinessAccount?: unknown;
  locationName?: unknown;
  about?: { country?: unknown };
  latestPosts?: ApifyPost[];
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
}

export function mapApifyClaimProfile(payload: unknown, expectedHandle: string): ClaimEnrichmentResult {
  if (!Array.isArray(payload) || payload.length === 0) throw new Error("Apify returned no Instagram profile.");
  const expected = expectedHandle.replace(/^@/, "").toLowerCase();
  const profile = payload.find(item => text((item as ApifyProfile)?.username)?.toLowerCase() === expected) as ApifyProfile | undefined;
  if (!profile) throw new Error("Apify returned a different Instagram profile.");
  const followerCount = count(profile.followersCount);
  const posts = Array.isArray(profile.latestPosts) ? profile.latestPosts : [];
  const interactions = posts.map(post => (count(post.likesCount) ?? 0) + (count(post.commentsCount) ?? 0)).filter(value => value > 0);
  const engagementRatePercent = followerCount && interactions.length
    ? Math.round((interactions.reduce((sum, value) => sum + value, 0) / interactions.length / followerCount) * 10_000) / 100
    : undefined;
  const category = text(profile.businessCategoryName);
  return {
    displayName: text(profile.fullName),
    biography: text(profile.biography),
    categories: category ? [category] : undefined,
    country: text(profile.about?.country),
    city: text(profile.locationName),
    websiteUrl: text(profile.externalUrl),
    businessEmail: text(profile.businessEmail)?.toLowerCase(),
    followerCount,
    followingCount: count(profile.followsCount),
    postCount: count(profile.postsCount),
    engagementRatePercent,
    profileImageUrl: text(profile.profilePicUrlHD) ?? text(profile.profilePicUrl),
    isVerified: typeof profile.verified === "boolean" ? profile.verified : undefined,
    isPrivate: typeof profile.private === "boolean" ? profile.private : undefined,
    isBusinessAccount: typeof profile.isBusinessAccount === "boolean" ? profile.isBusinessAccount : undefined,
  };
}

export function biographyContainsVerificationCode(biography: string | undefined, verificationCode: string) {
  return Boolean(biography?.toLocaleUpperCase().includes(verificationCode.trim().toLocaleUpperCase()));
}
