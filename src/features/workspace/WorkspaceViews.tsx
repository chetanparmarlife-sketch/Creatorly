import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleDollarSign, Download, FolderKanban, Plus, RotateCcw, Search, Sparkles, Users } from "lucide-react";
import { useAppData } from "../../data/AppData";
import type { AppRoute } from "../../hooks/useRoute";
import { CAMPAIGN_STAGES, type Campaign, type CampaignStage, type CreatorSearchResult, type Platform, type SavedCreator, type WorkspaceSummary } from "../../types";
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

function Empty({ icon, title, copy, action, onAction }: { icon: React.ReactNode; title: string; copy: string; action: string; onAction(): void }) {
  return <div className="ops-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" onClick={onAction}>{action}</button></div>;
}

export function DiscoveryWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const data = useAppData(); const store = useWorkspaceData();
  const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<Platform | "all">("all");
  const [creatorFilter, setCreatorFilter] = useState(""); const [audience, setAudience] = useState<"all" | "under100k" | "100k500k" | "500k1m" | "over1m">("all");
  const [market, setMarket] = useState(""); const [contact, setContact] = useState<"all" | "available" | "missing">("all");
  const [results, setResults] = useState<CreatorSearchResult[]>([]); const [savedIds, setSavedIds] = useState<Set<string>>(new Set()); const [loading, setLoading] = useState(false);
  const run = useCallback(async (nextQuery = query, nextPlatform = platform) => { setLoading(true); try { setResults(await data.search(nextQuery, { platform: nextPlatform === "all" ? undefined : nextPlatform })); } finally { setLoading(false); } }, [data, platform, query]);
  useEffect(() => { let active = true; void Promise.all([data.search("", {}), store.listSavedCreators(workspace.id)]).then(([creators, saved]) => { if (active) { setResults(creators); setSavedIds(new Set(saved.map(item => item.creator.id))); } }); return () => { active = false; }; }, [data, store, workspace.id]);
  const visibleResults = useMemo(() => results.filter(creator => {
    const creatorText = `${creator.displayName} ${creator.handle} ${creator.categories?.join(" ") ?? ""}`.toLowerCase();
    const creatorMatches = creatorText.includes(creatorFilter.trim().toLowerCase());
    const marketMatches = `${creator.location ?? ""}`.toLowerCase().includes(market.trim().toLowerCase());
    const contactMatches = contact === "all" || (contact === "available" ? creator.contactCount > 0 : creator.contactCount === 0);
    const audienceMatches = audience === "all"
      || (audience === "under100k" && creator.followerCount < 100_000)
      || (audience === "100k500k" && creator.followerCount >= 100_000 && creator.followerCount < 500_000)
      || (audience === "500k1m" && creator.followerCount >= 500_000 && creator.followerCount < 1_000_000)
      || (audience === "over1m" && creator.followerCount >= 1_000_000);
    return creatorMatches && marketMatches && contactMatches && audienceMatches;
  }), [audience, contact, creatorFilter, market, results]);
  const filtersActive = Boolean(creatorFilter || market || platform !== "all" || audience !== "all" || contact !== "all");
  function clearTableFilters() { setCreatorFilter(""); setPlatform("all"); setAudience("all"); setMarket(""); setContact("all"); void run(query, "all"); }
  async function save(creator: CreatorSearchResult) { await store.saveCreator(workspace.id, creator); setSavedIds(current => new Set(current).add(creator.id)); }
  return <main className="workspace ops-page">
    <PageHeader eyebrow="Creator database" title="Discover creators" copy="Search the current Creatorly repository, then save the strongest profiles to your team workspace." action={<span className="data-source-chip">Demo repository · official connections planned</span>}/>
    <section className="discovery-command"><Search size={20}/><label className="sr-only" htmlFor="workspace-creator-search">Creator name or handle</label><input id="workspace-creator-search" aria-label="Creator name or handle" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void run(); }} placeholder="Search by creator, handle, category, or market"/><button className="button button-primary" onClick={() => run()}><Sparkles size={15}/> Search</button></section>
    <div className="discovery-filter-summary"><span><strong>{visibleResults.length}</strong> of {results.length} creators</span>{filtersActive ? <button type="button" onClick={clearTableFilters}><RotateCcw size={13}/> Reset filters</button> : <span>Use any column to narrow the table</span>}</div>
    <section className="ops-table-card"><div className="ops-table-head"><span>Creator</span><span>Platform</span><span>Audience</span><span>Market</span><span>Contact</span><span/></div>
      <div className="ops-table-filters" aria-label="Creator table filters">
        <label><Search size={14}/><span className="sr-only">Filter creator column</span><input aria-label="Filter creator column" value={creatorFilter} onChange={event => setCreatorFilter(event.target.value)} placeholder="Name or handle"/></label>
        <label><span className="sr-only">Filter platform column</span><select aria-label="Filter platform column" value={platform} onChange={event => { const value = event.target.value as Platform | "all"; setPlatform(value); void run(query, value); }}><option value="all">All platforms</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="twitter">X</option></select></label>
        <label><span className="sr-only">Filter audience column</span><select aria-label="Filter audience column" value={audience} onChange={event => setAudience(event.target.value as typeof audience)}><option value="all">Any audience</option><option value="under100k">Under 100K</option><option value="100k500k">100K–500K</option><option value="500k1m">500K–1M</option><option value="over1m">1M+</option></select></label>
        <label><span className="sr-only">Filter market column</span><input aria-label="Filter market column" value={market} onChange={event => setMarket(event.target.value)} placeholder="City or country"/></label>
        <label><span className="sr-only">Filter contact column</span><select aria-label="Filter contact column" value={contact} onChange={event => setContact(event.target.value as typeof contact)}><option value="all">Any contact</option><option value="available">Available</option><option value="missing">Not available</option></select></label>
        <button type="button" className="filter-reset-icon" onClick={clearTableFilters} disabled={!filtersActive} aria-label="Reset table filters"><RotateCcw size={15}/></button>
      </div>
      {loading ? <div className="ops-loading" role="status">Searching creators…</div> : visibleResults.length ? visibleResults.map(creator => <article className="ops-table-row" key={creator.id}>
        <button className="creator-cell" onClick={() => navigate({ name: "creator", creatorId: creator.id })} aria-label={`View ${creator.displayName} profile`}><span className="creator-monogram">{creator.displayName[0]}</span><span><strong>{creator.displayName}</strong><small>{creator.handle} · {creator.categories?.[0] ?? "Creator"}</small></span></button>
        <span className="platform-name">{creator.platform === "twitter" ? "X" : creator.platform}</span><b className="numeric">{formatFollowers(creator.followerCount)}</b><span>{creator.location ?? "—"}</span><span className={creator.contactCount ? "contact-ready" : "contact-missing"}>{creator.contactCount ? `${creator.contactCount} available` : "Not available"}</span>
        <button className={savedIds.has(creator.id) ? "button button-saved" : "button button-secondary"} disabled={savedIds.has(creator.id)} onClick={() => save(creator)}>{savedIds.has(creator.id) ? <><Check size={15}/> Saved</> : <><Plus size={15}/> Save</>}</button>
      </article>) : <Empty icon={<Search/>} title="No creators match these filters" copy="Broaden one of the column filters or reset the table to see the full result set." action="Reset filters" onAction={clearTableFilters}/>}</section>
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
  const sourceLabel = (item: SavedCreator) => item.source === "creatorly" ? "Creatorly data" : item.source === "csv_upload" ? "Uploaded by your team" : item.source === "extension" ? "Added from extension" : "Added manually";
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
