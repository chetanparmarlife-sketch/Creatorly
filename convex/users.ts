import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

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
    return {
      id: user._id,
      name: user.name ?? "Creatorly user",
      email: user.email ?? "",
      companyName: user.companyName ?? "Agency",
      phone: user.phone,
      role: user.role ?? "user",
      currentPlanTier: user.currentPlanTier ?? "free",
      creditBalance: user.creditBalance ?? 25,
      subscriptionStatus: user.subscriptionStatus ?? "active",
      subscriptionRenewalDate: user.subscriptionRenewalDate,
      cancellationRequestedAt: user.cancellationRequestedAt,
      onboardingCompleted: user.onboardingCompleted ?? false,
      isEmailVerified: user.isEmailVerified ?? false,
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
    await ctx.db.patch(userId, { onboardingCompleted: true, updatedAt: Date.now() });
    return { status: "completed" as const };
  },
});

export const requestCancellation = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    if ((user.currentPlanTier ?? "free") === "free") throw new ConvexError("The Free plan has no subscription to cancel.");
    const now = Date.now();
    await ctx.db.patch(userId, { cancellationRequestedAt: now, subscriptionStatus: "cancelled", updatedAt: now });
    return { status: "cancelled" as const, accessUntil: user.subscriptionRenewalDate };
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
