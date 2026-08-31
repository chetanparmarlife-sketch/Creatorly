import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUpDown, Building2, Check, ChevronRight, CircleDollarSign, Download, FileDown, FolderKanban, Plus, RotateCcw, Search, Sparkles, UserPlus, Users, X } from "lucide-react";
import { useAppData } from "../../data/AppData";
import type { AppRoute } from "../../hooks/useRoute";
import { CAMPAIGN_STAGES, type BrandDivisionType, type Campaign, type CampaignStage, type CreatorSearchResult, type GroupCollaborator, type GroupCollaboratorRole, type Platform, type SavedCreator, type WorkspaceGroup, type WorkspaceSummary } from "../../types";
import { useWorkspaceData } from "./WorkspaceData";
import { CampaignExecution } from "./CampaignExecution";
import { CreatorImportPanel } from "./CreatorImportPanel";
import { RequestContactModal } from "../../components/RequestContactModal";
import { CreatorPortrait } from "../../components/CreatorPortrait";
import { exportCreatorsCsv } from "./creatorImport";
import { formatFollowers } from "../../lib/format";
import "./workspace.css";

const stageLabel = (stage: CampaignStage) => stage.replaceAll("_", " ").replace(/^./, value => value.toUpperCase());
const platformLabel = (platform: Platform) => ({ instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", twitter: "X" })[platform];
const freshnessLabel = (updatedAt?: number) => updatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(updatedAt) : "Date unavailable";
const repositoryScope = "The current Creatorly database covers India-focused Instagram and YouTube creators.";
const CREATOR_PAGE_SIZE = 24;
const CREATOR_CATEGORIES = ["Fashion", "Lifestyle", "Photography", "Entertainment", "Sports", "Beauty", "Luxury", "Decor", "Art", "Travel", "Food", "Fitness", "Gadgets & Tech", "Make-up", "Business", "Health", "Education", "Gaming"];
type CreatorSort = { field: "name" | "audience" | "location"; direction: "asc" | "desc" };
type AudienceBand = "all" | "1k5k" | "5k10k";

function audienceRange(band: AudienceBand) {
  if (band === "1k5k") return { minFollowers: 1_000, maxFollowers: 5_000 };
  if (band === "5k10k") return { minFollowers: 5_000, maxFollowers: 10_000 };
  return {};
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <header className="ops-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</header>;
}

function Empty({ icon, title, copy, action, onAction }: { icon: React.ReactNode; title: string; copy: string; action: string; onAction(): void }) {
  return <div className="ops-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" onClick={onAction}>{action}</button></div>;
}

export function DiscoveryWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const data = useAppData(); const store = useWorkspaceData();
  const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<Platform>("instagram");
  const [category, setCategory] = useState(""); const [audience, setAudience] = useState<AudienceBand>("all");
  const [location, setLocation] = useState(""); const [sort, setSort] = useState<CreatorSort>({ field: "audience", direction: "desc" });
  const [results, setResults] = useState<CreatorSearchResult[]>([]); const [savedIds, setSavedIds] = useState<Map<string, string>>(new Map()); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); const [campaignTarget, setCampaignTarget] = useState(""); const [bulkMessage, setBulkMessage] = useState(""); const [bulkWorking, setBulkWorking] = useState(false); const [loading, setLoading] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [cursor, setCursor] = useState<string | null>(null); const [isDone, setIsDone] = useState(false); const [error, setError] = useState(""); const [requestOpen, setRequestOpen] = useState(false);
  const run = useCallback(async (nextQuery = query, nextPlatform = platform, nextCategory = category, nextLocation = location, nextAudience = audience, nextSort = sort) => {
    setLoading(true); setError("");
    try {
      const range = audienceRange(nextAudience);
      const sorting = { sortField: nextSort.field, sortDirection: nextSort.direction };
      if (nextQuery.trim()) {
        setResults(await data.search(nextQuery, { platform: nextPlatform, category: nextCategory || undefined, location: nextLocation || undefined, ...range, ...sorting }));
        setCursor(null); setIsDone(true);
      } else {
        const result = await data.browseCreators({ cursor: null, numItems: CREATOR_PAGE_SIZE, platform: nextPlatform, category: nextCategory || undefined, location: nextLocation || undefined, ...range, ...sorting });
        setResults(result.page); setCursor(result.continueCursor); setIsDone(result.isDone);
      }
    } catch {
      setResults([]); setCursor(null); setIsDone(true); setError("Creator search is unavailable right now. Try again.");
    } finally { setLoading(false); }
  }, [audience, category, data, location, platform, query, sort]);
  async function loadMore() {
    if (loadingMore || isDone || query.trim()) return;
    setLoadingMore(true); setError("");
    try {
      const result = await data.browseCreators({ cursor, numItems: CREATOR_PAGE_SIZE, platform, category: category || undefined, location: location || undefined, ...audienceRange(audience), sortField: sort.field, sortDirection: sort.direction });
      setResults(current => [...new Map([...current, ...result.page].map(creator => [creator.id, creator])).values()]);
      setCursor(result.continueCursor); setIsDone(result.isDone);
    } catch { setError("More creators could not be loaded. Try again."); }
    finally { setLoadingMore(false); }
  }
  useEffect(() => { let active = true; void Promise.all([store.listSavedCreators(workspace.id), store.listCampaigns(workspace.id)]).then(([saved, nextCampaigns]) => { if (active) { setSavedIds(new Map(saved.map(item => [item.creator.id, item.id]))); setCampaigns(nextCampaigns); setCampaignTarget(current => current || nextCampaigns[0]?.id || ""); } }); return () => { active = false; }; }, [store, workspace.id]);
  useEffect(() => { const timer = window.setTimeout(() => { void run(query, platform, category, location, audience, sort); }, 180); return () => window.clearTimeout(timer); }, [audience, category, location, platform, query, run, sort]);
  const visibleResults = results;
  const categoryOptions = useMemo(() => [...new Set([...CREATOR_CATEGORIES, ...results.flatMap(creator => creator.categories ?? [])])].sort(), [results]);
  const locationOptions = useMemo(() => [...new Set(results.map(creator => creator.location).filter((item): item is string => Boolean(item)))].sort(), [results]);
  const filtersActive = Boolean(category || location || audience !== "all" || sort.field !== "audience" || sort.direction !== "desc");
  function clearTableFilters() { setCategory(""); setAudience("all"); setLocation(""); setSort({ field: "audience", direction: "desc" }); }
  function choosePlatform(nextPlatform: Platform) { setPlatform(nextPlatform); setCategory(""); setLocation(""); setSelectedIds(new Set()); setBulkMessage(""); }
  function cycleSort(field: CreatorSort["field"]) {
    setSort(current => {
      const firstDirection = field === "audience" ? "desc" : "asc";
      if (!current || current.field !== field) return { field, direction: firstDirection };
      if (current.direction === firstDirection) return { field, direction: firstDirection === "asc" ? "desc" : "asc" };
      return { field: "audience", direction: "desc" };
    });
  }
  function sortStatus(field: NonNullable<CreatorSort>["field"]) {
    if (sort.field !== field) return "Sort";
    if (field === "audience") return sort.direction === "desc" ? "High–low" : "Low–high";
    return sort.direction === "asc" ? "A–Z" : "Z–A";
  }
  async function save(creator: CreatorSearchResult) { const result = await store.saveCreator(workspace.id, creator); setSavedIds(current => new Map(current).set(creator.id, result.savedCreatorId)); return result.savedCreatorId; }
  function toggleSelected(creatorId: string) { setSelectedIds(current => { const next = new Set(current); if (next.has(creatorId)) next.delete(creatorId); else next.add(creatorId); return next; }); setBulkMessage(""); }
  async function saveSelected() { setBulkWorking(true); const chosen = visibleResults.filter(item => selectedIds.has(item.id)); await Promise.all(chosen.map(save)); setBulkMessage(`${chosen.length} creator${chosen.length === 1 ? "" : "s"} saved to CRM.`); setBulkWorking(false); }
  async function addToCampaign(creatorIds: string[]) {
    if (!campaignTarget) { setSelectedIds(new Set(creatorIds)); setBulkMessage("Create or choose a campaign first."); return; }
    setBulkWorking(true); setBulkMessage("");
    try {
      const chosen = visibleResults.filter(item => creatorIds.includes(item.id));
      const savedCreatorIds = await Promise.all(chosen.map(creator => savedIds.get(creator.id) ? Promise.resolve(savedIds.get(creator.id)!) : save(creator)));
      const result = await store.addCampaignCreators(workspace.id, campaignTarget, savedCreatorIds);
      setBulkMessage(`${result.added} added to campaign${result.alreadyAdded ? ` · ${result.alreadyAdded} already there` : ""}.`); setSelectedIds(new Set());
    } catch { setBulkMessage("Creators could not be added. Try again."); }
    finally { setBulkWorking(false); }
  }
  return <main className="workspace ops-page">
    <PageHeader eyebrow="India creator database" title="Discover creators across India" copy="Search verified source profiles from Instagram and YouTube by name, category, city, or country, then save them to your workspace." action={data.mode === "convex" ? <span className="data-source-chip">Instagram + YouTube repository</span> : undefined}/>
    <nav className="platform-filter" aria-label="Discovery platform"><button type="button" className={platform === "instagram" ? "is-active" : ""} aria-pressed={platform === "instagram"} onClick={() => choosePlatform("instagram")}>Instagram</button><button type="button" className={platform === "youtube" ? "is-active" : ""} aria-pressed={platform === "youtube"} onClick={() => choosePlatform("youtube")}>YouTube</button></nav>
    <section className="discovery-command"><Search size={20}/><label className="sr-only" htmlFor="workspace-creator-search">Creator name or handle</label><input id="workspace-creator-search" aria-label="Creator name or handle" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void run(); }} placeholder="Search creator name or handle"/><button className="button button-primary" onClick={() => run()}><Sparkles size={15}/> Search</button></section>
    <div className="discovery-filter-summary"><span><strong>{visibleResults.length}</strong> shown · {results.length} loaded</span>{filtersActive ? <button type="button" onClick={clearTableFilters}><RotateCcw size={13}/> Reset filters</button> : <span>{query.trim() ? "Search results" : isDone ? "Full repository loaded" : "More creators available"}</span>}</div>
    {visibleResults.length ? <section className="discovery-selection" aria-label="Creator selection actions"><button type="button" className="button button-secondary" onClick={() => setSelectedIds(selectedIds.size === visibleResults.length ? new Set() : new Set(visibleResults.map(item => item.id)))}>{selectedIds.size === visibleResults.length ? "Clear page" : "Select page"}</button><span>{selectedIds.size} selected</span><select aria-label="Campaign for selected creators" value={campaignTarget} onChange={event => setCampaignTarget(event.target.value)}><option value="">{campaigns.length ? "Choose campaign" : "No campaigns yet"}</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select><button type="button" className="button button-secondary" disabled={!selectedIds.size || bulkWorking} onClick={() => void saveSelected()}>Save to CRM</button><button type="button" className="button button-primary" disabled={!selectedIds.size || bulkWorking} onClick={() => void addToCampaign([...selectedIds])}>Add to campaign</button>{!campaigns.length ? <button type="button" className="text-button" onClick={() => navigate({ name: "campaigns" })}>Create campaign</button> : null}{bulkMessage ? <p role="status">{bulkMessage}</p> : null}</section> : null}
    <section className="ops-table-card"><div className="ops-table-head discovery-table-head" role="group" aria-label="Creator table filters">
      <span className="table-filter-cell"><b className="sortable-filter-title">Creator <button type="button" onClick={() => cycleSort("name")} aria-label={`Sort creator name ${sort.field === "name" && sort.direction === "asc" ? "descending" : sort.field === "name" ? "by default" : "ascending"}`} aria-pressed={sort.field === "name"}><ArrowUpDown size={12}/><span>{sortStatus("name")}</span></button></b><span className="filter-static-note">Use search above</span></span>
      <span className="table-filter-cell"><b>Category</b><label><span className="sr-only">Filter category column</span><input list="creator-category-options" aria-label="Filter category column" value={category} onChange={event => setCategory(event.target.value)} placeholder="Search category"/><datalist id="creator-category-options">{categoryOptions.map(item => <option key={item} value={item}/>)}</datalist></label></span>
      <span className="table-filter-cell"><b>Platform</b><span className="filter-static-note">{platformLabel(platform)}</span></span>
      <span className="table-filter-cell"><b className="sortable-filter-title">Audience <button type="button" onClick={() => cycleSort("audience")} aria-label={`Sort audience ${sort?.field === "audience" && sort.direction === "desc" ? "low to high" : sort?.field === "audience" ? "by default" : "high to low"}`} aria-pressed={sort?.field === "audience"}><ArrowUpDown size={12}/><span>{sortStatus("audience")}</span></button></b><label><span className="sr-only">Filter audience column</span><select aria-label="Filter audience column" value={audience} onChange={event => setAudience(event.target.value as typeof audience)}><option value="all">Any audience</option><option value="1k5k">1K–5K</option><option value="5k10k">5K–10K</option></select></label></span>
      <span className="table-filter-cell"><b className="sortable-filter-title">City / Country <button type="button" onClick={() => cycleSort("location")} aria-label={`Sort city and country ${sort.field === "location" && sort.direction === "asc" ? "descending" : sort.field === "location" ? "by default" : "ascending"}`} aria-pressed={sort.field === "location"}><ArrowUpDown size={12}/><span>{sortStatus("location")}</span></button></b><label><span className="sr-only">Filter city or country column</span><input list="creator-location-options" aria-label="Filter city or country column" value={location} onChange={event => setLocation(event.target.value)} placeholder="Exact location"/><datalist id="creator-location-options">{locationOptions.map(item => <option key={item} value={item}/>)}</datalist></label></span>
      <span className="table-filter-cell"><b>Contact</b><span className="filter-static-note">Verification status</span></span>
      <span className="table-filter-actions"><b>Reset</b><button type="button" className="filter-reset-icon" onClick={clearTableFilters} disabled={!filtersActive} aria-label="Reset table filters"><RotateCcw size={15}/></button></span>
    </div>
      {error && !results.length ? <div className="ops-loading state-error" role="alert">{error}</div> : loading ? <div className="ops-loading" role="status">Loading creators…</div> : visibleResults.length ? visibleResults.map(creator => <article className="ops-table-row discovery-row" key={creator.id}>
        <div className="discovery-creator-select"><input type="checkbox" aria-label={`Select ${creator.displayName}`} checked={selectedIds.has(creator.id)} onChange={() => toggleSelected(creator.id)}/><button className="creator-cell" onClick={() => navigate({ name: "creator", creatorId: creator.id })} aria-label={`View ${creator.displayName} profile`}><CreatorPortrait name={creator.displayName} platform={creator.platform} imageUrl={creator.profileImageUrl} size="small"/><span><strong>{creator.displayName}</strong><small>{creator.handle}</small><small>{creator.sourceLabel ?? "Creatorly database"} · {freshnessLabel(creator.lastUpdatedAt)}</small></span></button></div>
        <span>{creator.categories?.[0] ?? "—"}</span><span className="platform-name">{creator.platform === "twitter" ? "X" : creator.platform}</span><b className="numeric">{formatFollowers(creator.followerCount)}</b><span>{creator.location ?? "—"}</span><span className={creator.contactCount ? "contact-ready" : "contact-missing"}>{creator.contactCount ? `${creator.contactCount} available` : "Not available"}</span>
        <div className="discovery-row-actions"><button className={savedIds.has(creator.id) ? "button button-saved" : "button button-secondary"} disabled={savedIds.has(creator.id)} onClick={() => void save(creator)}>{savedIds.has(creator.id) ? <><Check size={15}/> Saved</> : <><Plus size={15}/> Save</>}</button><button className="text-button" disabled={bulkWorking} onClick={() => void addToCampaign([creator.id])}>Add to campaign</button></div>
      </article>) : query.trim().length >= 2 ? <Empty icon={<Search/>} title="No creator found" copy={repositoryScope} action="Request contact" onAction={() => setRequestOpen(true)}/> : <Empty icon={<Search/>} title="No creators match these filters" copy="Broaden one of the column filters or reset the table to see the full result set." action="Reset filters" onAction={clearTableFilters}/>}
      {!loading && !query.trim() && results.length ? <footer className="creator-page-actions"><span><strong>{results.length}</strong> creators loaded{!isDone ? " · continue exploring the repository" : " · you reached the end"}</span>{isDone ? <span className="creator-page-complete"><Check size={15}/> All creators loaded</span> : <button type="button" className="button button-secondary" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? "Loading creators…" : <><ArrowDown size={15}/> Load more creators</>}</button>}</footer> : null}
      {error && results.length ? <p className="creator-page-error" role="alert">{error}</p> : null}
    </section>
    {requestOpen ? <RequestContactModal initialHandle={query} initialPlatform={platform} onClose={() => setRequestOpen(false)}/> : null}
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
  const store = useWorkspaceData(); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [groups, setGroups] = useState<WorkspaceGroup[]>([]); const [collaborators, setCollaborators] = useState<GroupCollaborator[]>([]);
  const [creating, setCreating] = useState(false); const [managing, setManaging] = useState(false); const [selectedGroup, setSelectedGroup] = useState("all");
  const [name, setName] = useState(""); const [goal, setGoal] = useState(""); const [campaignGroup, setCampaignGroup] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>([]); const [currency, setCurrency] = useState("INR"); const [budget, setBudget] = useState(""); const [startsOn, setStartsOn] = useState(""); const [endsOn, setEndsOn] = useState(""); const [createError, setCreateError] = useState("");
  const [groupName, setGroupName] = useState(""); const [groupWebsite, setGroupWebsite] = useState(""); const [divisionType, setDivisionType] = useState<BrandDivisionType>("brand"); const [parentDivisionId, setParentDivisionId] = useState("");
  const [collaboratorGroup, setCollaboratorGroup] = useState(""); const [collaboratorEmail, setCollaboratorEmail] = useState(""); const [collaboratorRole, setCollaboratorRole] = useState<GroupCollaboratorRole>(workspace.kind === "agency" ? "client_reviewer" : "internal_stakeholder");
  const groupLabel = workspace.kind === "agency" ? "client" : "division"; const groupLabelPlural = workspace.kind === "agency" ? "clients" : "divisions";
  const load = useCallback(async () => { const [nextCampaigns, nextGroups, nextCollaborators] = await Promise.all([store.listCampaigns(workspace.id), store.listGroups(workspace.id), store.listGroupCollaborators(workspace.id)]); setCampaigns(nextCampaigns); setGroups(nextGroups); setCollaborators(nextCollaborators); }, [store, workspace.id]);
  useEffect(() => {
    let active = true;
    void Promise.all([store.listCampaigns(workspace.id), store.listGroups(workspace.id), store.listGroupCollaborators(workspace.id)]).then(([nextCampaigns, nextGroups, nextCollaborators]) => {
      if (active) { setCampaigns(nextCampaigns); setGroups(nextGroups); setCollaborators(nextCollaborators); }
    });
    return () => { active = false; };
  }, [store, workspace.id]);
  const visibleCampaigns = campaigns.filter(campaign => selectedGroup === "all" || (selectedGroup === "unassigned" ? !campaign.clientId && !campaign.divisionId : (campaign.clientId ?? campaign.divisionId) === selectedGroup));
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreateError("");
    if (!platforms.length) { setCreateError("Choose at least one platform."); return; }
    const parsedBudget = budget === "" ? undefined : Number(budget);
    if (parsedBudget !== undefined && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) { setCreateError("Enter a valid budget of zero or more."); return; }
    const startsAt = startsOn ? new Date(`${startsOn}T00:00:00`).getTime() : undefined;
    const endsAt = endsOn ? new Date(`${endsOn}T00:00:00`).getTime() : undefined;
    if (startsAt !== undefined && endsAt !== undefined && endsAt < startsAt) { setCreateError("End date cannot be before start date."); return; }
    const id = await store.createCampaign(workspace.id, { name, goal, platforms, currency, budget: parsedBudget, startsAt, endsAt, clientId: workspace.kind === "agency" && campaignGroup ? campaignGroup : undefined, divisionId: workspace.kind === "brand" && campaignGroup ? campaignGroup : undefined });
    navigate({ name: "campaign", campaignId: id });
  }
  function togglePlatform(platform: Platform) { setPlatforms(current => current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform]); }
  async function createGroup(event: React.FormEvent) { event.preventDefault(); const id = await store.createGroup(workspace.id, { name: groupName, website: workspace.kind === "agency" ? groupWebsite : undefined, divisionType: workspace.kind === "brand" ? divisionType : undefined, parentDivisionId: workspace.kind === "brand" && parentDivisionId ? parentDivisionId : undefined }); setGroupName(""); setGroupWebsite(""); setParentDivisionId(""); setCampaignGroup(id); setCollaboratorGroup(id); await load(); }
  async function invite(event: React.FormEvent) { event.preventDefault(); const group = groups.find(item => item.id === collaboratorGroup); if (!group) return; await store.addGroupCollaborator(workspace.id, group, collaboratorEmail, collaboratorRole); setCollaboratorEmail(""); await load(); }
  function exportReport() {
    const scoped = visibleCampaigns; const group = groups.find(item => item.id === selectedGroup); const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const headings = ["Campaign", groupLabel, "Status", "Goal", "Creators", "Deliverables", "Approved", "Budget", "Currency"];
    const rows = scoped.map(campaign => { const deliverables = campaign.creators.flatMap(item => item.deliverables); return [campaign.name, campaign.groupName ?? group?.name ?? "Unassigned", campaign.status, campaign.goal, campaign.creators.length, deliverables.length, deliverables.filter(item => item.status === "approved" || item.status === "live").length, campaign.budget ?? 0, campaign.currency]; });
    const csv = [headings, ...rows].map(row => row.map(quote).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `creatorly-${group?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "campaigns"}-report.csv`; link.click(); URL.revokeObjectURL(url);
  }
  return <main className="workspace ops-page"><PageHeader eyebrow="Campaign operations" title="Campaigns" copy={workspace.kind === "agency" ? "Run every creator campaign in the right client account, with clear client review and reporting." : "Group campaign work by brand, product line, market, or region, with the right internal and agency reviewers."} action={<div className="campaign-header-actions">{(workspace.role === "owner" || workspace.role === "admin") && workspace.kind !== "talent" ? <button className="button button-secondary" onClick={() => setManaging(value => !value)}><Building2 size={16}/> Manage {groupLabelPlural}</button> : null}<button className="button button-primary" onClick={() => setCreating(true)}><Plus size={16}/> Create campaign</button></div>}/>
    {workspace.kind !== "talent" ? <section className="campaign-group-bar"><div className="group-tabs" aria-label={`Filter campaigns by ${groupLabel}`}><button className={selectedGroup === "all" ? "active" : ""} onClick={() => setSelectedGroup("all")}>All campaigns <span>{campaigns.length}</span></button>{groups.filter(item => item.status === "active").map(group => <button key={group.id} className={selectedGroup === group.id ? "active" : ""} onClick={() => setSelectedGroup(group.id)}>{group.name} <span>{campaigns.filter(campaign => (campaign.clientId ?? campaign.divisionId) === group.id).length}</span></button>)}{campaigns.some(item => !item.clientId && !item.divisionId) ? <button className={selectedGroup === "unassigned" ? "active" : ""} onClick={() => setSelectedGroup("unassigned")}>Unassigned <span>{campaigns.filter(item => !item.clientId && !item.divisionId).length}</span></button> : null}</div><button className="button button-secondary report-action" disabled={selectedGroup === "all" || !visibleCampaigns.length} onClick={exportReport}><FileDown size={15}/> {workspace.kind === "agency" ? "Client report" : "Division report"}</button></section> : null}
    {managing ? <section className="group-manager"><header><div><p className="eyebrow">Workspace structure</p><h2>Manage {groupLabelPlural} and reviewers</h2></div><button className="icon-button" aria-label="Close group manager" onClick={() => setManaging(false)}><X size={18}/></button></header><div className="group-manager-grid"><form onSubmit={createGroup}><h3>Add {groupLabel}</h3><label>{workspace.kind === "agency" ? "Client name" : "Division name"}<input required value={groupName} onChange={event => setGroupName(event.target.value)} placeholder={workspace.kind === "agency" ? "Northstar Foods" : "India skincare"}/></label>{workspace.kind === "agency" ? <label>Website <input value={groupWebsite} onChange={event => setGroupWebsite(event.target.value)} placeholder="northstar.example"/></label> : <><label>Division type<select value={divisionType} onChange={event => setDivisionType(event.target.value as BrandDivisionType)}><option value="brand">Brand</option><option value="product_line">Product line</option><option value="market">Market</option><option value="region">Region</option></select></label><label>Parent division <select value={parentDivisionId} onChange={event => setParentDivisionId(event.target.value)}><option value="">None</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></>}<button className="button button-primary" type="submit"><Plus size={15}/> Add {groupLabel}</button></form><form onSubmit={invite}><h3>{workspace.kind === "agency" ? "Add client reviewer" : "Add review access"}</h3><label>{groupLabel[0].toUpperCase() + groupLabel.slice(1)}<select required value={collaboratorGroup} onChange={event => setCollaboratorGroup(event.target.value)}><option value="">Choose {groupLabel}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Email<input required type="email" value={collaboratorEmail} onChange={event => setCollaboratorEmail(event.target.value)} placeholder="reviewer@company.com"/></label>{workspace.kind === "brand" ? <label>Access role<select value={collaboratorRole} onChange={event => setCollaboratorRole(event.target.value as GroupCollaboratorRole)}><option value="internal_stakeholder">Internal stakeholder</option><option value="agency_collaborator">Agency collaborator</option></select></label> : null}<button className="button button-secondary" type="submit" disabled={!groups.length}><UserPlus size={15}/> Add access</button></form></div>{groups.length ? <div className="group-directory">{groups.map(group => { const assigned = collaborators.filter(item => item.groupId === group.id); return <article key={group.id}><span className="group-mark"><Building2 size={16}/></span><div><strong>{group.name}</strong><small>{group.kind === "division" ? group.divisionType?.replaceAll("_", " ") : group.website || "Client account"}</small></div><span>{assigned.length} {workspace.kind === "agency" ? "reviewers" : "collaborators"}</span></article>; })}</div> : null}</section> : null}
    {creating ? <form className="create-campaign-panel" onSubmit={create}><header><div><p className="eyebrow">New campaign</p><h2>Start with the working brief</h2></div><button type="button" className="text-button" onClick={() => setCreating(false)}>Cancel</button></header><label>Campaign name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Festive creator launch"/></label><label>Goal<input required value={goal} onChange={event => setGoal(event.target.value)} placeholder="Drive consideration with trusted creators"/></label>{workspace.kind !== "talent" ? <label>{groupLabel[0].toUpperCase() + groupLabel.slice(1)}<select value={campaignGroup} onChange={event => setCampaignGroup(event.target.value)}><option value="">Unassigned</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}<fieldset className="campaign-platforms"><legend>Platforms</legend>{(["instagram", "tiktok", "youtube", "twitter"] as Platform[]).map(platform => <label key={platform}><input type="checkbox" checked={platforms.includes(platform)} onChange={() => togglePlatform(platform)}/><span>{platformLabel(platform)}</span></label>)}</fieldset><label>Currency<select value={currency} onChange={event => setCurrency(event.target.value)}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label><label>Budget (optional)<input type="number" min="0" step="1" value={budget} onChange={event => setBudget(event.target.value)} placeholder="No budget set"/></label><label>Start date (optional)<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)}/></label><label>End date (optional)<input type="date" min={startsOn || undefined} value={endsOn} onChange={event => setEndsOn(event.target.value)}/></label>{createError ? <p className="campaign-form-error" role="alert">{createError}</p> : null}<div className="campaign-create-action"><button className="button button-primary" type="submit">Create campaign</button></div></form> : null}
    {visibleCampaigns.length ? <section className="campaign-grid">{visibleCampaigns.map(campaign => <button key={campaign.id} onClick={() => navigate({ name: "campaign", campaignId: campaign.id })}><header><span className={`status-chip status-${campaign.status}`}>{campaign.status}</span><small>{campaign.platforms.map(item => item === "twitter" ? "X" : item).join(" · ")}</small></header>{workspace.kind !== "talent" ? <span className="campaign-group-name"><Building2 size={13}/>{campaign.groupName ?? groups.find(group => group.id === (campaign.clientId ?? campaign.divisionId))?.name ?? "Unassigned"}</span> : null}<h2>{campaign.name}</h2><p>{campaign.goal}</p><footer><span><Users size={15}/>{campaign.creators.length} creators</span><span><CircleDollarSign size={15}/>{campaign.budget === undefined ? "No budget" : `${campaign.currency} ${campaign.budget.toLocaleString()}`}</span><ChevronRight size={17}/></footer></button>)}</section> : !creating ? <section className="ops-panel"><Empty icon={<FolderKanban/>} title={selectedGroup === "all" ? "No campaigns yet" : `No campaigns in this ${groupLabel}`} copy="Create a campaign, add saved creators, and move them through the campaign rail." action="Start a campaign" onAction={() => { setCampaignGroup(selectedGroup === "all" || selectedGroup === "unassigned" ? "" : selectedGroup); setCreating(true); }}/></section> : null}
  </main>;
}

export function CampaignDetailWorkspace({ workspace, campaignId, navigate }: { workspace: WorkspaceSummary; campaignId: string; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData(); const [campaignState, setCampaignState] = useState<{ status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ready"; campaign: Campaign }>({ status: "loading" }); const [saved, setSaved] = useState<SavedCreator[]>([]); const [selectedCreator, setSelectedCreator] = useState("");
  const fetchCampaign = useCallback(() => Promise.all([store.getCampaignExecution(workspace.id, campaignId), store.listSavedCreators(workspace.id)]), [campaignId, store, workspace.id]);
  const acceptCampaign = useCallback(([nextCampaign, savedCreators]: [Campaign | null, SavedCreator[]]) => { setSaved(savedCreators); setCampaignState(nextCampaign ? { status: "ready", campaign: nextCampaign } : { status: "missing" }); }, []);
  const rejectCampaign = useCallback((error: unknown) => setCampaignState({ status: "error", message: error instanceof Error ? error.message : "The campaign could not be loaded." }), []);
  const refresh = useCallback(async () => acceptCampaign(await fetchCampaign()), [acceptCampaign, fetchCampaign]);
  useEffect(() => { void fetchCampaign().then(acceptCampaign, rejectCampaign); }, [acceptCampaign, fetchCampaign, rejectCampaign]);
  function retryLoad() { setCampaignState({ status: "loading" }); void fetchCampaign().then(acceptCampaign, rejectCampaign); }
  if (campaignState.status === "loading") return <main className="workspace ops-page"><div className="ops-loading" role="status">Loading campaign…</div></main>;
  if (campaignState.status === "missing") return <main className="workspace ops-page"><section className="ops-load-state"><FolderKanban/><h1>Campaign not found</h1><p>It may have been removed, or you may not have access to it.</p><button className="button button-secondary" onClick={() => navigate({ name: "campaigns" })}>Back to campaigns</button></section></main>;
  if (campaignState.status === "error") return <main className="workspace ops-page"><section className="ops-load-state" role="alert"><RotateCcw/><h1>Campaign could not load</h1><p>{campaignState.message}</p><button className="button button-primary" onClick={retryLoad}>Try again</button></section></main>;
  const campaign = campaignState.campaign;
  const activeCampaign = campaign;
  const available = saved.filter(item => !activeCampaign.creators.some(creator => creator.savedCreatorId === item.id));
  async function add() { if (!selectedCreator) return; await store.addCampaignCreator(workspace.id, activeCampaign.id, selectedCreator); setSelectedCreator(""); await refresh(); }
  async function move(id: string, stage: CampaignStage) { await store.moveCampaignCreator(workspace.id, activeCampaign.id, id, stage); await refresh(); }
  return <main className="workspace ops-page"><button className="back-link" onClick={() => navigate({ name: "campaigns" })}>← All campaigns</button><PageHeader eyebrow="Active campaign" title={campaign.name} copy={campaign.goal} action={<div className="add-campaign-creator"><select aria-label="Saved creator" value={selectedCreator} onChange={event => setSelectedCreator(event.target.value)}><option value="">Add a saved creator…</option>{available.map(item => <option key={item.id} value={item.id}>{item.creator.displayName}</option>)}</select><button className="button button-primary" disabled={!selectedCreator} onClick={add}><Plus size={15}/> Add</button></div>}/>
    <CampaignExecution workspace={workspace} campaign={campaign} savedCreators={saved} onRefresh={refresh} onMove={move}/>
  </main>;
}
