import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const planTier = v.union(v.literal("free"), v.literal("basic"), v.literal("pro"));
const platform = v.union(v.literal("instagram"), v.literal("youtube"));

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    companyName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
    currentPlanTier: v.optional(planTier),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("trial"),
      ),
    ),
    creditBalance: v.optional(v.number()),
    monthlyCreditsIncluded: v.optional(v.number()),
    monthlyCreditsResetDate: v.optional(v.number()),
    notificationPreferences: v.optional(
      v.object({
        requestFulfilled: v.boolean(),
        lowBalance: v.boolean(),
        expirationWarning: v.boolean(),
        weeklySummary: v.boolean(),
      }),
    ),
    isEmailVerified: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
  creators: defineTable({
    platform,
    handle: v.string(),
    normalizedHandle: v.string(),
    displayName: v.string(),
    followerCount: v.number(),
    location: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    isVerified: v.boolean(),
    isDemo: v.boolean(),
    addedToRepositoryAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_normalized_handle", ["normalizedHandle"]),
  contacts: defineTable({
    creatorId: v.id("creators"),
    contactType: v.union(
      v.literal("creator_direct"),
      v.literal("manager"),
      v.literal("agent"),
      v.literal("assistant"),
      v.literal("pr_rep"),
    ),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    contextualNotes: v.optional(v.string()),
    verificationStatus: v.union(
      v.literal("verified"),
      v.literal("pending_verification"),
      v.literal("unverified"),
    ),
    lastVerifiedAt: v.number(),
    isActive: v.boolean(),
    accessTier: v.union(v.literal("basic"), v.literal("pro")),
    isDemo: v.boolean(),
  }).index("by_creator", ["creatorId"]),
  unlockRecords: defineTable({
    userId: v.id("users"),
    creatorId: v.id("creators"),
    unlockedAt: v.number(),
    expiresAt: v.number(),
    creditsSpent: v.number(),
    planTierAtUnlock: planTier,
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("re_unlocked"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_creator", ["userId", "creatorId"]),
  creditTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    transactionType: v.union(
      v.literal("signup_bonus"),
      v.literal("subscription_allocation"),
      v.literal("purchase"),
      v.literal("unlock_usage"),
      v.literal("admin_adjustment"),
      v.literal("refund"),
    ),
    description: v.string(),
    referenceId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  contactRequests: defineTable({
    userId: v.id("users"),
    requestedHandle: v.string(),
    requestedPlatform: platform,
    status: v.union(
      v.literal("pending"),
      v.literal("fulfilled"),
      v.literal("declined"),
    ),
    requestDate: v.number(),
    fulfilledDate: v.optional(v.number()),
    notificationSent: v.boolean(),
    associatedCreatorId: v.optional(v.id("creators")),
  }).index("by_user", ["userId"]),
});
