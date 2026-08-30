import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { campaignManagers, requireWorkspaceMember, requireWorkspaceRole } from "./lib/workspaceAuth";

const stage = v.union(v.literal("discovered"), v.literal("shortlisted"), v.literal("contacted"), v.literal("replied"), v.literal("negotiating"), v.literal("contracted"), v.literal("creating"), v.literal("in_review"), v.literal("scheduled"), v.literal("live"), v.literal("paid"));

export const save = mutation({
  args: { workspaceId: v.id("workspaces"), creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const existing = await ctx.db.query("savedCreators").withIndex("by_workspace_creator", q => q.eq("workspaceId", args.workspaceId).eq("creatorId", args.creatorId)).unique();
    if (existing) return { savedCreatorId: existing._id, alreadySaved: true };
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new ConvexError("Creator not found.");
    const now = Date.now();
    const savedCreatorId = await ctx.db.insert("savedCreators", { workspaceId: args.workspaceId, creatorId: args.creatorId, relationshipStage: "discovered", priority: "normal", tags: [], createdBy: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "saved_creator", entityId: savedCreatorId, action: "saved", summary: `Saved ${creator.displayName}`, createdAt: now });
    return { savedCreatorId, alreadySaved: false };
  },
});

export const list = query({
  args: { workspaceId: v.id("workspaces"), stage: v.optional(stage) },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const saved = args.stage
      ? await ctx.db.query("savedCreators").withIndex("by_workspace_stage", q => q.eq("workspaceId", args.workspaceId).eq("relationshipStage", args.stage!)).collect()
      : await ctx.db.query("savedCreators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
    return Promise.all(saved.map(async item => ({ ...item, creator: await ctx.db.get(item.creatorId), owner: item.ownerMemberId ? await ctx.db.get(item.ownerMemberId) : null })));
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
