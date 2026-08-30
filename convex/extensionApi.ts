import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalize } from "./lib/matching";

const platform = v.union(v.literal("instagram"), v.literal("youtube"), v.literal("linkedin"), v.literal("twitter"));
const COST = 5;
const WINDOW = 30 * 24 * 60 * 60 * 1000;

async function accountForToken(ctx: QueryCtx | MutationCtx, token: string) {
  const record = await ctx.db.query("extensionTokens").withIndex("by_token", q => q.eq("token", token)).first();
  if (!record || record.revokedAt) return null;
  const user = await ctx.db.get(record.userId);
  return user ? { user, userId: record.userId } : null;
}

export const profile = query({
  args: { token: v.string(), platform, handle: v.string() },
  handler: async (ctx, args) => {
    const account = await accountForToken(ctx, args.token);
    if (!account) return { authenticated: false as const };
    const normalizedHandle = normalize(args.handle);
    const socialProfile = await ctx.db.query("creatorSocialProfiles").withIndex("by_platform_handle", q => q.eq("platform", args.platform).eq("normalizedHandle", normalizedHandle)).first();
    const creator = socialProfile
      ? await ctx.db.get(socialProfile.creatorId)
      : args.platform === "instagram" || args.platform === "youtube"
        ? await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", normalizedHandle)).filter(q => q.eq(q.field("platform"), args.platform)).first()
        : null;
    if (!creator) return { authenticated: true as const, found: false as const, creditBalance: account.user.creditBalance ?? 0, currentPlanTier: account.user.currentPlanTier ?? "free" };
    const [unlocks, contacts, socialProfiles] = await Promise.all([
      ctx.db.query("unlockRecords").withIndex("by_user_creator", q => q.eq("userId", account.userId).eq("creatorId", creator._id)).collect(),
      ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
      ctx.db.query("creatorSocialProfiles").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
    ]);
    const active = unlocks.filter(item => item.expiresAt > Date.now()).sort((a,b) => b.expiresAt-a.expiresAt)[0];
    const isPro = account.user.currentPlanTier === "pro";
    const verifiedContacts = contacts.filter(item => item.isActive && item.verificationStatus === "verified");
    const permitted = verifiedContacts.filter(item => item.accessTier === "basic" || isPro);
    const hiddenProContactCount = verifiedContacts.filter(item => item.accessTier === "pro" && !isPro).length;
    const pendingContactCount = contacts.filter(item => item.isActive && item.verificationStatus !== "verified").length;
    const hasOpenableContact = permitted.length > 0;
    return {
      authenticated: true as const,
      found: true as const,
      creator: {
        id: creator._id,
        handle: creator.handle,
        displayName: creator.displayName,
        platform: creator.platform,
        followerCount: creator.followerCount,
        location: creator.location,
        categories: creator.categories,
        isVerified: creator.isVerified,
        isDemo: creator.isDemo,
        profileImageUrl: creator.profileImageUrl,
        socialProfiles: socialProfiles.length ? socialProfiles.map(profile => ({
          platform: profile.platform,
          handle: profile.handle,
          url: profile.url,
          followerCount: profile.followerCount,
          isVerified: profile.isVerified,
        })) : [{
          platform: creator.platform,
          handle: creator.handle,
          url: creator.platform === "youtube" ? `https://www.youtube.com/@${encodeURIComponent(creator.handle.replace(/^@/, ""))}` : `https://www.instagram.com/${encodeURIComponent(creator.handle.replace(/^@/, ""))}/`,
          followerCount: creator.followerCount,
          isVerified: creator.isVerified,
        }],
        contentLanguages: creator.contentLanguages,
        profileType: creator.profileType,
        contentQuality: creator.contentQuality,
        managementType: creator.managementType,
      },
      creditBalance: account.user.creditBalance ?? 0,
      currentPlanTier: account.user.currentPlanTier ?? "free",
      availableContactCount: permitted.length,
      hiddenProContactCount,
      pendingContactCount,
      isUnlocked: Boolean(active && hasOpenableContact),
      expiresAt: active && hasOpenableContact ? active.expiresAt : undefined,
      contacts: active && hasOpenableContact ? permitted.map(item => ({
        id: item._id,
        name: item.name,
        contactType: item.contactType,
        email: item.email,
        phone: item.phone,
        whatsapp: item.whatsapp,
        contextualNotes: item.contextualNotes,
        verificationStatus: item.verificationStatus,
        lastVerifiedAt: item.lastVerifiedAt,
        isDemo: item.isDemo,
      })) : [],
    };
  },
});

export const unlock = mutation({
  args: { token: v.string(), creatorId: v.id("creators") },
  handler: async (ctx,args) => {
    const account = await accountForToken(ctx,args.token);
    if (!account) throw new ConvexError("Reconnect the extension from Creatorly Settings.");
    const [creator, contacts, unlocks] = await Promise.all([ctx.db.get(args.creatorId),ctx.db.query("contacts").withIndex("by_creator",q=>q.eq("creatorId",args.creatorId)).collect(),ctx.db.query("unlockRecords").withIndex("by_user_creator",q=>q.eq("userId",account.userId).eq("creatorId",args.creatorId)).collect()]);
    if (!creator) throw new ConvexError("Creator not found.");
    const active = unlocks.find(item=>item.expiresAt>Date.now());
    if (active) return { status:"already_unlocked" as const };
    const permitted = contacts.filter(item=>item.isActive&&item.verificationStatus==="verified"&&(item.accessTier==="basic"||account.user.currentPlanTier==="pro"));
    if (!permitted.length) throw new ConvexError("This contact is unavailable while verification is in progress.");
    const balance=account.user.creditBalance??0;if(balance<COST)throw new ConvexError("Add credits before unlocking this contact.");
    const now=Date.now();const expiresAt=now+WINDOW;const id=await ctx.db.insert("unlockRecords",{userId:account.userId,creatorId:args.creatorId,unlockedAt:now,expiresAt,creditsSpent:COST,planTierAtUnlock:account.user.currentPlanTier??"free",status:unlocks.length?"re_unlocked":"active"});
    await ctx.db.patch(account.userId,{creditBalance:balance-COST,updatedAt:now});await ctx.db.insert("creditTransactions",{userId:account.userId,amount:-COST,transactionType:"unlock_usage",description:`Extension unlock: ${creator.displayName}`,referenceId:id,createdAt:now});
    return {status:"unlocked" as const};
  },
});

export const reportWrongContact = mutation({
  args: { token: v.string(), contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const account = await accountForToken(ctx, args.token);
    if (!account) throw new ConvexError("Reconnect the extension from Creatorly Settings.");
    const contact = await ctx.db.get(args.contactId);
    if (!contact || !contact.isActive) throw new ConvexError("Contact not found.");
    const existing = await ctx.db.query("contactFlags").withIndex("by_user_contact", q => q.eq("userId", account.userId).eq("contactId", args.contactId)).first();
    if (existing) return { status: "already_reported" as const };
    await ctx.db.insert("contactFlags", { userId: account.userId, creatorId: contact.creatorId, contactId: args.contactId, reason: "wrong_contact", status: "open", createdAt: Date.now() });
    return { status: "created" as const };
  },
});
