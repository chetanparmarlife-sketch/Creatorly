import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useConvex } from "convex/react";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import type { Campaign, CampaignStage, CreatorSearchResult, SavedCreator, Viewer, WorkspaceActivity, WorkspaceSummary } from "../../types";

type WorkspaceData = {
  ensureWorkspace(viewer: Viewer): Promise<WorkspaceSummary>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  saveCreator(workspaceId: string, creator: CreatorSearchResult): Promise<{ savedCreatorId: string; alreadySaved: boolean }>;
  listSavedCreators(workspaceId: string): Promise<SavedCreator[]>;
  updateSavedCreator(workspaceId: string, savedCreatorId: string, patch: Partial<Pick<SavedCreator, "relationshipStage" | "nextAction" | "nextActionAt" | "priority">>): Promise<void>;
  createCampaign(workspaceId: string, input: Pick<Campaign, "name" | "goal" | "platforms" | "currency" | "budget">): Promise<string>;
  listCampaigns(workspaceId: string): Promise<Campaign[]>;
  addCampaignCreator(workspaceId: string, campaignId: string, savedCreatorId: string): Promise<void>;
  moveCampaignCreator(workspaceId: string, campaignId: string, campaignCreatorId: string, stage: CampaignStage): Promise<void>;
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

function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
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
    async listWorkspaces() { const item = read<WorkspaceSummary | null>(WORKSPACE_KEY, null); return item ? [item] : []; },
    async saveCreator(_workspaceId, creator) {
      const items = read<SavedCreator[]>(SAVED_KEY, []);
      const existing = items.find(item => item.creator.id === creator.id);
      if (existing) return { savedCreatorId: existing.id, alreadySaved: true };
      const saved: SavedCreator = { id: crypto.randomUUID(), creator, relationshipStage: "discovered", ownerName: "Me", priority: "normal", tags: [], updatedAt: Date.now() };
      write(SAVED_KEY, [saved, ...items]);
      record(`Saved ${creator.displayName}`, "saved_creator");
      return { savedCreatorId: saved.id, alreadySaved: false };
    },
    async listSavedCreators() { return read<SavedCreator[]>(SAVED_KEY, []); },
    async updateSavedCreator(_workspaceId, savedCreatorId, patch) {
      const items = read<SavedCreator[]>(SAVED_KEY, []);
      const current = items.find(item => item.id === savedCreatorId);
      write(SAVED_KEY, items.map(item => item.id === savedCreatorId ? { ...item, ...patch, updatedAt: Date.now() } : item));
      if (current && patch.relationshipStage && current.relationshipStage !== patch.relationshipStage) record(`Moved ${current.creator.displayName} from ${current.relationshipStage} to ${patch.relationshipStage}`, "saved_creator");
    },
    async createCampaign(_workspaceId, input) {
      const campaigns = read<Campaign[]>(CAMPAIGN_KEY, []);
      const now = Date.now();
      const campaign: Campaign = { id: crypto.randomUUID(), ...input, status: "active", ownerName: "Me", creators: [], createdAt: now, updatedAt: now };
      write(CAMPAIGN_KEY, [campaign, ...campaigns]);
      record(`Created campaign ${campaign.name}`, "campaign");
      return campaign.id;
    },
    async listCampaigns() { return read<Campaign[]>(CAMPAIGN_KEY, []); },
    async addCampaignCreator(_workspaceId, campaignId, savedCreatorId) {
      const campaigns = read<Campaign[]>(CAMPAIGN_KEY, []);
      const campaign = campaigns.find(item => item.id === campaignId);
      const saved = read<SavedCreator[]>(SAVED_KEY, []).find(item => item.id === savedCreatorId);
      if (!campaign || !saved || campaign.creators.some(item => item.savedCreatorId === savedCreatorId)) return;
      const creator = { id: crypto.randomUUID(), savedCreatorId, stage: "shortlisted" as const, ownerName: saved.ownerName, nextAction: "Send campaign brief" };
      write(CAMPAIGN_KEY, campaigns.map(item => item.id === campaignId ? { ...item, creators: [...item.creators, creator], updatedAt: Date.now() } : item));
      record(`Added ${saved.creator.displayName} to ${campaign.name}`, "campaign_creator");
    },
    async moveCampaignCreator(_workspaceId, campaignId, campaignCreatorId, stage) {
      const campaigns = read<Campaign[]>(CAMPAIGN_KEY, []);
      const campaign = campaigns.find(item => item.id === campaignId);
      const current = campaign?.creators.find(item => item.id === campaignCreatorId);
      write(CAMPAIGN_KEY, campaigns.map(item => item.id === campaignId ? { ...item, creators: item.creators.map(creator => creator.id === campaignCreatorId ? { ...creator, stage } : creator), updatedAt: Date.now() } : item));
      if (campaign && current) record(`Moved a creator in ${campaign.name} from ${current.stage} to ${stage}`, "campaign_creator");
    },
    async listActivity() { return read<WorkspaceActivity[]>(ACTIVITY_KEY, []); },
  }), []);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

type Empty = Record<string, never>;
const listWorkspacesRef = makeFunctionReference<"query">("workspaces:listMine") as FunctionReference<"query", "public", Empty, Array<{ id: string; name: string; kind: WorkspaceSummary["kind"]; role: WorkspaceSummary["role"] }>>;
const createWorkspaceRef = makeFunctionReference<"mutation">("workspaces:create") as FunctionReference<"mutation", "public", { name: string; kind: WorkspaceSummary["kind"]; website?: string }, { workspaceId: string }>;
const saveCreatorRef = makeFunctionReference<"mutation">("savedCreators:save") as FunctionReference<"mutation", "public", { workspaceId: string; creatorId: string }, { savedCreatorId: string; alreadySaved: boolean }>;
const listSavedRef = makeFunctionReference<"query">("savedCreators:list") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const updateSavedRef = makeFunctionReference<"mutation">("savedCreators:update") as FunctionReference<"mutation", "public", { workspaceId: string; savedCreatorId: string; relationshipStage?: CampaignStage; nextAction?: string; nextActionAt?: number; priority?: SavedCreator["priority"] }, unknown>;
const createCampaignRef = makeFunctionReference<"mutation">("campaigns:create") as FunctionReference<"mutation", "public", { workspaceId: string; name: string; goal: string; platforms: Campaign["platforms"]; currency: string; budget?: number }, { campaignId: string }>;
const listCampaignsRef = makeFunctionReference<"query">("campaigns:list") as FunctionReference<"query", "public", { workspaceId: string }, Array<Record<string, unknown>>>;
const addCampaignCreatorRef = makeFunctionReference<"mutation">("campaigns:addCreator") as FunctionReference<"mutation", "public", { workspaceId: string; campaignId: string; savedCreatorId: string }, unknown>;
const moveCampaignCreatorRef = makeFunctionReference<"mutation">("campaigns:moveCreator") as FunctionReference<"mutation", "public", { workspaceId: string; campaignCreatorId: string; stage: CampaignStage }, unknown>;
const homeRef = makeFunctionReference<"query">("home:getSummary") as FunctionReference<"query", "public", { workspaceId: string }, { recentActivity: WorkspaceActivity[] }>;

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
    listWorkspaces: () => convex.query(listWorkspacesRef, {}),
    saveCreator: (workspaceId, creator) => convex.mutation(saveCreatorRef, { workspaceId, creatorId: creator.id }),
    listSavedCreators: async (workspaceId) => (await convex.query(listSavedRef, { workspaceId })).flatMap(row => {
      const creator = row.creator as (CreatorSearchResult & { _id?: string }) | null;
      if (!creator) return [];
      return [{ id: String(row._id), creator: { ...creator, id: String(creator._id ?? creator.id), contactCount: creator.contactCount ?? 0, matchScore: 0 }, relationshipStage: row.relationshipStage as CampaignStage, ownerName: "Unassigned", priority: row.priority as SavedCreator["priority"], tags: row.tags as string[], nextAction: row.nextAction as string | undefined, nextActionAt: row.nextActionAt as number | undefined, updatedAt: row.updatedAt as number }];
    }),
    updateSavedCreator: async (workspaceId, savedCreatorId, patch) => { await convex.mutation(updateSavedRef, { workspaceId, savedCreatorId, ...patch }); },
    createCampaign: async (workspaceId, input) => (await convex.mutation(createCampaignRef, { workspaceId, ...input })).campaignId,
    listCampaigns: async (workspaceId) => (await convex.query(listCampaignsRef, { workspaceId })).map(row => ({
      id: String(row._id),
      name: String(row.name),
      goal: String(row.goal),
      platforms: row.platforms as Campaign["platforms"],
      status: row.status as Campaign["status"],
      ownerName: "Unassigned",
      currency: String(row.currency),
      budget: row.budget as number | undefined,
      creators: ((row.creators as Array<Record<string, unknown>> | undefined) ?? []).map(creator => ({
        id: String(creator._id),
        savedCreatorId: String(creator.savedCreatorId),
        stage: creator.stage as CampaignStage,
        ownerName: "Unassigned",
        nextAction: creator.nextAction as string | undefined,
      })),
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
    })),
    addCampaignCreator: async (workspaceId, campaignId, savedCreatorId) => { await convex.mutation(addCampaignCreatorRef, { workspaceId, campaignId, savedCreatorId }); },
    moveCampaignCreator: async (workspaceId, _campaignId, campaignCreatorId, stage) => { await convex.mutation(moveCampaignCreatorRef, { workspaceId, campaignCreatorId, stage }); },
    listActivity: async (workspaceId) => (await convex.query(homeRef, { workspaceId })).recentActivity,
  }), [convex, ensureWorkspace]);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}
