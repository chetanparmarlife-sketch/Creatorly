import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const planTier = v.union(v.literal("free"), v.literal("basic"), v.literal("pro"));
const platform = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("tiktok"),
  v.literal("youtube"),
  v.literal("twitter"),
);
const socialPlatform = v.union(
  v.literal("instagram"), v.literal("facebook"), v.literal("tiktok"), v.literal("youtube"), v.literal("linkedin"), v.literal("twitter"),
);
const workspaceKind = v.union(v.literal("agency"), v.literal("brand"), v.literal("talent"));
const workspaceRole = v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("contributor"), v.literal("reviewer"));
const campaignStage = v.union(
  v.literal("discovered"), v.literal("shortlisted"), v.literal("contacted"),
  v.literal("replied"), v.literal("negotiating"), v.literal("contracted"),
  v.literal("creating"), v.literal("in_review"), v.literal("scheduled"),
  v.literal("live"), v.literal("paid"),
);
const instagramMetrics = v.object({
  followingCount: v.optional(v.number()),
  postCount: v.optional(v.number()),
  highlightReelCount: v.optional(v.number()),
  igtvVideoCount: v.optional(v.number()),
  averageLikes: v.optional(v.number()),
  averageComments: v.optional(v.number()),
  averageVideoViews: v.optional(v.number()),
  averageReelViews: v.optional(v.number()),
  engagementRatePercent: v.optional(v.number()),
  minLikes: v.optional(v.number()),
  minComments: v.optional(v.number()),
  minVideoViews: v.optional(v.number()),
  minReelViews: v.optional(v.number()),
  maxLikes: v.optional(v.number()),
  maxComments: v.optional(v.number()),
  maxVideoViews: v.optional(v.number()),
  maxReelViews: v.optional(v.number()),
  isBusinessAccount: v.optional(v.boolean()),
  businessCategoryName: v.optional(v.string()),
});
const youtubeMetrics = v.object({
  videoCount: v.optional(v.number()),
  totalVideoViews: v.optional(v.number()),
  likes: v.optional(v.number()),
  dislikes: v.optional(v.number()),
  comments: v.optional(v.number()),
  shares: v.optional(v.number()),
  views: v.optional(v.number()),
  averageViewDuration: v.optional(v.number()),
  averageViewPercentage: v.optional(v.number()),
  estimatedMinutesWatched: v.optional(v.number()),
  integratedVideoRateMin: v.optional(v.number()),
  integratedVideoRateMax: v.optional(v.number()),
  sponsoredVideoRateMin: v.optional(v.number()),
  sponsoredVideoRateMax: v.optional(v.number()),
  averageRate: v.optional(v.number()),
  subscriberRange: v.optional(v.string()),
  priceRange: v.optional(v.string()),
  uploadsPlaylistId: v.optional(v.string()),
  bannerImageUrl: v.optional(v.string()),
  audience: v.optional(v.array(v.object({
    ageGroup: v.string(),
    gender: v.string(),
    percentage: v.number(),
  }))),
});
const facebookMetrics = v.object({
  engagementRatePercent: v.optional(v.number()),
  averageRate: v.optional(v.number()),
  storyRateMin: v.optional(v.number()),
  storyRateMax: v.optional(v.number()),
  postRateMin: v.optional(v.number()),
  postRateMax: v.optional(v.number()),
  videoRateMin: v.optional(v.number()),
  videoRateMax: v.optional(v.number()),
  pageEngagedUsers: v.optional(v.number()),
  pageImpressions: v.optional(v.number()),
  pageImpressionsOrganic: v.optional(v.number()),
  pageImpressionsPaid: v.optional(v.number()),
  pagePostEngagements: v.optional(v.number()),
  pageViewsTotal: v.optional(v.number()),
  pageImpressionsUnique: v.optional(v.number()),
  pageImpressionsOrganicUnique: v.optional(v.number()),
  pageImpressionsPaidUnique: v.optional(v.number()),
  pageViewsLoggedInUnique: v.optional(v.number()),
  followerRange: v.optional(v.string()),
  priceRange: v.optional(v.string()),
  coverImageUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  audience: v.optional(v.array(v.object({
    ageGroup: v.string(),
    gender: v.string(),
    value: v.number(),
  }))),
  audienceCities: v.optional(v.array(v.object({
    city: v.string(),
    value: v.number(),
  }))),
});

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
    // Keep legacy 4/5 values readable while all new onboarding writes use 1–3.
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
    engagementRatePercent: v.optional(v.number()),
    engagementRateBasis: v.optional(v.union(v.literal("followers"), v.literal("views"))),
    engagementRateBackfilled: v.optional(v.boolean()),
    engagementRateBasisBackfilled: v.optional(v.boolean()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    primaryCategory: v.optional(v.string()),
    categorySearch: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    profileImageStorageId: v.optional(v.id("_storage")),
    biography: v.optional(v.string()),
    gender: v.optional(v.string()),
    age: v.optional(v.number()),
    instagramAccountId: v.optional(v.string()),
    instagramMetrics: v.optional(instagramMetrics),
    youtubeChannelId: v.optional(v.string()),
    youtubeMetrics: v.optional(youtubeMetrics),
    facebookPageId: v.optional(v.string()),
    facebookMetrics: v.optional(facebookMetrics),
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
    .index("by_repository_name", ["isDemo", "displayName"])
    .index("by_repository_location", ["isDemo", "location"])
    .index("by_repository_location_followers", ["isDemo", "location", "followerCount"])
    .index("by_repository_platform_location_followers", ["isDemo", "platform", "location", "followerCount"])
    .index("by_repository_category_location_followers", ["isDemo", "primaryCategory", "location", "followerCount"])
    .index("by_repository_platform_category_location_followers", ["isDemo", "platform", "primaryCategory", "location", "followerCount"])
    .index("by_followers", ["followerCount"])
    .index("by_engagement", ["engagementRateBasis", "engagementRatePercent"])
    .index("by_platform_engagement", ["platform", "engagementRateBasis", "engagementRatePercent"])
    .index("by_engagement_backfilled", ["engagementRateBackfilled"])
    .index("by_engagement_basis_backfilled", ["engagementRateBasisBackfilled"])
    .index("by_platform_followers", ["platform", "followerCount"])
    .index("by_verified_followers", ["isVerified", "followerCount"])
    .index("by_platform_verified_followers", ["platform", "isVerified", "followerCount"])
    .index("by_primary_category", ["primaryCategory"])
    .index("by_category_followers", ["primaryCategory", "followerCount"])
    .index("by_platform_category_followers", ["platform", "primaryCategory", "followerCount"])
    .index("by_category_verified_followers", ["primaryCategory", "isVerified", "followerCount"])
    .index("by_platform_category_verified_followers", ["platform", "primaryCategory", "isVerified", "followerCount"])
    .index("by_normalized_handle", ["normalizedHandle"])
    .index("by_youtube_channel_id", ["youtubeChannelId"])
    .index("by_facebook_page_id", ["facebookPageId"])
    .searchIndex("search_normalized_handle", { searchField: "normalizedHandle", filterFields: ["platform"] })
    .searchIndex("search_display_name", { searchField: "displayName", filterFields: ["platform"] })
    .searchIndex("search_location", { searchField: "location", filterFields: ["platform", "isVerified"] })
    .searchIndex("search_category", { searchField: "categorySearch", filterFields: ["platform", "isVerified"] }),
  profileImageMigrationState: defineTable({
    jobKey: v.string(),
    status: v.union(v.literal("running"), v.literal("complete"), v.literal("failed")),
    cursor: v.optional(v.string()),
    processed: v.number(),
    migrated: v.number(),
    failed: v.number(),
    skipped: v.number(),
    pass: v.number(),
    pageSize: v.number(),
    maxMigrations: v.optional(v.number()),
    sampleCreatorIds: v.optional(v.array(v.id("creators"))),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  }).index("by_job_key", ["jobKey"]),
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
    .index("by_user_creator", ["userId", "creatorId"])
    .index("by_creator", ["creatorId"]),
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
  billingCustomers: defineTable({
    userId: v.id("users"),
    dodoCustomerId: v.string(),
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_dodo_customer", ["dodoCustomerId"]),
  billingSubscriptions: defineTable({
    userId: v.id("users"),
    dodoSubscriptionId: v.string(),
    dodoCustomerId: v.string(),
    dodoProductId: v.string(),
    tier: v.union(v.literal("basic"), v.literal("pro")),
    billingCycle: v.union(v.literal("monthly"), v.literal("annual")),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("paused"),
      v.literal("cancelled"),
      v.literal("failed"),
      v.literal("expired"),
    ),
    nextBillingDate: v.optional(v.number()),
    cancelAtNextBillingDate: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_dodo_subscription", ["dodoSubscriptionId"]),
  billingPayments: defineTable({
    userId: v.id("users"),
    dodoPaymentId: v.string(),
    dodoCustomerId: v.string(),
    dodoProductId: v.optional(v.string()),
    purchaseKind: v.union(v.literal("core_plan"), v.literal("contact_credits"), v.literal("unknown")),
    status: v.union(v.literal("processing"), v.literal("succeeded"), v.literal("failed"), v.literal("cancelled")),
    amount: v.number(),
    currency: v.string(),
    invoiceId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_dodo_payment", ["dodoPaymentId"]),
  billingWebhookEvents: defineTable({
    eventKey: v.string(),
    eventType: v.string(),
    providerObjectId: v.string(),
    processedAt: v.number(),
  }).index("by_event_key", ["eventKey"]),
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
    .index("by_status", ["status"])
    .index("by_associated_creator", ["associatedCreatorId"]),
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
    platform: v.optional(v.union(v.literal("instagram"), v.literal("youtube"), v.literal("facebook"))),
    handle: v.string(),
    normalizedHandle: v.string(),
    displayName: v.string(),
    followerCount: v.number(),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    isVerified: v.boolean(),
    categories: v.array(v.string()),
    youtubeUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    biography: v.optional(v.string()),
    gender: v.optional(v.string()),
    age: v.optional(v.number()),
    instagramAccountId: v.optional(v.string()),
    contentLanguages: v.optional(v.array(v.string())),
    profileType: v.optional(v.string()),
    instagramMetrics: v.optional(instagramMetrics),
    youtubeChannelId: v.optional(v.string()),
    youtubeMetrics: v.optional(youtubeMetrics),
    facebookPageId: v.optional(v.string()),
    facebookMetrics: v.optional(facebookMetrics),
    contactVerificationStatus: v.optional(v.union(v.literal("verified"), v.literal("pending_verification"))),
    contacts: v.array(v.object({
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
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
    goals: v.optional(v.array(v.string())),
    defaultCampaignRole: v.optional(workspaceRole),
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
    updatedAt: v.optional(v.number()),
  }).index("by_workspace", ["workspaceId"]),
  brandDivisions: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    divisionType: v.union(v.literal("brand"), v.literal("product_line"), v.literal("market"), v.literal("region")),
    parentDivisionId: v.optional(v.id("brandDivisions")),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_parent", ["parentDivisionId"]),
  groupCollaborators: defineTable({
    workspaceId: v.id("workspaces"),
    clientId: v.optional(v.id("clients")),
    divisionId: v.optional(v.id("brandDivisions")),
    email: v.string(),
    role: v.union(v.literal("client_reviewer"), v.literal("internal_stakeholder"), v.literal("agency_collaborator")),
    status: v.union(v.literal("invited"), v.literal("active"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_client", ["clientId"])
    .index("by_division", ["divisionId"]),
  savedCreators: defineTable({
    workspaceId: v.id("workspaces"),
    creatorId: v.optional(v.id("creators")),
    source: v.optional(v.union(v.literal("creatorly"), v.literal("csv_upload"), v.literal("manual"), v.literal("extension"))),
    privateDisplayName: v.optional(v.string()),
    privatePlatform: v.optional(socialPlatform),
    privateHandle: v.optional(v.string()),
    privateNormalizedHandle: v.optional(v.string()),
    privateFollowerCount: v.optional(v.number()),
    privateLocation: v.optional(v.string()),
    privateEmail: v.optional(v.string()),
    privateNormalizedEmail: v.optional(v.string()),
    privatePhone: v.optional(v.string()),
    privateWhatsapp: v.optional(v.string()),
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
    .index("by_creator", ["creatorId"])
    .index("by_workspace_creator", ["workspaceId", "creatorId"])
    .index("by_workspace_private_profile", ["workspaceId", "privatePlatform", "privateNormalizedHandle"])
    .index("by_workspace_private_email", ["workspaceId", "privateNormalizedEmail"])
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
    divisionId: v.optional(v.id("brandDivisions")),
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
  deliverables: defineTable({
    workspaceId: v.id("workspaces"),
    campaignId: v.id("campaigns"),
    campaignCreatorId: v.id("campaignCreators"),
    title: v.string(),
    channel: platform,
    format: v.string(),
    dueAt: v.optional(v.number()),
    status: v.union(v.literal("planned"), v.literal("awaiting_content"), v.literal("in_review"), v.literal("changes_requested"), v.literal("approved"), v.literal("scheduled"), v.literal("live")),
    submissionUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_creator", ["campaignCreatorId"])
    .index("by_campaign_status", ["campaignId", "status"])
    .index("by_workspace", ["workspaceId"]),
  approvals: defineTable({
    workspaceId: v.id("workspaces"),
    campaignId: v.id("campaigns"),
    deliverableId: v.id("deliverables"),
    decision: v.union(v.literal("pending"), v.literal("approved"), v.literal("changes_requested")),
    note: v.optional(v.string()),
    reviewerUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_deliverable", ["deliverableId"])
    .index("by_campaign", ["campaignId"])
    .index("by_workspace", ["workspaceId"]),
  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    campaignId: v.optional(v.id("campaigns")),
    savedCreatorId: v.optional(v.id("savedCreators")),
    campaignCreatorId: v.optional(v.id("campaignCreators")),
    title: v.string(),
    status: v.union(v.literal("open"), v.literal("done"), v.literal("cancelled")),
    assigneeMemberId: v.optional(v.id("workspaceMembers")),
    dueAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_campaign", ["campaignId"]),
  activityEvents: defineTable({
    workspaceId: v.id("workspaces"),
    actorUserId: v.id("users"),
    entityType: v.union(v.literal("workspace"), v.literal("saved_creator"), v.literal("campaign"), v.literal("campaign_creator"), v.literal("deliverable"), v.literal("approval"), v.literal("task")),
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
