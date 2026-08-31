import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { STARTING_CREDIT_BALANCE } from "./lib/creditPolicy";
import { normalize, score } from "./lib/matching";
import { MIN_REPOSITORY_FOLLOWERS } from "./lib/repositoryPolicy";
import { creatorEngagementRatePercent } from "./lib/engagement";

function canonicalProfileUrl(platform: string, handle: string, youtubeChannelId?: string, facebookPageId?: string) {
  const clean = handle.replace(/^@/, "");
  if (platform === "youtube" && youtubeChannelId) return `https://www.youtube.com/channel/${encodeURIComponent(youtubeChannelId)}`;
  if (platform === "youtube") return `https://www.youtube.com/@${encodeURIComponent(clean)}`;
  if (platform === "facebook" && handle.startsWith("@")) return `https://www.facebook.com/${encodeURIComponent(clean)}`;
  if (platform === "facebook" && facebookPageId) return `https://www.facebook.com/profile.php?id=${encodeURIComponent(facebookPageId)}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
  if (platform === "twitter") return `https://x.com/${encodeURIComponent(clean)}`;
  return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
}

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("tiktok"),
  v.literal("youtube"),
  v.literal("twitter"),
);
const engagementRateBasisValidator = v.union(v.literal("followers"), v.literal("views"));

function engagementFields(creator: Doc<"creators">) {
  const rate = creatorEngagementRatePercent(creator);
  return {
    engagementRatePercent: rate?.percent,
    engagementRateBasis: rate?.basis,
  };
}

function creatorLocationParts(creator: Pick<Doc<"creators">, "location" | "country" | "city" | "postalCode">) {
  const parts = creator.location?.split(",").map(part => part.trim()).filter(Boolean) ?? [];
  return {
    country: creator.country ?? (parts.length > 1 ? parts.at(-1) : parts[0]),
    city: creator.city ?? (parts.length > 1 ? parts[0] : undefined),
    postalCode: creator.postalCode,
  };
}

function passesFilters(creator: Doc<"creators">, args: { category?: string; location?: string; country?: string; city?: string; postalCode?: string; verifiedOnly?: boolean; minFollowers?: number; maxFollowers?: number; minEngagementRate?: number; maxEngagementRate?: number; engagementRateBasis?: "followers" | "views" }) {
  const locationParts = creatorLocationParts(creator);
  const engagementRate = creatorEngagementRatePercent(creator);
  if (creator.isDemo) return false;
  if (creator.followerCount < MIN_REPOSITORY_FOLLOWERS) return false;
  if (args.verifiedOnly && !creator.isVerified) return false;
  if (args.location && !creator.location?.toLowerCase().includes(args.location.trim().toLowerCase())) return false;
  if (args.country && locationParts.country?.toLowerCase() !== args.country.trim().toLowerCase()) return false;
  if (args.city && locationParts.city?.toLowerCase() !== args.city.trim().toLowerCase()) return false;
  if (args.postalCode && locationParts.postalCode?.toLowerCase() !== args.postalCode.trim().toLowerCase()) return false;
  if (args.category && !creator.categories?.some(category => category.toLowerCase() === args.category?.toLowerCase())) return false;
  if (args.minFollowers !== undefined && creator.followerCount < args.minFollowers) return false;
  if (args.maxFollowers !== undefined && creator.followerCount >= args.maxFollowers) return false;
  if (args.minEngagementRate !== undefined || args.maxEngagementRate !== undefined) {
    if (engagementRate === undefined || args.engagementRateBasis === undefined || engagementRate.basis !== args.engagementRateBasis) return false;
  }
  if (args.minEngagementRate !== undefined && engagementRate!.percent < args.minEngagementRate) return false;
  if (args.maxEngagementRate !== undefined && engagementRate!.percent >= args.maxEngagementRate) return false;
  return true;
}

const sortFieldValidator = v.union(v.literal("name"), v.literal("audience"), v.literal("location"));
const sortDirectionValidator = v.union(v.literal("asc"), v.literal("desc"));

export const listLocationFacets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { countries: [], cities: [], postalCodes: [] };
    const creators = await ctx.db
      .query("creators")
      .withIndex("by_followers", q => q.gte("followerCount", MIN_REPOSITORY_FOLLOWERS))
      .filter(q => q.eq(q.field("isDemo"), false))
      .order("desc")
      .take(250);
    const locations = creators.map(creatorLocationParts);
    return {
      countries: [...new Set(locations.map(item => item.country).filter((value): value is string => Boolean(value)))].sort(),
      cities: [...new Map(locations.filter(item => item.city).map(item => [`${item.city}:${item.country ?? ""}`, { city: item.city!, country: item.country }])).values()].sort((a, b) => a.city.localeCompare(b.city)),
      postalCodes: [...new Map(locations.filter(item => item.postalCode).map(item => [`${item.postalCode}:${item.city ?? ""}:${item.country ?? ""}`, { postalCode: item.postalCode!, city: item.city, country: item.country }])).values()].sort((a, b) => a.postalCode.localeCompare(b.postalCode)),
    };
  },
});

export const countPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    platform: v.optional(platformValidator),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
    minFollowers: v.optional(v.number()),
    maxFollowers: v.optional(v.number()),
    minEngagementRate: v.optional(v.number()),
    maxEngagementRate: v.optional(v.number()),
    engagementRateBasis: v.optional(engagementRateBasisValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { count: 0, continueCursor: args.paginationOpts.cursor ?? "", isDone: true };

    const category = args.category?.trim().toLowerCase();
    const minFollowers = Math.max(MIN_REPOSITORY_FOLLOWERS, args.minFollowers ?? MIN_REPOSITORY_FOLLOWERS);
    const maxFollowers = args.maxFollowers;
    const engagementActive = args.minEngagementRate !== undefined || args.maxEngagementRate !== undefined;
    const paginationOpts = { cursor: args.paginationOpts.cursor, numItems: Math.min(args.paginationOpts.numItems, 100) };
    const locationSearch = args.postalCode?.trim() || args.city?.trim() || args.country?.trim() || args.location?.trim();
    const result = locationSearch
      ? await ctx.db.query("creators").withSearchIndex("search_location", q => {
          if (args.platform && args.verifiedOnly) return q.search("location", locationSearch).eq("platform", args.platform).eq("isVerified", true);
          if (args.platform) return q.search("location", locationSearch).eq("platform", args.platform);
          if (args.verifiedOnly) return q.search("location", locationSearch).eq("isVerified", true);
          return q.search("location", locationSearch);
        }).paginate(paginationOpts)
      : engagementActive && args.platform
        ? await ctx.db.query("creators").withIndex("by_platform_engagement", q => args.minEngagementRate !== undefined
            ? args.maxEngagementRate !== undefined
              ? q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate).lt("engagementRatePercent", args.maxEngagementRate)
              : q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate)
            : q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).lt("engagementRatePercent", args.maxEngagementRate!))
          .filter(q => q.and(
            q.eq(q.field("isDemo"), false),
            ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
            ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
            q.gte(q.field("followerCount"), minFollowers),
            ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
          )).paginate(paginationOpts)
        : engagementActive
          ? await ctx.db.query("creators").withIndex("by_engagement", q => args.minEngagementRate !== undefined
              ? args.maxEngagementRate !== undefined
                ? q.eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate).lt("engagementRatePercent", args.maxEngagementRate)
                : q.eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate)
              : q.eq("engagementRateBasis", args.engagementRateBasis).lt("engagementRatePercent", args.maxEngagementRate!))
            .filter(q => q.and(
              q.eq(q.field("isDemo"), false),
              ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
              ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
              q.gte(q.field("followerCount"), minFollowers),
              ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
            )).paginate(paginationOpts)
      : category && args.platform && args.verifiedOnly
      ? await ctx.db.query("creators").withIndex("by_platform_category_verified_followers", q => maxFollowers === undefined
          ? q.eq("platform", args.platform!).eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers)
          : q.eq("platform", args.platform!).eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
        .filter(q => q.eq(q.field("isDemo"), false)).paginate(paginationOpts)
      : category && args.platform
        ? await ctx.db.query("creators").withIndex("by_platform_category_followers", q => maxFollowers === undefined
            ? q.eq("platform", args.platform!).eq("primaryCategory", category).gte("followerCount", minFollowers)
            : q.eq("platform", args.platform!).eq("primaryCategory", category).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
          .filter(q => q.and(q.eq(q.field("isDemo"), false), ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []))).paginate(paginationOpts)
        : category && args.verifiedOnly
          ? await ctx.db.query("creators").withIndex("by_category_verified_followers", q => maxFollowers === undefined
              ? q.eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers)
              : q.eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
            .filter(q => q.eq(q.field("isDemo"), false)).paginate(paginationOpts)
          : category
            ? await ctx.db.query("creators").withIndex("by_category_followers", q => maxFollowers === undefined
                ? q.eq("primaryCategory", category).gte("followerCount", minFollowers)
                : q.eq("primaryCategory", category).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
              .filter(q => q.and(q.eq(q.field("isDemo"), false), ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []))).paginate(paginationOpts)
            : args.platform && args.verifiedOnly
              ? await ctx.db.query("creators").withIndex("by_platform_verified_followers", q => maxFollowers === undefined
                  ? q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", minFollowers)
                  : q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                .filter(q => q.eq(q.field("isDemo"), false)).paginate(paginationOpts)
              : args.platform
                ? await ctx.db.query("creators").withIndex("by_platform_followers", q => maxFollowers === undefined
                    ? q.eq("platform", args.platform!).gte("followerCount", minFollowers)
                    : q.eq("platform", args.platform!).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                  .filter(q => q.and(q.eq(q.field("isDemo"), false), ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []))).paginate(paginationOpts)
                : args.verifiedOnly
                  ? await ctx.db.query("creators").withIndex("by_verified_followers", q => maxFollowers === undefined
                      ? q.eq("isVerified", true).gte("followerCount", minFollowers)
                      : q.eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                    .filter(q => q.eq(q.field("isDemo"), false)).paginate(paginationOpts)
                  : await ctx.db.query("creators").withIndex("by_followers", q => maxFollowers === undefined
                      ? q.gte("followerCount", minFollowers)
                      : q.gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                    .filter(q => q.eq(q.field("isDemo"), false)).paginate(paginationOpts);

    return {
      count: result.page.filter(creator => passesFilters(creator, args)).length,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const browsePage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    platform: v.optional(platformValidator),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
    minFollowers: v.optional(v.number()),
    maxFollowers: v.optional(v.number()),
    minEngagementRate: v.optional(v.number()),
    maxEngagementRate: v.optional(v.number()),
    engagementRateBasis: v.optional(engagementRateBasisValidator),
    sortField: v.optional(sortFieldValidator),
    sortDirection: v.optional(sortDirectionValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        page: [],
        continueCursor: args.paginationOpts.cursor ?? "",
        isDone: true,
        totalCount: 0,
      };
    }

    const category = args.category?.trim().toLowerCase();
    const location = args.location?.trim();
    const minFollowers = Math.max(MIN_REPOSITORY_FOLLOWERS, args.minFollowers ?? MIN_REPOSITORY_FOLLOWERS);
    const maxFollowers = args.maxFollowers;
    const engagementActive = args.minEngagementRate !== undefined || args.maxEngagementRate !== undefined;
    const sortField = args.sortField ?? "audience";
    const sortDirection = args.sortDirection ?? (sortField === "audience" ? "desc" : "asc");
    const paginationOpts = {
      cursor: args.paginationOpts.cursor,
      numItems: Math.min(args.paginationOpts.numItems, 24),
    };
    if (args.country?.trim() || args.city?.trim() || args.postalCode?.trim() || engagementActive) {
      const locationSearch = args.postalCode?.trim() || args.city?.trim() || args.country?.trim();
      let scanCursor = args.paginationOpts.cursor;
      let isDone = false;
      const matching: Doc<"creators">[] = [];
      for (let scan = 0; scan < 5 && matching.length < paginationOpts.numItems && !isDone; scan += 1) {
        const candidates = locationSearch
          ? await ctx.db.query("creators").withSearchIndex("search_location", q => {
              if (args.platform && args.verifiedOnly) return q.search("location", locationSearch).eq("platform", args.platform).eq("isVerified", true);
              if (args.platform) return q.search("location", locationSearch).eq("platform", args.platform);
              if (args.verifiedOnly) return q.search("location", locationSearch).eq("isVerified", true);
              return q.search("location", locationSearch);
            }).paginate({ cursor: scanCursor, numItems: paginationOpts.numItems })
          : engagementActive && args.platform
            ? await ctx.db.query("creators").withIndex("by_platform_engagement", q => args.minEngagementRate !== undefined
                ? args.maxEngagementRate !== undefined
                  ? q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate).lt("engagementRatePercent", args.maxEngagementRate)
                  : q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate)
                : q.eq("platform", args.platform!).eq("engagementRateBasis", args.engagementRateBasis).lt("engagementRatePercent", args.maxEngagementRate!))
              .filter(q => q.and(
                q.eq(q.field("isDemo"), false),
                ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
                ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
                q.gte(q.field("followerCount"), minFollowers),
                ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
              )).paginate({ cursor: scanCursor, numItems: paginationOpts.numItems })
            : engagementActive
              ? await ctx.db.query("creators").withIndex("by_engagement", q => args.minEngagementRate !== undefined
                  ? args.maxEngagementRate !== undefined
                    ? q.eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate).lt("engagementRatePercent", args.maxEngagementRate)
                    : q.eq("engagementRateBasis", args.engagementRateBasis).gte("engagementRatePercent", args.minEngagementRate)
                  : q.eq("engagementRateBasis", args.engagementRateBasis).lt("engagementRatePercent", args.maxEngagementRate!))
                .filter(q => q.and(
                  q.eq(q.field("isDemo"), false),
                  ...(args.platform ? [q.eq(q.field("platform"), args.platform)] : []),
                  ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
                  ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
                  q.gte(q.field("followerCount"), minFollowers),
                  ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
                )).paginate({ cursor: scanCursor, numItems: paginationOpts.numItems })
              : await ctx.db
              .query("creators")
              .withIndex("by_followers", q => maxFollowers === undefined
                ? q.gte("followerCount", minFollowers)
                : q.gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
              .filter(q => q.and(
                q.eq(q.field("isDemo"), false),
                ...(args.platform ? [q.eq(q.field("platform"), args.platform)] : []),
                ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
                ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
              ))
              .order(sortField === "audience" ? sortDirection : "desc")
              .paginate({ cursor: scanCursor, numItems: paginationOpts.numItems });
        matching.push(...candidates.page.filter(creator => passesFilters(creator, args)));
        scanCursor = candidates.continueCursor;
        isDone = candidates.isDone;
      }
      matching.sort((left, right) => {
        const comparison = sortField === "name"
          ? left.displayName.localeCompare(right.displayName)
          : sortField === "location"
            ? (left.location ?? "").localeCompare(right.location ?? "")
            : left.followerCount - right.followerCount;
        return comparison * (sortDirection === "asc" ? 1 : -1);
      });
      const page = await Promise.all(matching.map(async creator => {
        const contacts = await ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).take(20);
        const locationParts = creatorLocationParts(creator);
        return {
          id: creator._id, platform: creator.platform, handle: creator.handle, displayName: creator.displayName,
          followerCount: creator.followerCount, ...engagementFields(creator), location: creator.location, ...locationParts, categories: creator.categories,
          isVerified: creator.isVerified, isDemo: creator.isDemo, contentLanguages: creator.contentLanguages,
          profileType: creator.profileType, contentQuality: creator.contentQuality, managementType: creator.managementType,
          profileImageUrl: creator.profileImageUrl, biography: creator.biography, gender: creator.gender, age: creator.age,
          instagramAccountId: creator.instagramAccountId, instagramMetrics: creator.instagramMetrics,
          youtubeChannelId: creator.youtubeChannelId, youtubeMetrics: creator.youtubeMetrics,
          facebookPageId: creator.facebookPageId, facebookMetrics: creator.facebookMetrics,
          sourceLabel: creator.metricProvenance === "apify" ? "Public profile" : "Creatorly database",
          lastUpdatedAt: creator.lastUpdatedAt,
          metricProvenance: creator.metricProvenance ?? "supplied" as const,
          contactCount: contacts.filter(contact => contact.isActive && contact.verificationStatus === "verified").length,
          matchScore: 0,
        };
      }));
      return {
        page,
        continueCursor: scanCursor,
        isDone,
        totalCount: args.paginationOpts.cursor === null && isDone ? matching.length : undefined,
      };
    }
    const result = location && category && args.platform
      ? await ctx.db
          .query("creators")
          .withIndex("by_repository_platform_category_location_followers", (q) => maxFollowers === undefined
            ? q.eq("isDemo", false).eq("platform", args.platform!).eq("primaryCategory", category).eq("location", location).gte("followerCount", minFollowers)
            : q.eq("isDemo", false).eq("platform", args.platform!).eq("primaryCategory", category).eq("location", location).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
          .filter((q) => args.verifiedOnly ? q.eq(q.field("isVerified"), true) : q.eq(q.field("isDemo"), false))
          .order(sortDirection)
          .paginate(paginationOpts)
      : location && category
        ? await ctx.db
            .query("creators")
            .withIndex("by_repository_category_location_followers", (q) => maxFollowers === undefined
              ? q.eq("isDemo", false).eq("primaryCategory", category).eq("location", location).gte("followerCount", minFollowers)
              : q.eq("isDemo", false).eq("primaryCategory", category).eq("location", location).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
            .filter((q) => args.verifiedOnly ? q.eq(q.field("isVerified"), true) : q.eq(q.field("isDemo"), false))
            .order(sortDirection)
            .paginate(paginationOpts)
      : location && args.platform
        ? await ctx.db
            .query("creators")
            .withIndex("by_repository_platform_location_followers", (q) => maxFollowers === undefined
              ? q.eq("isDemo", false).eq("platform", args.platform!).eq("location", location).gte("followerCount", minFollowers)
              : q.eq("isDemo", false).eq("platform", args.platform!).eq("location", location).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
            .filter((q) => args.verifiedOnly ? q.eq(q.field("isVerified"), true) : q.eq(q.field("isDemo"), false))
            .order(sortDirection)
            .paginate(paginationOpts)
      : location
        ? await ctx.db
            .query("creators")
            .withIndex("by_repository_location_followers", (q) => maxFollowers === undefined
              ? q.eq("isDemo", false).eq("location", location).gte("followerCount", minFollowers)
              : q.eq("isDemo", false).eq("location", location).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
            .filter((q) => args.verifiedOnly ? q.eq(q.field("isVerified"), true) : q.eq(q.field("isDemo"), false))
            .order(sortDirection)
            .paginate(paginationOpts)
      : sortField === "name"
      ? await ctx.db
          .query("creators")
          .withIndex("by_repository_name", (q) => q.eq("isDemo", false))
          .filter((q) => q.and(
            ...(args.platform ? [q.eq(q.field("platform"), args.platform)] : []),
            ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
            ...(location ? [q.eq(q.field("location"), location)] : []),
            ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
            q.gte(q.field("followerCount"), minFollowers),
            ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
          ))
          .order(sortDirection)
          .paginate(paginationOpts)
      : sortField === "location"
        ? await ctx.db
            .query("creators")
            .withIndex("by_repository_location", (q) => q.eq("isDemo", false))
            .filter((q) => q.and(
              ...(args.platform ? [q.eq(q.field("platform"), args.platform)] : []),
              ...(category ? [q.eq(q.field("primaryCategory"), category)] : []),
              ...(location ? [q.eq(q.field("location"), location)] : []),
              ...(args.verifiedOnly ? [q.eq(q.field("isVerified"), true)] : []),
              q.gte(q.field("followerCount"), minFollowers),
              ...(maxFollowers === undefined ? [] : [q.lt(q.field("followerCount"), maxFollowers)]),
            ))
            .order(sortDirection)
            .paginate(paginationOpts)
        : category && args.platform
        ? await ctx.db
            .query("creators")
            .withIndex(args.verifiedOnly ? "by_platform_category_verified_followers" : "by_platform_category_followers", (q) => args.verifiedOnly
              ? maxFollowers === undefined
                ? q.eq("platform", args.platform!).eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers)
                : q.eq("platform", args.platform!).eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers)
              : maxFollowers === undefined
                ? q.eq("platform", args.platform!).eq("primaryCategory", category).gte("followerCount", minFollowers)
                : q.eq("platform", args.platform!).eq("primaryCategory", category).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
            .filter((q) => location ? q.and(q.eq(q.field("isDemo"), false), q.eq(q.field("location"), location)) : q.eq(q.field("isDemo"), false))
            .order(sortDirection)
            .paginate(paginationOpts)
        : category
          ? await ctx.db
              .query("creators")
              .withIndex(args.verifiedOnly ? "by_category_verified_followers" : "by_category_followers", (q) => args.verifiedOnly
                ? maxFollowers === undefined
                  ? q.eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers)
                  : q.eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers)
                : maxFollowers === undefined
                  ? q.eq("primaryCategory", category).gte("followerCount", minFollowers)
                  : q.eq("primaryCategory", category).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
              .filter((q) => location ? q.and(q.eq(q.field("isDemo"), false), q.eq(q.field("location"), location)) : q.eq(q.field("isDemo"), false))
              .order(sortDirection)
              .paginate(paginationOpts)
          : args.platform
            ? await ctx.db
                .query("creators")
                .withIndex(args.verifiedOnly ? "by_platform_verified_followers" : "by_platform_followers", (q) => args.verifiedOnly
                  ? maxFollowers === undefined
                    ? q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", minFollowers)
                    : q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers)
                  : maxFollowers === undefined
                    ? q.eq("platform", args.platform!).gte("followerCount", minFollowers)
                    : q.eq("platform", args.platform!).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                .filter((q) => location ? q.and(q.eq(q.field("isDemo"), false), q.eq(q.field("location"), location)) : q.eq(q.field("isDemo"), false))
                .order(sortDirection)
                .paginate(paginationOpts)
            : args.verifiedOnly
              ? await ctx.db
                  .query("creators")
                  .withIndex("by_verified_followers", (q) => maxFollowers === undefined
                    ? q.eq("isVerified", true).gte("followerCount", minFollowers)
                    : q.eq("isVerified", true).gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                  .filter((q) => q.eq(q.field("isDemo"), false))
                  .order(sortDirection)
                  .paginate(paginationOpts)
            : await ctx.db
                .query("creators")
                .withIndex("by_followers", (q) => maxFollowers === undefined
                  ? q.gte("followerCount", minFollowers)
                  : q.gte("followerCount", minFollowers).lt("followerCount", maxFollowers))
                .filter((q) => location ? q.and(q.eq(q.field("isDemo"), false), q.eq(q.field("location"), location)) : q.eq(q.field("isDemo"), false))
                .order(sortDirection)
                .paginate(paginationOpts);

    const page = await Promise.all(result.page.map(async (creator) => {
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
        .take(20);
      return {
        id: creator._id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        ...engagementFields(creator),
        location: creator.location,
        ...creatorLocationParts(creator),
        categories: creator.categories,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
        contentLanguages: creator.contentLanguages,
        profileType: creator.profileType,
        contentQuality: creator.contentQuality,
        managementType: creator.managementType,
        profileImageUrl: creator.profileImageUrl,
        biography: creator.biography,
        gender: creator.gender,
        age: creator.age,
        instagramAccountId: creator.instagramAccountId,
        instagramMetrics: creator.instagramMetrics,
        youtubeChannelId: creator.youtubeChannelId,
        youtubeMetrics: creator.youtubeMetrics,
        facebookPageId: creator.facebookPageId,
        facebookMetrics: creator.facebookMetrics,
        sourceLabel: creator.metricProvenance === "apify" ? "Public profile" : "Creatorly database",
        lastUpdatedAt: creator.lastUpdatedAt,
        metricProvenance: creator.metricProvenance ?? "supplied" as const,
        contactCount: contacts.filter((contact) => contact.isActive && contact.verificationStatus === "verified").length,
        matchScore: 0,
      };
    }));

    return {
      ...result,
      page,
      totalCount: args.paginationOpts.cursor === null && result.isDone ? page.length : undefined,
    };
  },
});

export const search = query({
  args: {
    query: v.string(),
    platform: v.optional(platformValidator),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
    minFollowers: v.optional(v.number()),
    maxFollowers: v.optional(v.number()),
    minEngagementRate: v.optional(v.number()),
    maxEngagementRate: v.optional(v.number()),
    engagementRateBasis: v.optional(engagementRateBasisValidator),
    sortField: v.optional(sortFieldValidator),
    sortDirection: v.optional(sortDirectionValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const searchText = args.query.trim();
    if (!userId || searchText.length === 1) return [];

    let creators: Doc<"creators">[];
    if (searchText.length >= 2) {
      const normalized = normalize(searchText);
      const [exact, handleMatches, nameMatches] = await Promise.all([
        ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", normalized)).collect(),
        ctx.db.query("creators").withSearchIndex("search_normalized_handle", q => args.platform ? q.search("normalizedHandle", normalized).eq("platform", args.platform) : q.search("normalizedHandle", normalized)).take(24),
        ctx.db.query("creators").withSearchIndex("search_display_name", q => args.platform ? q.search("displayName", searchText).eq("platform", args.platform) : q.search("displayName", searchText)).take(24),
      ]);
      creators = [...new Map([...exact, ...handleMatches, ...nameMatches]
        .filter(creator => (!args.platform || creator.platform === args.platform) && passesFilters(creator, args))
        .map(creator => [creator._id.toString(), creator])).values()];
    } else {
      const min = Math.max(MIN_REPOSITORY_FOLLOWERS, args.minFollowers ?? MIN_REPOSITORY_FOLLOWERS);
      const max = args.maxFollowers ?? Number.POSITIVE_INFINITY;
      if (args.category) {
        const term = args.category.toLowerCase();
        if (args.platform && args.verifiedOnly) {
          creators = await ctx.db.query("creators").withIndex("by_platform_category_verified_followers", q => max === Number.POSITIVE_INFINITY
            ? q.eq("platform", args.platform!).eq("primaryCategory", term).eq("isVerified", true).gte("followerCount", min)
            : q.eq("platform", args.platform!).eq("primaryCategory", term).eq("isVerified", true).gte("followerCount", min).lt("followerCount", max)).order("desc").take(250);
        } else if (args.platform) {
          creators = await ctx.db.query("creators").withIndex("by_platform_category_followers", q => max === Number.POSITIVE_INFINITY
            ? q.eq("platform", args.platform!).eq("primaryCategory", term).gte("followerCount", min)
            : q.eq("platform", args.platform!).eq("primaryCategory", term).gte("followerCount", min).lt("followerCount", max)).order("desc").take(250);
        } else if (args.verifiedOnly) {
          creators = await ctx.db.query("creators").withIndex("by_category_verified_followers", q => max === Number.POSITIVE_INFINITY
            ? q.eq("primaryCategory", term).eq("isVerified", true).gte("followerCount", min)
            : q.eq("primaryCategory", term).eq("isVerified", true).gte("followerCount", min).lt("followerCount", max)).order("desc").take(250);
        } else {
          creators = await ctx.db.query("creators").withIndex("by_category_followers", q => max === Number.POSITIVE_INFINITY
            ? q.eq("primaryCategory", term).gte("followerCount", min)
            : q.eq("primaryCategory", term).gte("followerCount", min).lt("followerCount", max)).order("desc").take(250);
        }
      } else if (args.location?.trim()) {
        const term = args.location.trim();
        creators = await ctx.db.query("creators").withSearchIndex("search_location", q => {
          if (args.platform && args.verifiedOnly) return q.search("location", term).eq("platform", args.platform).eq("isVerified", true);
          if (args.platform) return q.search("location", term).eq("platform", args.platform);
          if (args.verifiedOnly) return q.search("location", term).eq("isVerified", true);
          return q.search("location", term);
        }).take(250);
      } else if (args.platform && args.verifiedOnly) {
        creators = await ctx.db.query("creators").withIndex("by_platform_verified_followers", q => max === Number.POSITIVE_INFINITY
          ? q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", min)
          : q.eq("platform", args.platform!).eq("isVerified", true).gte("followerCount", min).lt("followerCount", max)).order("desc").take(30);
      } else if (args.platform) {
        creators = await ctx.db.query("creators").withIndex("by_platform_followers", q => max === Number.POSITIVE_INFINITY
          ? q.eq("platform", args.platform!).gte("followerCount", min)
          : q.eq("platform", args.platform!).gte("followerCount", min).lt("followerCount", max)).order("desc").take(30);
      } else if (args.verifiedOnly) {
        creators = await ctx.db.query("creators").withIndex("by_verified_followers", q => max === Number.POSITIVE_INFINITY
          ? q.eq("isVerified", true).gte("followerCount", min)
          : q.eq("isVerified", true).gte("followerCount", min).lt("followerCount", max)).order("desc").take(30);
      } else {
        creators = await ctx.db.query("creators").withIndex("by_followers", q => max === Number.POSITIVE_INFINITY
          ? q.gte("followerCount", min)
          : q.gte("followerCount", min).lt("followerCount", max)).order("desc").take(30);
      }
      creators = creators.filter(creator => (!args.platform || creator.platform === args.platform) && passesFilters(creator, args)).slice(0, 24);
    }

    const ranked = await Promise.all(
      creators.map(async (creator) => {
        const matchScore = searchText ? score(searchText, creator) : 0;
        if (matchScore === null) return null;
        const contacts = await ctx.db
          .query("contacts")
          .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
          .take(20);
        return {
          id: creator._id,
          platform: creator.platform,
          handle: creator.handle,
          displayName: creator.displayName,
          followerCount: creator.followerCount,
          ...engagementFields(creator),
          location: creator.location,
          ...creatorLocationParts(creator),
          categories: creator.categories,
          isVerified: creator.isVerified,
          isDemo: creator.isDemo,
          contentLanguages: creator.contentLanguages,
          profileType: creator.profileType,
          contentQuality: creator.contentQuality,
          managementType: creator.managementType,
          profileImageUrl: creator.profileImageUrl,
          biography: creator.biography,
          gender: creator.gender,
          age: creator.age,
          instagramAccountId: creator.instagramAccountId,
          instagramMetrics: creator.instagramMetrics,
          youtubeChannelId: creator.youtubeChannelId,
          youtubeMetrics: creator.youtubeMetrics,
          facebookPageId: creator.facebookPageId,
          facebookMetrics: creator.facebookMetrics,
          sourceLabel: creator.metricProvenance === "apify" ? "Public profile" : "Creatorly database",
          lastUpdatedAt: creator.lastUpdatedAt,
          metricProvenance: creator.metricProvenance ?? "supplied" as const,
          contactCount: contacts.filter((contact) => contact.isActive && contact.verificationStatus === "verified").length,
          matchScore,
        };
      }),
    );

    return ranked
      .filter((item) => item !== null)
      .sort((a, b) => {
        if (!args.sortField) return searchText ? b.matchScore - a.matchScore : b.followerCount - a.followerCount;
        const comparison = args.sortField === "name"
          ? a.displayName.localeCompare(b.displayName)
          : args.sortField === "location"
            ? (a.location ?? "").localeCompare(b.location ?? "")
            : a.followerCount - b.followerCount;
        return comparison * ((args.sortDirection ?? "asc") === "asc" ? 1 : -1);
      })
      .slice(0, searchText ? 8 : 24);
  },
});

export const getById = query({
  args: { creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const [user, creator] = await Promise.all([
      ctx.db.get(userId),
      ctx.db.get(args.creatorId),
    ]);
    if (!user || !creator) return null;

    const now = Date.now();
    const [unlocks, socialProfiles] = await Promise.all([ctx.db
      .query("unlockRecords")
      .withIndex("by_user_creator", (q) =>
        q.eq("userId", userId).eq("creatorId", args.creatorId),
      )
      .collect(), ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", args.creatorId)).collect()]);
    const activeUnlock = unlocks
      .filter((unlock) => unlock.expiresAt > now)
      .sort((a, b) => b.expiresAt - a.expiresAt)[0];
    const allContacts = (
      await ctx.db
        .query("contacts")
        .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
        .collect()
    ).filter((contact) => contact.isActive);
    const isPro = user.currentPlanTier === "pro";
    const verifiedContacts = allContacts.filter((contact) => contact.verificationStatus === "verified");
    const permitted = verifiedContacts.filter(
      (contact) => contact.accessTier === "basic" || isPro,
    );
    const pendingContactCount = allContacts.filter((contact) => contact.verificationStatus !== "verified").length;
    const hasOpenableContact = permitted.length > 0;

    return {
      creator: {
        id: creator._id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        ...engagementFields(creator),
        location: creator.location,
        ...creatorLocationParts(creator),
        categories: creator.categories,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
        socialProfiles: socialProfiles.length ? socialProfiles.map(profile => ({
          platform: profile.platform,
          handle: profile.handle,
          url: profile.url,
          followerCount: profile.followerCount,
          isVerified: profile.isVerified,
        })) : [{
          platform: creator.platform,
          handle: creator.handle,
          url: canonicalProfileUrl(creator.platform, creator.handle, creator.youtubeChannelId, creator.facebookPageId),
          followerCount: creator.followerCount,
          isVerified: creator.isVerified,
        }],
        contentLanguages: creator.contentLanguages,
        profileType: creator.profileType,
        contentQuality: creator.contentQuality,
        managementType: creator.managementType,
        profileImageUrl: creator.profileImageUrl,
        biography: creator.biography,
        gender: creator.gender,
        age: creator.age,
        instagramAccountId: creator.instagramAccountId,
        instagramMetrics: creator.instagramMetrics,
        youtubeChannelId: creator.youtubeChannelId,
        youtubeMetrics: creator.youtubeMetrics,
        facebookPageId: creator.facebookPageId,
        facebookMetrics: creator.facebookMetrics,
        sourceLabel: creator.metricProvenance === "apify" ? "Public profile" : "Creatorly database",
        lastUpdatedAt: creator.lastUpdatedAt,
        metricProvenance: creator.metricProvenance ?? "supplied" as const,
      },
      isUnlocked: Boolean(activeUnlock && hasOpenableContact),
      expiresAt: activeUnlock && hasOpenableContact ? activeUnlock.expiresAt : null,
      creditBalance: user.creditBalance ?? STARTING_CREDIT_BALANCE,
      currentPlanTier: user.currentPlanTier ?? "free",
      availableContactCount: permitted.length,
      hiddenProContactCount: verifiedContacts.length - permitted.length,
      pendingContactCount,
      contacts: activeUnlock && hasOpenableContact
        ? permitted.map((contact) => ({
            id: contact._id,
            contactType: contact.contactType,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            whatsapp: contact.whatsapp,
            contextualNotes: contact.contextualNotes,
            verificationStatus: contact.verificationStatus,
            lastVerifiedAt: contact.lastVerifiedAt,
            isDemo: contact.isDemo,
          }))
        : [],
    };
  },
});

export const findByProfile = query({
  args: { platform: platformValidator, handle: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const normalizedHandle = normalize(args.handle);
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_normalized_handle", (q) =>
        q.eq("normalizedHandle", normalizedHandle),
      )
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
    return creator
      ? {
          id: creator._id,
          displayName: creator.displayName,
          handle: creator.handle,
          platform: creator.platform,
        }
      : null;
  },
});
