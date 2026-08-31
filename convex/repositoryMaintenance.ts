import { makeFunctionReference, paginationOptsValidator, type FunctionReference } from "convex/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { MIN_REPOSITORY_FOLLOWERS } from "./lib/repositoryPolicy";

type CleanupBatchResult = { creatorsDeleted: number; contactsDeleted: number; unlocksDeleted: number; savedSnapshotsPreserved: number; hasMore: boolean };
const removeBatchRef = makeFunctionReference<"mutation">("repositoryMaintenance:removeBelowMinimumBatch") as unknown as FunctionReference<"mutation", "internal", Record<string, never>, CleanupBatchResult>;
type CreatorStatsPage = { continueCursor: string; isDone: boolean; creatorCount: number; minimumStoredFollowerCount: number | null; maximumStoredFollowerCount: number | null };
type ContactStatsPage = { continueCursor: string; isDone: boolean; contactCount: number };
const creatorStatsPageRef = makeFunctionReference<"query">("repositoryMaintenance:auditCreatorStatsPage") as unknown as FunctionReference<"query", "internal", { paginationOpts: { cursor: string | null; numItems: number } }, CreatorStatsPage>;
const contactStatsPageRef = makeFunctionReference<"query">("repositoryMaintenance:auditContactStatsPage") as unknown as FunctionReference<"query", "internal", { paginationOpts: { cursor: string | null; numItems: number } }, ContactStatsPage>;

export const auditBelowMinimum = internalQuery({
  args: {},
  handler: async (ctx) => {
    const creators = await ctx.db
      .query("creators")
      .withIndex("by_followers", q => q.lt("followerCount", MIN_REPOSITORY_FOLLOWERS))
      .collect();
    const repositoryCreators = creators.filter(creator => !creator.isDemo);
    return {
      minimumFollowers: MIN_REPOSITORY_FOLLOWERS,
      creatorCount: repositoryCreators.length,
      sample: repositoryCreators.slice(0, 10).map(creator => ({ id: creator._id, handle: creator.handle, followerCount: creator.followerCount })),
    };
  },
});

export const auditCreatorStatsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("creators").paginate(args.paginationOpts);
    const repositoryCreators = page.page.filter(creator => !creator.isDemo);
    const followerCounts = repositoryCreators.map(creator => creator.followerCount);
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      creatorCount: repositoryCreators.length,
      minimumStoredFollowerCount: followerCounts.length ? Math.min(...followerCounts) : null,
      maximumStoredFollowerCount: followerCounts.length ? Math.max(...followerCounts) : null,
    };
  },
});

export const auditContactStatsPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("contacts").paginate(args.paginationOpts);
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      contactCount: page.page.filter(contact => !contact.isDemo).length,
    };
  },
});

export const auditRepositoryStats = internalAction({
  args: {},
  handler: async (ctx) => {
    let creatorCursor: string | null = null;
    let contactCursor: string | null = null;
    let creatorCount = 0;
    let contactCount = 0;
    let minimumStoredFollowerCount: number | null = null;
    let maximumStoredFollowerCount: number | null = null;
    do {
      const page: CreatorStatsPage = await ctx.runQuery(creatorStatsPageRef, { paginationOpts: { cursor: creatorCursor, numItems: 1000 } });
      creatorCount += page.creatorCount;
      if (page.minimumStoredFollowerCount !== null) minimumStoredFollowerCount = minimumStoredFollowerCount === null ? page.minimumStoredFollowerCount : Math.min(minimumStoredFollowerCount, page.minimumStoredFollowerCount);
      if (page.maximumStoredFollowerCount !== null) maximumStoredFollowerCount = maximumStoredFollowerCount === null ? page.maximumStoredFollowerCount : Math.max(maximumStoredFollowerCount, page.maximumStoredFollowerCount);
      creatorCursor = page.isDone ? null : page.continueCursor;
    } while (creatorCursor);
    do {
      const page: ContactStatsPage = await ctx.runQuery(contactStatsPageRef, { paginationOpts: { cursor: contactCursor, numItems: 1000 } });
      contactCount += page.contactCount;
      contactCursor = page.isDone ? null : page.continueCursor;
    } while (contactCursor);
    return { minimumFollowers: MIN_REPOSITORY_FOLLOWERS, creatorCount, contactCount, minimumStoredFollowerCount, maximumStoredFollowerCount };
  },
});

export const removeBelowMinimumBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const candidates = await ctx.db
      .query("creators")
      .withIndex("by_followers", q => q.lt("followerCount", MIN_REPOSITORY_FOLLOWERS))
      .take(25);
    const creators = candidates.filter(creator => !creator.isDemo);
    let contactsDeleted = 0;
    let unlocksDeleted = 0;
    let savedSnapshotsPreserved = 0;

    for (const creator of creators) {
      const [profiles, contacts, unlocks, savedCreators, requests] = await Promise.all([
        ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
        ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
        ctx.db.query("unlockRecords").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
        ctx.db.query("savedCreators").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
        ctx.db.query("contactRequests").withIndex("by_associated_creator", q => q.eq("associatedCreatorId", creator._id)).collect(),
      ]);

      for (const profile of profiles) await ctx.db.delete(profile._id);
      for (const contact of contacts) {
        const flags = await ctx.db.query("contactFlags").withIndex("by_contact", q => q.eq("contactId", contact._id)).collect();
        for (const flag of flags) await ctx.db.delete(flag._id);
        await ctx.db.delete(contact._id);
        contactsDeleted += 1;
      }
      for (const unlock of unlocks) { await ctx.db.delete(unlock._id); unlocksDeleted += 1; }
      for (const saved of savedCreators) {
        await ctx.db.patch(saved._id, {
          creatorId: undefined,
          privateDisplayName: creator.displayName,
          privatePlatform: creator.platform,
          privateHandle: creator.handle,
          privateNormalizedHandle: creator.normalizedHandle,
          privateFollowerCount: creator.followerCount,
          privateLocation: creator.location,
          updatedAt: Date.now(),
        });
        savedSnapshotsPreserved += 1;
      }
      for (const request of requests) await ctx.db.patch(request._id, { associatedCreatorId: undefined });
      await ctx.db.delete(creator._id);
    }

    const remaining = await ctx.db
      .query("creators")
      .withIndex("by_followers", q => q.lt("followerCount", MIN_REPOSITORY_FOLLOWERS))
      .filter(q => q.eq(q.field("isDemo"), false))
      .first();
    return { creatorsDeleted: creators.length, contactsDeleted, unlocksDeleted, savedSnapshotsPreserved, hasMore: Boolean(remaining) };
  },
});

export const removeAllBelowMinimum = internalAction({
  args: {},
  handler: async (ctx) => {
    const totals = { creatorsDeleted: 0, contactsDeleted: 0, unlocksDeleted: 0, savedSnapshotsPreserved: 0, batches: 0 };
    for (let batch = 0; batch < 500; batch += 1) {
      const result = await ctx.runMutation(removeBatchRef, {});
      totals.creatorsDeleted += result.creatorsDeleted;
      totals.contactsDeleted += result.contactsDeleted;
      totals.unlocksDeleted += result.unlocksDeleted;
      totals.savedSnapshotsPreserved += result.savedSnapshotsPreserved;
      totals.batches += 1;
      if (!result.hasMore) return { ...totals, complete: true };
      if (result.creatorsDeleted === 0) throw new Error("Repository cleanup stopped without progress.");
    }
    return { ...totals, complete: false };
  },
});
