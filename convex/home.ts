import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspaceMember } from "./lib/workspaceAuth";

export const getSummary = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const [campaigns, creators, activity, tasks, deliverables] = await Promise.all([
      ctx.db.query("campaigns").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("savedCreators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("activityEvents").withIndex("by_workspace_created_at", q => q.eq("workspaceId", args.workspaceId)).order("desc").take(8),
      ctx.db.query("tasks").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("deliverables").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
    ]);
    const now = Date.now();
    const allActiveCampaignRows = campaigns.filter(item => item.status === "active").sort((a, b) => b.updatedAt - a.updatedAt);
    const activeCampaignRows = allActiveCampaignRows.slice(0, 4);
    const activeCampaigns = await Promise.all(activeCampaignRows.map(async campaign => ({
      id: campaign._id,
      name: campaign.name,
      goal: campaign.goal,
      creatorCount: (await ctx.db.query("campaignCreators").withIndex("by_campaign", q => q.eq("campaignId", campaign._id)).collect()).length,
      pendingReviewCount: deliverables.filter(item => item.campaignId === campaign._id && item.status === "in_review").length,
      updatedAt: campaign.updatedAt,
    })));
    return {
      activeCampaignCount: allActiveCampaignRows.length,
      savedCreatorCount: creators.length,
      pendingReviewCount: deliverables.filter(item => item.status === "in_review").length,
      overdueTasks: tasks.filter(item => item.status === "open" && item.dueAt && item.dueAt < now).sort((a, b) => a.dueAt! - b.dueAt!).slice(0, 6).map(item => ({ id: item._id, title: item.title, dueAt: item.dueAt!, campaignId: item.campaignId })),
      pendingReviews: deliverables.filter(item => item.status === "in_review").slice(0, 6).map(item => ({ id: item._id, title: item.title, campaignId: item.campaignId, campaignName: campaigns.find(campaign => campaign._id === item.campaignId)?.name ?? "Campaign" })),
      recentActivity: activity,
      activeCampaigns,
    };
  },
});
