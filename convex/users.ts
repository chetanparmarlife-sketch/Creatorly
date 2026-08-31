import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { STARTING_CREDIT_BALANCE } from "./lib/creditPolicy";
import { isEmailVerified } from "./lib/emailVerification";

async function requireUser(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to manage your account.");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Account not found.");
  return { userId, user };
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const billingCustomer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      id: user._id,
      name: user.name ?? "Creatorly user",
      email: user.email ?? "",
      companyName: user.companyName ?? "Agency",
      persona: user.persona ?? "buyer",
      phone: user.phone,
      role: user.role ?? "user",
      currentPlanTier: user.currentPlanTier ?? "free",
      creditBalance: user.creditBalance ?? STARTING_CREDIT_BALANCE,
      subscriptionStatus: user.subscriptionStatus ?? "active",
      subscriptionRenewalDate: user.subscriptionRenewalDate,
      cancellationRequestedAt: user.cancellationRequestedAt,
      hasDodoCustomer: Boolean(billingCustomer),
      onboardingCompleted: user.onboardingCompleted ?? false,
      onboardingStep: user.onboardingStep ?? 1,
      onboardingPlanTier: user.onboardingPlanTier ?? user.currentPlanTier ?? "free",
      isEmailVerified: isEmailVerified(user),
      notificationPreferences: user.notificationPreferences ?? {
        requestFulfilled: true,
        lowBalance: true,
        expirationWarning: true,
        weeklySummary: false,
      },
    };
  },
});

export const updateProfile = mutation({
  args: { name: v.string(), companyName: v.string(), phone: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const name = args.name.trim();
    const companyName = args.companyName.trim();
    if (!name || !companyName) throw new ConvexError("Enter your name and agency name.");
    await ctx.db.patch(userId, { name, companyName, phone: args.phone?.trim() || undefined, updatedAt: Date.now() });
    return { status: "saved" as const };
  },
});

export const updateNotifications = mutation({
  args: { requestFulfilled: v.boolean(), lowBalance: v.boolean(), expirationWarning: v.boolean(), weeklySummary: v.boolean() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { notificationPreferences: args, updatedAt: Date.now() });
    return { status: "saved" as const };
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { onboardingCompleted: true, onboardingStep: 3, updatedAt: Date.now() });
    return { status: "completed" as const };
  },
});

export const updateOnboardingStep = mutation({
  args: { step: v.union(v.literal(1), v.literal(2), v.literal(3)) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { onboardingStep: args.step, updatedAt: Date.now() });
    return { step: args.step };
  },
});

export const updateOnboardingPlan = mutation({
  args: { tier: v.union(v.literal("free"), v.literal("basic"), v.literal("pro")) },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { onboardingPlanTier: args.tier, updatedAt: Date.now() });
    return { tier: args.tier };
  },
});

export const createExtensionToken = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const existing = await ctx.db.query("extensionTokens").withIndex("by_user", q => q.eq("userId", userId)).collect();
    await Promise.all(existing.filter(item => !item.revokedAt).map(item => ctx.db.patch(item._id, { revokedAt: Date.now() })));
    const token = `crx_${crypto.randomUUID().replaceAll("-", "")}`;
    await ctx.db.insert("extensionTokens", { userId, token, createdAt: Date.now() });
    return { token };
  },
});
