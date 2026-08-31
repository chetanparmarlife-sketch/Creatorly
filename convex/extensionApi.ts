import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { CONTACT_ACCESS_WINDOW_MS, CONTACT_UNLOCK_COST, STARTING_CREDIT_BALANCE } from "./lib/creditPolicy";
import { canExtensionMemberSave, normalizeExtensionHandle } from "./lib/extensionCrm";
import { normalize } from "./lib/matching";

const platform = v.union(v.literal("instagram"), v.literal("youtube"), v.literal("linkedin"), v.literal("twitter"));

async function accountForToken(ctx: QueryCtx | MutationCtx, token: string) {
  const record = await ctx.db.query("extensionTokens").withIndex("by_token", q => q.eq("token", token)).first();
  if (!record || record.revokedAt) return null;
  const user = await ctx.db.get(record.userId);
  return user ? { user, userId: record.userId } : null;
}

async function activeWorkspaceForAccount(ctx: QueryCtx | MutationCtx, account: NonNullable<Awaited<ReturnType<typeof accountForToken>>>) {
  const workspaceId = account.user.activeWorkspaceId;
  if (!workspaceId) return null;
  const [workspace, member] = await Promise.all([
    ctx.db.get(workspaceId),
    ctx.db.query("workspaceMembers").withIndex("by_workspace_user", q => q.eq("workspaceId", workspaceId).eq("userId", account.userId)).unique(),
  ]);
  if (!workspace || !member || member.status !== "active") return null;
  return { id: workspace._id, name: workspace.name, kind: workspace.kind, role: member.role, canSave: canExtensionMemberSave(member.role) };
}

async function savedProfile(ctx: QueryCtx | MutationCtx, workspaceId: Id<"workspaces">, profilePlatform: "instagram" | "youtube" | "linkedin" | "twitter", handle: string, creatorId?: Id<"creators">) {
  const [canonical, privateRecord] = await Promise.all([
    creatorId ? ctx.db.query("savedCreators").withIndex("by_workspace_creator", q => q.eq("workspaceId", workspaceId).eq("creatorId", creatorId)).first() : null,
    ctx.db.query("savedCreators").withIndex("by_workspace_private_profile", q => q.eq("workspaceId", workspaceId).eq("privatePlatform", profilePlatform).eq("privateNormalizedHandle", normalizeExtensionHandle(handle))).first(),
  ]);
  return canonical ?? privateRecord;
}

function workspacePayload(workspace: Awaited<ReturnType<typeof activeWorkspaceForAccount>>) {
  return workspace ? { id: workspace.id, name: workspace.name, kind: workspace.kind, canSave: workspace.canSave } : null;
}

export const profile = query({
  args: { token: v.string(), platform, handle: v.string() },
  handler: async (ctx, args) => {
    const account = await accountForToken(ctx, args.token);
    if (!account) return { authenticated: false as const };
    const workspace = await activeWorkspaceForAccount(ctx, account);
    const normalizedHandle = normalize(args.handle);
    const socialProfile = await ctx.db.query("creatorSocialProfiles").withIndex("by_platform_handle", q => q.eq("platform", args.platform).eq("normalizedHandle", normalizedHandle)).first();
    const creator = socialProfile
      ? await ctx.db.get(socialProfile.creatorId)
      : args.platform === "instagram" || args.platform === "youtube"
        ? await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", normalizedHandle)).filter(q => q.eq(q.field("platform"), args.platform)).first()
        : null;
    const saved = workspace ? await savedProfile(ctx, workspace.id, args.platform, args.handle, creator?._id) : null;
    if (!creator) return { authenticated: true as const, found: false as const, creditBalance: account.user.creditBalance ?? STARTING_CREDIT_BALANCE, currentPlanTier: account.user.currentPlanTier ?? "free", workspace: workspacePayload(workspace), isSaved: Boolean(saved), savedCreatorId: saved?._id };
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
      authenticated: true as const, found: true as const, workspace: workspacePayload(workspace), isSaved: Boolean(saved), savedCreatorId: saved?._id,
      creator: {
        id: creator._id, handle: creator.handle, displayName: creator.displayName, platform: creator.platform, followerCount: creator.followerCount, location: creator.location, categories: creator.categories, isVerified: creator.isVerified, isDemo: creator.isDemo, profileImageUrl: creator.profileImageUrl,
        socialProfiles: socialProfiles.length ? socialProfiles.map(profile => ({ platform: profile.platform, handle: profile.handle, url: profile.url, followerCount: profile.followerCount, isVerified: profile.isVerified })) : [{ platform: creator.platform, handle: creator.handle, url: creator.platform === "youtube" ? `https://www.youtube.com/@${encodeURIComponent(creator.handle.replace(/^@/, ""))}` : `https://www.instagram.com/${encodeURIComponent(creator.handle.replace(/^@/, ""))}/`, followerCount: creator.followerCount, isVerified: creator.isVerified }],
        contentLanguages: creator.contentLanguages, profileType: creator.profileType, contentQuality: creator.contentQuality, managementType: creator.managementType,
      },
      creditBalance: account.user.creditBalance ?? STARTING_CREDIT_BALANCE, currentPlanTier: account.user.currentPlanTier ?? "free", availableContactCount: permitted.length, hiddenProContactCount, pendingContactCount, isUnlocked: Boolean(active && hasOpenableContact), expiresAt: active && hasOpenableContact ? active.expiresAt : undefined,
      contacts: active && hasOpenableContact ? permitted.map(item => ({ id: item._id, name: item.name, contactType: item.contactType, email: item.email, phone: item.phone, whatsapp: item.whatsapp, contextualNotes: item.contextualNotes, verificationStatus: item.verificationStatus, lastVerifiedAt: item.lastVerifiedAt, isDemo: item.isDemo })) : [],
    };
  },
});

export const saveMatched = mutation({
  args: { token: v.string(), creatorId: v.id("creators"), platform, handle: v.string() },
  handler: async (ctx, args) => {
    const account = await accountForToken(ctx, args.token);
    if (!account) throw new ConvexError("Reconnect the extension from Creatorly Settings.");
    const workspace = await activeWorkspaceForAccount(ctx, account);
    if (!workspace) throw new ConvexError("Choose an active workspace in Creatorly first.");
    if (!workspace.canSave) throw new ConvexError("Your workspace role has read-only access.");
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new ConvexError("Creator not found.");
    const existing = await savedProfile(ctx, workspace.id, args.platform, args.handle, creator._id);
    if (existing) return { status: "already_saved" as const, savedCreatorId: existing._id, workspace: workspacePayload(workspace) };
    const now = Date.now();
    const savedCreatorId = await ctx.db.insert("savedCreators", { workspaceId: workspace.id, creatorId: creator._id, source: "creatorly", relationshipStage: "discovered", priority: "normal", tags: [], createdBy: account.userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: workspace.id, actorUserId: account.userId, entityType: "saved_creator", entityId: savedCreatorId, action: "saved_from_extension", summary: `Saved ${creator.displayName} from the extension`, createdAt: now });
    return { status: "saved" as const, savedCreatorId, workspace: workspacePayload(workspace) };
  },
});

export const savePrivate = mutation({
  args: { token: v.string(), platform, handle: v.string(), displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const account = await accountForToken(ctx, args.token);
    if (!account) throw new ConvexError("Reconnect the extension from Creatorly Settings.");
    const workspace = await activeWorkspaceForAccount(ctx, account);
    if (!workspace) throw new ConvexError("Choose an active workspace in Creatorly first.");
    if (!workspace.canSave) throw new ConvexError("Your workspace role has read-only access.");
    const handle = args.handle.trim().replace(/^@/, "");
    const normalizedHandle = normalizeExtensionHandle(handle);
    if (!normalizedHandle) throw new ConvexError("Open a valid creator profile first.");
    const repositoryHandle = normalize(handle);
    const socialProfile = await ctx.db.query("creatorSocialProfiles").withIndex("by_platform_handle", q => q.eq("platform", args.platform).eq("normalizedHandle", repositoryHandle)).first();
    const creator = socialProfile ? await ctx.db.get(socialProfile.creatorId) : args.platform === "instagram" || args.platform === "youtube" ? await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", repositoryHandle)).filter(q => q.eq(q.field("platform"), args.platform)).first() : null;
    if (creator) throw new ConvexError("This profile now matches Creatorly data. Refresh and save the matched profile.");
    const existing = await savedProfile(ctx, workspace.id, args.platform, handle);
    if (existing) return { status: "already_saved" as const, savedCreatorId: existing._id, workspace: workspacePayload(workspace) };
    const now = Date.now();
    const displayName = args.displayName?.trim() || `@${handle}`;
    const savedCreatorId = await ctx.db.insert("savedCreators", { workspaceId: workspace.id, source: "extension", privateDisplayName: displayName, privatePlatform: args.platform, privateHandle: handle, privateNormalizedHandle: normalizedHandle, relationshipStage: "discovered", priority: "normal", tags: [], createdBy: account.userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: workspace.id, actorUserId: account.userId, entityType: "saved_creator", entityId: savedCreatorId, action: "added_from_extension", summary: `Added private profile @${handle} from the extension`, createdAt: now });
    return { status: "saved" as const, savedCreatorId, workspace: workspacePayload(workspace) };
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
    const balance=account.user.creditBalance??STARTING_CREDIT_BALANCE;if(balance<CONTACT_UNLOCK_COST)throw new ConvexError("Add credits before unlocking this contact.");
    const now=Date.now();const expiresAt=now+CONTACT_ACCESS_WINDOW_MS;const id=await ctx.db.insert("unlockRecords",{userId:account.userId,creatorId:args.creatorId,unlockedAt:now,expiresAt,creditsSpent:CONTACT_UNLOCK_COST,planTierAtUnlock:account.user.currentPlanTier??"free",status:unlocks.length?"re_unlocked":"active"});
    await ctx.db.patch(account.userId,{creditBalance:balance-CONTACT_UNLOCK_COST,updatedAt:now});await ctx.db.insert("creditTransactions",{userId:account.userId,amount:-CONTACT_UNLOCK_COST,transactionType:"unlock_usage",description:`Extension unlock: ${creator.displayName}`,referenceId:id,createdAt:now});
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
