import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

export const reportWrongContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to report a contact.");

    const contact = await ctx.db.get(args.contactId);
    if (!contact || !contact.isActive) throw new ConvexError("Contact not found.");

    const existing = await ctx.db
      .query("contactFlags")
      .withIndex("by_user_contact", (q) => q.eq("userId", userId).eq("contactId", args.contactId))
      .first();
    if (existing) return { status: "already_reported" as const, flagId: existing._id };

    const flagId = await ctx.db.insert("contactFlags", {
      userId,
      creatorId: contact.creatorId,
      contactId: args.contactId,
      reason: "wrong_contact",
      status: "open",
      createdAt: Date.now(),
    });
    return { status: "created" as const, flagId };
  },
});
