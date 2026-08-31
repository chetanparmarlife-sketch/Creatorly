import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { buildImportedCreatorFields, facebookPageUrl, importedPlatform, youtubeChannelUrl } from "./lib/creatorImportMapping";
import { isRepositoryEligible } from "./lib/repositoryPolicy";
import { creatorEngagementRatePercent } from "./lib/engagement";

function sameContact(existing: { email?: string; phone?: string; whatsapp?: string }, incoming: { email?: string; phone?: string; whatsapp?: string }) {
  const existingEmail = (existing.email ?? "").trim().toLowerCase();
  const incomingEmail = (incoming.email ?? "").trim().toLowerCase();
  const existingPhone = (existing.phone ?? existing.whatsapp ?? "").replace(/\D/g, "");
  const incomingPhone = (incoming.phone ?? incoming.whatsapp ?? "").replace(/\D/g, "");
  return Boolean((incomingEmail && existingEmail === incomingEmail) || (incomingPhone && existingPhone === incomingPhone));
}

export const ingestBatch = internalMutation({
  args: { limit: v.optional(v.number()), continueInBackground: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 100), 200));
    const rows = await ctx.db.query("creatorImportStaging").withIndex("by_processed", q => q.eq("processed", undefined)).take(limit);
    let creatorsInserted = 0;
    let creatorsUpdated = 0;
    let contactsInserted = 0;
    let skippedBelowMinimum = 0;
    const now = Date.now();
    for (const row of rows) {
      if (!isRepositoryEligible(row.followerCount)) {
        await ctx.db.patch(row._id, { processed: true });
        skippedBelowMinimum += 1;
        continue;
      }
      const creatorPlatform = importedPlatform(row);
      let existing: Doc<"creators"> | null | undefined;
      if (creatorPlatform === "youtube" && row.youtubeChannelId) {
        existing = await ctx.db.query("creators").withIndex("by_youtube_channel_id", q => q.eq("youtubeChannelId", row.youtubeChannelId)).first();
      }
      if (creatorPlatform === "facebook" && row.facebookPageId) {
        existing = await ctx.db.query("creators").withIndex("by_facebook_page_id", q => q.eq("facebookPageId", row.facebookPageId)).first();
      }
      if (!existing) {
        const candidates = await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", row.normalizedHandle)).collect();
        existing = candidates.find(creator => creator.platform === creatorPlatform && creator.handle.toLowerCase() === row.handle.toLowerCase());
      }
      const profileFields = buildImportedCreatorFields(row, now);
      let creatorId = existing?._id;
      if (existing) {
        await ctx.db.patch(existing._id, profileFields);
        creatorsUpdated += 1;
      } else {
        creatorId = await ctx.db.insert("creators", { platform: creatorPlatform, handle: row.handle, normalizedHandle: row.normalizedHandle, ...profileFields, addedToRepositoryAt: now });
        creatorsInserted += 1;
      }
      if (creatorPlatform === "youtube" && row.youtubeChannelId) {
        const socialProfiles = await ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creatorId!)).collect();
        const existingYouTube = socialProfiles.find(profile => profile.platform === "youtube");
        const socialFields = {
          handle: row.handle,
          normalizedHandle: row.normalizedHandle,
          url: row.youtubeUrl ?? youtubeChannelUrl(row.youtubeChannelId),
          followerCount: row.followerCount,
          isVerified: row.isVerified,
        };
        if (existingYouTube) await ctx.db.patch(existingYouTube._id, socialFields);
        else await ctx.db.insert("creatorSocialProfiles", { creatorId: creatorId!, platform: "youtube", ...socialFields });
      }
      if (creatorPlatform === "facebook" && row.facebookPageId) {
        const socialProfiles = await ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creatorId!)).collect();
        const existingFacebook = socialProfiles.find(profile => profile.platform === "facebook");
        const socialFields = {
          handle: row.handle,
          normalizedHandle: row.normalizedHandle,
          url: row.facebookUrl ?? facebookPageUrl(row.facebookPageId, row.handle.startsWith("@") ? row.handle : undefined),
          followerCount: row.followerCount,
          isVerified: row.isVerified,
        };
        if (existingFacebook) await ctx.db.patch(existingFacebook._id, socialFields);
        else await ctx.db.insert("creatorSocialProfiles", { creatorId: creatorId!, platform: "facebook", ...socialFields });
      }
      const existingContacts = row.contacts.length
        ? await ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creatorId!)).collect()
        : [];
      const insertedThisRow: Array<{ email?: string; phone?: string; whatsapp?: string }> = [];
      for (const contact of row.contacts) {
        if (existingContacts.some(item => sameContact(item, contact)) || insertedThisRow.some(item => sameContact(item, contact))) continue;
        const verificationStatus = row.contactVerificationStatus ?? "pending_verification";
        await ctx.db.insert("contacts", {
          creatorId: creatorId!, contactType: "creator_direct", name: row.displayName.startsWith("@") ? `${row.handle} contact` : row.displayName,
          email: contact.email, phone: contact.phone, whatsapp: contact.whatsapp,
          contextualNotes: verificationStatus === "verified"
            ? "Imported contact supplied as valid by the data owner."
            : row.categories.length ? `Categories: ${row.categories.join(", ")}. Imported contact; verification pending.` : "Imported contact; verification pending.",
          verificationStatus, lastVerifiedAt: now, isActive: true, accessTier: "basic", isDemo: false,
        });
        insertedThisRow.push(contact);
        contactsInserted += 1;
      }
      await ctx.db.patch(row._id, { processed: true });
    }
    if (args.continueInBackground && rows.length > 0) {
      await ctx.scheduler.runAfter(0, internal.importCreators.ingestBatch, {
        limit,
        continueInBackground: true,
      });
    }
    return { processed: rows.length, creatorsInserted, creatorsUpdated, contactsInserted, skippedBelowMinimum };
  },
});

export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [pending, processed] = await Promise.all([
      ctx.db.query("creatorImportStaging").withIndex("by_processed", q => q.eq("processed", undefined)).first(),
      ctx.db.query("creatorImportStaging").withIndex("by_processed", q => q.eq("processed", true)).first(),
    ]);
    return { hasPending: Boolean(pending), hasProcessed: Boolean(processed) };
  },
});

export const auditSample = internalQuery({
  args: { handles: v.array(v.string()) },
  handler: async (ctx, args) => {
    return Promise.all(args.handles.slice(0, 10).map(async requestedHandle => {
      const normalized = requestedHandle.trim().toLowerCase();
      const matching = await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", normalized.replace(/[^a-z0-9]/g, "").replace(/^(?:the|real)/, "").replace(/official$/, ""))).collect();
      const creator = matching.find(item => item.handle.toLowerCase() === (normalized.startsWith("@") ? normalized : `@${normalized}`));
      if (!creator) return { handle: requestedHandle, found: false as const };
      const contacts = await ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect();
      return {
        handle: creator.handle,
        found: true as const,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        location: creator.location,
        categories: creator.categories,
        isDemo: creator.isDemo,
        contactCount: contacts.length,
        verificationStatuses: [...new Set(contacts.map(item => item.verificationStatus))],
        hasInstagramMetrics: Boolean(creator.instagramMetrics),
        averageComments: creator.instagramMetrics?.averageComments,
        engagementRatePercent: creator.instagramMetrics?.engagementRatePercent,
        includesContactValues: false,
      };
    }));
  },
});

export const auditYouTubeSample = internalQuery({
  args: { channelIds: v.array(v.string()) },
  handler: async (ctx, args) => Promise.all(args.channelIds.slice(0, 10).map(async channelId => {
    const creator = await ctx.db.query("creators").withIndex("by_youtube_channel_id", q => q.eq("youtubeChannelId", channelId)).first();
    if (!creator || creator.platform !== "youtube") return { channelId, found: false as const };
    const socialProfiles = await ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect();
    return {
      channelId,
      found: true as const,
      creatorId: creator._id,
      handle: creator.handle,
      displayName: creator.displayName,
      subscriberCount: creator.followerCount,
      profileImageUrl: creator.profileImageUrl,
      hasYouTubeMetrics: Boolean(creator.youtubeMetrics),
      audienceRows: creator.youtubeMetrics?.audience?.length ?? 0,
      profileUrl: socialProfiles.find(profile => profile.platform === "youtube")?.url,
      isDemo: creator.isDemo,
    };
  })),
});

export const auditYouTubeDiscovery = internalQuery({
  args: { minSubscribers: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const minSubscribers = Math.max(1_000, args.minSubscribers ?? 1_000);
    const creators = await ctx.db
      .query("creators")
      .withIndex("by_platform_followers", q => q.eq("platform", "youtube").gte("followerCount", minSubscribers))
      .take(20);
    return creators
      .filter(creator => !creator.isDemo)
      .map(creator => ({
        channelId: creator.youtubeChannelId,
        handle: creator.handle,
        subscriberCount: creator.followerCount,
        hasProfileImage: Boolean(creator.profileImageUrl),
        hasYouTubeMetrics: Boolean(creator.youtubeMetrics),
        isDemo: creator.isDemo,
      }));
  },
});

export const auditFacebookSample = internalQuery({
  args: { pageIds: v.array(v.string()) },
  handler: async (ctx, args) => Promise.all(args.pageIds.slice(0, 10).map(async pageId => {
    const creator = await ctx.db.query("creators").withIndex("by_facebook_page_id", q => q.eq("facebookPageId", pageId)).first();
    if (!creator || creator.platform !== "facebook") return { pageId, found: false as const };
    const socialProfiles = await ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect();
    return {
      pageId,
      found: true as const,
      creatorId: creator._id,
      handle: creator.handle,
      displayName: creator.displayName,
      followerCount: creator.followerCount,
      profileImageUrl: creator.profileImageUrl,
      hasStoredProfileImage: Boolean(creator.profileImageStorageId),
      hasFacebookMetrics: Boolean(creator.facebookMetrics),
      audienceRows: creator.facebookMetrics?.audience?.length ?? 0,
      audienceCityRows: creator.facebookMetrics?.audienceCities?.length ?? 0,
      profileUrl: socialProfiles.find(profile => profile.platform === "facebook")?.url,
      isDemo: creator.isDemo,
    };
  })),
});

export const auditFacebookDiscovery = internalQuery({
  args: { minFollowers: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const minFollowers = Math.max(1_000, args.minFollowers ?? 1_000);
    const creators = await ctx.db
      .query("creators")
      .withIndex("by_platform_followers", q => q.eq("platform", "facebook").gte("followerCount", minFollowers))
      .take(20);
    return creators
      .filter(creator => !creator.isDemo)
      .map(creator => ({
        pageId: creator.facebookPageId,
        handle: creator.handle,
        followerCount: creator.followerCount,
        hasProfileImage: Boolean(creator.profileImageUrl),
        hasStoredProfileImage: Boolean(creator.profileImageStorageId),
        hasFacebookMetrics: Boolean(creator.facebookMetrics),
        isDemo: creator.isDemo,
      }));
  },
});

export const auditDiscovery = internalQuery({
  args: {
    category: v.string(),
    minFollowers: v.number(),
    maxFollowers: v.number(),
    location: v.optional(v.string()),
    verifiedOnly: v.boolean(),
  },
  handler: async (ctx, args) => {
    const category = args.category.toLowerCase();
    const candidates = args.verifiedOnly
      ? await ctx.db.query("creators").withIndex("by_platform_category_verified_followers", q => q.eq("platform", "instagram").eq("primaryCategory", category).eq("isVerified", true).gte("followerCount", args.minFollowers).lt("followerCount", args.maxFollowers)).order("desc").take(250)
      : await ctx.db.query("creators").withIndex("by_platform_category_followers", q => q.eq("platform", "instagram").eq("primaryCategory", category).gte("followerCount", args.minFollowers).lt("followerCount", args.maxFollowers)).order("desc").take(250);
    return candidates
      .filter(creator => !args.location || creator.location?.toLowerCase().includes(args.location.toLowerCase()))
      .slice(0, 10)
      .map(creator => ({
        handle: creator.handle,
        displayName: creator.displayName,
        followerCount: creator.followerCount,
        location: creator.location,
        categories: creator.categories,
        isVerified: creator.isVerified,
        includesContactValues: false,
      }));
  },
});

export const backfillPrimaryCategories = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const creators = await ctx.db.query("creators").withIndex("by_primary_category", q => q.eq("primaryCategory", undefined)).take(Math.min(args.limit ?? 200, 500));
    await Promise.all(creators.map(creator => ctx.db.patch(creator._id, { primaryCategory: creator.categories?.[0]?.toLowerCase() ?? "" })));
    return { updated: creators.length };
  },
});

export const backfillEngagementRateBatch = internalMutation({
  args: { limit: v.optional(v.number()), continueInBackground: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 200, 500);
    const creators = await ctx.db.query("creators").withIndex("by_engagement_backfilled", q => q.eq("engagementRateBackfilled", undefined)).take(limit);
    await Promise.all(creators.map(creator => ctx.db.patch(creator._id, {
      engagementRatePercent: creatorEngagementRatePercent(creator),
      engagementRateBackfilled: true,
    })));
    if (args.continueInBackground && creators.length > 0) {
      await ctx.scheduler.runAfter(0, internal.importCreators.backfillEngagementRateBatch, {
        limit,
        continueInBackground: true,
      });
    }
    return { updated: creators.length };
  },
});

export const backfillEngagementRates = internalAction({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    for (let batch = 0; batch < 2_000; batch += 1) {
      const result = await ctx.runMutation(internal.importCreators.backfillEngagementRateBatch, { limit: 200 });
      updated += result.updated;
      if (result.updated === 0) return { updated, complete: true };
    }
    return { updated, complete: false };
  },
});

export const clearProcessedBatch = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("creatorImportStaging").withIndex("by_processed", q => q.eq("processed", true)).take(Math.min(args.limit ?? 200, 500));
    await Promise.all(rows.map(row => ctx.db.delete(row._id)));
    return { deleted: rows.length };
  },
});
