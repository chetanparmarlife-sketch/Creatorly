import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { biographyContainsVerificationCode, mapApifyClaimProfile, type ClaimEnrichmentResult } from "./lib/apifyClaim";
import { requireVerifiedEmail } from "./lib/emailVerification";

const enrichRef = makeFunctionReference<"action">("creatorClaims:enrich") as unknown as FunctionReference<"action", "internal", { claimId: Id<"creatorClaims">; instagramHandle: string; instagramUrl: string }, void>;
const markEnrichmentRunningRef = makeFunctionReference<"mutation">("creatorClaims:markEnrichmentRunning") as unknown as FunctionReference<"mutation", "internal", { claimId: Id<"creatorClaims">; actorId: string }, void>;
const applyEnrichmentRef = makeFunctionReference<"mutation">("creatorClaims:applyEnrichment") as unknown as FunctionReference<"mutation", "internal", { claimId: Id<"creatorClaims">; actorId: string; result?: ClaimEnrichmentResult; error?: string }, void>;
const getVerificationClaimRef = makeFunctionReference<"query">("creatorClaims:getVerificationClaim") as unknown as FunctionReference<"query", "internal", { claimId: Id<"creatorClaims">; userId: Id<"users"> }, Doc<"creatorClaims">>;
const recordOwnershipAssertionRef = makeFunctionReference<"mutation">("creatorClaims:recordOwnershipAssertion") as unknown as FunctionReference<"mutation", "internal", { claimId: Id<"creatorClaims">; userId: Id<"users">; verificationMethod: "instagram_bio" | "business_email" | "website_backlink"; verificationCode: string; instagramBioVerified: boolean }, { status: "ownership_claimed_by_user" }>;
const copyCreatorImageRef = makeFunctionReference<"action">("profileImageMigration:copyCreatorImage") as unknown as FunctionReference<"action", "internal", { creatorId: Id<"creators"> }, { stored: boolean }>;

const activeStatuses = new Set<Doc<"creatorClaims">["status"]>([
  "draft", "enrichment_pending", "ready_for_verification", "ownership_claimed_by_user", "verified", "review_required", "published",
]);

const contactPreference = v.union(v.literal("direct"), v.literal("manager_only"), v.literal("not_contactable"));
const verificationMethod = v.union(v.literal("instagram_bio"), v.literal("business_email"), v.literal("website_backlink"));
const rateValidator = v.object({
  deliverableType: v.string(),
  currency: v.string(),
  minimum: v.optional(v.number()),
  maximum: v.optional(v.number()),
  negotiable: v.boolean(),
});

function clean(value?: string) {
  return value?.trim() || undefined;
}

function normalizeInstagramInput(value: string) {
  const input = value.trim();
  if (!input) throw new ConvexError("Enter an Instagram profile URL or handle.");
  let candidate = input.replace(/^@+/, "");
  if (/^https?:\/\//i.test(candidate) || /^www\./i.test(candidate) || /^instagram\.com\//i.test(candidate)) {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    let url: URL;
    try { url = new URL(withProtocol); } catch { throw new ConvexError("Enter a valid Instagram profile URL."); }
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "instagram.com") throw new ConvexError("Use an instagram.com profile URL.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1 || ["p", "reel", "reels", "stories", "explore"].includes(parts[0].toLowerCase())) {
      throw new ConvexError("Use a profile URL, not a post, reel, or story URL.");
    }
    candidate = parts[0];
  }
  const handle = candidate.replace(/\/$/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) throw new ConvexError("Instagram handles may contain letters, numbers, periods, and underscores.");
  return { handle: `@${handle}`, normalizedHandle: handle.toLowerCase(), url: `https://www.instagram.com/${handle}/` };
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to claim a creator profile.");
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("Account not found.");
  return { userId, user };
}

async function requireOwner(ctx: QueryCtx | MutationCtx, claimId: Id<"creatorClaims">) {
  const { userId, user } = await requireUser(ctx);
  const claim = await ctx.db.get(claimId);
  if (!claim || claim.userId !== userId) throw new ConvexError("Claim not found.");
  return { userId, user, claim };
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admin access required.");
  return { userId, user };
}

function profileComplete(claim: Pick<Doc<"creatorClaims">, "displayName" | "categories" | "languages" | "country" | "contactPreference" | "businessEmail" | "whatsapp" | "managerName" | "managerEmail" | "managerWhatsapp">) {
  if (!claim.displayName || !claim.categories.length || !claim.languages.length || !claim.country) return false;
  if (claim.contactPreference === "direct" && !claim.businessEmail && !claim.whatsapp) return false;
  if (claim.contactPreference === "manager_only" && (!claim.managerName || (!claim.managerEmail && !claim.managerWhatsapp))) return false;
  return true;
}

async function claimResult(ctx: QueryCtx, claim: Doc<"creatorClaims">) {
  const assets = await ctx.db.query("creatorClaimAssets").withIndex("by_claim", q => q.eq("claimId", claim._id)).collect();
  return {
    ...claim,
    id: claim._id,
    assets: await Promise.all(assets.map(async asset => ({
      ...asset,
      id: asset._id,
      url: await ctx.storage.getUrl(asset.storageId),
    }))),
  };
}

async function runApifyInstagramProfile(instagramHandle: string) {
  const token = process.env.APIFY_API_TOKEN?.trim();
  const actorId = (process.env.APIFY_CREATOR_CLAIM_ACTOR_ID?.trim() || "apify~instagram-profile-scraper").replace("/", "~");
  if (!token) throw new ConvexError("Instagram ownership checking is not configured. Try another method or contact Creatorly support.");
  const endpoint = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=180&clean=true`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ usernames: [instagramHandle.replace(/^@/, "")], includeAboutSection: process.env.APIFY_CREATOR_CLAIM_INCLUDE_ABOUT === "true" }),
  });
  if (!response.ok) throw new Error(`Apify returned ${response.status}.`);
  return mapApifyClaimProfile(await response.json(), instagramHandle);
}

export const lookupInstagram = query({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const identity = normalizeInstagramInput(args.input);
    const social = await ctx.db.query("creatorSocialProfiles")
      .withIndex("by_platform_handle", q => q.eq("platform", "instagram").eq("normalizedHandle", identity.normalizedHandle))
      .first();
    const creator = social
      ? await ctx.db.get(social.creatorId)
      : await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", identity.normalizedHandle))
        .filter(q => q.eq(q.field("platform"), "instagram")).first();
    return {
      normalizedHandle: identity.normalizedHandle,
      instagramUrl: identity.url,
      match: creator ? {
        creatorId: creator._id,
        displayName: creator.displayName,
        handle: creator.handle,
        followerCount: creator.followerCount,
        profileImageUrl: creator.profileImageUrl,
        isVerified: creator.isVerified,
      } : null,
    };
  },
});

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const claims = await ctx.db.query("creatorClaims").withIndex("by_user", q => q.eq("userId", userId)).order("desc").take(10);
    const claim = claims.find(item => activeStatuses.has(item.status)) ?? claims[0];
    return claim ? claimResult(ctx, claim) : null;
  },
});

export const start = mutation({
  args: { input: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    requireVerifiedEmail(user, "start an ownership claim");
    const identity = normalizeInstagramInput(args.input);
    const existingClaims = await ctx.db.query("creatorClaims").withIndex("by_handle", q => q.eq("normalizedInstagramHandle", identity.normalizedHandle)).collect();
    const owned = existingClaims.find(item => item.userId === userId && activeStatuses.has(item.status));
    if (owned) return { claimId: owned._id };
    if (existingClaims.some(item => item.userId !== userId && ["verified", "review_required", "published"].includes(item.status))) {
      throw new ConvexError("This Instagram profile already has an active ownership claim. Creatorly support must review it.");
    }
    const social = await ctx.db.query("creatorSocialProfiles")
      .withIndex("by_platform_handle", q => q.eq("platform", "instagram").eq("normalizedHandle", identity.normalizedHandle)).first();
    const creator = social
      ? await ctx.db.get(social.creatorId)
      : await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", identity.normalizedHandle))
        .filter(q => q.eq(q.field("platform"), "instagram")).first();
    const now = Date.now();
    const claimId = await ctx.db.insert("creatorClaims", {
      userId,
      creatorId: creator?._id,
      instagramHandle: identity.handle,
      normalizedInstagramHandle: identity.normalizedHandle,
      instagramUrl: identity.url,
      displayName: creator?.displayName,
      biography: creator?.biography,
      categories: creator?.categories ?? [],
      languages: creator?.contentLanguages ?? [],
      country: creator?.country,
      city: creator?.city,
      postalCode: creator?.postalCode,
      websiteUrl: creator?.websiteUrl,
      managementType: creator?.managementType,
      contactPreference: "direct",
      rates: [],
      status: "enrichment_pending",
      enrichmentStatus: "queued",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(userId, { persona: user.persona === "buyer" ? "both" : user.persona ?? "creator", updatedAt: now });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId, actorUserId: userId, eventType: "claim_started", createdAt: now });
    await ctx.scheduler.runAfter(0, enrichRef, { claimId, instagramHandle: identity.handle, instagramUrl: identity.url });
    return { claimId };
  },
});

export const enrich = internalAction({
  args: { claimId: v.id("creatorClaims"), instagramHandle: v.string(), instagramUrl: v.string() },
  handler: async (ctx, args) => {
    const actorId = (process.env.APIFY_CREATOR_CLAIM_ACTOR_ID?.trim() || "apify~instagram-profile-scraper").replace("/", "~");
    if (!process.env.APIFY_API_TOKEN?.trim()) {
      await ctx.runMutation(applyEnrichmentRef, { claimId: args.claimId, actorId, error: "Apify creator-claim enrichment is not configured." });
      return;
    }
    await ctx.runMutation(markEnrichmentRunningRef, { claimId: args.claimId, actorId });
    try {
      const result = await runApifyInstagramProfile(args.instagramHandle);
      await ctx.runMutation(applyEnrichmentRef, { claimId: args.claimId, actorId, result });
    } catch (error) {
      await ctx.runMutation(applyEnrichmentRef, { claimId: args.claimId, actorId, error: error instanceof Error ? error.message : "Apify profile enrichment failed." });
    }
  },
});

export const markEnrichmentRunning = internalMutation({
  args: { claimId: v.id("creatorClaims"), actorId: v.string() },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim) return;
    await ctx.db.patch(claim._id, { enrichmentStatus: "running", enrichmentProvider: "apify", enrichmentActorId: args.actorId, updatedAt: Date.now() });
  },
});

export const applyEnrichment = internalMutation({
  args: {
    claimId: v.id("creatorClaims"),
    actorId: v.string(),
    result: v.optional(v.object({ displayName: v.optional(v.string()), biography: v.optional(v.string()), businessCategoryName: v.optional(v.string()), categories: v.optional(v.array(v.string())), country: v.optional(v.string()), city: v.optional(v.string()), websiteUrl: v.optional(v.string()), businessEmail: v.optional(v.string()), followerCount: v.optional(v.number()), followingCount: v.optional(v.number()), postCount: v.optional(v.number()), engagementRatePercent: v.optional(v.number()), profileImageUrl: v.optional(v.string()), isVerified: v.optional(v.boolean()), isPrivate: v.optional(v.boolean()), isBusinessAccount: v.optional(v.boolean()) })),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim) return;
    const now = Date.now();
    if (!args.result) {
      await ctx.db.patch(claim._id, { enrichmentStatus: "failed", enrichmentProvider: "apify", enrichmentActorId: args.actorId, enrichmentRunAt: now, updatedAt: now });
      await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, eventType: "enrichment_failed", detail: args.error?.slice(0, 400), createdAt: now });
      return;
    }
    const result = args.result;
    await ctx.db.patch(claim._id, {
      displayName: clean(result.displayName) ?? claim.displayName,
      biography: clean(result.biography) ?? claim.biography,
      categories: result.categories?.map(item => item.trim()).filter(Boolean).slice(0, 8) ?? claim.categories,
      country: clean(result.country) ?? claim.country,
      city: clean(result.city) ?? claim.city,
      websiteUrl: clean(result.websiteUrl) ?? claim.websiteUrl,
      businessEmail: clean(result.businessEmail)?.toLowerCase() ?? claim.businessEmail,
      enrichmentStatus: "complete",
      enrichmentProvider: "apify",
      enrichmentActorId: args.actorId,
      enrichmentRunAt: now,
      enrichedFollowerCount: result.followerCount,
      enrichedFollowingCount: result.followingCount,
      enrichedPostCount: result.postCount,
      enrichedEngagementRatePercent: result.engagementRatePercent,
      enrichedProfileImageUrl: result.profileImageUrl,
      enrichedBusinessCategoryName: result.businessCategoryName,
      enrichedIsVerified: result.isVerified,
      enrichedIsPrivate: result.isPrivate,
      enrichedIsBusinessAccount: result.isBusinessAccount,
      updatedAt: now,
    });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, eventType: "enrichment_complete", createdAt: now });
  },
});

export const saveProfile = mutation({
  args: {
    claimId: v.id("creatorClaims"),
    displayName: v.string(),
    biography: v.optional(v.string()),
    categories: v.array(v.string()),
    languages: v.array(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    businessEmail: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    managementType: v.union(v.literal("self_managed"), v.literal("talent_managed")),
    managerName: v.optional(v.string()),
    managerEmail: v.optional(v.string()),
    managerWhatsapp: v.optional(v.string()),
    contactPreference,
    rates: v.array(rateValidator),
  },
  handler: async (ctx, args) => {
    const { userId, claim } = await requireOwner(ctx, args.claimId);
    if (["published", "suspended"].includes(claim.status)) throw new ConvexError("This published claim must be edited through profile maintenance.");
    const displayName = args.displayName.trim();
    if (!displayName) throw new ConvexError("Enter your creator name.");
    const categories = [...new Set(args.categories.map(item => item.trim()).filter(Boolean))].slice(0, 8);
    const languages = [...new Set(args.languages.map(item => item.trim()).filter(Boolean))].slice(0, 12);
    const rates = args.rates.map(rate => {
      const minimum = rate.minimum === undefined ? undefined : Math.round(rate.minimum);
      const maximum = rate.maximum === undefined ? undefined : Math.round(rate.maximum);
      if (minimum !== undefined && minimum < 0 || maximum !== undefined && maximum < 0) throw new ConvexError("Rates cannot be negative.");
      if (minimum !== undefined && maximum !== undefined && maximum < minimum) throw new ConvexError("Maximum rate must be greater than or equal to minimum rate.");
      return { deliverableType: rate.deliverableType.trim(), currency: rate.currency.trim().toUpperCase(), minimum, maximum, negotiable: rate.negotiable };
    }).filter(rate => rate.deliverableType && rate.currency).slice(0, 12);
    const fields = {
      displayName,
      biography: clean(args.biography),
      categories,
      languages,
      country: clean(args.country),
      city: clean(args.city),
      postalCode: clean(args.postalCode),
      websiteUrl: clean(args.websiteUrl),
      businessEmail: clean(args.businessEmail)?.toLowerCase(),
      whatsapp: clean(args.whatsapp),
      managementType: args.managementType,
      managerName: args.managementType === "talent_managed" ? clean(args.managerName) : undefined,
      managerEmail: args.managementType === "talent_managed" ? clean(args.managerEmail)?.toLowerCase() : undefined,
      managerWhatsapp: args.managementType === "talent_managed" ? clean(args.managerWhatsapp) : undefined,
      contactPreference: args.contactPreference,
      rates,
    };
    const nextStatus = profileComplete(fields) ? "ready_for_verification" as const : "draft" as const;
    const status = ["ownership_claimed_by_user", "verified", "review_required"].includes(claim.status) ? claim.status : nextStatus;
    const now = Date.now();
    await ctx.db.patch(claim._id, { ...fields, status, updatedAt: now });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, actorUserId: userId, eventType: "profile_saved", createdAt: now });
    return { status };
  },
});

export const generateUploadUrl = mutation({
  args: { claimId: v.id("creatorClaims") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.claimId);
    return ctx.storage.generateUploadUrl();
  },
});

export const saveAsset = mutation({
  args: {
    claimId: v.id("creatorClaims"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("media_kit"), v.literal("audience_screenshot")),
    fileName: v.string(),
    contentType: v.string(),
    byteSize: v.number(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwner(ctx, args.claimId);
    const allowed = args.kind === "media_kit" ? ["application/pdf"] : ["image/jpeg", "image/png", "image/webp"];
    const maximum = args.kind === "media_kit" ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!allowed.includes(args.contentType) || args.byteSize <= 0 || args.byteSize > maximum) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError(args.kind === "media_kit" ? "Upload one PDF up to 20 MB." : "Upload a JPG, PNG, or WebP image up to 8 MB.");
    }
    const existing = await ctx.db.query("creatorClaimAssets").withIndex("by_claim", q => q.eq("claimId", args.claimId)).collect();
    if (args.kind === "media_kit") {
      for (const asset of existing.filter(item => item.kind === "media_kit")) {
        await ctx.storage.delete(asset.storageId);
        await ctx.db.delete(asset._id);
      }
    } else if (existing.filter(item => item.kind === "audience_screenshot").length >= 10) {
      await ctx.storage.delete(args.storageId);
      throw new ConvexError("You can keep up to 10 audience screenshots.");
    }
    const assetId = await ctx.db.insert("creatorClaimAssets", {
      claimId: args.claimId,
      userId,
      kind: args.kind,
      storageId: args.storageId,
      fileName: args.fileName.trim().slice(0, 160),
      contentType: args.contentType,
      byteSize: args.byteSize,
      label: clean(args.label),
      createdAt: Date.now(),
    });
    return { assetId };
  },
});

export const removeAsset = mutation({
  args: { assetId: v.id("creatorClaimAssets") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.userId !== userId) throw new ConvexError("Asset not found.");
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(asset._id);
    return { removed: true };
  },
});

export const issueVerification = mutation({
  args: { claimId: v.id("creatorClaims"), method: verificationMethod },
  handler: async (ctx, args) => {
    const { userId, claim } = await requireOwner(ctx, args.claimId);
    if (!profileComplete(claim)) throw new ConvexError("Complete the required profile fields before verification.");
    if (args.method === "business_email" && !claim.businessEmail) throw new ConvexError("Add a business email first.");
    if (args.method === "website_backlink" && !claim.websiteUrl) throw new ConvexError("Add your public website first.");
    const code = `CRLY-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const now = Date.now();
    await ctx.db.patch(claim._id, {
      verificationMethod: args.method,
      verificationCode: code,
      verificationExpiresAt: now + 24 * 60 * 60 * 1000,
      verificationSubmittedAt: undefined,
      verifiedAt: undefined,
      status: "ready_for_verification",
      updatedAt: now,
    });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, actorUserId: userId, eventType: "verification_issued", detail: args.method, createdAt: now });
    return { code, expiresAt: now + 24 * 60 * 60 * 1000 };
  },
});

export const getVerificationClaim = internalQuery({
  args: { claimId: v.id("creatorClaims"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.userId !== args.userId) throw new ConvexError("Claim not found.");
    return claim;
  },
});

export const recordOwnershipAssertion = internalMutation({
  args: {
    claimId: v.id("creatorClaims"),
    userId: v.id("users"),
    verificationMethod,
    verificationCode: v.string(),
    instagramBioVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.userId !== args.userId) throw new ConvexError("Claim not found.");
    if (claim.verificationMethod !== args.verificationMethod || claim.verificationCode !== args.verificationCode || !claim.verificationExpiresAt) {
      throw new ConvexError("This ownership challenge changed. Submit the latest challenge instead.");
    }
    if (claim.verificationExpiresAt <= Date.now()) throw new ConvexError("This ownership challenge expired. Create a new one.");
    if (claim.verificationMethod === "instagram_bio" && !args.instagramBioVerified) {
      throw new ConvexError("Creatorly could not verify the Instagram bio code.");
    }
    const now = Date.now();
    await ctx.db.patch(claim._id, {
      verificationSubmittedAt: now,
      verifiedAt: args.instagramBioVerified ? now : undefined,
      status: "ownership_claimed_by_user",
      updatedAt: now,
    });
    await ctx.db.insert("creatorClaimAuditEvents", {
      claimId: claim._id,
      actorUserId: args.userId,
      eventType: args.instagramBioVerified ? "ownership_verified_instagram_bio" : "ownership_asserted_by_claimant",
      detail: claim.verificationMethod,
      createdAt: now,
    });
    return { status: "ownership_claimed_by_user" as const };
  },
});

export const submitVerification = action({
  args: { claimId: v.id("creatorClaims") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Sign in to claim a creator profile.");
    const claim = await ctx.runQuery(getVerificationClaimRef, { claimId: args.claimId, userId });
    if (!claim.verificationMethod || !claim.verificationCode || !claim.verificationExpiresAt) throw new ConvexError("Choose a verification method first.");
    if (claim.verificationExpiresAt <= Date.now()) throw new ConvexError("This verification challenge expired. Create a new one.");
    let instagramBioVerified = false;
    if (claim.verificationMethod === "instagram_bio") {
      let result: ClaimEnrichmentResult;
      try {
        result = await runApifyInstagramProfile(claim.instagramHandle);
      } catch (error) {
        if (error instanceof ConvexError) throw error;
        throw new ConvexError(error instanceof Error ? `Instagram ownership check failed: ${error.message}` : "Instagram ownership check failed. Try again.");
      }
      if (!biographyContainsVerificationCode(result.biography, claim.verificationCode)) {
        throw new ConvexError("Creatorly could not find the verification code in this Instagram bio. Add the code, wait for the public bio to update, then try again.");
      }
      instagramBioVerified = true;
    }
    return ctx.runMutation(recordOwnershipAssertionRef, {
      claimId: claim._id,
      userId,
      verificationMethod: claim.verificationMethod,
      verificationCode: claim.verificationCode,
      instagramBioVerified,
    });
  },
});

export const submitForReview = mutation({
  args: { claimId: v.id("creatorClaims"), acceptTerms: v.boolean() },
  handler: async (ctx, args) => {
    const { userId, claim } = await requireOwner(ctx, args.claimId);
    if (!args.acceptTerms) throw new ConvexError("Accept the profile declaration before submitting.");
    if (!profileComplete(claim) || claim.status !== "ownership_claimed_by_user") throw new ConvexError("Complete the profile and assert ownership first.");
    const now = Date.now();
    await ctx.db.patch(claim._id, { termsAcceptedAt: now, submittedAt: now, status: "review_required", updatedAt: now });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, actorUserId: userId, eventType: "claim_submitted", createdAt: now });
    return { status: "review_required" as const };
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const claims = await ctx.db.query("creatorClaims").withIndex("by_status", q => q.eq("status", "review_required")).order("desc").take(100);
    return Promise.all(claims.map(async claim => {
      const user = await ctx.db.get(claim.userId);
      return { ...claim, id: claim._id, claimant: { name: user?.name ?? "Creator", email: user?.email ?? "" } };
    }));
  },
});

export const review = mutation({
  args: { claimId: v.id("creatorClaims"), decision: v.union(v.literal("approve"), v.literal("reject"), v.literal("request_changes")), note: v.optional(v.string()), contactVerified: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.status !== "review_required") throw new ConvexError("Claim is not awaiting review.");
    const now = Date.now();
    if (args.decision !== "approve") {
      const status = args.decision === "reject" ? "rejected" as const : "draft" as const;
      await ctx.db.patch(claim._id, { status, reviewNote: clean(args.note), updatedAt: now });
      await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, actorUserId: userId, eventType: `claim_${args.decision}`, detail: clean(args.note), createdAt: now });
      return { status };
    }
    if (claim.contactPreference !== "not_contactable" && !args.contactVerified) {
      throw new ConvexError("Confirm that you verified the submitted contact details before publishing.");
    }
    const creator = claim.creatorId ? await ctx.db.get(claim.creatorId) : null;
    const platformVerified = claim.enrichedIsVerified ?? creator?.isVerified ?? false;
    const canonical = {
      displayName: claim.displayName ?? claim.instagramHandle,
      biography: claim.biography,
      categories: claim.categories,
      primaryCategory: claim.categories[0]?.toLowerCase() ?? "",
      categorySearch: claim.categories.join(" ").toLowerCase(),
      contentLanguages: claim.languages,
      location: [claim.city, claim.country].filter(Boolean).join(", ") || undefined,
      country: claim.country,
      city: claim.city,
      postalCode: claim.postalCode,
      websiteUrl: claim.websiteUrl,
      managementType: claim.managementType,
      metricProvenance: "apify" as const,
      followerCount: claim.enrichedFollowerCount ?? creator?.followerCount ?? 0,
      engagementRatePercent: claim.enrichedEngagementRatePercent ?? creator?.engagementRatePercent,
      engagementRateBasis: claim.enrichedEngagementRatePercent === undefined ? creator?.engagementRateBasis : "followers" as const,
      profileImageUrl: creator?.profileImageStorageId ? creator.profileImageUrl : claim.enrichedProfileImageUrl ?? creator?.profileImageUrl,
      isVerified: platformVerified,
      instagramMetrics: {
        ...creator?.instagramMetrics,
        followingCount: claim.enrichedFollowingCount ?? creator?.instagramMetrics?.followingCount,
        postCount: claim.enrichedPostCount ?? creator?.instagramMetrics?.postCount,
        engagementRatePercent: claim.enrichedEngagementRatePercent ?? creator?.instagramMetrics?.engagementRatePercent,
        isBusinessAccount: claim.enrichedIsBusinessAccount ?? creator?.instagramMetrics?.isBusinessAccount,
        businessCategoryName: claim.enrichedBusinessCategoryName ?? creator?.instagramMetrics?.businessCategoryName,
      },
      lastUpdatedAt: now,
    };
    const creatorId = creator?._id ?? await ctx.db.insert("creators", {
      platform: "instagram",
      handle: claim.instagramHandle,
      normalizedHandle: claim.normalizedInstagramHandle,
      isDemo: false,
      addedToRepositoryAt: now,
      ...canonical,
    });
    if (creator) await ctx.db.patch(creator._id, canonical);
    const social = await ctx.db.query("creatorSocialProfiles").withIndex("by_platform_handle", q => q.eq("platform", "instagram").eq("normalizedHandle", claim.normalizedInstagramHandle)).first();
    if (social) await ctx.db.patch(social._id, { creatorId, handle: claim.instagramHandle, url: claim.instagramUrl, followerCount: claim.enrichedFollowerCount, isVerified: platformVerified });
    else await ctx.db.insert("creatorSocialProfiles", { creatorId, platform: "instagram", handle: claim.instagramHandle, normalizedHandle: claim.normalizedInstagramHandle, url: claim.instagramUrl, followerCount: claim.enrichedFollowerCount, isVerified: platformVerified });
    const contacts = await ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creatorId)).collect();
    const addContact = async (kind: "creator_direct" | "manager", name: string, email?: string, whatsapp?: string) => {
      if (!email && !whatsapp) return;
      if (contacts.some(item => item.contactType === kind && item.email === email && item.whatsapp === whatsapp)) return;
      await ctx.db.insert("contacts", {
        creatorId,
        contactType: kind,
        name,
        email,
        whatsapp,
        verificationStatus: "verified",
        lastVerifiedAt: now,
        isActive: true,
        accessTier: "basic",
        isDemo: false,
      });
    };
    if (claim.contactPreference === "direct") await addContact("creator_direct", claim.displayName ?? "Creator", claim.businessEmail, claim.whatsapp);
    if (claim.contactPreference === "manager_only") await addContact("manager", claim.managerName ?? "Manager", claim.managerEmail, claim.managerWhatsapp);
    await ctx.db.patch(claim._id, { creatorId, status: "published", verifiedAt: now, publishedAt: now, reviewNote: clean(args.note), updatedAt: now });
    await ctx.db.insert("creatorClaimAuditEvents", { claimId: claim._id, actorUserId: userId, eventType: "claim_published", detail: clean(args.note), createdAt: now });
    await ctx.scheduler.runAfter(0, copyCreatorImageRef, { creatorId });
    return { status: "published" as const, creatorId };
  },
});

export const republishFromEnrichment = internalMutation({
  args: { claimId: v.id("creatorClaims"), verifyContacts: v.boolean() },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId);
    if (!claim || claim.status !== "published" || !claim.creatorId) {
      throw new ConvexError("Published creator claim not found.");
    }
    const creator = await ctx.db.get(claim.creatorId);
    if (!creator) throw new ConvexError("Published creator profile not found.");
    const now = Date.now();
    await ctx.db.patch(creator._id, {
      displayName: claim.displayName ?? claim.instagramHandle,
      biography: claim.biography,
      websiteUrl: claim.websiteUrl,
      followerCount: claim.enrichedFollowerCount ?? creator.followerCount,
      engagementRatePercent: claim.enrichedEngagementRatePercent ?? creator.engagementRatePercent,
      engagementRateBasis: claim.enrichedEngagementRatePercent === undefined ? creator.engagementRateBasis : "followers",
      profileImageUrl: creator.profileImageStorageId ? creator.profileImageUrl : claim.enrichedProfileImageUrl ?? creator.profileImageUrl,
      isVerified: claim.enrichedIsVerified ?? false,
      metricProvenance: "apify",
      instagramMetrics: {
        ...creator.instagramMetrics,
        followingCount: claim.enrichedFollowingCount ?? creator.instagramMetrics?.followingCount,
        postCount: claim.enrichedPostCount ?? creator.instagramMetrics?.postCount,
        engagementRatePercent: claim.enrichedEngagementRatePercent ?? creator.instagramMetrics?.engagementRatePercent,
        isBusinessAccount: claim.enrichedIsBusinessAccount ?? creator.instagramMetrics?.isBusinessAccount,
        businessCategoryName: claim.enrichedBusinessCategoryName ?? creator.instagramMetrics?.businessCategoryName,
      },
      lastUpdatedAt: now,
    });
    const social = await ctx.db.query("creatorSocialProfiles")
      .withIndex("by_platform_handle", q => q.eq("platform", "instagram").eq("normalizedHandle", claim.normalizedInstagramHandle))
      .first();
    if (social) await ctx.db.patch(social._id, {
      followerCount: claim.enrichedFollowerCount,
      isVerified: claim.enrichedIsVerified ?? false,
    });
    if (args.verifyContacts) {
      const contacts = await ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect();
      await Promise.all(contacts.filter(contact => contact.isActive).map(contact => ctx.db.patch(contact._id, {
        verificationStatus: "verified",
        lastVerifiedAt: now,
      })));
    }
    await ctx.db.insert("creatorClaimAuditEvents", {
      claimId: claim._id,
      eventType: "published_profile_refreshed_from_apify",
      detail: args.verifyContacts ? "active contacts verified" : undefined,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, copyCreatorImageRef, { creatorId: creator._id });
    return { creatorId: creator._id, contactsVerified: args.verifyContacts };
  },
});
