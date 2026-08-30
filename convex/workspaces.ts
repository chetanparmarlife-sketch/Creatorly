import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireWorkspaceMember, requireWorkspaceRole, workspaceAdmins } from "./lib/workspaceAuth";
import { getAuthUserId } from "@convex-dev/auth/server";

const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("manager"), v.literal("contributor"), v.literal("reviewer"));
const kind = v.union(v.literal("agency"), v.literal("brand"), v.literal("talent"));

export const create = mutation({
  args: { name: v.string(), kind, website: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("NOT_AUTHENTICATED");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Account not found.");
    const name = args.name.trim();
    if (!name) throw new ConvexError("Enter a workspace name.");
    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", { name, kind: args.kind, website: args.website?.trim() || undefined, createdBy: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("workspaceMembers", { workspaceId, userId, email: user.email ?? "", role: "owner", status: "active", createdAt: now, updatedAt: now });
    await ctx.db.patch(userId, { activeWorkspaceId: workspaceId, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId, actorUserId: userId, entityType: "workspace", entityId: workspaceId, action: "created", summary: `Created workspace ${name}`, createdAt: now });
    return { workspaceId };
  },
});

export const completeSetup = mutation({
  args: {
    name: v.string(),
    kind,
    role,
    goals: v.array(v.string()),
    inviteEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("NOT_AUTHENTICATED");
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("Account not found.");
    const name = args.name.trim();
    if (!name) throw new ConvexError("Enter a workspace name.");
    const goals = [...new Set(args.goals.map(goal => goal.trim()).filter(Boolean))];
    const now = Date.now();

    let workspaceId = user.activeWorkspaceId;
    const workspace = workspaceId ? await ctx.db.get(workspaceId) : null;
    const membership = workspaceId
      ? await ctx.db.query("workspaceMembers").withIndex("by_workspace_user", q => q.eq("workspaceId", workspaceId!).eq("userId", userId)).unique()
      : null;

    if (!workspace || !membership || workspace.createdBy !== userId) {
      workspaceId = await ctx.db.insert("workspaces", { name, kind: args.kind, goals, defaultCampaignRole: args.role, createdBy: userId, createdAt: now, updatedAt: now });
      await ctx.db.insert("workspaceMembers", { workspaceId, userId, email: user.email ?? "", role: "owner", status: "active", createdAt: now, updatedAt: now });
      await ctx.db.insert("activityEvents", { workspaceId, actorUserId: userId, entityType: "workspace", entityId: workspaceId, action: "created", summary: `Created ${args.kind} workspace ${name}`, createdAt: now });
    } else {
      await ctx.db.patch(workspaceId!, { name, kind: args.kind, goals, defaultCampaignRole: args.role, updatedAt: now });
    }

    const inviteEmail = args.inviteEmail?.trim().toLowerCase();
    if (inviteEmail && inviteEmail !== user.email?.toLowerCase()) {
      if (!inviteEmail.includes("@")) throw new ConvexError("Enter a valid teammate email address.");
      const existingInvite = await ctx.db.query("workspaceMembers").withIndex("by_workspace_email", q => q.eq("workspaceId", workspaceId!).eq("email", inviteEmail)).unique();
      if (!existingInvite) await ctx.db.insert("workspaceMembers", { workspaceId: workspaceId!, email: inviteEmail, role: "contributor", status: "invited", createdAt: now, updatedAt: now });
    }

    await ctx.db.patch(userId, { activeWorkspaceId: workspaceId, companyName: name, onboardingCompleted: true, onboardingStep: 5, updatedAt: now });
    return { id: workspaceId!, name, kind: args.kind, role: "owner" as const, goals, defaultCampaignRole: args.role };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const memberships = await ctx.db.query("workspaceMembers").withIndex("by_user", q => q.eq("userId", userId)).collect();
    const rows = await Promise.all(memberships.filter(m => m.status === "active").map(async member => {
      const workspace = await ctx.db.get(member.workspaceId);
      return workspace ? { id: workspace._id, name: workspace.name, kind: workspace.kind, role: member.role, goals: workspace.goals, defaultCampaignRole: workspace.defaultCampaignRole } : null;
    }));
    return rows.filter(row => row !== null);
  },
});

export const getCurrent = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { member } = await requireWorkspaceMember(ctx, args.workspaceId);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found.");
    const members = await ctx.db.query("workspaceMembers").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
    return { ...workspace, role: member.role, members: members.map(item => ({ id: item._id, email: item.email, role: item.role, status: item.status })) };
  },
});

export const inviteMember = mutation({
  args: { workspaceId: v.id("workspaces"), email: v.string(), role },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, workspaceAdmins);
    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) throw new ConvexError("Enter a valid email address.");
    const existing = await ctx.db.query("workspaceMembers").withIndex("by_workspace_email", q => q.eq("workspaceId", args.workspaceId).eq("email", email)).unique();
    if (existing) return { invitationId: existing._id, status: "already_exists" as const };
    const now = Date.now();
    const invitationId = await ctx.db.insert("workspaceMembers", { workspaceId: args.workspaceId, email, role: args.role, status: "invited", createdAt: now, updatedAt: now });
    return { invitationId, status: "created" as const };
  },
});
