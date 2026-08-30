import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { campaignManagers, requireWorkspaceMember, requireWorkspaceRole } from "./lib/workspaceAuth";

const platform = v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube"), v.literal("twitter"));
const stage = v.union(v.literal("discovered"), v.literal("shortlisted"), v.literal("contacted"), v.literal("replied"), v.literal("negotiating"), v.literal("contracted"), v.literal("creating"), v.literal("in_review"), v.literal("scheduled"), v.literal("live"), v.literal("paid"));

export const create = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string(), goal: v.string(), platforms: v.array(platform), currency: v.string(), budget: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    if (!args.name.trim()) throw new ConvexError("Enter a campaign name.");
    const now = Date.now();
    const campaignId = await ctx.db.insert("campaigns", { workspaceId: args.workspaceId, name: args.name.trim(), goal: args.goal.trim(), platforms: args.platforms, status: "active", currency: args.currency, budget: args.budget, createdBy: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "campaign", entityId: campaignId, action: "created", summary: `Created campaign ${args.name.trim()}`, createdAt: now });
    return { campaignId };
  },
});

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const campaigns = await ctx.db.query("campaigns").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).order("desc").collect();
    return Promise.all(campaigns.map(async campaign => {
      const creators = await ctx.db.query("campaignCreators").withIndex("by_campaign", q => q.eq("campaignId", campaign._id)).collect();
      return { ...campaign, creatorCount: creators.length, creators };
    }));
  },
});

export const addCreator = mutation({
  args: { workspaceId: v.id("workspaces"), campaignId: v.id("campaigns"), savedCreatorId: v.id("savedCreators") },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const [campaign, saved] = await Promise.all([ctx.db.get(args.campaignId), ctx.db.get(args.savedCreatorId)]);
    if (!campaign || !saved || campaign.workspaceId !== args.workspaceId || saved.workspaceId !== args.workspaceId) throw new ConvexError("Campaign creator not found.");
    const existing = await ctx.db.query("campaignCreators").withIndex("by_campaign_creator", q => q.eq("campaignId", args.campaignId).eq("savedCreatorId", args.savedCreatorId)).unique();
    if (existing) return { campaignCreatorId: existing._id, alreadyAdded: true };
    const now = Date.now();
    const campaignCreatorId = await ctx.db.insert("campaignCreators", { workspaceId: args.workspaceId, campaignId: args.campaignId, savedCreatorId: args.savedCreatorId, stage: "shortlisted", createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "campaign_creator", entityId: campaignCreatorId, action: "added", summary: `Added creator to ${campaign.name}`, createdAt: now });
    return { campaignCreatorId, alreadyAdded: false };
  },
});

export const moveCreator = mutation({
  args: { workspaceId: v.id("workspaces"), campaignCreatorId: v.id("campaignCreators"), stage, nextAction: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const item = await ctx.db.get(args.campaignCreatorId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Campaign creator not found.");
    await ctx.db.patch(item._id, { stage: args.stage, nextAction: args.nextAction?.trim() || undefined, updatedAt: Date.now() });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "campaign_creator", entityId: item._id, action: "stage_changed", summary: `Moved campaign creator from ${item.stage} to ${args.stage}`, previousValue: item.stage, nextValue: args.stage, createdAt: Date.now() });
    return { status: "updated" as const };
  },
});
