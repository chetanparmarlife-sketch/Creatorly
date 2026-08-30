import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useConvex } from "convex/react";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import { demoData } from "../../lib/demoData";
import type { ApprovalDecision, Campaign, CampaignStage, CampaignTaskStatus, CreatorSearchResult, CreatorSource, GroupCollaborator, GroupCollaboratorRole, Platform, PrivateCreatorInput, SavedCreator, Viewer, WorkspaceActivity, WorkspaceGroup, WorkspaceOnboardingInput, WorkspaceSummary } from "../../types";
import { creatorDuplicateKey } from "./creatorImport";

type WorkspaceData = {
  ensureWorkspace(viewer: Viewer): Promise<WorkspaceSummary>;
  completeWorkspaceOnboarding(input: WorkspaceOnboardingInput): Promise<WorkspaceSummary>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  saveCreator(workspaceId: string, creator: CreatorSearchResult): Promise<{ savedCreatorId: string; alreadySaved: boolean }>;
  importPrivateCreators(workspaceId: string, source: "csv_upload" | "manual", rows: PrivateCreatorInput[]): Promise<{ imported: number; duplicates: number; errors: number }>;
  listSavedCreators(workspaceId: string): Promise<SavedCreator[]>;
  updateSavedCreator(workspaceId: string, savedCreatorId: string, patch: Partial<Pick<SavedCreator, "relationshipStage" | "nextAction" | "nextActionAt" | "priority">>): Promise<void>;
  listGroups(workspaceId: string): Promise<WorkspaceGroup[]>;
  createGroup(workspaceId: string, input: Pick<WorkspaceGroup, "name" | "website" | "divisionType" | "parentDivisionId">): Promise<string>;
  listGroupCollaborators(workspaceId: string): Promise<GroupCollaborator[]>;
  addGroupCollaborator(workspaceId: string, group: WorkspaceGroup, email: string, role: GroupCollaboratorRole): Promise<void>;
  createCampaign(workspaceId: string, input: Pick<Campaign, "name" | "goal" | "platforms" | "currency" | "budget" | "clientId" | "divisionId">): Promise<string>;
  listCampaigns(workspaceId: string): Promise<Campaign[]>;
  addCampaignCreator(workspaceId: string, campaignId: string, savedCreatorId: string): Promise<void>;
  moveCampaignCreator(workspaceId: string, campaignId: string, campaignCreatorId: string, stage: CampaignStage): Promise<void>;
  getCampaignExecution(workspaceId: string, campaignId: string): Promise<Campaign | null>;
  addDeliverable(workspaceId: string, campaignId: string, campaignCreatorId: string, input: { title: string; channel: Platform; format: string; dueAt?: number }): Promise<void>;
  submitDeliverable(workspaceId: string, campaignId: string, deliverableId: string, submissionUrl: string): Promise<void>;
  decideDeliverable(workspaceId: string, campaignId: string, deliverableId: string, decision: Exclude<ApprovalDecision, "pending">, note?: string): Promise<void>;
  addCampaignTask(workspaceId: string, campaignId: string, input: { campaignCreatorId?: string; title: string; dueAt?: number }): Promise<void>;
  setCampaignTaskStatus(workspaceId: string, campaignId: string, taskId: string, status: CampaignTaskStatus): Promise<void>;
  setCampaignCreatorFee(workspaceId: string, campaignId: string, campaignCreatorId: string, agreedFee: number): Promise<void>;
  listActivity(workspaceId: string): Promise<WorkspaceActivity[]>;
};

const WorkspaceDataContext = createContext<WorkspaceData | null>(null);
export function useWorkspaceData() {
  const value = useContext(WorkspaceDataContext);
  if (!value) throw new Error("WorkspaceDataProvider is missing.");
  return value;
}

const WORKSPACE_KEY = "creatorly.workspace.v1";
const SAVED_KEY = "creatorly.saved-creators.v1";
const CAMPAIGN_KEY = "creatorly.campaigns.v1";
const ACTIVITY_KEY = "creatorly.workspace-activity.v1";
const INVITES_KEY = "creatorly.workspace-invites.v1";
const GROUPS_KEY = "creatorly.workspace-groups.v1";
const COLLABORATORS_KEY = "creatorly.group-collaborators.v1";

function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
function savedKey(workspaceId: string) { return workspaceId === "demo-workspace" ? SAVED_KEY : `${SAVED_KEY}.${workspaceId}`; }
function campaignKey(workspaceId: string) { return `${CAMPAIGN_KEY}.${workspaceId}`; }
function groupsKey(workspaceId: string) { return `${GROUPS_KEY}.${workspaceId}`; }
function collaboratorsKey(workspaceId: string) { return `${COLLABORATORS_KEY}.${workspaceId}`; }
function normalizeSaved(item: SavedCreator): SavedCreator { return { ...item, source: item.source ?? "creatorly" }; }
function normalizeCampaign(campaign: Campaign): Campaign {
  return { ...campaign, tasks: campaign.tasks ?? [], creators: campaign.creators.map(creator => ({ ...creator, deliverables: creator.deliverables ?? [] })) };
}
function record(summary: string, entityType: WorkspaceActivity["entityType"]) {
  const items = read<WorkspaceActivity[]>(ACTIVITY_KEY, []);
  write(ACTIVITY_KEY, [{ id: crypto.randomUUID(), summary, entityType, createdAt: Date.now() }, ...items].slice(0, 100));
}

export function DemoWorkspaceDataProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WorkspaceData>(() => ({
    async ensureWorkspace(viewer) {
      const existing = read<WorkspaceSummary | null>(WORKSPACE_KEY, null);
      if (existing) return existing;
      const workspace: WorkspaceSummary = { id: "demo-workspace", name: viewer.companyName || "Creator workspace", kind: "agency", role: "owner" };
      write(WORKSPACE_KEY, workspace);
      record(`Created workspace ${workspace.name}`, "workspace");
      return workspace;
    },
    async completeWorkspaceOnboarding(input) {
      const existing = read<WorkspaceSummary | null>(WORKSPACE_KEY, null);
      const workspace: WorkspaceSummary = {
        id: existing?.id ?? "demo-workspace",
        name: input.name.trim(),
        kind: input.kind,
        role: "owner",
        goals: [...new Set(input.goals)],
        defaultCampaignRole: input.role,
      };
      write(WORKSPACE_KEY, workspace);
      if (input.inviteEmail?.trim()) write(INVITES_KEY, [{ email: input.inviteEmail.trim().toLowerCase(), role: "contributor", status: "invited" }]);
      const viewer = await demoData.viewer();
      if (viewer) await demoData.updateProfile({ name: viewer.name, companyName: workspace.name });
      await demoData.completeOnboarding();
      if (!existing) record(`Created ${workspace.kind} workspace ${workspace.name}`, "workspace");
      return workspace;
    },
    async listWorkspaces() { const item = read<WorkspaceSummary | null>(WORKSPACE_KEY, null); return item ? [item] : []; },
    async saveCreator(workspaceId, creator) {
      const key = savedKey(workspaceId); const items = read<SavedCreator[]>(key, []).map(normalizeSaved);
      const existing = items.find(item => item.creator.id === creator.id);
      if (existing) return { savedCreatorId: existing.id, alreadySaved: true };
      const saved: SavedCreator = { id: crypto.randomUUID(), creator, source: "creatorly", relationshipStage: "discovered", ownerName: "Me", priority: "normal", tags: [], updatedAt: Date.now() };
      write(key, [saved, ...items]);
      record(`Saved ${creator.displayName}`, "saved_creator");
      return { savedCreatorId: saved.id, alreadySaved: false };
    },
    async importPrivateCreators(workspaceId, source, rows) {
      const key = savedKey(workspaceId); const items = read<SavedCreator[]>(key, []).map(normalizeSaved);
      const known = new Set(items.flatMap(item => {
        const profile = creatorDuplicateKey({ platform: item.creator.platform, handle: item.creator.handle });
        const email = creatorDuplicateKey({ email: item.privateContact?.email });
        return [profile, email].filter(Boolean);
      }));
      let imported = 0; let duplicates = 0; let errors = 0; const additions: SavedCreator[] = [];
      for (const row of rows) {
        const keys = [creatorDuplicateKey(row), creatorDuplicateKey({ email: row.email })].filter(Boolean);
        if (!row.displayName.trim() || (!row.handle && !row.email && !row.phone && !row.whatsapp)) { errors += 1; continue; }
        if (keys.some(keyValue => known.has(keyValue))) { duplicates += 1; continue; }
        keys.forEach(keyValue => known.add(keyValue));
        const id = crypto.randomUUID();
        additions.push({
          id,
          creator: { id: `private:${id}`, displayName: row.displayName.trim(), platform: row.platform, handle: row.handle?.trim(), followerCount: row.followerCount, location: row.location?.trim() },
          source,
          privateContact: { email: row.email?.trim().toLowerCase(), phone: row.phone?.trim(), whatsapp: row.whatsapp?.trim() },
          relationshipStage: "discovered",
          ownerName: "Me",
          priority: "normal",
          tags: row.tags ?? [],
          notes: row.notes?.trim(),
          updatedAt: Date.now(),
        });
        record(`${source === "manual" ? "Added" : "Imported"} private creator ${row.displayName.trim()}`, "saved_creator");
        imported += 1;
      }
      write(key, [...additions, ...items]);
      return { imported, duplicates, errors };
    },
    async listSavedCreators(workspaceId) { return read<SavedCreator[]>(savedKey(workspaceId), []).map(normalizeSaved); },
    async updateSavedCreator(workspaceId, savedCreatorId, patch) {
      const key = savedKey(workspaceId); const items = read<SavedCreator[]>(key, []).map(normalizeSaved);
      const current = items.find(item => item.id === savedCreatorId);
      write(key, items.map(item => item.id === savedCreatorId ? { ...item, ...patch, updatedAt: Date.now() } : item));
      if (current && patch.relationshipStage && current.relationshipStage !== patch.relationshipStage) record(`Moved ${current.creator.displayName} from ${current.relationshipStage} to ${patch.relationshipStage}`, "saved_creator");
    },
    async listGroups(workspaceId) { return read<WorkspaceGroup[]>(groupsKey(workspaceId), []); },
    async createGroup(workspaceId, input) {
      const workspace = read<WorkspaceSummary | null>(WORKSPACE_KEY, null);
      const groups = read<WorkspaceGroup[]>(groupsKey(workspaceId), []);
      const group: WorkspaceGroup = { id: crypto.randomUUID(), kind: workspace?.kind === "brand" ? "division" : "client", name: input.name.trim(), website: input.website?.trim() || undefined, divisionType: workspace?.kind === "brand" ? (input.divisionType ?? "brand") : undefined, parentDivisionId: input.parentDivisionId, status: "active" };
      write(groupsKey(workspaceId), [...groups, group]);
      return group.id;
    },
    async listGroupCollaborators(workspaceId) { return read<GroupCollaborator[]>(collaboratorsKey(workspaceId), []); },
    async addGroupCollaborator(workspaceId, group, email, role) {
      const items = read<GroupCollaborator[]>(collaboratorsKey(workspaceId), []);
      if (items.some(item => item.groupId === group.id && item.email === email.trim().toLowerCase() && item.role === role)) return;
      write(collaboratorsKey(workspaceId), [...items, { id: crypto.randomUUID(), groupId: group.id, email: email.trim().toLowerCase(), role, status: "invited" }]);
    },
    async createCampaign(workspaceId, input) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []);
      const now = Date.now();
      const groupId = input.clientId ?? input.divisionId;
      const groupName = read<WorkspaceGroup[]>(groupsKey(workspaceId), []).find(item => item.id === groupId)?.name;
      const campaign: Campaign = { id: crypto.randomUUID(), ...input, groupName, status: "active", ownerName: "Me", creators: [], tasks: [], createdAt: now, updatedAt: now };
      write(campaignKey(workspaceId), [campaign, ...campaigns]);
      record(`Created campaign ${campaign.name}`, "campaign");
      return campaign.id;
    },
    async listCampaigns(workspaceId) { return read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); },
    async addCampaignCreator(workspaceId, campaignId, savedCreatorId) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign);
      const campaign = campaigns.find(item => item.id === campaignId);
      const saved = read<SavedCreator[]>(savedKey(workspaceId), []).find(item => item.id === savedCreatorId);
      if (!campaign || !saved || campaign.creators.some(item => item.savedCreatorId === savedCreatorId)) return;
      const creator = { id: crypto.randomUUID(), savedCreatorId, stage: "shortlisted" as const, ownerName: saved.ownerName, nextAction: "Send campaign brief", deliverables: [] };
      write(campaignKey(workspaceId), campaigns.map(item => item.id === campaignId ? { ...item, creators: [...item.creators, creator], updatedAt: Date.now() } : item));
      record(`Added ${saved.creator.displayName} to ${campaign.name}`, "campaign_creator");
    },
    async moveCampaignCreator(workspaceId, campaignId, campaignCreatorId, stage) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign);
      const campaign = campaigns.find(item => item.id === campaignId);
      const current = campaign?.creators.find(item => item.id === campaignCreatorId);
      write(campaignKey(workspaceId), campaigns.map(item => item.id === campaignId ? { ...item, creators: item.creators.map(creator => creator.id === campaignCreatorId ? { ...creator, stage } : creator), updatedAt: Date.now() } : item));
      if (campaign && current) record(`Moved a creator in ${campaign.name} from ${current.stage} to ${stage}`, "campaign_creator");
    },
    async getCampaignExecution(workspaceId, campaignId) { return read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign).find(item => item.id === campaignId) ?? null; },
    async addDeliverable(workspaceId, campaignId, campaignCreatorId, input) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, creators: campaign.creators.map(creator => creator.id === campaignCreatorId ? { ...creator, deliverables: [...creator.deliverables, { id: crypto.randomUUID(), campaignCreatorId, ...input, status: "planned", approvals: [], createdAt: now, updatedAt: now }] } : creator), updatedAt: now } : campaign));
      record(`Added deliverable ${input.title}`, "deliverable");
    },
    async submitDeliverable(workspaceId, campaignId, deliverableId, submissionUrl) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, creators: campaign.creators.map(creator => ({ ...creator, deliverables: creator.deliverables.map(item => item.id === deliverableId ? { ...item, submissionUrl, status: "in_review", updatedAt: now } : item) })), updatedAt: now } : campaign));
      record("Submitted content for review", "deliverable");
    },
    async decideDeliverable(workspaceId, campaignId, deliverableId, decision, note) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, creators: campaign.creators.map(creator => ({ ...creator, deliverables: creator.deliverables.map(item => item.id === deliverableId ? { ...item, status: decision, approvals: [...item.approvals, { id: crypto.randomUUID(), decision, note, reviewerName: "Me", createdAt: now }], updatedAt: now } : item) })), updatedAt: now } : campaign));
      record(decision === "approved" ? "Approved creator content" : "Requested creator content changes", "approval");
    },
    async addCampaignTask(workspaceId, campaignId, input) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, tasks: [...campaign.tasks, { id: crypto.randomUUID(), ...input, status: "open", assigneeName: "Me", createdAt: now, updatedAt: now }], updatedAt: now } : campaign));
      record(`Created task ${input.title}`, "task");
    },
    async setCampaignTaskStatus(workspaceId, campaignId, taskId, status) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, tasks: campaign.tasks.map(task => task.id === taskId ? { ...task, status, updatedAt: now } : task), updatedAt: now } : campaign));
      record(status === "done" ? "Completed campaign task" : "Updated campaign task", "task");
    },
    async setCampaignCreatorFee(workspaceId, campaignId, campaignCreatorId, agreedFee) {
      const campaigns = read<Campaign[]>(campaignKey(workspaceId), []).map(normalizeCampaign); const now = Date.now();
      write(campaignKey(workspaceId), campaigns.map(campaign => campaign.id === campaignId ? { ...campaign, creators: campaign.creators.map(creator => creator.id === campaignCreatorId ? { ...creator, agreedFee } : creator), updatedAt: now } : campaign));
      record("Updated creator agreed fee", "campaign_creator");
    },
    async listActivity() { return read<WorkspaceActivity[]>(ACTIVITY_KEY, []); },
  }), []);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

type Empty = Record<string, never>;
const listWorkspacesRef = makeFunctionReference<"query">("workspaces:listMine") as FunctionReference<"query", "public", Empty, Array<{ id: string; name: string; kind: WorkspaceSummary["kind"]; role: WorkspaceSummary["role"] }>>;
const createWorkspaceRef = makeFunctionReference<"mutation">("workspaces:create") as FunctionReference<"mutation", "public", { name: string; kind: WorkspaceSummary["kind"]; website?: string }, { workspaceId: string }>;
const completeSetupRef = makeFunctionReference<"mutation">("workspaces:completeSetup") as FunctionReference<"mutation", "public", WorkspaceOnboardingInput, WorkspaceSummary>;
const saveCreatorRef = makeFunctionReference<"mutation">("savedCreators:save") as FunctionReference<"mutation", "public", { workspaceId: string; creatorId: string }, { savedCreatorId: string; alreadySaved: boolean }>;
const importPrivateRef = makeFunctionReference<"mutation">("savedCreators:importPrivate") as FunctionReference<"mutation", "public", { workspaceId: string; source: "csv_upload" | "manual"; rows: PrivateCreatorInput[] }, { imported: number; duplicates: number; errors: number }>;
const listSavedRef = makeFunctionReference<"query">("savedCreators:list") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const updateSavedRef = makeFunctionReference<"mutation">("savedCreators:update") as FunctionReference<"mutation", "public", { workspaceId: string; savedCreatorId: string; relationshipStage?: CampaignStage; nextAction?: string; nextActionAt?: number; priority?: SavedCreator["priority"] }, unknown>;
const listGroupsRef = makeFunctionReference<"query">("groupOperations:listGroups") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const createGroupRef = makeFunctionReference<"mutation">("groupOperations:createGroup") as FunctionReference<"mutation", "public", { workspaceId: string; name: string; website?: string; divisionType?: WorkspaceGroup["divisionType"]; parentDivisionId?: string }, { groupId: string }>;
const listCollaboratorsRef = makeFunctionReference<"query">("groupOperations:listCollaborators") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const addCollaboratorRef = makeFunctionReference<"mutation">("groupOperations:addCollaborator") as FunctionReference<"mutation", "public", { workspaceId: string; clientId?: string; divisionId?: string; email: string; role: GroupCollaboratorRole }, unknown>;
const createCampaignRef = makeFunctionReference<"mutation">("campaigns:create") as FunctionReference<"mutation", "public", { workspaceId: string; clientId?: string; divisionId?: string; name: string; goal: string; platforms: Campaign["platforms"]; currency: string; budget?: number }, { campaignId: string }>;
const listCampaignsRef = makeFunctionReference<"query">("campaigns:list") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const addCampaignCreatorRef = makeFunctionReference<"mutation">("campaigns:addCreator") as FunctionReference<"mutation", "public", { workspaceId: string; campaignId: string; savedCreatorId: string }, unknown>;
const moveCampaignCreatorRef = makeFunctionReference<"mutation">("campaigns:moveCreator") as FunctionReference<"mutation", "public", { workspaceId: string; campaignCreatorId: string; stage: CampaignStage }, unknown>;
const getExecutionRef = makeFunctionReference<"query">("campaignExecution:getCampaign") as FunctionReference<"query", "public", { workspaceId: string; campaignId: string }, Record<string, unknown>>;
const addDeliverableRef = makeFunctionReference<"mutation">("campaignExecution:addDeliverable") as FunctionReference<"mutation", "public", { workspaceId: string; campaignId: string; campaignCreatorId: string; title: string; channel: Platform; format: string; dueAt?: number }, unknown>;
const submitDeliverableRef = makeFunctionReference<"mutation">("campaignExecution:submitContent") as FunctionReference<"mutation", "public", { workspaceId: string; deliverableId: string; submissionUrl: string }, unknown>;
const decideDeliverableRef = makeFunctionReference<"mutation">("campaignExecution:decideApproval") as FunctionReference<"mutation", "public", { workspaceId: string; deliverableId: string; decision: Exclude<ApprovalDecision, "pending">; note?: string }, unknown>;
const addTaskRef = makeFunctionReference<"mutation">("campaignExecution:addTask") as FunctionReference<"mutation", "public", { workspaceId: string; campaignId: string; campaignCreatorId?: string; title: string; dueAt?: number }, unknown>;
const setTaskRef = makeFunctionReference<"mutation">("campaignExecution:setTaskStatus") as FunctionReference<"mutation", "public", { workspaceId: string; taskId: string; status: CampaignTaskStatus }, unknown>;
const setFeeRef = makeFunctionReference<"mutation">("campaignExecution:setCreatorFee") as FunctionReference<"mutation", "public", { workspaceId: string; campaignCreatorId: string; agreedFee: number }, unknown>;
const homeRef = makeFunctionReference<"query">("home:getSummary") as FunctionReference<"query", "public", { workspaceId: string }, { recentActivity: WorkspaceActivity[] }>;

function mapCampaignRow(row: Record<string, unknown>): Campaign {
  return {
    id: String(row._id), clientId: row.clientId ? String(row.clientId) : undefined, divisionId: row.divisionId ? String(row.divisionId) : undefined, groupName: row.groupName as string | undefined, name: String(row.name), goal: String(row.goal), platforms: row.platforms as Campaign["platforms"], status: row.status as Campaign["status"], ownerName: "Unassigned", currency: String(row.currency), budget: row.budget as number | undefined,
    creators: ((row.creators as Array<Record<string, unknown>> | undefined) ?? []).map(creator => ({
      id: String(creator._id), savedCreatorId: String(creator.savedCreatorId), stage: creator.stage as CampaignStage, ownerName: "Unassigned", nextAction: creator.nextAction as string | undefined, nextActionAt: creator.nextActionAt as number | undefined, agreedFee: creator.agreedFee as number | undefined,
      deliverables: ((creator.deliverables as Array<Record<string, unknown>> | undefined) ?? []).map(item => ({
        id: String(item._id), campaignCreatorId: String(item.campaignCreatorId), title: String(item.title), channel: item.channel as Platform, format: String(item.format), dueAt: item.dueAt as number | undefined, status: item.status as Campaign["creators"][number]["deliverables"][number]["status"], submissionUrl: item.submissionUrl as string | undefined, liveUrl: item.liveUrl as string | undefined,
        approvals: ((item.approvals as Array<Record<string, unknown>> | undefined) ?? []).map(approval => ({ id: String(approval._id), decision: approval.decision as ApprovalDecision, note: approval.note as string | undefined, reviewerName: String(approval.reviewerName ?? "Workspace reviewer"), createdAt: Number(approval.createdAt) })), createdAt: Number(item.createdAt), updatedAt: Number(item.updatedAt),
      })),
    })),
    tasks: ((row.tasks as Array<Record<string, unknown>> | undefined) ?? []).map(task => ({ id: String(task._id), campaignCreatorId: task.campaignCreatorId ? String(task.campaignCreatorId) : undefined, title: String(task.title), status: task.status as CampaignTaskStatus, dueAt: task.dueAt as number | undefined, assigneeName: "Unassigned", createdAt: Number(task.createdAt), updatedAt: Number(task.updatedAt) })),
    createdAt: Number(row.createdAt), updatedAt: Number(row.updatedAt),
  };
}

export function ConvexWorkspaceDataProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const ensureWorkspace = useCallback(async (viewer: Viewer) => {
    const existing = await convex.query(listWorkspacesRef, {});
    if (existing[0]) return existing[0];
    const result = await convex.mutation(createWorkspaceRef, { name: viewer.companyName || "Creator workspace", kind: "agency" });
    return { id: result.workspaceId, name: viewer.companyName || "Creator workspace", kind: "agency" as const, role: "owner" as const };
  }, [convex]);
  const value = useMemo<WorkspaceData>(() => ({
    ensureWorkspace,
    completeWorkspaceOnboarding: (input) => convex.mutation(completeSetupRef, input),
    listWorkspaces: () => convex.query(listWorkspacesRef, {}),
    saveCreator: (workspaceId, creator) => convex.mutation(saveCreatorRef, { workspaceId, creatorId: creator.id }),
    importPrivateCreators: (workspaceId, source, rows) => convex.mutation(importPrivateRef, { workspaceId, source, rows }),
    listSavedCreators: async (workspaceId) => (await convex.query(listSavedRef, { workspaceId })).flatMap(row => {
      const creator = row.creator as (CreatorSearchResult & { _id?: string }) | null;
      const id = String(row._id);
      const profile = creator ? { ...creator, id: String(creator._id ?? creator.id), contactCount: creator.contactCount ?? 0 } : {
        id: `private:${id}`,
        displayName: String(row.privateDisplayName ?? "Private creator"),
        platform: row.privatePlatform as Platform | undefined,
        handle: row.privateHandle as string | undefined,
        followerCount: row.privateFollowerCount as number | undefined,
        location: row.privateLocation as string | undefined,
      };
      return [{ id, creator: profile, source: (row.source ?? (creator ? "creatorly" : "manual")) as CreatorSource, privateContact: creator ? undefined : { email: row.privateEmail as string | undefined, phone: row.privatePhone as string | undefined, whatsapp: row.privateWhatsapp as string | undefined }, relationshipStage: row.relationshipStage as CampaignStage, ownerName: "Unassigned", priority: row.priority as SavedCreator["priority"], tags: row.tags as string[], notes: row.notes as string | undefined, nextAction: row.nextAction as string | undefined, nextActionAt: row.nextActionAt as number | undefined, updatedAt: row.updatedAt as number }];
    }),
    updateSavedCreator: async (workspaceId, savedCreatorId, patch) => { await convex.mutation(updateSavedRef, { workspaceId, savedCreatorId, ...patch }); },
    listGroups: async (workspaceId) => (await convex.query(listGroupsRef, { workspaceId })).map(row => ({ id: String(row._id), kind: row.kind as WorkspaceGroup["kind"], name: String(row.name), website: row.website as string | undefined, divisionType: row.divisionType as WorkspaceGroup["divisionType"], parentDivisionId: row.parentDivisionId ? String(row.parentDivisionId) : undefined, status: row.status as WorkspaceGroup["status"] })),
    createGroup: async (workspaceId, input) => (await convex.mutation(createGroupRef, { workspaceId, ...input })).groupId,
    listGroupCollaborators: async (workspaceId) => (await convex.query(listCollaboratorsRef, { workspaceId })).map(row => ({ id: String(row._id), groupId: String(row.clientId ?? row.divisionId), email: String(row.email), role: row.role as GroupCollaboratorRole, status: row.status as GroupCollaborator["status"] })),
    addGroupCollaborator: async (workspaceId, group, email, role) => { await convex.mutation(addCollaboratorRef, { workspaceId, clientId: group.kind === "client" ? group.id : undefined, divisionId: group.kind === "division" ? group.id : undefined, email, role }); },
    createCampaign: async (workspaceId, input) => (await convex.mutation(createCampaignRef, { workspaceId, ...input })).campaignId,
    listCampaigns: async (workspaceId) => (await convex.query(listCampaignsRef, { workspaceId })).map(mapCampaignRow),
    addCampaignCreator: async (workspaceId, campaignId, savedCreatorId) => { await convex.mutation(addCampaignCreatorRef, { workspaceId, campaignId, savedCreatorId }); },
    moveCampaignCreator: async (workspaceId, _campaignId, campaignCreatorId, stage) => { await convex.mutation(moveCampaignCreatorRef, { workspaceId, campaignCreatorId, stage }); },
    getCampaignExecution: async (workspaceId, campaignId) => { const row = await convex.query(getExecutionRef, { workspaceId, campaignId }); return row ? mapCampaignRow(row) : null; },
    addDeliverable: async (workspaceId, campaignId, campaignCreatorId, input) => { await convex.mutation(addDeliverableRef, { workspaceId, campaignId, campaignCreatorId, ...input }); },
    submitDeliverable: async (workspaceId, _campaignId, deliverableId, submissionUrl) => { await convex.mutation(submitDeliverableRef, { workspaceId, deliverableId, submissionUrl }); },
    decideDeliverable: async (workspaceId, _campaignId, deliverableId, decision, note) => { await convex.mutation(decideDeliverableRef, { workspaceId, deliverableId, decision, note }); },
    addCampaignTask: async (workspaceId, campaignId, input) => { await convex.mutation(addTaskRef, { workspaceId, campaignId, ...input }); },
    setCampaignTaskStatus: async (workspaceId, _campaignId, taskId, status) => { await convex.mutation(setTaskRef, { workspaceId, taskId, status }); },
    setCampaignCreatorFee: async (workspaceId, _campaignId, campaignCreatorId, agreedFee) => { await convex.mutation(setFeeRef, { workspaceId, campaignCreatorId, agreedFee }); },
    listActivity: async (workspaceId) => (await convex.query(homeRef, { workspaceId })).recentActivity,
  }), [convex, ensureWorkspace]);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}
