import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireWorkspaceMember, requireWorkspaceRole, workspaceAdmins } from "./lib/workspaceAuth";

const divisionType = v.union(v.literal("brand"), v.literal("product_line"), v.literal("market"), v.literal("region"));
const collaboratorRole = v.union(v.literal("client_reviewer"), v.literal("internal_stakeholder"), v.literal("agency_collaborator"));

export const listGroups = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found.");
    if (workspace.kind === "agency") {
      const clients = await ctx.db.query("clients").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
      return clients.map(item => ({ ...item, kind: "client" as const }));
    }
    if (workspace.kind === "brand") {
      const divisions = await ctx.db.query("brandDivisions").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
      return divisions.map(item => ({ ...item, kind: "division" as const }));
    }
    return [];
  },
});

export const createGroup = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    website: v.optional(v.string()),
    divisionType: v.optional(divisionType),
    parentDivisionId: v.optional(v.id("brandDivisions")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, workspaceAdmins);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found.");
    const name = args.name.trim();
    if (!name) throw new ConvexError("Enter a name.");
    const now = Date.now();
    if (workspace.kind === "agency") {
      const id = await ctx.db.insert("clients", { workspaceId: args.workspaceId, name, website: args.website?.trim() || undefined, status: "active", createdAt: now, updatedAt: now });
      return { groupId: id, kind: "client" as const };
    }
    if (workspace.kind === "brand") {
      if (!args.divisionType) throw new ConvexError("Choose a division type.");
      if (args.parentDivisionId) {
        const parent = await ctx.db.get(args.parentDivisionId);
        if (!parent || parent.workspaceId !== args.workspaceId) throw new ConvexError("Parent division not found.");
      }
      const id = await ctx.db.insert("brandDivisions", { workspaceId: args.workspaceId, name, divisionType: args.divisionType, parentDivisionId: args.parentDivisionId, status: "active", createdAt: now, updatedAt: now });
      return { groupId: id, kind: "division" as const };
    }
    throw new ConvexError("Client and division grouping is available for agency and brand workspaces.");
  },
});

export const listCollaborators = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return ctx.db.query("groupCollaborators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect();
  },
});

export const addCollaborator = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    clientId: v.optional(v.id("clients")),
    divisionId: v.optional(v.id("brandDivisions")),
    email: v.string(),
    role: collaboratorRole,
  },
  handler: async (ctx, args) => {
    await requireWorkspaceRole(ctx, args.workspaceId, workspaceAdmins);
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new ConvexError("Workspace not found.");
    if (Boolean(args.clientId) === Boolean(args.divisionId)) throw new ConvexError("Choose one client or division.");
    if (workspace.kind === "agency" && (!args.clientId || args.role !== "client_reviewer")) throw new ConvexError("Agency clients accept client reviewers.");
    if (workspace.kind === "brand" && (!args.divisionId || args.role === "client_reviewer")) throw new ConvexError("Brand divisions accept stakeholders or agency collaborators.");
    const target = args.clientId ? await ctx.db.get(args.clientId) : args.divisionId ? await ctx.db.get(args.divisionId) : null;
    if (!target || target.workspaceId !== args.workspaceId) throw new ConvexError("Group not found.");
    const email = args.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ConvexError("Enter a valid email address.");
    const existing = (await ctx.db.query("groupCollaborators").withIndex("by_workspace", q => q.eq("workspaceId", args.workspaceId)).collect()).find(item => item.email === email && item.clientId === args.clientId && item.divisionId === args.divisionId && item.role === args.role);
    if (existing) return { collaboratorId: existing._id, alreadyAdded: true };
    const now = Date.now();
    const collaboratorId = await ctx.db.insert("groupCollaborators", { workspaceId: args.workspaceId, clientId: args.clientId, divisionId: args.divisionId, email, role: args.role, status: "invited", createdAt: now, updatedAt: now });
    return { collaboratorId, alreadyAdded: false };
  },
});
