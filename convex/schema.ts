import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const planTier = v.union(v.literal("free"), v.literal("basic"), v.literal("pro"));
const platform = v.union(
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("youtube"),
  v.literal("twitter"),
);
const socialPlatform = v.union(
  v.literal("instagram"), v.literal("tiktok"), v.literal("youtube"), v.literal("linkedin"), v.literal("twitter"),
);
const workspaceKind = v.union(v.literal("agency"), v.literal("brand"), v.literal("talent"));
const workspaceRole = v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("contributor"), v.literal("reviewer"));
const campaignStage = v.union(
  v.literal("discovered"), v.literal("shortlisted"), v.literal("contacted"),
  v.literal("replied"), v.literal("negotiating"), v.literal("contracted"),
  v.literal("creating"), v.literal("in_review"), v.literal("scheduled"),
  v.literal("live"), v.literal("paid"),
);

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
    subscriptionRenewalDate: v.optional(v.number()),
    cancellationRequestedAt: v.optional(v.number()),
    onboardingCompleted: v.optional(v.boolean()),
    onboardingStep: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3), v.literal(4), v.literal(5))),
    onboardingPlanTier: v.optional(planTier),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
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
    activeWorkspaceId: v.optional(v.id("workspaces")),
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
    categories: v.optional(v.array(v.string())),
    primaryCategory: v.optional(v.string()),
    categorySearch: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    contentLanguages: v.optional(v.array(v.string())),
    profileType: v.optional(v.string()),
    contentQuality: v.optional(v.string()),
    managementType: v.optional(v.union(v.literal("self_managed"), v.literal("talent_managed"))),
    isVerified: v.boolean(),
    isDemo: v.boolean(),
    addedToRepositoryAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_followers", ["followerCount"])
    .index("by_platform_followers", ["platform", "followerCount"])
    .index("by_verified_followers", ["isVerified", "followerCount"])
    .index("by_platform_verified_followers", ["platform", "isVerified", "followerCount"])
    .index("by_primary_category", ["primaryCategory"])
    .index("by_category_followers", ["primaryCategory", "followerCount"])
    .index("by_platform_category_followers", ["platform", "primaryCategory", "followerCount"])
    .index("by_category_verified_followers", ["primaryCategory", "isVerified", "followerCount"])
    .index("by_platform_category_verified_followers", ["platform", "primaryCategory", "isVerified", "followerCount"])
    .index("by_normalized_handle", ["normalizedHandle"])
    .searchIndex("search_normalized_handle", { searchField: "normalizedHandle", filterFields: ["platform"] })
    .searchIndex("search_display_name", { searchField: "displayName", filterFields: ["platform"] })
    .searchIndex("search_location", { searchField: "location", filterFields: ["platform", "isVerified"] })
    .searchIndex("search_category", { searchField: "categorySearch", filterFields: ["platform", "isVerified"] }),
  creatorSocialProfiles: defineTable({
    creatorId: v.id("creators"),
    platform: socialPlatform,
    handle: v.string(),
    normalizedHandle: v.string(),
    url: v.string(),
    followerCount: v.optional(v.number()),
    isVerified: v.optional(v.boolean()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_platform_handle", ["platform", "normalizedHandle"]),
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
  contactFlags: defineTable({
    userId: v.id("users"),
    creatorId: v.id("creators"),
    contactId: v.id("contacts"),
    reason: v.literal("wrong_contact"),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_user_contact", ["userId", "contactId"])
    .index("by_contact", ["contactId"]),
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
    normalizedHandle: v.optional(v.string()),
    requestedPlatform: platform,
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("fulfilled"),
      v.literal("declined"),
    ),
    requestDate: v.number(),
    fulfilledDate: v.optional(v.number()),
    notificationSent: v.boolean(),
    associatedCreatorId: v.optional(v.id("creators")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("request_fulfilled"),
      v.literal("low_balance"),
      v.literal("expiration_warning"),
      v.literal("weekly_summary"),
      v.literal("payment"),
      v.literal("system"),
    ),
    title: v.string(),
    message: v.string(),
    href: v.optional(v.string()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  extensionTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),
  creatorImportStaging: defineTable({
    sourceKey: v.string(),
    handle: v.string(),
    normalizedHandle: v.string(),
    displayName: v.string(),
    followerCount: v.number(),
    location: v.optional(v.string()),
    isVerified: v.boolean(),
    categories: v.array(v.string()),
    youtubeUrl: v.optional(v.string()),
    contacts: v.array(v.object({
      email: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
    })),
    processed: v.optional(v.boolean()),
  })
    .index("by_source_key", ["sourceKey"])
    .index("by_processed", ["processed"]),
  workspaces: defineTable({
    name: v.string(),
    kind: workspaceKind,
    website: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_created_by", ["createdBy"]),
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.id("users")),
    email: v.string(),
    role: workspaceRole,
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_user", ["workspaceId", "userId"])
    .index("by_user", ["userId"])
    .index("by_workspace_email", ["workspaceId", "email"]),
  clients: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    website: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),
  savedCreators: defineTable({
    workspaceId: v.id("workspaces"),
    creatorId: v.id("creators"),
    ownerMemberId: v.optional(v.id("workspaceMembers")),
    relationshipStage: campaignStage,
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    tags: v.array(v.string()),
    nextAction: v.optional(v.string()),
    nextActionAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_creator", ["workspaceId", "creatorId"])
    .index("by_workspace_stage", ["workspaceId", "relationshipStage"]),
  creatorLists: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),
  creatorListMembers: defineTable({
    workspaceId: v.id("workspaces"),
    listId: v.id("creatorLists"),
    savedCreatorId: v.id("savedCreators"),
    createdAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_creator", ["listId", "savedCreatorId"])
    .index("by_workspace", ["workspaceId"]),
  campaigns: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.optional(v.id("clients")),
    name: v.string(),
    goal: v.string(),
    platforms: v.array(platform),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("paused"), v.literal("completed"), v.literal("archived")),
    ownerMemberId: v.optional(v.id("workspaceMembers")),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    currency: v.string(),
    budget: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),
  campaignCreators: defineTable({
    workspaceId: v.id("workspaces"),
    campaignId: v.id("campaigns"),
    savedCreatorId: v.id("savedCreators"),
    stage: campaignStage,
    ownerMemberId: v.optional(v.id("workspaceMembers")),
    nextAction: v.optional(v.string()),
    nextActionAt: v.optional(v.number()),
    agreedFee: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_stage", ["campaignId", "stage"])
    .index("by_campaign_creator", ["campaignId", "savedCreatorId"])
    .index("by_workspace", ["workspaceId"]),
  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    campaignId: v.optional(v.id("campaigns")),
    savedCreatorId: v.optional(v.id("savedCreators")),
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("done"), v.literal("cancelled")),
    assigneeMemberId: v.optional(v.id("workspaceMembers")),
    dueAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),
  activityEvents: defineTable({
    workspaceId: v.id("workspaces"),
    actorUserId: v.id("users"),
    entityType: v.union(v.literal("workspace"), v.literal("saved_creator"), v.literal("campaign"), v.literal("campaign_creator"), v.literal("task")),
    entityId: v.string(),
    action: v.string(),
    summary: v.string(),
    previousValue: v.optional(v.string()),
    nextValue: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_created_at", ["workspaceId", "createdAt"]),
});
