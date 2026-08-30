import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { normalize, score } from "./lib/matching";

function canonicalProfileUrl(platform: string, handle: string) {
  const clean = handle.replace(/^@/, "");
  if (platform === "youtube") return `https://www.youtube.com/@${encodeURIComponent(clean)}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
  if (platform === "twitter") return `https://x.com/${encodeURIComponent(clean)}`;
  return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
}

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("youtube"),
  v.literal("twitter"),
);

function passesFilters(creator: Doc<"creators">, args: { category?: string; location?: string; verifiedOnly?: boolean }) {
  if (args.verifiedOnly && !creator.isVerified) return false;
  if (args.location && !creator.location?.toLowerCase().includes(args.location.trim().toLowerCase())) return false;
  if (args.category && !creator.categories?.some(category => category.toLowerCase() === args.category?.toLowerCase())) return false;
  return true;
}

export const browsePage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    platform: v.optional(platformValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        page: [],
        continueCursor: args.paginationOpts.cursor ?? "",
        isDone: true,
      };
    }

    const result = args.platform
      ? await ctx.db
          .query("creators")
          .withIndex("by_platform_followers", (q) => q.eq("platform", args.platform!))
          .filter((q) => q.eq(q.field("isDemo"), false))
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("creators")
          .withIndex("by_followers")
          .filter((q) => q.eq(q.field("isDemo"), false))
          .order("desc")
          .paginate(args.paginationOpts);

    const page = await Promise.all(result.page.map(async (creator) => {
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
        contentLanguages: creator.contentLanguages,
        profileType: creator.profileType,
        contentQuality: creator.contentQuality,
        managementType: creator.managementType,
        contactCount: contacts.filter((contact) => contact.isActive && contact.verificationStatus === "verified").length,
        matchScore: 0,
      };
    }));

    return { ...result, page };
  },
});

export const search = query({
  args: {
    query: v.string(),
    platform: v.optional(platformValidator),
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
      const min = 0;
      const max = Number.POSITIVE_INFINITY;
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
          contactCount: contacts.filter((contact) => contact.isActive && contact.verificationStatus === "verified").length,
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
        location: creator.location,
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
          url: canonicalProfileUrl(creator.platform, creator.handle),
          followerCount: creator.followerCount,
          isVerified: creator.isVerified,
        }],
        contentLanguages: creator.contentLanguages,
        profileType: creator.profileType,
        contentQuality: creator.contentQuality,
        managementType: creator.managementType,
      },
      isUnlocked: Boolean(activeUnlock && hasOpenableContact),
      expiresAt: activeUnlock && hasOpenableContact ? activeUnlock.expiresAt : null,
      creditBalance: user.creditBalance ?? 25,
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
