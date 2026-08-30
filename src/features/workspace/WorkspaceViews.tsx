import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, ChevronRight, CircleDollarSign, Download, FolderKanban, Plus, Search, Sparkles, Users } from "lucide-react";
import { useAppData } from "../../data/AppData";
import type { AppRoute } from "../../hooks/useRoute";
import { CAMPAIGN_STAGES, type Campaign, type CampaignStage, type CreatorSearchResult, type Platform, type SavedCreator, type WorkspaceActivity, type WorkspaceSummary } from "../../types";
import { useWorkspaceData } from "./WorkspaceData";
import { CampaignExecution } from "./CampaignExecution";
import { CreatorImportPanel } from "./CreatorImportPanel";
import { exportCreatorsCsv } from "./creatorImport";
import "./workspace.css";

const stageLabel = (stage: CampaignStage) => stage.replaceAll("_", " ").replace(/^./, value => value.toUpperCase());
const formatFollowers = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${Math.round(value / 1_000)}K` : String(value);

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <header className="ops-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</header>;
}

export function WorkspaceHome({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData();
  const [saved, setSaved] = useState<SavedCreator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  useEffect(() => { void Promise.all([store.listSavedCreators(workspace.id), store.listCampaigns(workspace.id), store.listActivity(workspace.id)]).then(([nextSaved, nextCampaigns, nextActivity]) => { setSaved(nextSaved); setCampaigns(nextCampaigns); setActivity(nextActivity); }); }, [store, workspace.id]);
  const due = saved.filter(item => item.nextAction);
  return <main className="workspace ops-page">
    <PageHeader eyebrow={workspace.kind} title={`Good morning, ${workspace.name}.`} copy="The next decisions across your creator pipeline, in one place." action={<button className="button button-primary" onClick={() => navigate({ name: "discover" })}><Search size={16}/> Discover creators</button>}/>
    <section className="ops-summary" aria-label="Workspace summary">
      <button onClick={() => navigate({ name: "creators" })}><span>Saved creators</span><strong>{saved.length}</strong><small>{saved.length ? "Ready to activate" : "Start your roster"}</small></button>
      <button onClick={() => navigate({ name: "campaigns" })}><span>Active campaigns</span><strong>{campaigns.filter(item => item.status === "active").length}</strong><small>{campaigns.length ? `${campaigns.reduce((total, item) => total + item.creators.length, 0)} creator placements` : "Create your first campaign"}</small></button>
      <div><span>Actions due</span><strong>{due.length}</strong><small>{due.length ? "Needs attention" : "Nothing overdue"}</small></div>
    </section>
    <div className="ops-home-grid">
      <section className="ops-panel"><header><div><p className="eyebrow">Priority queue</p><h2>Next actions</h2></div><button className="text-button" onClick={() => navigate({ name: "creators" })}>View CRM <ArrowRight size={14}/></button></header>
        {due.length ? <div className="next-action-list">{due.slice(0, 6).map(item => <article key={item.id}><span className="creator-monogram">{item.creator.displayName[0]}</span><div><strong>{item.creator.displayName}</strong><p>{item.nextAction}</p></div><span className="status-chip status-review">{stageLabel(item.relationshipStage)}</span></article>)}</div> : <Empty icon={<CalendarClock/>} title="Your queue is clear" copy="Add a next action to a saved creator and it will appear here." action="Open creators" onAction={() => navigate({ name: "creators" })}/>}</section>
      <section className="ops-panel"><header><div><p className="eyebrow">Campaign pulse</p><h2>Active campaigns</h2></div></header>
        {campaigns.length ? <div className="campaign-mini-list">{campaigns.slice(0, 4).map(campaign => <button key={campaign.id} onClick={() => navigate({ name: "campaign", campaignId: campaign.id })}><span><strong>{campaign.name}</strong><small>{campaign.goal}</small></span><b>{campaign.creators.length} creators</b><ChevronRight size={16}/></button>)}</div> : <Empty icon={<FolderKanban/>} title="No campaign is running" copy="Create a campaign and turn your saved roster into a shared execution plan." action="Create campaign" onAction={() => navigate({ name: "campaigns" })}/>}</section>
    </div>
    <section className="ops-panel activity-panel"><header><div><p className="eyebrow">Workspace log</p><h2>Recent activity</h2></div></header>{activity.length ? <ol>{activity.slice(0, 8).map(item => <li key={item.id}><span/><p>{item.summary}</p><time>{new Date(item.createdAt).toLocaleDateString()}</time></li>)}</ol> : <p className="panel-empty-copy">Workspace changes will appear here.</p>}</section>
  </main>;
}

function Empty({ icon, title, copy, action, onAction }: { icon: React.ReactNode; title: string; copy: string; action: string; onAction(): void }) {
  return <div className="ops-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" onClick={onAction}>{action}</button></div>;
}

export function DiscoveryWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const data = useAppData(); const store = useWorkspaceData();
  const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<Platform | "all">("all");
  const [results, setResults] = useState<CreatorSearchResult[]>([]); const [savedIds, setSavedIds] = useState<Set<string>>(new Set()); const [loading, setLoading] = useState(false);
  const run = useCallback(async (nextQuery = query, nextPlatform = platform) => { setLoading(true); try { setResults(await data.search(nextQuery, { platform: nextPlatform === "all" ? undefined : nextPlatform })); } finally { setLoading(false); } }, [data, platform, query]);
  useEffect(() => { let active = true; void Promise.all([data.search("", {}), store.listSavedCreators(workspace.id)]).then(([creators, saved]) => { if (active) { setResults(creators); setSavedIds(new Set(saved.map(item => item.creator.id))); } }); return () => { active = false; }; }, [data, store, workspace.id]);
  async function save(creator: CreatorSearchResult) { await store.saveCreator(workspace.id, creator); setSavedIds(current => new Set(current).add(creator.id)); }
  return <main className="workspace ops-page">
    <PageHeader eyebrow="Creator database" title="Discover creators" copy="Search the current Creatorly repository, then save the strongest profiles to your team workspace." action={<span className="data-source-chip">Demo repository · official connections planned</span>}/>
    <section className="discovery-command"><Search size={20}/><label className="sr-only" htmlFor="workspace-creator-search">Creator name or handle</label><input id="workspace-creator-search" aria-label="Creator name or handle" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void run(); }} placeholder="Search by creator, handle, category, or market"/><button className="button button-primary" onClick={() => run()}><Sparkles size={15}/> Search</button></section>
    <div className="platform-filter" role="group" aria-label="Platform filters">{(["all", "instagram", "tiktok", "youtube", "twitter"] as const).map(item => <button className={platform === item ? "is-active" : ""} key={item} onClick={() => { setPlatform(item); void run(query, item); }}>{item === "twitter" ? "X" : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
    <section className="ops-table-card"><div className="ops-table-head"><span>Creator</span><span>Platform</span><span>Audience</span><span>Market</span><span>Contact</span><span/></div>
      {loading ? <div className="ops-loading" role="status">Searching creators…</div> : results.length ? results.map(creator => <article className="ops-table-row" key={creator.id}>
        <button className="creator-cell" onClick={() => navigate({ name: "creator", creatorId: creator.id })} aria-label={`View ${creator.displayName} profile`}><span className="creator-monogram">{creator.displayName[0]}</span><span><strong>{creator.displayName}</strong><small>{creator.handle} · {creator.categories?.[0] ?? "Creator"}</small></span></button>
        <span className="platform-name">{creator.platform === "twitter" ? "X" : creator.platform}</span><b className="numeric">{formatFollowers(creator.followerCount)}</b><span>{creator.location ?? "—"}</span><span className={creator.contactCount ? "contact-ready" : "contact-missing"}>{creator.contactCount ? `${creator.contactCount} available` : "Not available"}</span>
        <button className={savedIds.has(creator.id) ? "button button-saved" : "button button-secondary"} disabled={savedIds.has(creator.id)} onClick={() => save(creator)}>{savedIds.has(creator.id) ? <><Check size={15}/> Saved</> : <><Plus size={15}/> Save</>}</button>
      </article>) : <Empty icon={<Search/>} title="No creators match yet" copy="Try a broader name, platform, or category. Live platform coverage will appear only after an official connection is enabled." action="Clear search" onAction={() => { setQuery(""); setPlatform("all"); void run("", "all"); }}/>}</section>
  </main>;
}

export function CreatorsWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData(); const [items, setItems] = useState<SavedCreator[]>([]); const [filter, setFilter] = useState(""); const [importing, setImporting] = useState(false);
  const load = useCallback(() => store.listSavedCreators(workspace.id).then(setItems), [store, workspace.id]); useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => items.filter(item => `${item.creator.displayName} ${item.creator.handle ?? ""} ${item.privateContact?.email ?? ""}`.toLowerCase().includes(filter.toLowerCase())), [filter, items]);
  async function update(item: SavedCreator, stage: CampaignStage) { await store.updateSavedCreator(workspace.id, item.id, { relationshipStage: stage, nextAction: stage === "contacted" ? "Follow up in 3 days" : item.nextAction }); await load(); }
  function downloadCrm() {
    const csv = exportCreatorsCsv(items.map(item => ({ displayName: item.creator.displayName, source: sourceLabel(item), platform: item.creator.platform, handle: item.creator.handle, followerCount: item.creator.followerCount, location: item.creator.location, email: item.privateContact?.email, phone: item.privateContact?.phone, whatsapp: item.privateContact?.whatsapp, stage: item.relationshipStage, owner: item.ownerName, nextAction: item.nextAction, priority: item.priority, tags: item.tags, notes: item.notes })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `creatorly-crm-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  const sourceLabel = (item: SavedCreator) => item.source === "creatorly" ? "Creatorly data" : item.source === "csv_upload" ? "Uploaded by your team" : "Added manually";
  const contactLabel = (item: SavedCreator) => item.privateContact?.email ?? item.privateContact?.whatsapp ?? item.privateContact?.phone ?? (item.source === "creatorly" ? "Use Creatorly contact access" : "No contact added");
  return <main className="workspace ops-page"><PageHeader eyebrow="Relationship workspace" title="Creator CRM" copy="Creatorly profiles and your team’s private creator data in one workspace." action={<div className="crm-header-actions"><button className="button button-secondary" disabled={!items.length} onClick={downloadCrm}><Download size={15}/> Export CSV</button><button className="button button-primary" onClick={() => setImporting(true)}><Plus size={16}/> Add creators</button></div>}/>
    <div className="crm-toolbar"><label><Search size={16}/><span className="sr-only">Search saved creators</span><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search creators, handles, or private contacts"/></label><span>{visible.length} creators · private to {workspace.name}</span></div>
    <section className="ops-table-card"><div className="crm-head"><span>Creator</span><span>Source</span><span>Contact</span><span>Stage</span><span>Owner</span><span>Next action</span><span>Priority</span></div>{visible.length ? visible.map(item => <article className="crm-row" key={item.id}>{item.source === "creatorly" ? <button className="creator-cell" onClick={() => navigate({ name: "creator", creatorId: item.creator.id })}><span className="creator-monogram">{item.creator.displayName[0]}</span><span><strong>{item.creator.displayName}</strong><small>{item.creator.handle ?? "Creator profile"}</small></span></button> : <div className="creator-cell"><span className="creator-monogram">{item.creator.displayName[0]}</span><span><strong>{item.creator.displayName}</strong><small>{item.creator.handle ?? "Private contact"}</small></span></div>}<span><b className={`crm-source source-${item.source}`}>{sourceLabel(item)}</b></span><span className="crm-private-contact">{contactLabel(item)}</span><select aria-label={`${item.creator.displayName} stage`} value={item.relationshipStage} onChange={event => update(item, event.target.value as CampaignStage)}>{CAMPAIGN_STAGES.map(stage => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</select><span>{item.ownerName}</span><span>{item.nextAction ?? "Add next action"}</span><span className={`priority priority-${item.priority}`}>{item.priority}</span></article>) : <Empty icon={<Users/>} title="Your creator roster is empty" copy="Upload a CSV, add a private creator manually, or save a profile from Creatorly Discovery." action="Add private creators" onAction={() => setImporting(true)}/>}</section>
    {importing ? <CreatorImportPanel workspaceId={workspace.id} existing={items} onClose={() => setImporting(false)} onImported={load}/> : null}
  </main>;
}

export function CampaignsWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData(); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [creating, setCreating] = useState(false); const [name, setName] = useState(""); const [goal, setGoal] = useState("");
  const load = useCallback(() => store.listCampaigns(workspace.id).then(setCampaigns), [store, workspace.id]); useEffect(() => { void load(); }, [load]);
  async function create(event: React.FormEvent) { event.preventDefault(); const id = await store.createCampaign(workspace.id, { name, goal: goal || "Creator partnerships", platforms: ["instagram", "tiktok", "youtube"], currency: "INR", budget: 500000 }); navigate({ name: "campaign", campaignId: id }); }
  return <main className="workspace ops-page"><PageHeader eyebrow="Campaign operations" title="Campaigns" copy="Plan the roster, assign the work, and keep every creator moving toward live content." action={<button className="button button-primary" onClick={() => setCreating(true)}><Plus size={16}/> Create campaign</button>}/>
    {creating ? <form className="create-campaign-panel" onSubmit={create}><header><div><p className="eyebrow">New campaign</p><h2>Start with the working brief</h2></div><button type="button" className="text-button" onClick={() => setCreating(false)}>Cancel</button></header><label>Campaign name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Festive creator launch"/></label><label>Goal<input value={goal} onChange={event => setGoal(event.target.value)} placeholder="Drive consideration with trusted creators"/></label><div><button className="button button-primary" type="submit">Create campaign</button></div></form> : null}
    {campaigns.length ? <section className="campaign-grid">{campaigns.map(campaign => <button key={campaign.id} onClick={() => navigate({ name: "campaign", campaignId: campaign.id })}><header><span className={`status-chip status-${campaign.status}`}>{campaign.status}</span><small>{campaign.platforms.map(item => item === "twitter" ? "X" : item).join(" · ")}</small></header><h2>{campaign.name}</h2><p>{campaign.goal}</p><footer><span><Users size={15}/>{campaign.creators.length} creators</span><span><CircleDollarSign size={15}/>{campaign.currency} {(campaign.budget ?? 0).toLocaleString()}</span><ChevronRight size={17}/></footer></button>)}</section> : !creating ? <section className="ops-panel"><Empty icon={<FolderKanban/>} title="No campaigns yet" copy="Create the first campaign, then add saved creators and move them through the campaign rail." action="Create campaign" onAction={() => setCreating(true)}/></section> : null}
  </main>;
}

export function CampaignDetailWorkspace({ workspace, campaignId, navigate }: { workspace: WorkspaceSummary; campaignId: string; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData(); const [campaign, setCampaign] = useState<Campaign | null>(null); const [saved, setSaved] = useState<SavedCreator[]>([]); const [selectedCreator, setSelectedCreator] = useState("");
  const load = useCallback(async () => { const [nextCampaign, savedCreators] = await Promise.all([store.getCampaignExecution(workspace.id, campaignId), store.listSavedCreators(workspace.id)]); setCampaign(nextCampaign); setSaved(savedCreators); }, [campaignId, store, workspace.id]);
  useEffect(() => { let active = true; void Promise.all([store.getCampaignExecution(workspace.id, campaignId), store.listSavedCreators(workspace.id)]).then(([nextCampaign, savedCreators]) => { if (active) { setCampaign(nextCampaign); setSaved(savedCreators); } }); return () => { active = false; }; }, [campaignId, store, workspace.id]);
  if (!campaign) return <main className="workspace ops-page"><div className="ops-loading">Loading campaign…</div></main>;
  const activeCampaign = campaign;
  const available = saved.filter(item => !activeCampaign.creators.some(creator => creator.savedCreatorId === item.id));
  async function add() { if (!selectedCreator) return; await store.addCampaignCreator(workspace.id, activeCampaign.id, selectedCreator); setSelectedCreator(""); await load(); }
  async function move(id: string, stage: CampaignStage) { await store.moveCampaignCreator(workspace.id, activeCampaign.id, id, stage); await load(); }
  return <main className="workspace ops-page"><button className="back-link" onClick={() => navigate({ name: "campaigns" })}>← All campaigns</button><PageHeader eyebrow="Active campaign" title={campaign.name} copy={campaign.goal} action={<div className="add-campaign-creator"><select aria-label="Saved creator" value={selectedCreator} onChange={event => setSelectedCreator(event.target.value)}><option value="">Add a saved creator…</option>{available.map(item => <option key={item.id} value={item.id}>{item.creator.displayName}</option>)}</select><button className="button button-primary" disabled={!selectedCreator} onClick={add}><Plus size={15}/> Add</button></div>}/>
    <CampaignExecution workspace={workspace} campaign={campaign} savedCreators={saved} onRefresh={load} onMove={move}/>
  </main>;
}
