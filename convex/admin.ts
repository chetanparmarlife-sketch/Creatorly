import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { isRepositoryEligible, MIN_REPOSITORY_FOLLOWERS } from "./lib/repositoryPolicy";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalize } from "./lib/matching";

const platform = v.union(v.literal("instagram"), v.literal("youtube"));
const contactType = v.union(
  v.literal("creator_direct"),
  v.literal("manager"),
  v.literal("agent"),
  v.literal("assistant"),
  v.literal("pr_rep"),
);
const accessTier = v.union(v.literal("basic"), v.literal("pro"));

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to access the admin queue.");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") throw new ConvexError("Admin access required.");
  return user;
}

export const listRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db
      .query("contactRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    return Promise.all(requests.map(async (request) => {
      const user = await ctx.db.get(request.userId);
      return {
        id: request._id,
        requestedHandle: request.requestedHandle,
        requestedPlatform: request.requestedPlatform,
        notes: request.notes,
        requestDate: request.requestDate,
        requester: {
          name: user?.name ?? "Creatorly user",
          email: user?.email ?? "",
          companyName: user?.companyName ?? "Agency",
        },
      };
    }));
  },
});

export const fulfillRequest = mutation({
  args: {
    requestId: v.id("contactRequests"),
    creator: v.object({
      platform,
      handle: v.string(),
      displayName: v.string(),
      followerCount: v.number(),
      location: v.optional(v.string()),
      isVerified: v.boolean(),
    }),
    contact: v.object({
      contactType,
      name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
      contextualNotes: v.optional(v.string()),
      accessTier,
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") throw new ConvexError("Pending request not found.");

    const handle = args.creator.handle.trim().replace(/^@+/, "");
    const normalizedHandle = normalize(handle);
    const requestedNormalized = request.normalizedHandle ?? normalize(request.requestedHandle);
    if (args.creator.platform !== request.requestedPlatform || normalizedHandle !== requestedNormalized) {
      throw new ConvexError("Creator platform and handle must match the request.");
    }
    if (!args.creator.displayName.trim() || !args.contact.name.trim()) {
      throw new ConvexError("Enter the creator and contact names.");
    }
    if (!isRepositoryEligible(Math.round(args.creator.followerCount))) {
      throw new ConvexError(`Repository creators need at least ${MIN_REPOSITORY_FOLLOWERS.toLocaleString("en-US")} followers.`);
    }
    if (!args.contact.email && !args.contact.phone && !args.contact.whatsapp) {
      throw new ConvexError("Add at least one contact method.");
    }

    const existingCreator = await ctx.db
      .query("creators")
      .withIndex("by_normalized_handle", (q) => q.eq("normalizedHandle", normalizedHandle))
      .filter((q) => q.eq(q.field("platform"), args.creator.platform))
      .first();
    const now = Date.now();
    const creatorId = existingCreator?._id ?? await ctx.db.insert("creators", {
      platform: args.creator.platform,
      handle: `@${handle}`,
      normalizedHandle,
      displayName: args.creator.displayName.trim(),
      followerCount: Math.max(0, Math.round(args.creator.followerCount)),
      location: args.creator.location?.trim() || undefined,
      isVerified: args.creator.isVerified,
      isDemo: false,
      addedToRepositoryAt: now,
      lastUpdatedAt: now,
    });

    await ctx.db.insert("contacts", {
      creatorId,
      contactType: args.contact.contactType,
      name: args.contact.name.trim(),
      email: args.contact.email?.trim() || undefined,
      phone: args.contact.phone?.trim() || undefined,
      whatsapp: args.contact.whatsapp?.trim() || undefined,
      contextualNotes: args.contact.contextualNotes?.trim() || undefined,
      verificationStatus: "verified",
      lastVerifiedAt: now,
      isActive: true,
      accessTier: args.contact.accessTier,
      isDemo: false,
    });

    const pending = await ctx.db
      .query("contactRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    const matching = pending.filter((item) =>
      item.requestedPlatform === args.creator.platform
      && (item.normalizedHandle ?? normalize(item.requestedHandle)) === normalizedHandle
    );
    await Promise.all(matching.map((item) => ctx.db.patch(item._id, {
      status: "fulfilled",
      fulfilledDate: now,
      associatedCreatorId: creatorId,
      notificationSent: true,
    })));

    await Promise.all(matching.map((item) => ctx.db.insert("notifications", {
      userId: item.userId,
      type: "request_fulfilled",
      title: `${args.creator.displayName} is now available`,
      message: `The contact you requested for @${handle} has been added.`,
      href: `/creator/${creatorId}`,
      createdAt: now,
    })));

    return { creatorId, fulfilledCount: matching.length };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(100);
    return users.map(user => ({
      id: user._id,
      name: user.name ?? "Creatorly user",
      email: user.email ?? "",
      companyName: user.companyName ?? "Agency",
      role: user.role ?? "user",
      currentPlanTier: user.currentPlanTier ?? "free",
      creditBalance: user.creditBalance ?? 0,
      subscriptionStatus: user.subscriptionStatus ?? "active",
    }));
  },
});

export const promoteByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
    if (!user) throw new ConvexError("User not found. Sign up first.");
    await ctx.db.patch(user._id, { role: "admin" });
    return { userId: user._id, email, role: "admin" as const };
  },
});
