import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import {
  isAllowedProfileImageSource,
  isAllowedProfileImageType,
  MAX_PROFILE_IMAGE_BYTES,
} from "./lib/profileImagePolicy";

const JOB_KEY = "creator-profile-images-v1";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;
const COPY_CONCURRENCY = 500;

type MigrationCreator = { creatorId: Id<"creators">; sourceUrl: string };

type MigrationPage = {
  stateId: Id<"profileImageMigrationState">;
  creators: MigrationCreator[];
  scanned: number;
  skipped: number;
  continueCursor: string;
  isDone: boolean;
} | null;

type CopySuccess = {
  creatorId: Id<"creators">;
  storageId: Id<"_storage">;
  profileImageUrl: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : "Unknown profile image migration error";
}

export const start = internalMutation({
  args: {
    pageSize: v.optional(v.number()),
    maxMigrations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (existing?.status === "running") {
      throw new ConvexError("The profile image migration is already running.");
    }
    const now = Date.now();
    const pageSize = Math.max(1, Math.min(Math.floor(args.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE));
    const maxMigrations = args.maxMigrations === undefined
      ? undefined
      : Math.max(1, Math.floor(args.maxMigrations));
    const fields = {
      jobKey: JOB_KEY,
      status: "running" as const,
      cursor: undefined,
      processed: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      pass: (existing?.pass ?? 0) + 1,
      pageSize,
      maxMigrations,
      sampleCreatorIds: [],
      startedAt: now,
      updatedAt: now,
      completedAt: undefined,
      lastError: undefined,
    };
    const stateId = existing?._id ?? await ctx.db.insert("profileImageMigrationState", fields);
    if (existing) await ctx.db.patch(existing._id, fields);
    await ctx.scheduler.runAfter(0, internal.profileImageMigration.runBatch, {});
    return { stateId, pageSize, maxMigrations, pass: fields.pass };
  },
});

export const resume = internalMutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state || state.status !== "running") {
      throw new ConvexError("There is no running profile image migration to resume.");
    }
    await ctx.scheduler.runAfter(0, internal.profileImageMigration.runBatch, {});
    return { resumed: true, cursor: state.cursor ?? null };
  },
});

export const setPageSize = internalMutation({
  args: { pageSize: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state || state.status !== "running") {
      throw new ConvexError("There is no running profile image migration to tune.");
    }
    const pageSize = Math.max(1, Math.min(Math.floor(args.pageSize), MAX_PAGE_SIZE));
    await ctx.db.patch(state._id, { pageSize, updatedAt: Date.now() });
    return { pageSize };
  },
});

export const loadPage = internalQuery({
  args: {},
  handler: async (ctx): Promise<MigrationPage> => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state || state.status !== "running") return null;
    const remaining = state.maxMigrations === undefined
      ? state.pageSize
      : Math.max(1, Math.min(state.pageSize, state.maxMigrations - state.migrated));
    const result = await ctx.db.query("creators").paginate({
      cursor: state.cursor ?? null,
      numItems: remaining,
    });
    const creators = result.page
      .filter(creator => !creator.profileImageStorageId
        && Boolean(creator.profileImageUrl)
        && isAllowedProfileImageSource(creator.profileImageUrl!))
      .map(creator => ({ creatorId: creator._id, sourceUrl: creator.profileImageUrl! }));
    return {
      stateId: state._id,
      creators,
      scanned: result.page.length,
      skipped: result.page.length - creators.length,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

async function copyImage(ctx: ActionCtx, creator: MigrationCreator): Promise<CopySuccess> {
  const response = await fetch(creator.sourceUrl, { redirect: "error" });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!isAllowedProfileImageType(contentType)) throw new Error(`Rejected content type ${contentType || "missing"}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_PROFILE_IMAGE_BYTES) throw new Error("Image exceeds the one MiB limit");
  const blob = await response.blob();
  if (blob.size === 0 || blob.size > MAX_PROFILE_IMAGE_BYTES) throw new Error("Image size is invalid");
  const storageId = await ctx.storage.store(blob);
  const profileImageUrl = await ctx.storage.getUrl(storageId);
  if (!profileImageUrl) {
    await ctx.storage.delete(storageId);
    throw new Error("Convex did not return a stored image URL");
  }
  return { creatorId: creator.creatorId, storageId, profileImageUrl };
}

export const runBatch = internalAction({
  args: {},
  handler: async (ctx): Promise<null> => {
    const stored: CopySuccess[] = [];
    try {
      const page: MigrationPage = await ctx.runQuery(internal.profileImageMigration.loadPage, {});
      if (!page) return null;
      let failedCount = 0;
      for (let index = 0; index < page.creators.length; index += COPY_CONCURRENCY) {
        const group = page.creators.slice(index, index + COPY_CONCURRENCY);
        const results = await Promise.all(group.map(async creator => {
          try {
            return await copyImage(ctx, creator);
          } catch {
            failedCount += 1;
            return null;
          }
        }));
        stored.push(...results.filter((item): item is CopySuccess => item !== null));
      }
      await ctx.runMutation(internal.profileImageMigration.commitBatch, {
        stateId: page.stateId,
        successful: stored,
        failedCount,
        scanned: page.scanned,
        skipped: page.skipped,
        continueCursor: page.continueCursor,
        isDone: page.isDone,
      });
    } catch (error) {
      await Promise.all(stored.map(item => ctx.storage.delete(item.storageId)));
      await ctx.runMutation(internal.profileImageMigration.markFailed, { message: errorMessage(error) });
    }
    return null;
  },
});

export const commitBatch = internalMutation({
  args: {
    stateId: v.id("profileImageMigrationState"),
    successful: v.array(v.object({
      creatorId: v.id("creators"),
      storageId: v.id("_storage"),
      profileImageUrl: v.string(),
    })),
    failedCount: v.number(),
    scanned: v.number(),
    skipped: v.number(),
    continueCursor: v.string(),
    isDone: v.boolean(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db.get(args.stateId);
    if (!state || state.status !== "running") {
      for (const item of args.successful) await ctx.storage.delete(item.storageId);
      return { committed: 0, complete: true };
    }
    let committed = 0;
    const committedCreatorIds: Id<"creators">[] = [];
    for (const item of args.successful) {
      const creator = await ctx.db.get(item.creatorId);
      if (creator && !creator.profileImageStorageId && creator.profileImageUrl && isAllowedProfileImageSource(creator.profileImageUrl)) {
        await ctx.db.patch(item.creatorId, {
          profileImageStorageId: item.storageId,
          profileImageUrl: item.profileImageUrl,
        });
        committed += 1;
        committedCreatorIds.push(item.creatorId);
      } else {
        await ctx.storage.delete(item.storageId);
      }
    }
    const migrated = state.migrated + committed;
    const complete = args.isDone || (state.maxMigrations !== undefined && migrated >= state.maxMigrations);
    const sampleCreatorIds = [
      ...(state.sampleCreatorIds ?? []),
      ...committedCreatorIds,
    ].slice(0, 10);
    await ctx.db.patch(state._id, {
      cursor: complete ? undefined : args.continueCursor,
      processed: state.processed + args.scanned,
      migrated,
      failed: state.failed + args.failedCount,
      skipped: state.skipped + args.skipped,
      sampleCreatorIds,
      status: complete ? "complete" : "running",
      updatedAt: Date.now(),
      completedAt: complete ? Date.now() : undefined,
    });
    if (!complete) await ctx.scheduler.runAfter(0, internal.profileImageMigration.runBatch, {});
    return { committed, complete };
  },
});

export const markFailed = internalMutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state || state.status !== "running") return { marked: false };
    await ctx.db.patch(state._id, {
      status: "failed",
      lastError: args.message,
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
    return { marked: true };
  },
});

export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state) return null;
    return {
      status: state.status,
      processed: state.processed,
      migrated: state.migrated,
      failed: state.failed,
      skipped: state.skipped,
      pass: state.pass,
      pageSize: state.pageSize,
      maxMigrations: state.maxMigrations,
      sampleCreatorIds: state.sampleCreatorIds,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      completedAt: state.completedAt,
      lastError: state.lastError,
    };
  },
});

export const auditSample = internalQuery({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query("profileImageMigrationState")
      .withIndex("by_job_key", q => q.eq("jobKey", JOB_KEY))
      .first();
    if (!state) return [];
    const creators = await Promise.all(
      (state.sampleCreatorIds ?? []).map(creatorId => ctx.db.get(creatorId)),
    );
    return creators.filter(creator => creator !== null).map(creator => ({
      handle: creator.handle,
      hasStorageId: Boolean(creator.profileImageStorageId),
      profileImageUrl: creator.profileImageUrl,
    }));
  },
});

export const auditPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const result = await ctx.db.query("creators").paginate({
      cursor: args.cursor,
      numItems: 500,
    });
    let owned = 0;
    let external = 0;
    let missing = 0;
    for (const creator of result.page) {
      if (creator.profileImageStorageId) owned += 1;
      else if (creator.profileImageUrl && isAllowedProfileImageSource(creator.profileImageUrl)) external += 1;
      else missing += 1;
    }
    return {
      owned,
      external,
      missing,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const auditAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ owned: number; external: number; missing: number; total: number }> => {
    let cursor: string | null = null;
    let owned = 0;
    let external = 0;
    let missing = 0;
    for (;;) {
      const page: {
        owned: number;
        external: number;
        missing: number;
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(internal.profileImageMigration.auditPage, { cursor });
      owned += page.owned;
      external += page.external;
      missing += page.missing;
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    return { owned, external, missing, total: owned + external + missing };
  },
});
