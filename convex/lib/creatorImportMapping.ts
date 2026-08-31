export type ImportedPlatform = "instagram" | "youtube";

export type ImportedCreatorRow = {
  platform?: ImportedPlatform;
  displayName?: string;
  followerCount?: number;
  location?: string;
  categories?: string[];
  profileImageUrl?: string;
  biography?: string;
  gender?: string;
  age?: number;
  instagramAccountId?: string;
  instagramMetrics?: Record<string, unknown>;
  youtubeChannelId?: string;
  youtubeMetrics?: Record<string, unknown>;
  contentLanguages?: string[];
  profileType?: string;
  isVerified?: boolean;
};

export function importedPlatform(row: Pick<ImportedCreatorRow, "platform">): ImportedPlatform {
  return row.platform ?? "instagram";
}

export function youtubeChannelUrl(channelId: string) {
  return `https://www.youtube.com/channel/${encodeURIComponent(channelId)}`;
}

export function buildImportedCreatorFields<T extends ImportedCreatorRow>(row: T, now: number) {
  const categories = row.categories ?? [];
  return {
    displayName: row.displayName ?? "YouTube creator",
    followerCount: row.followerCount ?? 0,
    location: row.location,
    categories,
    primaryCategory: categories[0]?.toLowerCase() ?? "",
    categorySearch: categories.join(" ").toLowerCase(),
    profileImageUrl: row.profileImageUrl,
    biography: row.biography,
    gender: row.gender,
    age: row.age,
    instagramAccountId: row.instagramAccountId,
    instagramMetrics: row.instagramMetrics,
    youtubeChannelId: row.youtubeChannelId,
    youtubeMetrics: row.youtubeMetrics,
    contentLanguages: row.contentLanguages,
    profileType: row.profileType,
    isVerified: row.isVerified ?? false,
    isDemo: false,
    lastUpdatedAt: now,
  };
}
