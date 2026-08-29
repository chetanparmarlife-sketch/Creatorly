import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const planTier = v.union(v.literal("free"), v.literal("basic"), v.literal("pro"));
const planCredits = { free: 0, basic: 100, pro: 250 } as const;

async function userIdOrThrow(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to manage billing.");
  return userId;
}

export const changePlan = mutation({
  args: { tier: planTier, billingCycle: v.union(v.literal("monthly"), v.literal("annual")), demoPaymentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await userIdOrThrow(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Account not found.");
    const now = Date.now();
    const included = planCredits[args.tier];
    const renewalDays = args.billingCycle === "annual" ? 365 : 30;
    const renewalDate = args.tier === "free" ? undefined : now + renewalDays * 24 * 60 * 60 * 1000;
    const allocation = args.tier === "free" ? 0 : included;
    await ctx.db.patch(userId, {
      currentPlanTier: args.tier,
      subscriptionStatus: "active",
      subscriptionRenewalDate: renewalDate,
      cancellationRequestedAt: undefined,
      monthlyCreditsIncluded: included,
      monthlyCreditsResetDate: renewalDate,
      creditBalance: (user.creditBalance ?? 0) + allocation,
      updatedAt: now,
    });
    if (allocation > 0) await ctx.db.insert("creditTransactions", {
      userId,
      amount: allocation,
      transactionType: "subscription_allocation",
      description: `DemoPay ${args.tier} plan allocation`,
      referenceId: args.demoPaymentId,
      createdAt: now,
    });
    await ctx.db.insert("notifications", {
      userId, type: "payment", title: `${args.tier[0].toUpperCase()}${args.tier.slice(1)} plan active`,
      message: allocation ? `${allocation} credits were added through DemoPay.` : "Your account is now on the Free plan.",
      href: "/pricing", createdAt: now,
    });
    return { tier: args.tier, creditsAdded: allocation, creditBalance: (user.creditBalance ?? 0) + allocation, renewalDate };
  },
});

export const purchaseCredits = mutation({
  args: { credits: v.union(v.literal(50), v.literal(100)), demoPaymentId: v.string() },
  handler: async (ctx, args) => {
    const userId = await userIdOrThrow(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Account not found.");
    const nextBalance = (user.creditBalance ?? 0) + args.credits;
    const now = Date.now();
    await ctx.db.patch(userId, { creditBalance: nextBalance, updatedAt: now });
    await ctx.db.insert("creditTransactions", {
      userId, amount: args.credits, transactionType: "purchase",
      description: `DemoPay ${args.credits}-credit pack`, referenceId: args.demoPaymentId, createdAt: now,
    });
    await ctx.db.insert("notifications", {
      userId, type: "payment", title: "Credits added", message: `${args.credits} credits were added through DemoPay.`, href: "/pricing", createdAt: now,
    });
    return { creditsAdded: args.credits, creditBalance: nextBalance };
  },
});

export const listTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("creditTransactions").withIndex("by_user", q => q.eq("userId", userId)).order("desc").take(20);
  },
});
