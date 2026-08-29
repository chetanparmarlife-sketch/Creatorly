import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { normalize, score } from "./lib/matching";

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("youtube"),
);

const followerBandValidator = v.union(
  v.literal("any"),
  v.literal("not_reported"),
  v.literal("under_1k"),
  v.literal("1k_5k"),
  v.literal("5k_10k"),
);

function followerRange(band: "any" | "not_reported" | "under_1k" | "1k_5k" | "5k_10k" | undefined) {
  if (band === "not_reported") return { min: 0, max: 1 };
  if (band === "under_1k") return { min: 1, max: 1_000 };
  if (band === "1k_5k") return { min: 1_000, max: 5_000 };
  if (band === "5k_10k") return { min: 5_000, max: 10_000 };
  return { min: 0, max: Number.POSITIVE_INFINITY };
}

function passesFilters(creator: Doc<"creators">, args: { category?: string; location?: string; verifiedOnly?: boolean; followerBand?: "any" | "not_reported" | "under_1k" | "1k_5k" | "5k_10k" }) {
  const { min, max } = followerRange(args.followerBand);
  if (creator.followerCount < min || creator.followerCount >= max) return false;
  if (args.verifiedOnly && !creator.isVerified) return false;
  if (args.location && !creator.location?.toLowerCase().includes(args.location.trim().toLowerCase())) return false;
  if (args.category && !creator.categories?.some(category => category.toLowerCase() === args.category?.toLowerCase())) return false;
  return true;
}

export const search = query({
  args: {
    query: v.string(),
    platform: v.optional(platformValidator),
    followerBand: v.optional(followerBandValidator),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
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
      const { min, max } = followerRange(args.followerBand);
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
      creators = creators.filter(creator => !creator.isDemo && (!args.platform || creator.platform === args.platform) && passesFilters(creator, args)).slice(0, 24);
    }

    const ranked = await Promise.all(
      creators.map(async (creator) => {
        const matchScore = searchText ? score(searchText, creator) : 0;
        if (matchScore === null) return null;
        const contacts = await ctx.db
          .query("contacts")
          .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
          .collect();
        return {
          id: creator._id,
          platform: creator.platform,
          handle: creator.handle,
          displayName: creator.displayName,
          followerCount: creator.followerCount,
          location: creator.location,
          categories: creator.categories,
          isVerified: creator.isVerified,
          isDemo: creator.isDemo,
          contactCount: contacts.filter((contact) => contact.isActive).length,
          matchScore,
        };
      }),
    );

    return ranked
      .filter((item) => item !== null)
      .sort((a, b) => searchText ? b.matchScore - a.matchScore : b.followerCount - a.followerCount)
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
    const unlocks = await ctx.db
      .query("unlockRecords")
      .withIndex("by_user_creator", (q) =>
        q.eq("userId", userId).eq("creatorId", args.creatorId),
      )
      .collect();
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
    const permitted = allContacts.filter(
      (contact) => contact.accessTier === "basic" || isPro,
    );

    return {
      creator: {
        id: creator._id,
        platform: creator.platform,
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        location: creator.location,
        categories: creator.categories,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
      },
      isUnlocked: Boolean(activeUnlock),
      expiresAt: activeUnlock?.expiresAt ?? null,
      creditBalance: user.creditBalance ?? 25,
      currentPlanTier: user.currentPlanTier ?? "free",
      availableContactCount: permitted.length,
      hiddenProContactCount: allContacts.length - permitted.length,
      contacts: activeUnlock
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
