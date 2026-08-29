import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("notifications").withIndex("by_user", q => q.eq("userId", userId)).order("desc").take(30);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to view notifications.");
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) throw new ConvexError("Notification not found.");
    await ctx.db.patch(args.notificationId, { readAt: Date.now() });
  },
});
