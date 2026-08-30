import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { campaignManagers, requireWorkspaceMember, requireWorkspaceRole } from "./lib/workspaceAuth";

const stage = v.union(v.literal("discovered"), v.literal("shortlisted"), v.literal("contacted"), v.literal("replied"), v.literal("negotiating"), v.literal("contracted"), v.literal("creating"), v.literal("in_review"), v.literal("scheduled"), v.literal("live"), v.literal("paid"));
const platform = v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube"), v.literal("linkedin"), v.literal("twitter"));
const privateSource = v.union(v.literal("csv_upload"), v.literal("manual"));
const privateCreator = v.object({
  displayName: v.string(),
  platform: v.optional(platform),
  handle: v.optional(v.string()),
  followerCount: v.optional(v.number()),
  location: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  whatsapp: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
});

const normalizeHandle = (value?: string) => value?.trim().toLowerCase().replace(/^@/, "") || undefined;
const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || undefined;
const privateKeys = (item: { platform?: "instagram" | "tiktok" | "youtube" | "linkedin" | "twitter"; handle?: string; email?: string }) => {
  const keys: string[] = [];
  const handle = normalizeHandle(item.handle);
  const email = normalizeEmail(item.email);
  if (item.platform && handle) keys.push(`profile:${item.platform}:${handle}`);
  if (email) keys.push(`email:${email}`);
  return keys;
};

export const save = mutation({
  args: { workspaceId: v.id("workspaces"), creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const existing = await ctx.db.query("savedCreators").withIndex("by_workspace_creator", q => q.eq("workspaceId", args.workspaceId).eq("creatorId", args.creatorId)).unique();
    if (existing) return { savedCreatorId: existing._id, alreadySaved: true };
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new ConvexError("Creator not found.");
    const now = Date.now();
    const savedCreatorId = await ctx.db.insert("savedCreators", { workspaceId: args.workspaceId, creatorId: args.creatorId, source: "creatorly", relationshipStage: "discovered", priority: "normal", tags: [], createdBy: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "saved_creator", entityId: savedCreatorId, action: "saved", summary: `Saved ${creator.displayName}`, createdAt: now });
    return { savedCreatorId, alreadySaved: false };
  },
});

export const importPrivate = mutation({
  args: { workspaceId: v.id("workspaces"), source: privateSource, rows: v.array(privateCreator) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    if (args.rows.length > 500) throw new ConvexError("Import up to 500 creators at a time.");
    const existing = await ctx.db.query("savedCreators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
    const known = new Set<string>();
    for (const item of existing) {
      if (item.creatorId) {
        const creator = await ctx.db.get(item.creatorId);
        if (creator) privateKeys({ platform: creator.platform, handle: creator.handle }).forEach(key => known.add(key));
      }
      privateKeys({ platform: item.privatePlatform, handle: item.privateHandle, email: item.privateEmail }).forEach(key => known.add(key));
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const now = Date.now();
    for (const row of args.rows) {
      const displayName = row.displayName.trim();
      const handle = row.handle?.trim() || undefined;
      const email = normalizeEmail(row.email);
      const phone = row.phone?.trim() || undefined;
      const whatsapp = row.whatsapp?.trim() || undefined;
      const keys = privateKeys({ platform: row.platform, handle, email });
      if (!displayName || (!handle && !email && !phone && !whatsapp) || (row.followerCount !== undefined && (!Number.isInteger(row.followerCount) || row.followerCount < 0))) { errors += 1; continue; }
      if (keys.some(key => known.has(key))) { duplicates += 1; continue; }
      keys.forEach(key => known.add(key));
      const savedCreatorId = await ctx.db.insert("savedCreators", {
        workspaceId: args.workspaceId,
        source: args.source,
        privateDisplayName: displayName,
        privatePlatform: row.platform,
        privateHandle: handle,
        privateNormalizedHandle: normalizeHandle(handle),
        privateFollowerCount: row.followerCount,
        privateLocation: row.location?.trim() || undefined,
        privateEmail: email,
        privateNormalizedEmail: email,
        privatePhone: phone,
        privateWhatsapp: whatsapp,
        notes: row.notes?.trim() || undefined,
        relationshipStage: "discovered",
        priority: "normal",
        tags: [...new Set((row.tags ?? []).map(tag => tag.trim()).filter(Boolean))],
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "saved_creator", entityId: savedCreatorId, action: "imported", summary: `${args.source === "manual" ? "Added" : "Imported"} private creator ${displayName}`, createdAt: now });
      imported += 1;
    }
    return { imported, duplicates, errors };
  },
});

export const list = query({
  args: { workspaceId: v.id("workspaces"), stage: v.optional(stage) },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const saved = args.stage
      ? await ctx.db.query("savedCreators").withIndex("by_workspace_stage", q => q.eq("workspaceId", args.workspaceId).eq("relationshipStage", args.stage!)).collect()
      : await ctx.db.query("savedCreators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
    return Promise.all(saved.map(async item => ({ ...item, creator: item.creatorId ? await ctx.db.get(item.creatorId) : null, owner: item.ownerMemberId ? await ctx.db.get(item.ownerMemberId) : null })));
  },
});

export const update = mutation({
  args: { workspaceId: v.id("workspaces"), savedCreatorId: v.id("savedCreators"), relationshipStage: v.optional(stage), ownerMemberId: v.optional(v.id("workspaceMembers")), nextAction: v.optional(v.string()), nextActionAt: v.optional(v.number()), priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const item = await ctx.db.get(args.savedCreatorId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Saved creator not found.");
    const previous = item.relationshipStage;
    const patch = { relationshipStage: args.relationshipStage, ownerMemberId: args.ownerMemberId, nextAction: args.nextAction?.trim() || undefined, nextActionAt: args.nextActionAt, priority: args.priority, updatedAt: Date.now() };
    await ctx.db.patch(item._id, patch);
    if (args.relationshipStage && args.relationshipStage !== previous) await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "saved_creator", entityId: item._id, action: "stage_changed", summary: `Moved creator from ${previous} to ${args.relationshipStage}`, previousValue: previous, nextValue: args.relationshipStage, createdAt: Date.now() });
    return { status: "updated" as const };
  },
});
