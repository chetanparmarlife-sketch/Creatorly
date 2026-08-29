import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { normalize } from "./lib/matching";

const platform = v.union(v.literal("instagram"), v.literal("youtube"));
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
    const creator = await ctx.db.query("creators").withIndex("by_normalized_handle", q => q.eq("normalizedHandle", normalize(args.handle))).filter(q => q.eq(q.field("platform"), args.platform)).first();
    if (!creator) return { authenticated: true as const, found: false as const, creditBalance: account.user.creditBalance ?? 0, currentPlanTier: account.user.currentPlanTier ?? "free" };
    const [unlocks, contacts] = await Promise.all([
      ctx.db.query("unlockRecords").withIndex("by_user_creator", q => q.eq("userId", account.userId).eq("creatorId", creator._id)).collect(),
      ctx.db.query("contacts").withIndex("by_creator", q => q.eq("creatorId", creator._id)).collect(),
    ]);
    const active = unlocks.filter(item => item.expiresAt > Date.now()).sort((a,b) => b.expiresAt-a.expiresAt)[0];
    const isPro = account.user.currentPlanTier === "pro";
    const permitted = contacts.filter(item => item.isActive && (item.accessTier === "basic" || isPro));
    const hiddenProContactCount = contacts.filter(item => item.isActive && item.accessTier === "pro" && !isPro).length;
    return { authenticated: true as const, found: true as const, creator: { id: creator._id, handle: creator.handle, displayName: creator.displayName, platform: creator.platform, isDemo: creator.isDemo }, creditBalance: account.user.creditBalance ?? 0, currentPlanTier: account.user.currentPlanTier ?? "free", availableContactCount: permitted.length, hiddenProContactCount, isUnlocked: Boolean(active), expiresAt: active?.expiresAt, contacts: active ? permitted.map(item => ({ id:item._id, name:item.name, contactType:item.contactType,email:item.email,phone:item.phone,whatsapp:item.whatsapp,contextualNotes:item.contextualNotes,verificationStatus:item.verificationStatus,lastVerifiedAt:item.lastVerifiedAt,isDemo:item.isDemo })) : [] };
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
    const permitted = contacts.filter(item=>item.isActive&&(item.accessTier==="basic"||account.user.currentPlanTier==="pro"));
    if (!permitted.length) throw new ConvexError("Upgrade to Pro to access this representative contact.");
    const balance=account.user.creditBalance??0;if(balance<COST)throw new ConvexError("Add credits before unlocking this contact.");
    const now=Date.now();const expiresAt=now+WINDOW;const id=await ctx.db.insert("unlockRecords",{userId:account.userId,creatorId:args.creatorId,unlockedAt:now,expiresAt,creditsSpent:COST,planTierAtUnlock:account.user.currentPlanTier??"free",status:unlocks.length?"re_unlocked":"active"});
    await ctx.db.patch(account.userId,{creditBalance:balance-COST,updatedAt:now});await ctx.db.insert("creditTransactions",{userId:account.userId,amount:-COST,transactionType:"unlock_usage",description:`Extension unlock: ${creator.displayName}`,referenceId:id,createdAt:now});
    return {status:"unlocked" as const};
  },
});
