import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type WorkspaceCtx = QueryCtx | MutationCtx;
export type WorkspaceRole = Doc<"workspaceMembers">["role"];

export async function requireWorkspaceMember(ctx: WorkspaceCtx, workspaceId: Id<"workspaces">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("NOT_AUTHENTICATED");
  const member = await ctx.db.query("workspaceMembers")
    .withIndex("by_workspace_user", q => q.eq("workspaceId", workspaceId).eq("userId", userId))
    .unique();
  if (!member || member.status !== "active") throw new ConvexError("NOT_A_MEMBER");
  return { userId, member };
}

export async function requireWorkspaceRole(ctx: WorkspaceCtx, workspaceId: Id<"workspaces">, allowed: WorkspaceRole[]) {
  const result = await requireWorkspaceMember(ctx, workspaceId);
  if (!allowed.includes(result.member.role)) throw new ConvexError("INSUFFICIENT_ROLE");
  return result;
}

export const campaignManagers: WorkspaceRole[] = ["owner", "admin", "manager", "contributor"];
export const workspaceAdmins: WorkspaceRole[] = ["owner", "admin"];
