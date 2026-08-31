import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { isRepositoryEligible } from "./lib/repositoryPolicy";

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
      const candidates = await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", row.normalizedHandle)).collect();
      const existing = candidates.find(creator => creator.platform === "instagram" && creator.handle.toLowerCase() === row.handle.toLowerCase());
      const profileFields = {
        displayName: row.displayName,
        followerCount: row.followerCount,
        location: row.location,
        categories: row.categories,
        primaryCategory: row.categories[0]?.toLowerCase() ?? "",
        categorySearch: row.categories.join(" ").toLowerCase(),
        profileImageUrl: row.profileImageUrl,
        biography: row.biography,
        gender: row.gender,
        age: row.age,
        instagramAccountId: row.instagramAccountId,
        contentLanguages: row.contentLanguages,
        profileType: row.profileType,
        instagramMetrics: row.instagramMetrics,
        isVerified: row.isVerified,
        isDemo: false,
        lastUpdatedAt: now,
      };
      let creatorId = existing?._id;
      if (existing) {
        await ctx.db.patch(existing._id, profileFields);
        creatorsUpdated += 1;
      } else {
        creatorId = await ctx.db.insert("creators", { platform: "instagram", handle: row.handle, normalizedHandle: row.normalizedHandle, ...profileFields, addedToRepositoryAt: now });
        creatorsInserted += 1;
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
        includesContactValues: false,
      };
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

export const clearProcessedBatch = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("creatorImportStaging").withIndex("by_processed", q => q.eq("processed", true)).take(Math.min(args.limit ?? 200, 500));
    await Promise.all(rows.map(row => ctx.db.delete(row._id)));
    return { deleted: rows.length };
  },
});
