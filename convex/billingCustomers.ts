import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getDodoCustomer = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => ctx.db
    .query("billingCustomers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique(),
});

export const getCheckoutUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const customer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      email: user.email ?? "",
      name: user.name ?? "Creatorly customer",
      companyName: user.companyName,
      dodoCustomerId: customer?.dodoCustomerId,
    };
  },
});
