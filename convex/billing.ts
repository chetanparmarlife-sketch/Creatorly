import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { checkout, customerPortal } from "./dodo";
import { getCheckoutProduct, requireCreatorlyAppUrl } from "./lib/dodoCatalog";

const purchase = v.union(
  v.object({
    kind: v.literal("core_plan"),
    tier: v.union(v.literal("basic"), v.literal("pro")),
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
  }),
  v.object({
    kind: v.literal("contact_credits"),
    credits: v.union(v.literal(50), v.literal(100)),
  }),
);

export const createCheckout = action({
  args: { purchase },
  handler: async (ctx, args): Promise<{ checkoutUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to start checkout.");
    if (!process.env.DODO_PAYMENTS_API_KEY) throw new ConvexError("Dodo Payments is not configured yet.");
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
    if (environment !== "test_mode" && environment !== "live_mode") {
      throw new ConvexError("DODO_PAYMENTS_ENVIRONMENT must be test_mode or live_mode.");
    }
    if (environment === "live_mode" && process.env.DODO_PAYMENTS_LIVE_ENABLED !== "true") {
      throw new ConvexError("Live Dodo checkout is locked while Creatorly billing is being verified.");
    }
    const user = await ctx.runQuery(internal.billingCustomers.getCheckoutUser, { userId });
    if (!user?.email) throw new ConvexError("Add an email address before starting checkout.");
    const item = getCheckoutProduct(args.purchase);
    const appUrl = requireCreatorlyAppUrl();
    const metadata: Record<string, string | number | boolean> = args.purchase.kind === "core_plan"
      ? {
          creatorly_user_id: userId,
          creatorly_purchase: "core_plan",
          creatorly_tier: args.purchase.tier,
          creatorly_billing_cycle: args.purchase.billingCycle,
        }
      : {
          creatorly_user_id: userId,
          creatorly_purchase: "contact_credits",
          creatorly_credits: args.purchase.credits,
        };
    const result: { checkout_url: string } = await checkout(ctx, {
      payload: {
        product_cart: [{ product_id: item.productId, quantity: 1 }],
        customer: user.dodoCustomerId
          ? { customer_id: user.dodoCustomerId }
          : { email: user.email, name: user.name },
        metadata,
        return_url: `${appUrl}/payment/success`,
        cancel_url: `${appUrl}/pricing`,
        billing_currency: "INR",
        minimal_address: true,
        feature_flags: { allow_discount_code: true },
        customization: { theme: "light", show_order_details: true },
      },
    });
    if (!result.checkout_url) throw new ConvexError("Dodo Payments did not return a checkout URL.");
    return { checkoutUrl: result.checkout_url };
  },
});

export const createCustomerPortal = action({
  args: {},
  handler: async (ctx): Promise<{ portalUrl: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to manage billing.");
    const customer = await ctx.runQuery(internal.billingCustomers.getDodoCustomer, { userId });
    if (!customer) throw new ConvexError("No Dodo billing profile exists yet. Complete a test checkout first.");
    const result: { portal_url: string } = await customerPortal(ctx, { send_email: false });
    if (!result.portal_url) throw new ConvexError("Dodo Payments did not return a billing portal URL.");
    return { portalUrl: result.portal_url };
  },
});

export const listTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("creditTransactions").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(20);
  },
});

export const listPayments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("billingPayments").withIndex("by_user", (q) => q.eq("userId", userId)).order("desc").take(20);
  },
});
