import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspaceMember } from "./lib/workspaceAuth";

export const getSummary = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const [campaigns, creators, activity] = await Promise.all([
      ctx.db.query("campaigns").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("savedCreators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect(),
      ctx.db.query("activityEvents").withIndex("by_workspace_created_at", q => q.eq("workspaceId", args.workspaceId)).order("desc").take(8),
    ]);
    const now = Date.now();
    return {
      activeCampaignCount: campaigns.filter(item => item.status === "active").length,
      savedCreatorCount: creators.length,
      creatorsAwaitingAction: creators.filter(item => item.nextAction).length,
      overdueActions: creators.filter(item => item.nextActionAt && item.nextActionAt < now).map(item => ({ id: item._id, title: item.nextAction!, dueAt: item.nextActionAt! })),
      recentActivity: activity,
      activeCampaigns: campaigns.filter(item => item.status === "active").slice(0, 4),
    };
  },
});
