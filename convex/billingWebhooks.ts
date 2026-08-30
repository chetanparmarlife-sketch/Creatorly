import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const paymentStatus = v.union(v.literal("processing"), v.literal("succeeded"), v.literal("failed"), v.literal("cancelled"));
const purchaseKind = v.union(v.literal("core_plan"), v.literal("contact_credits"), v.literal("unknown"));
const subscriptionStatus = v.union(
  v.literal("pending"), v.literal("active"), v.literal("on_hold"), v.literal("paused"),
  v.literal("cancelled"), v.literal("failed"), v.literal("expired"),
);

async function resolveUserId(ctx: MutationCtx, rawUserId: string | undefined, dodoCustomerId: string) {
  if (rawUserId) {
    const userId = ctx.db.normalizeId("users", rawUserId);
    if (userId && await ctx.db.get(userId)) return userId;
  }
  const customer = await ctx.db
    .query("billingCustomers")
    .withIndex("by_dodo_customer", (q) => q.eq("dodoCustomerId", dodoCustomerId))
    .unique();
  if (customer) return customer.userId;
  throw new ConvexError("Dodo webhook could not be matched to a Creatorly account.");
}

async function claimEvent(ctx: MutationCtx, eventKey: string, eventType: string, providerObjectId: string) {
  const existing = await ctx.db
    .query("billingWebhookEvents")
    .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
    .unique();
  if (existing) return false;
  await ctx.db.insert("billingWebhookEvents", { eventKey, eventType, providerObjectId, processedAt: Date.now() });
  return true;
}

async function upsertCustomer(ctx: MutationCtx, userId: Id<"users">, dodoCustomerId: string, email: string, now: number) {
  const byProvider = await ctx.db
    .query("billingCustomers")
    .withIndex("by_dodo_customer", (q) => q.eq("dodoCustomerId", dodoCustomerId))
    .unique();
  if (byProvider) {
    if (byProvider.userId !== userId) throw new ConvexError("Dodo customer is already linked to another Creatorly account.");
    await ctx.db.patch(byProvider._id, { email, updatedAt: now });
    return;
  }
  const byUser = await ctx.db.query("billingCustomers").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  if (byUser) {
    await ctx.db.patch(byUser._id, { dodoCustomerId, email, updatedAt: now });
    return;
  }
  await ctx.db.insert("billingCustomers", { userId, dodoCustomerId, email, createdAt: now, updatedAt: now });
}

export const syncPayment = internalMutation({
  args: {
    eventKey: v.string(),
    eventType: v.string(),
    paymentId: v.string(),
    userId: v.optional(v.string()),
    dodoCustomerId: v.string(),
    customerEmail: v.string(),
    productId: v.optional(v.string()),
    purchaseKind,
    status: paymentStatus,
    amount: v.number(),
    currency: v.string(),
    invoiceId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    credits: v.optional(v.union(v.literal(50), v.literal(100))),
  },
  handler: async (ctx, args) => {
    if (!await claimEvent(ctx, args.eventKey, args.eventType, args.paymentId)) return { duplicate: true };
    const userId = await resolveUserId(ctx, args.userId, args.dodoCustomerId);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Creatorly account no longer exists.");
    const now = Date.now();
    await upsertCustomer(ctx, userId, args.dodoCustomerId, args.customerEmail, now);
    const existing = await ctx.db
      .query("billingPayments")
      .withIndex("by_dodo_payment", (q) => q.eq("dodoPaymentId", args.paymentId))
      .unique();
    const paymentRecord = {
      dodoCustomerId: args.dodoCustomerId,
      dodoProductId: args.productId,
      purchaseKind: args.purchaseKind,
      status: args.status,
      amount: args.amount,
      currency: args.currency,
      invoiceId: args.invoiceId,
      invoiceUrl: args.invoiceUrl,
      failureMessage: args.failureMessage,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, paymentRecord);
    else await ctx.db.insert("billingPayments", { userId, dodoPaymentId: args.paymentId, ...paymentRecord, createdAt: now });

    if (args.status === "succeeded" && args.purchaseKind === "contact_credits" && args.credits) {
      const priorCredit = (await ctx.db.query("creditTransactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect())
        .some((transaction) => transaction.referenceId === args.paymentId && transaction.transactionType === "purchase");
      if (!priorCredit) {
        await ctx.db.patch(userId, { creditBalance: (user.creditBalance ?? 0) + args.credits, updatedAt: now });
        await ctx.db.insert("creditTransactions", {
          userId,
          amount: args.credits,
          transactionType: "purchase",
          description: `Dodo Payments ${args.credits}-credit pack`,
          referenceId: args.paymentId,
          createdAt: now,
        });
        await ctx.db.insert("notifications", {
          userId,
          type: "payment",
          title: "Contact credits added",
          message: `${args.credits} credits were added after Dodo confirmed payment.`,
          href: "/pricing",
          createdAt: now,
        });
      }
    } else if (args.status === "failed") {
      await ctx.db.insert("notifications", {
        userId,
        type: "payment",
        title: "Payment failed",
        message: args.failureMessage || "Dodo could not complete this payment. Your Creatorly access was not changed.",
        href: "/pricing",
        createdAt: now,
      });
    }
    return { duplicate: false };
  },
});

export const syncSubscription = internalMutation({
  args: {
    eventKey: v.string(),
    eventType: v.string(),
    subscriptionId: v.string(),
    userId: v.optional(v.string()),
    dodoCustomerId: v.string(),
    customerEmail: v.string(),
    productId: v.string(),
    tier: v.union(v.literal("basic"), v.literal("pro")),
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
    status: subscriptionStatus,
    nextBillingDate: v.optional(v.number()),
    cancelAtNextBillingDate: v.boolean(),
    grantCredits: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!await claimEvent(ctx, args.eventKey, args.eventType, args.subscriptionId)) return { duplicate: true };
    const userId = await resolveUserId(ctx, args.userId, args.dodoCustomerId);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Creatorly account no longer exists.");
    const now = Date.now();
    await upsertCustomer(ctx, userId, args.dodoCustomerId, args.customerEmail, now);
    const existing = await ctx.db
      .query("billingSubscriptions")
      .withIndex("by_dodo_subscription", (q) => q.eq("dodoSubscriptionId", args.subscriptionId))
      .unique();
    const subscriptionRecord = {
      dodoCustomerId: args.dodoCustomerId,
      dodoProductId: args.productId,
      tier: args.tier,
      billingCycle: args.billingCycle,
      status: args.status,
      nextBillingDate: args.nextBillingDate,
      cancelAtNextBillingDate: args.cancelAtNextBillingDate,
      updatedAt: now,
    };
    if (existing) await ctx.db.patch(existing._id, subscriptionRecord);
    else await ctx.db.insert("billingSubscriptions", { userId, dodoSubscriptionId: args.subscriptionId, ...subscriptionRecord, createdAt: now });

    if (args.status === "active") {
      const included = args.tier === "basic" ? 100 : 250;
      let creditBalance = user.creditBalance ?? 0;
      if (args.grantCredits) {
        const referenceId = `${args.subscriptionId}:${args.eventKey}`;
        const priorAllocation = (await ctx.db.query("creditTransactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect())
          .some((transaction) => transaction.referenceId === referenceId);
        if (!priorAllocation) {
          creditBalance += included;
          await ctx.db.insert("creditTransactions", {
            userId,
            amount: included,
            transactionType: "subscription_allocation",
            description: `Dodo Payments ${args.tier} plan allocation`,
            referenceId,
            createdAt: now,
          });
        }
      }
      await ctx.db.patch(userId, {
        currentPlanTier: args.tier,
        subscriptionStatus: "active",
        subscriptionRenewalDate: args.nextBillingDate,
        cancellationRequestedAt: args.cancelAtNextBillingDate ? now : undefined,
        monthlyCreditsIncluded: included,
        monthlyCreditsResetDate: args.nextBillingDate,
        creditBalance,
        updatedAt: now,
      });
      await ctx.db.insert("notifications", {
        userId,
        type: "payment",
        title: `${args.tier === "basic" ? "Basic" : "Pro"} plan active`,
        message: args.grantCredits ? `${included} plan credits were added after Dodo confirmed the subscription.` : "Dodo confirmed your subscription update.",
        href: "/pricing",
        createdAt: now,
      });
    } else if (args.status === "on_hold" || args.status === "paused") {
      await ctx.db.patch(userId, { subscriptionStatus: "past_due", updatedAt: now });
    } else if (args.status === "cancelled") {
      await ctx.db.patch(userId, { subscriptionStatus: "cancelled", cancellationRequestedAt: now, subscriptionRenewalDate: args.nextBillingDate, updatedAt: now });
    } else if (args.status === "failed" || args.status === "expired") {
      await ctx.db.patch(userId, {
        currentPlanTier: "free",
        subscriptionStatus: "cancelled",
        monthlyCreditsIncluded: 0,
        monthlyCreditsResetDate: undefined,
        subscriptionRenewalDate: undefined,
        updatedAt: now,
      });
    }
    return { duplicate: false };
  },
});
