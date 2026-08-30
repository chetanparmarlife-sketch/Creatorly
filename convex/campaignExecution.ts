import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { campaignManagers, requireWorkspaceMember, requireWorkspaceRole } from "./lib/workspaceAuth";

const platform = v.union(v.literal("instagram"), v.literal("tiktok"), v.literal("youtube"), v.literal("twitter"));
const taskStatus = v.union(v.literal("open"), v.literal("done"), v.literal("cancelled"));
const decision = v.union(v.literal("approved"), v.literal("changes_requested"));

function required(value: string, message: string) {
  const next = value.trim();
  if (!next) throw new ConvexError(message);
  return next;
}

function reviewUrl(value: string) {
  const next = required(value, "Enter a review URL.");
  try {
    const url = new URL(next);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new ConvexError("Enter a valid http or https review URL.");
  }
}

export const getCampaign = query({
  args: { workspaceId: v.id("workspaces"), campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.workspaceId !== args.workspaceId) throw new ConvexError("Campaign not found.");
    const [creators, deliverables, tasks] = await Promise.all([
      ctx.db.query("campaignCreators").withIndex("by_campaign", q => q.eq("campaignId", args.campaignId)).collect(),
      ctx.db.query("deliverables").withIndex("by_campaign", q => q.eq("campaignId", args.campaignId)).collect(),
      ctx.db.query("tasks").withIndex("by_campaign", q => q.eq("campaignId", args.campaignId)).collect(),
    ]);
    const hydrated = await Promise.all(deliverables.map(async item => ({
      ...item,
      approvals: await Promise.all((await ctx.db.query("approvals").withIndex("by_deliverable", q => q.eq("deliverableId", item._id)).collect()).map(async approval => {
        const reviewer = await ctx.db.get(approval.reviewerUserId);
        return { ...approval, reviewerName: reviewer?.name ?? "Workspace reviewer" };
      })),
    })));
    return {
      ...campaign,
      creators: creators.map(item => ({ ...item, deliverables: hydrated.filter(deliverable => deliverable.campaignCreatorId === item._id) })),
      tasks,
    };
  },
});

export const addDeliverable = mutation({
  args: { workspaceId: v.id("workspaces"), campaignId: v.id("campaigns"), campaignCreatorId: v.id("campaignCreators"), title: v.string(), channel: platform, format: v.string(), dueAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const creator = await ctx.db.get(args.campaignCreatorId);
    if (!creator || creator.workspaceId !== args.workspaceId || creator.campaignId !== args.campaignId) throw new ConvexError("Campaign creator not found.");
    const title = required(args.title, "Enter a deliverable title.");
    const format = required(args.format, "Enter a deliverable format.");
    const now = Date.now();
    const deliverableId = await ctx.db.insert("deliverables", { workspaceId: args.workspaceId, campaignId: args.campaignId, campaignCreatorId: args.campaignCreatorId, title, channel: args.channel, format, dueAt: args.dueAt, status: "planned", createdBy: userId, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "deliverable", entityId: deliverableId, action: "created", summary: `Added deliverable ${title}`, createdAt: now });
    return { deliverableId };
  },
});

export const submitContent = mutation({
  args: { workspaceId: v.id("workspaces"), deliverableId: v.id("deliverables"), submissionUrl: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const item = await ctx.db.get(args.deliverableId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Deliverable not found.");
    await ctx.db.patch(item._id, { submissionUrl: reviewUrl(args.submissionUrl), status: "in_review", updatedAt: Date.now() });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "deliverable", entityId: item._id, action: "submitted", summary: `Submitted ${item.title} for review`, previousValue: item.status, nextValue: "in_review", createdAt: Date.now() });
  },
});

export const decideApproval = mutation({
  args: { workspaceId: v.id("workspaces"), deliverableId: v.id("deliverables"), decision, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const item = await ctx.db.get(args.deliverableId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Deliverable not found.");
    const now = Date.now();
    const approvalId = await ctx.db.insert("approvals", { workspaceId: args.workspaceId, campaignId: item.campaignId, deliverableId: item._id, decision: args.decision, note: args.note?.trim() || undefined, reviewerUserId: userId, createdAt: now });
    await ctx.db.patch(item._id, { status: args.decision, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "approval", entityId: approvalId, action: args.decision, summary: `${args.decision === "approved" ? "Approved" : "Requested changes to"} ${item.title}`, previousValue: item.status, nextValue: args.decision, createdAt: now });
  },
});

export const addTask = mutation({
  args: { workspaceId: v.id("workspaces"), campaignId: v.id("campaigns"), campaignCreatorId: v.optional(v.id("campaignCreators")), title: v.string(), dueAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.workspaceId !== args.workspaceId) throw new ConvexError("Campaign not found.");
    const title = required(args.title, "Enter a task title.");
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", { workspaceId: args.workspaceId, campaignId: args.campaignId, campaignCreatorId: args.campaignCreatorId, title, status: "open", createdBy: userId, dueAt: args.dueAt, createdAt: now, updatedAt: now });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "task", entityId: taskId, action: "created", summary: `Created task ${title}`, createdAt: now });
    return { taskId };
  },
});

export const setTaskStatus = mutation({
  args: { workspaceId: v.id("workspaces"), taskId: v.id("tasks"), status: taskStatus },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    const item = await ctx.db.get(args.taskId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Task not found.");
    await ctx.db.patch(item._id, { status: args.status, updatedAt: Date.now() });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "task", entityId: item._id, action: "status_changed", summary: `${args.status === "done" ? "Completed" : "Updated"} task ${item.title}`, previousValue: item.status, nextValue: args.status, createdAt: Date.now() });
  },
});

export const setCreatorFee = mutation({
  args: { workspaceId: v.id("workspaces"), campaignCreatorId: v.id("campaignCreators"), agreedFee: v.number() },
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceRole(ctx, args.workspaceId, campaignManagers);
    if (args.agreedFee < 0) throw new ConvexError("Fee cannot be negative.");
    const item = await ctx.db.get(args.campaignCreatorId);
    if (!item || item.workspaceId !== args.workspaceId) throw new ConvexError("Campaign creator not found.");
    await ctx.db.patch(item._id, { agreedFee: args.agreedFee, updatedAt: Date.now() });
    await ctx.db.insert("activityEvents", { workspaceId: args.workspaceId, actorUserId: userId, entityType: "campaign_creator", entityId: item._id, action: "fee_changed", summary: "Updated creator agreed fee", previousValue: String(item.agreedFee ?? 0), nextValue: String(args.agreedFee), createdAt: Date.now() });
  },
});
