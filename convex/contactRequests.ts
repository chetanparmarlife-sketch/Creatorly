import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { normalize } from "./lib/matching";

const platform = v.union(v.literal("instagram"), v.literal("youtube"));

export const create = mutation({
  args: {
    platform,
    handle: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to request a contact.");

    const handle = args.handle.trim().replace(/^@+/, "");
    const normalizedHandle = normalize(handle);
    if (normalizedHandle.length < 2) {
      throw new ConvexError("Enter a valid creator handle.");
    }

    const existing = (
      await ctx.db
        .query("contactRequests")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).find((request) =>
      request.status === "pending"
      && request.requestedPlatform === args.platform
      && (request.normalizedHandle ?? normalize(request.requestedHandle)) === normalizedHandle
    );
    if (existing) return { status: "already_pending" as const, requestId: existing._id };

    const requestId = await ctx.db.insert("contactRequests", {
      userId,
      requestedHandle: `@${handle}`,
      normalizedHandle,
      requestedPlatform: args.platform,
      notes: args.notes?.trim() || undefined,
      status: "pending",
      requestDate: Date.now(),
      notificationSent: false,
    });
    return { status: "created" as const, requestId };
  },
});
