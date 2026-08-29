import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const UNLOCK_COST = 5;
const ACCESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const unlock = mutation({
  args: { creatorId: v.id("creators") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to unlock this contact.");

    const [user, creator] = await Promise.all([
      ctx.db.get(userId),
      ctx.db.get(args.creatorId),
    ]);
    if (!user || !creator) throw new ConvexError("Creator not found.");

    const now = Date.now();
    const unlocks = await ctx.db
      .query("unlockRecords")
      .withIndex("by_user_creator", (q) =>
        q.eq("userId", userId).eq("creatorId", args.creatorId),
      )
      .collect();
    const active = unlocks.find((record) => record.expiresAt > now);
    if (active) {
      return {
        status: "already_unlocked" as const,
        expiresAt: active.expiresAt,
        creditBalance: user.creditBalance ?? 25,
      };
    }

    const creditBalance = user.creditBalance ?? 25;
    if (creditBalance < UNLOCK_COST) {
      throw new ConvexError("You need 5 credits to unlock this contact.");
    }

    const expiresAt = now + ACCESS_WINDOW_MS;
    const unlockId = await ctx.db.insert("unlockRecords", {
      userId,
      creatorId: args.creatorId,
      unlockedAt: now,
      expiresAt,
      creditsSpent: UNLOCK_COST,
      planTierAtUnlock: user.currentPlanTier ?? "free",
      status: unlocks.length > 0 ? "re_unlocked" : "active",
    });
    const nextBalance = creditBalance - UNLOCK_COST;
    await ctx.db.patch(userId, { creditBalance: nextBalance });
    await ctx.db.insert("creditTransactions", {
      userId,
      amount: -UNLOCK_COST,
      transactionType: "unlock_usage",
      description: `Unlock: ${creator.displayName}`,
      referenceId: unlockId,
      createdAt: now,
    });

    return {
      status: "unlocked" as const,
      expiresAt,
      creditBalance: nextBalance,
    };
  },
});
