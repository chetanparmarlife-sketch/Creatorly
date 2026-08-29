import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { normalize, score } from "./lib/matching";

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("youtube"),
);

export const search = query({
  args: {
    query: v.string(),
    platform: v.optional(platformValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || args.query.trim().length < 2) return [];

    const creators = args.platform
      ? await ctx.db
          .query("creators")
          .withIndex("by_platform", (q) => q.eq("platform", args.platform!))
          .collect()
      : await ctx.db.query("creators").collect();

    const ranked = await Promise.all(
      creators.map(async (creator) => {
        const matchScore = score(args.query, creator);
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
          isVerified: creator.isVerified,
          isDemo: creator.isDemo,
          contactCount: contacts.filter((contact) => contact.isActive).length,
          matchScore,
        };
      }),
    );

    return ranked
      .filter((item) => item !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);
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
