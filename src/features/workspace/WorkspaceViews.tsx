import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, ArrowDown, ArrowUpDown, BadgeCheck, Building2, Check, ChevronRight, CircleDollarSign, Download, FileDown, FolderKanban, MapPin, MonitorSmartphone, Plus, RotateCcw, Search, SlidersHorizontal, Tags, UserPlus, Users, X } from "lucide-react";
import { useAppData } from "../../data/AppData";
import type { AppRoute } from "../../hooks/useRoute";
import { CAMPAIGN_STAGES, type BrandDivisionType, type Campaign, type CampaignStage, type CreatorLocationFacets, type CreatorSearchResult, type GroupCollaborator, type GroupCollaboratorRole, type Platform, type SavedCreator, type WorkspaceGroup, type WorkspaceSummary } from "../../types";
import { useWorkspaceData } from "./WorkspaceData";
import { CampaignExecution } from "./CampaignExecution";
import { CreatorImportPanel } from "./CreatorImportPanel";
import { RequestContactModal } from "../../components/RequestContactModal";
import { CreatorPortrait } from "../../components/CreatorPortrait";
import { AppSidebarTargetContext } from "../../components/AppShell";
import { exportCreatorsCsv } from "./creatorImport";
import { formatFollowers } from "../../lib/format";
import "./workspace.css";

const stageLabel = (stage: CampaignStage) => stage.replaceAll("_", " ").replace(/^./, value => value.toUpperCase());
const platformLabel = (platform: Platform) => ({ instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", twitter: "X" })[platform];
const repositoryScope = "The current Creatorly database covers India-focused Instagram, YouTube, and Facebook creators.";
const CREATOR_PAGE_SIZE = 24;
const CREATOR_CATEGORIES = ["Fashion", "Lifestyle", "Photography", "Entertainment", "Sports", "Beauty", "Luxury", "Decor", "Art", "Travel", "Food", "Fitness", "Gadgets & Tech", "Make-up", "Business", "Health", "Education", "Gaming"];
type CreatorSort = { field: "name" | "audience" | "location"; direction: "asc" | "desc" };
type AudienceBand = "all" | "nano" | "micro" | "mid" | "macro" | "mega";
type PlatformFilter = "all" | Extract<Platform, "instagram" | "youtube" | "facebook">;
type DiscoveryFilterSection = "platform" | "category" | "audience" | "engagement" | "country" | "city" | "postal" | "priority";

const AUDIENCE_LABELS: Record<AudienceBand, string> = {
  all: "Any audience",
  nano: "Under 10K",
  micro: "10K–100K",
  mid: "100K–500K",
  macro: "500K–1M",
  mega: "1M+",
};

function followerBoundary(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function audienceRange(band: AudienceBand, exactMin = "", exactMax = "") {
  const preset = band === "nano" ? { maxFollowers: 10_000 }
    : band === "micro" ? { minFollowers: 10_000, maxFollowers: 100_000 }
      : band === "mid" ? { minFollowers: 100_000, maxFollowers: 500_000 }
        : band === "macro" ? { minFollowers: 500_000, maxFollowers: 1_000_000 }
          : band === "mega" ? { minFollowers: 1_000_000 }
            : {};
  const minFollowers = followerBoundary(exactMin);
  const maxFollowers = followerBoundary(exactMax);
  return {
    ...preset,
    ...(minFollowers === undefined ? {} : { minFollowers }),
    ...(maxFollowers === undefined ? {} : { maxFollowers }),
  };
}

function audienceValueLabel(band: AudienceBand, exactMin: string, exactMax: string) {
  const min = followerBoundary(exactMin); const max = followerBoundary(exactMax);
  if (min !== undefined || max !== undefined) {
    if (min !== undefined && max !== undefined) return `${formatFollowers(min)}–${formatFollowers(max)}`;
    if (min !== undefined) return `${formatFollowers(min)}+`;
    return `Under ${formatFollowers(max ?? 0)}`;
  }
  return AUDIENCE_LABELS[band];
}

function engagementBoundary(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : undefined;
}

function engagementValueLabel(minimum: string, maximum: string) {
  const min = engagementBoundary(minimum); const max = engagementBoundary(maximum);
  if (min !== undefined && max !== undefined) return `${min}%–${max}%`;
  if (min !== undefined) return `${min}%+`;
  if (max !== undefined) return `Under ${max}%`;
  return "Any engagement";
}

const PRIORITY_OPTIONS: Array<{ label: string; sort: CreatorSort }> = [
  { label: "Largest audience", sort: { field: "audience", direction: "desc" } },
  { label: "Emerging first", sort: { field: "audience", direction: "asc" } },
  { label: "Creator A–Z", sort: { field: "name", direction: "asc" } },
  { label: "Creator Z–A", sort: { field: "name", direction: "desc" } },
  { label: "Market A–Z", sort: { field: "location", direction: "asc" } },
  { label: "Market Z–A", sort: { field: "location", direction: "desc" } },
];

function priorityLabel(sort: CreatorSort) {
  return PRIORITY_OPTIONS.find(option => option.sort.field === sort.field && option.sort.direction === sort.direction)?.label ?? "Custom order";
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <header className="ops-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</header>;
}

function Empty({ icon, title, copy, action, onAction }: { icon: React.ReactNode; title: string; copy: string; action: string; onAction(): void }) {
  return <div className="ops-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p><button className="button button-secondary" onClick={onAction}>{action}</button></div>;
}

function WorkspaceSidebarPortal({ children }: { children: React.ReactNode }) {
  const target = useContext(AppSidebarTargetContext);
  return target ? createPortal(children, target) : null;
}

function DiscoveryFilterDisclosure({ id, label, value, icon, open, onToggle, children }: { id: DiscoveryFilterSection; label: string; value: string; icon: React.ReactNode; open: boolean; onToggle(): void; children: React.ReactNode }) {
  return <section className={`discovery-filter-section ${open ? "is-open" : ""}`}>
    <button type="button" className="discovery-filter-section-trigger" aria-expanded={open} aria-controls={`discovery-filter-${id}`} onClick={onToggle}>
      <span className="discovery-filter-section-icon">{icon}</span><span><strong>{label}</strong><small>{value}</small></span><ChevronRight size={16} aria-hidden="true"/>
    </button>
    {open ? <div className="discovery-filter-section-content" id={`discovery-filter-${id}`}>{children}</div> : null}
  </section>;
}

export function DiscoveryWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const data = useAppData(); const store = useWorkspaceData();
  const [query, setQuery] = useState(""); const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [category, setCategory] = useState(""); const [audience, setAudience] = useState<AudienceBand>("all");
  const [audienceMin, setAudienceMin] = useState(""); const [audienceMax, setAudienceMax] = useState("");
  const [engagementMin, setEngagementMin] = useState(""); const [engagementMax, setEngagementMax] = useState("");
  const [countryInput, setCountryInput] = useState(""); const [country, setCountry] = useState(""); const [cityInput, setCityInput] = useState(""); const [city, setCity] = useState(""); const [postalCodeInput, setPostalCodeInput] = useState(""); const [postalCode, setPostalCode] = useState(""); const [locationFacets, setLocationFacets] = useState<CreatorLocationFacets>({ countries: [], cities: [], postalCodes: [] }); const [verifiedOnly, setVerifiedOnly] = useState(false); const [sort, setSort] = useState<CreatorSort>({ field: "audience", direction: "desc" });
  const [openFilters, setOpenFilters] = useState<Set<DiscoveryFilterSection>>(() => new Set(["platform"]));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const countRequestRef = useRef(0);
  const [results, setResults] = useState<CreatorSearchResult[]>([]); const [totalCount, setTotalCount] = useState<number | null>(null); const [savedIds, setSavedIds] = useState<Map<string, string>>(new Map()); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); const [campaignTarget, setCampaignTarget] = useState(""); const [bulkMessage, setBulkMessage] = useState(""); const [bulkWorking, setBulkWorking] = useState(false); const [loading, setLoading] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [cursor, setCursor] = useState<string | null>(null); const [isDone, setIsDone] = useState(false); const [error, setError] = useState(""); const [requestOpen, setRequestOpen] = useState(false);
  const exactAudienceMin = followerBoundary(audienceMin); const exactAudienceMax = followerBoundary(audienceMax);
  const audienceError = (audienceMin.trim() && exactAudienceMin === undefined) || (audienceMax.trim() && exactAudienceMax === undefined)
    ? "Use positive numbers for the audience range."
    : exactAudienceMin !== undefined && exactAudienceMax !== undefined && exactAudienceMax <= exactAudienceMin
      ? "Maximum audience must be greater than minimum."
      : "";
  const exactEngagementMin = engagementBoundary(engagementMin); const exactEngagementMax = engagementBoundary(engagementMax);
  const engagementError = (engagementMin.trim() && exactEngagementMin === undefined) || (engagementMax.trim() && exactEngagementMax === undefined)
    ? "Use a percentage from 0 to 100."
    : exactEngagementMin !== undefined && exactEngagementMax !== undefined && exactEngagementMax <= exactEngagementMin
      ? "Maximum engagement must be greater than minimum."
      : "";
  const run = useCallback(async (nextQuery = query, nextPlatform = platform, nextCategory = category, nextCountry = country, nextCity = city, nextPostalCode = postalCode, nextAudience = audience, nextVerifiedOnly = verifiedOnly, nextSort = sort, nextAudienceMin = audienceMin, nextAudienceMax = audienceMax, nextEngagementMin = engagementMin, nextEngagementMax = engagementMax) => {
    const nextMin = followerBoundary(nextAudienceMin); const nextMax = followerBoundary(nextAudienceMax);
    const nextEngagementMinimum = engagementBoundary(nextEngagementMin); const nextEngagementMaximum = engagementBoundary(nextEngagementMax);
    if ((nextAudienceMin.trim() && nextMin === undefined) || (nextAudienceMax.trim() && nextMax === undefined) || (nextMin !== undefined && nextMax !== undefined && nextMax <= nextMin) || (nextEngagementMin.trim() && nextEngagementMinimum === undefined) || (nextEngagementMax.trim() && nextEngagementMaximum === undefined) || (nextEngagementMinimum !== undefined && nextEngagementMaximum !== undefined && nextEngagementMaximum <= nextEngagementMinimum)) return;
    const countRequest = ++countRequestRef.current;
    setLoading(true); setTotalCount(null); setError("");
    try {
      const range = audienceRange(nextAudience, nextAudienceMin, nextAudienceMax);
      const engagementRange = { ...(nextEngagementMinimum === undefined ? {} : { minEngagementRate: nextEngagementMinimum }), ...(nextEngagementMaximum === undefined ? {} : { maxEngagementRate: nextEngagementMaximum }) };
      const sorting = { sortField: nextSort.field, sortDirection: nextSort.direction };
      if (nextQuery.trim()) {
        const nextResults = await data.search(nextQuery, { platform: nextPlatform === "all" ? undefined : nextPlatform, category: nextCategory || undefined, country: nextCountry || undefined, city: nextCity || undefined, postalCode: nextPostalCode || undefined, verifiedOnly: nextVerifiedOnly || undefined, ...range, ...engagementRange, ...sorting });
        setResults(nextResults); setTotalCount(nextResults.length);
        setCursor(null); setIsDone(true);
      } else {
        const countFilters = { platform: nextPlatform === "all" ? undefined : nextPlatform, category: nextCategory || undefined, country: nextCountry || undefined, city: nextCity || undefined, postalCode: nextPostalCode || undefined, verifiedOnly: nextVerifiedOnly || undefined, ...range, ...engagementRange };
        const result = await data.browseCreators({ cursor: null, numItems: CREATOR_PAGE_SIZE, ...countFilters, ...sorting });
        setResults(result.page); setTotalCount(result.totalCount ?? null); setCursor(result.continueCursor); setIsDone(result.isDone);
        if (result.totalCount === undefined) void data.countCreators(countFilters).then(count => { if (countRequestRef.current === countRequest) setTotalCount(count); }).catch(() => undefined);
      }
    } catch {
      setResults([]); setTotalCount(0); setCursor(null); setIsDone(true); setError("Creator search is unavailable right now. Try again.");
    } finally { setLoading(false); }
  }, [audience, audienceMax, audienceMin, category, city, country, data, engagementMax, engagementMin, platform, postalCode, query, sort, verifiedOnly]);
  async function loadMore() {
    if (audienceError || engagementError || loadingMore || isDone || query.trim()) return;
    setLoadingMore(true); setError("");
    try {
      const result = await data.browseCreators({ cursor, numItems: CREATOR_PAGE_SIZE, platform: platform === "all" ? undefined : platform, category: category || undefined, country: country || undefined, city: city || undefined, postalCode: postalCode || undefined, verifiedOnly: verifiedOnly || undefined, ...audienceRange(audience, audienceMin, audienceMax), ...(exactEngagementMin === undefined ? {} : { minEngagementRate: exactEngagementMin }), ...(exactEngagementMax === undefined ? {} : { maxEngagementRate: exactEngagementMax }), sortField: sort.field, sortDirection: sort.direction });
      setResults(current => [...new Map([...current, ...result.page].map(creator => [creator.id, creator])).values()]);
      if (result.totalCount !== undefined) setTotalCount(result.totalCount);
      setCursor(result.continueCursor); setIsDone(result.isDone);
    } catch { setError("More creators could not be loaded. Try again."); }
    finally { setLoadingMore(false); }
  }
  useEffect(() => { let active = true; void Promise.all([store.listSavedCreators(workspace.id), store.listCampaigns(workspace.id)]).then(([saved, nextCampaigns]) => { if (active) { setSavedIds(new Map(saved.map(item => [item.creator.id, item.id]))); setCampaigns(nextCampaigns); setCampaignTarget(current => current || nextCampaigns[0]?.id || ""); } }); return () => { active = false; }; }, [store, workspace.id]);
  useEffect(() => { let active = true; void data.listCreatorLocations().then(nextLocationFacets => { if (active) setLocationFacets(nextLocationFacets); }).catch(() => undefined); return () => { active = false; }; }, [data]);
  useEffect(() => { if (audienceError || engagementError) return; const timer = window.setTimeout(() => { void run(query, platform, category, country, city, postalCode, audience, verifiedOnly, sort, audienceMin, audienceMax, engagementMin, engagementMax); }, 180); return () => window.clearTimeout(timer); }, [audience, audienceError, audienceMax, audienceMin, category, city, country, engagementError, engagementMax, engagementMin, platform, postalCode, query, run, sort, verifiedOnly]);
  const visibleResults = results;
  const categoryOptions = useMemo(() => [...new Set([...CREATOR_CATEGORIES, ...results.flatMap(creator => creator.categories ?? [])])].sort(), [results]);
  const cityOptions = useMemo(() => locationFacets.cities.filter(item => !country || item.country?.toLowerCase() === country.toLowerCase()), [country, locationFacets.cities]);
  const postalCodeOptions = useMemo(() => locationFacets.postalCodes.filter(item => (!country || item.country?.toLowerCase() === country.toLowerCase()) && (!city || item.city?.toLowerCase() === city.toLowerCase())), [city, country, locationFacets.postalCodes]);
  const audienceActive = audience !== "all" || Boolean(audienceMin || audienceMax);
  const engagementActive = Boolean(engagementMin || engagementMax);
  const activeFilterCount = Number(platform !== "all") + Number(Boolean(category)) + Number(audienceActive) + Number(engagementActive) + Number(Boolean(country)) + Number(Boolean(city)) + Number(Boolean(postalCode)) + Number(verifiedOnly);
  const filtersActive = activeFilterCount > 0;
  const remainingCount = totalCount === null ? null : Math.max(0, totalCount - visibleResults.length);
  function clearTableFilters() { setPlatform("all"); setCategory(""); setAudience("all"); setAudienceMin(""); setAudienceMax(""); setEngagementMin(""); setEngagementMax(""); setCountryInput(""); setCountry(""); setCityInput(""); setCity(""); setPostalCodeInput(""); setPostalCode(""); setVerifiedOnly(false); }
  function updateCountryInput(value: string) { const exact = locationFacets.countries.find(item => item.toLowerCase() === value.trim().toLowerCase()) ?? ""; setCountryInput(value); if (exact !== country) { setCountry(exact); setCityInput(""); setCity(""); setPostalCodeInput(""); setPostalCode(""); } }
  function updateCityInput(value: string) { const exact = cityOptions.find(item => item.city.toLowerCase() === value.trim().toLowerCase())?.city ?? ""; setCityInput(value); if (exact !== city) { setCity(exact); setPostalCodeInput(""); setPostalCode(""); } }
  function updatePostalCodeInput(value: string) { const exact = postalCodeOptions.find(item => item.postalCode.toLowerCase() === value.trim().toLowerCase())?.postalCode ?? ""; setPostalCodeInput(value); setPostalCode(exact); }
  function applyCountryInput() { const value = countryInput.trim(); if (value !== country) { setCountry(value); setCityInput(""); setCity(""); setPostalCodeInput(""); setPostalCode(""); } }
  function applyCityInput() { const value = cityInput.trim(); if (value !== city) { setCity(value); setPostalCodeInput(""); setPostalCode(""); } }
  function applyPostalCodeInput() { setPostalCode(postalCodeInput.trim()); }
  function toggleFilter(section: DiscoveryFilterSection) { setOpenFilters(current => { const next = new Set(current); if (next.has(section)) next.delete(section); else next.add(section); return next; }); }
  function choosePlatform(nextPlatform: PlatformFilter) { setPlatform(nextPlatform); setSelectedIds(new Set()); setBulkMessage(""); }
  function chooseAudience(nextAudience: AudienceBand) { setAudience(nextAudience); setAudienceMin(""); setAudienceMax(""); }
  function applyAudienceBrief(min: string, max: string) { setAudience("all"); setAudienceMin(min); setAudienceMax(max); setOpenFilters(current => new Set(current).add("audience")); }
  function applyEngagementRange(min: string, max: string) { setEngagementMin(min); setEngagementMax(max); }
  function cycleSort(field: CreatorSort["field"]) {
    setSort(current => {
      const firstDirection = field === "audience" ? "desc" : "asc";
      if (!current || current.field !== field) return { field, direction: firstDirection };
      if (current.direction === firstDirection) return { field, direction: firstDirection === "asc" ? "desc" : "asc" };
      return { field: "audience", direction: "desc" };
    });
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
  return <main className="workspace ops-page discovery-page">
    <PageHeader eyebrow="Creator database" title="Discover creators" copy="Search India-first Instagram, YouTube, and Facebook profiles, with global coverage when you need it." action={<span className="data-source-chip" aria-live="polite">{totalCount === null ? <strong>Counting total…</strong> : <><strong>{totalCount.toLocaleString()}</strong> {filtersActive || query.trim() ? `matching ${totalCount === 1 ? "profile" : "profiles"}` : `${totalCount === 1 ? "profile" : "profiles"} available`}</>}</span>}/>
    <div className="discovery-layout">
      <WorkspaceSidebarPortal><div className={`discovery-filter-panel ${mobileFiltersOpen ? "is-mobile-open" : ""}`}>
        <header><div><p>Discovery</p><h2>Filters</h2></div><div><span>{activeFilterCount} active</span><button type="button" onClick={clearTableFilters} disabled={!filtersActive}>Clear</button><button type="button" className="discovery-mobile-filter-close" aria-label="Close creator filters" onClick={() => setMobileFiltersOpen(false)}><X size={17}/></button></div></header>
        <section className="discovery-brief-presets" aria-label="Audience brief shortcuts">
          <div><strong>Audience shortcuts</strong><small>Use with platform, niche, and market</small></div>
          <div>
            <button type="button" className={audience === "all" && audienceMin === "" && audienceMax === "100000" ? "is-active" : ""} onClick={() => applyAudienceBrief("", "100000")}>Emerging <small>&lt;100K</small></button>
            <button type="button" className={audience === "all" && audienceMin === "100000" && audienceMax === "500000" ? "is-active" : ""} onClick={() => applyAudienceBrief("100000", "500000")}>Growth <small>100K–500K</small></button>
            <button type="button" className={audience === "all" && audienceMin === "1000000" && audienceMax === "" ? "is-active" : ""} onClick={() => applyAudienceBrief("1000000", "")}>Major reach <small>1M+</small></button>
          </div>
        </section>
        {filtersActive ? <div className="discovery-active-filters" aria-label="Applied discovery filters">
          {platform !== "all" ? <button type="button" onClick={() => choosePlatform("all")} aria-label={`Remove ${platformLabel(platform)} platform filter`}>{platformLabel(platform)}<X size={11}/></button> : null}
          {category ? <button type="button" onClick={() => setCategory("")} aria-label={`Remove ${category} category filter`}>{category}<X size={11}/></button> : null}
          {audienceActive ? <button type="button" onClick={() => chooseAudience("all")} aria-label="Remove audience filter">{audienceValueLabel(audience, audienceMin, audienceMax)}<X size={11}/></button> : null}
          {engagementActive ? <button type="button" onClick={() => { setEngagementMin(""); setEngagementMax(""); }} aria-label="Remove engagement filter">{engagementValueLabel(engagementMin, engagementMax)}<X size={11}/></button> : null}
          {country ? <button type="button" onClick={() => { setCountryInput(""); setCountry(""); setCityInput(""); setCity(""); setPostalCodeInput(""); setPostalCode(""); }} aria-label={`Remove ${country} country filter`}>{country}<X size={11}/></button> : null}
          {city ? <button type="button" onClick={() => { setCityInput(""); setCity(""); setPostalCodeInput(""); setPostalCode(""); }} aria-label={`Remove ${city} city filter`}>{city}<X size={11}/></button> : null}
          {postalCode ? <button type="button" onClick={() => { setPostalCodeInput(""); setPostalCode(""); }} aria-label={`Remove ${postalCode} postal code filter`}>{postalCode}<X size={11}/></button> : null}
          {verifiedOnly ? <button type="button" onClick={() => setVerifiedOnly(false)} aria-label="Remove verified profiles filter">Verified<X size={11}/></button> : null}
        </div> : null}
        <div className="discovery-filter-stack">
          <DiscoveryFilterDisclosure id="platform" label="Platform" value={platform === "all" ? "All platforms" : platformLabel(platform)} icon={<MonitorSmartphone size={17}/>} open={openFilters.has("platform")} onToggle={() => toggleFilter("platform")}><div className="platform-filter" aria-label="Discovery platform"><button type="button" className={platform === "all" ? "is-active" : ""} aria-pressed={platform === "all"} onClick={() => choosePlatform("all")}>All</button><button type="button" className={platform === "instagram" ? "is-active" : ""} aria-pressed={platform === "instagram"} onClick={() => choosePlatform("instagram")}>Instagram</button><button type="button" className={platform === "youtube" ? "is-active" : ""} aria-pressed={platform === "youtube"} onClick={() => choosePlatform("youtube")}>YouTube</button><button type="button" className={platform === "facebook" ? "is-active" : ""} aria-pressed={platform === "facebook"} onClick={() => choosePlatform("facebook")}>Facebook</button></div></DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="category" label="Category" value={category || "All categories"} icon={<Tags size={17}/>} open={openFilters.has("category")} onToggle={() => toggleFilter("category")}><label className="discovery-filter-field"><span className="sr-only">Category</span><input list="creator-category-options" aria-label="Filter category column" value={category} onChange={event => setCategory(event.target.value)} placeholder="Search categories"/><datalist id="creator-category-options">{categoryOptions.map(item => <option key={item} value={item}/>)}</datalist></label></DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="audience" label="Audience size" value={audienceValueLabel(audience, audienceMin, audienceMax)} icon={<Users size={17}/>} open={openFilters.has("audience")} onToggle={() => toggleFilter("audience")}>
            <div className="discovery-audience-controls">
              <label className="discovery-filter-field"><span className="sr-only">Audience size</span><select aria-label="Filter audience column" value={audience} onChange={event => chooseAudience(event.target.value as AudienceBand)}>{Object.entries(AUDIENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="discovery-range-fields">
                <label><span>Minimum</span><input type="number" min="0" inputMode="numeric" aria-label="Minimum audience size" aria-invalid={Boolean(audienceError)} value={audienceMin} onChange={event => { setAudience("all"); setAudienceMin(event.target.value); }} placeholder="Any"/></label>
                <span aria-hidden="true">to</span>
                <label><span>Maximum</span><input type="number" min="0" inputMode="numeric" aria-label="Maximum audience size" aria-invalid={Boolean(audienceError)} value={audienceMax} onChange={event => { setAudience("all"); setAudienceMax(event.target.value); }} placeholder="Any"/></label>
              </div>
              {audienceError ? <p className="discovery-filter-error" role="alert">{audienceError}</p> : null}
            </div>
          </DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="engagement" label="Engagement rate" value={engagementValueLabel(engagementMin, engagementMax)} icon={<Activity size={17}/>} open={openFilters.has("engagement")} onToggle={() => toggleFilter("engagement")}>
            <div className="discovery-engagement-controls">
              <div className="discovery-engagement-presets" aria-label="Engagement rate ranges">
                <button type="button" className={engagementMin === "" && engagementMax === "1" ? "is-active" : ""} aria-pressed={engagementMin === "" && engagementMax === "1"} onClick={() => applyEngagementRange("", "1")}>Under 1%</button>
                <button type="button" className={engagementMin === "1" && engagementMax === "3" ? "is-active" : ""} aria-pressed={engagementMin === "1" && engagementMax === "3"} onClick={() => applyEngagementRange("1", "3")}>1%–3%</button>
                <button type="button" className={engagementMin === "3" && engagementMax === "6" ? "is-active" : ""} aria-pressed={engagementMin === "3" && engagementMax === "6"} onClick={() => applyEngagementRange("3", "6")}>3%–6%</button>
                <button type="button" className={engagementMin === "6" && engagementMax === "" ? "is-active" : ""} aria-pressed={engagementMin === "6" && engagementMax === ""} onClick={() => applyEngagementRange("6", "")}>6%+</button>
              </div>
              <div className="discovery-range-fields">
                <label><span>Minimum %</span><input type="number" min="0" max="100" step="0.1" inputMode="decimal" aria-label="Minimum engagement rate" aria-invalid={Boolean(engagementError)} value={engagementMin} onChange={event => setEngagementMin(event.target.value)} placeholder="Any"/></label>
                <span aria-hidden="true">to</span>
                <label><span>Maximum %</span><input type="number" min="0" max="100" step="0.1" inputMode="decimal" aria-label="Maximum engagement rate" aria-invalid={Boolean(engagementError)} value={engagementMax} onChange={event => setEngagementMax(event.target.value)} placeholder="Any"/></label>
              </div>
              <p className="discovery-filter-note">Profiles without engagement data are excluded when this filter is active.</p>
              {engagementError ? <p className="discovery-filter-error" role="alert">{engagementError}</p> : null}
            </div>
          </DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="country" label="Country" value={country || "All countries"} icon={<MapPin size={17}/>} open={openFilters.has("country")} onToggle={() => toggleFilter("country")}><label className="discovery-filter-field"><span className="sr-only">Country</span><input list="creator-country-options" aria-label="Filter creator country" value={countryInput} onChange={event => updateCountryInput(event.target.value)} onBlur={applyCountryInput} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="Type a country and press Enter" autoComplete="off"/><datalist id="creator-country-options">{locationFacets.countries.map(item => <option key={item} value={item}/>)}</datalist></label></DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="city" label="City" value={city || "All cities"} icon={<Building2 size={17}/>} open={openFilters.has("city")} onToggle={() => toggleFilter("city")}><label className="discovery-filter-field"><span className="sr-only">City</span><input list="creator-city-options" aria-label="Filter creator city" value={cityInput} onChange={event => updateCityInput(event.target.value)} onBlur={applyCityInput} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder={country ? `Type a city in ${country} and press Enter` : "Type a city and press Enter"} autoComplete="off"/><datalist id="creator-city-options">{cityOptions.map(item => <option key={`${item.city}:${item.country ?? ""}`} value={item.city}>{item.country && !country ? item.country : undefined}</option>)}</datalist></label></DiscoveryFilterDisclosure>
          <DiscoveryFilterDisclosure id="postal" label="PIN / postal code" value={postalCode || "Any postal code"} icon={<MapPin size={17}/>} open={openFilters.has("postal")} onToggle={() => toggleFilter("postal")}><label className="discovery-filter-field"><span className="sr-only">PIN or postal code</span><input list="creator-postal-options" aria-label="Filter creator PIN or postal code" value={postalCodeInput} onChange={event => updatePostalCodeInput(event.target.value)} onBlur={applyPostalCodeInput} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder={city ? `Type a code in ${city} and press Enter` : "Type a PIN or postal code and press Enter"} inputMode="numeric" autoComplete="postal-code"/><datalist id="creator-postal-options">{postalCodeOptions.map(item => <option key={`${item.postalCode}:${item.city ?? ""}`} value={item.postalCode}>{[item.city, item.country].filter(Boolean).join(", ")}</option>)}</datalist></label></DiscoveryFilterDisclosure>
          <button type="button" className={`discovery-filter-toggle ${verifiedOnly ? "is-active" : ""}`} aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly(value => !value)}><span className="discovery-filter-section-icon"><BadgeCheck size={17}/></span><span><strong>Verified profiles only</strong><small>{verifiedOnly ? "Enabled" : "Exclude unverified imports"}</small></span><span className="discovery-filter-check" aria-hidden="true">{verifiedOnly ? <Check size={13}/> : null}</span></button>
          <DiscoveryFilterDisclosure id="priority" label="Result priority" value={priorityLabel(sort)} icon={<SlidersHorizontal size={17}/>} open={openFilters.has("priority")} onToggle={() => toggleFilter("priority")}><label className="discovery-filter-field"><span className="sr-only">Result priority</span><select aria-label="Prioritize discovery results" value={`${sort.field}:${sort.direction}`} onChange={event => { const option = PRIORITY_OPTIONS.find(item => `${item.sort.field}:${item.sort.direction}` === event.target.value); if (option) setSort(option.sort); }}>{PRIORITY_OPTIONS.map(option => <option key={option.label} value={`${option.sort.field}:${option.sort.direction}`}>{option.label}</option>)}</select></label></DiscoveryFilterDisclosure>
        </div>
      </div></WorkspaceSidebarPortal>

      <div className="discovery-results">
        <button type="button" className="discovery-mobile-filter-trigger" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal size={17}/><span>Filters</span>{activeFilterCount ? <strong>{activeFilterCount}</strong> : null}</button>
        <section className="discovery-command"><Search size={20}/><label className="sr-only" htmlFor="workspace-creator-search">Creator name or handle</label><input id="workspace-creator-search" aria-label="Creator name or handle" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !audienceError && !engagementError) void run(); }} placeholder="Search by creator name or handle"/><button className="button button-primary" disabled={Boolean(audienceError || engagementError)} onClick={() => run()}>Search</button></section>
        <div className="discovery-filter-summary"><span><strong>{visibleResults.length}</strong>{totalCount === null ? " creators loaded" : <> of <strong>{totalCount.toLocaleString()}</strong> creators loaded</>} · {activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied` : "All profiles"}</span><span className="discovery-summary-actions"><span>{remainingCount === null ? "More profiles available" : remainingCount > 0 ? `${remainingCount.toLocaleString()} more available` : "All matching creators loaded"}</span>{visibleResults.length && !selectedIds.size ? <button type="button" onClick={() => setSelectedIds(new Set(visibleResults.map(item => item.id)))}>Select page</button> : null}</span></div>
        {visibleResults.length ? <section className={`discovery-selection ${selectedIds.size || bulkMessage ? "has-selection" : "is-idle"}`} aria-label="Creator selection actions"><button type="button" className="button button-secondary" onClick={() => setSelectedIds(selectedIds.size === visibleResults.length ? new Set() : new Set(visibleResults.map(item => item.id)))}>{selectedIds.size === visibleResults.length ? "Clear page" : "Select page"}</button><span>{selectedIds.size} selected</span><select aria-label="Campaign for selected creators" value={campaignTarget} onChange={event => setCampaignTarget(event.target.value)}><option value="">{campaigns.length ? "Choose campaign" : "No campaigns yet"}</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select><button type="button" className="button button-secondary" disabled={!selectedIds.size || bulkWorking} onClick={() => void saveSelected()}>Save to CRM</button><button type="button" className="button button-primary" disabled={!selectedIds.size || bulkWorking} onClick={() => void addToCampaign([...selectedIds])}>Add to campaign</button>{!campaigns.length ? <button type="button" className="text-button" onClick={() => navigate({ name: "campaigns" })}>Create campaign</button> : null}{bulkMessage ? <p role="status">{bulkMessage}</p> : null}</section> : null}
        <section className="ops-table-card discovery-table-card"><div className="discovery-table-scroll"><table className="discovery-data-table" aria-label="Creator discovery results"><colgroup><col className="creator-column"/><col className="category-column"/><col className="platform-column"/><col className="audience-column"/><col className="engagement-column"/><col className="location-column"/><col className="contact-column"/><col className="actions-column"/></colgroup><thead><tr>
          <th><button className="table-sort-button" type="button" onClick={() => cycleSort("name")} aria-label={`Sort creator name ${sort.field === "name" && sort.direction === "asc" ? "descending" : sort.field === "name" ? "by default" : "ascending"}`} aria-pressed={sort.field === "name"}>Creator <ArrowUpDown size={12}/></button></th>
          <th>Category</th><th>Platform</th>
          <th><button className="table-sort-button" type="button" onClick={() => cycleSort("audience")} aria-label={`Sort audience ${sort.field === "audience" && sort.direction === "desc" ? "low to high" : sort.field === "audience" ? "by default" : "high to low"}`} aria-pressed={sort.field === "audience"}>Audience <ArrowUpDown size={12}/></button></th>
          <th>Engagement</th>
          <th><button className="table-sort-button" type="button" onClick={() => cycleSort("location")} aria-label={`Sort city and country ${sort.field === "location" && sort.direction === "asc" ? "descending" : sort.field === "location" ? "by default" : "ascending"}`} aria-pressed={sort.field === "location"}>City / Country <ArrowUpDown size={12}/></button></th>
          <th>Contact</th><th>Actions</th>
        </tr></thead><tbody>
      {error && !results.length ? <tr><td colSpan={8}><div className="ops-loading state-error" role="alert">{error}</div></td></tr> : loading ? <tr><td colSpan={8}><div className="ops-loading" role="status">Loading creators…</div></td></tr> : visibleResults.length ? visibleResults.map(creator => <tr className="discovery-row" key={creator.id}>
        <td><div className="discovery-creator-select"><input type="checkbox" aria-label={`Select ${creator.displayName}`} checked={selectedIds.has(creator.id)} onChange={() => toggleSelected(creator.id)}/><button className="creator-cell" onClick={() => navigate({ name: "creator", creatorId: creator.id })} aria-label={`View ${creator.displayName} profile`}><CreatorPortrait name={creator.displayName} platform={creator.platform} imageUrl={creator.profileImageUrl} size="small"/><span><strong>{creator.displayName}</strong><small>{creator.handle}</small></span></button><span className="discovery-mobile-meta">{platformLabel(creator.platform)} · {formatFollowers(creator.followerCount)}{creator.engagementRatePercent === undefined ? "" : ` · ${creator.engagementRatePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}% engagement`}<small>{creator.location ?? "Location unavailable"}</small></span></div></td>
        <td>{creator.categories?.[0] ?? "—"}</td><td><span className="platform-name">{creator.platform === "twitter" ? "X" : creator.platform}</span></td><td><b className="numeric">{formatFollowers(creator.followerCount)}</b></td><td><b className="numeric">{creator.engagementRatePercent === undefined ? "—" : `${creator.engagementRatePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}</b></td><td>{creator.location ?? "—"}</td><td><span className={creator.contactCount ? "contact-ready" : "contact-missing"}>{creator.contactCount ? `${creator.contactCount} available` : "Not available"}</span></td>
        <td><div className="discovery-row-actions"><button className={savedIds.has(creator.id) ? "button button-saved" : "button button-secondary"} disabled={savedIds.has(creator.id)} onClick={() => void save(creator)}>{savedIds.has(creator.id) ? <><Check size={15}/> Saved</> : <><Plus size={15}/> Save</>}</button><button className="text-button" disabled={bulkWorking} onClick={() => void addToCampaign([creator.id])}>Add to campaign</button></div></td>
      </tr>) : <tr><td colSpan={8}>{query.trim().length >= 2 ? <Empty icon={<Search/>} title="No creator found" copy={repositoryScope} action="Request contact" onAction={() => setRequestOpen(true)}/> : <Empty icon={<Search/>} title="No creators match these filters" copy="Broaden one of the filters or reset the search to see the full result set." action="Reset filters" onAction={clearTableFilters}/>}</td></tr>}
        </tbody></table></div>
      {!loading && !query.trim() && results.length ? <footer className="creator-page-actions"><span><strong>{results.length}</strong>{totalCount === null ? " creators loaded" : ` of ${totalCount.toLocaleString()} creators loaded`}</span>{isDone ? <span className="creator-page-complete"><Check size={15}/> All creators loaded</span> : <button type="button" className="button button-secondary" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? "Loading creators…" : <><ArrowDown size={15}/> Load more creators</>}</button>}</footer> : null}
      {error && results.length ? <p className="creator-page-error" role="alert">{error}</p> : null}
        </section>
      </div>
    </div>
    {requestOpen ? <RequestContactModal initialHandle={query} initialPlatform={platform === "all" ? "instagram" : platform} onClose={() => setRequestOpen(false)}/> : null}
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
  return <main className="workspace ops-page"><PageHeader eyebrow="Saved workspace" title="Creator CRM" copy="Your saved creators, private contacts, and next steps." action={<div className="crm-header-actions"><button className="button button-secondary" disabled={!items.length} onClick={downloadCrm}><Download size={15}/> Export CSV</button><button className="button button-primary" onClick={() => setImporting(true)}><Plus size={16}/> Add creators</button></div>}/>
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
  return <main className="workspace ops-page"><PageHeader eyebrow="Campaign workspace" title="Campaigns" copy={workspace.kind === "agency" ? "Plan and track each client campaign in one place." : "Plan and track campaigns by brand, product, market, or region."} action={<div className="campaign-header-actions">{(workspace.role === "owner" || workspace.role === "admin") && workspace.kind !== "talent" ? <button className="button button-secondary" onClick={() => setManaging(value => !value)}><Building2 size={16}/> Manage {groupLabelPlural}</button> : null}<button className="button button-primary" onClick={() => setCreating(true)}><Plus size={16}/> Create campaign</button></div>}/>
    {workspace.kind !== "talent" ? <section className="campaign-group-bar"><div className="group-tabs" aria-label={`Filter campaigns by ${groupLabel}`}><button className={selectedGroup === "all" ? "active" : ""} onClick={() => setSelectedGroup("all")}>All campaigns <span>{campaigns.length}</span></button>{groups.filter(item => item.status === "active").map(group => <button key={group.id} className={selectedGroup === group.id ? "active" : ""} onClick={() => setSelectedGroup(group.id)}>{group.name} <span>{campaigns.filter(campaign => (campaign.clientId ?? campaign.divisionId) === group.id).length}</span></button>)}{campaigns.some(item => !item.clientId && !item.divisionId) ? <button className={selectedGroup === "unassigned" ? "active" : ""} onClick={() => setSelectedGroup("unassigned")}>Unassigned <span>{campaigns.filter(item => !item.clientId && !item.divisionId).length}</span></button> : null}</div><button className="button button-secondary report-action" disabled={selectedGroup === "all" || !visibleCampaigns.length} onClick={exportReport}><FileDown size={15}/> {workspace.kind === "agency" ? "Client report" : "Division report"}</button></section> : null}
    {managing ? <section className="group-manager"><header><div><p className="eyebrow">Workspace structure</p><h2>Manage {groupLabelPlural} and reviewers</h2></div><button className="icon-button" aria-label="Close group manager" onClick={() => setManaging(false)}><X size={18}/></button></header><div className="group-manager-grid"><form onSubmit={createGroup}><h3>Add {groupLabel}</h3><label>{workspace.kind === "agency" ? "Client name" : "Division name"}<input required value={groupName} onChange={event => setGroupName(event.target.value)} placeholder={workspace.kind === "agency" ? "Northstar Foods" : "India skincare"}/></label>{workspace.kind === "agency" ? <label>Website <input value={groupWebsite} onChange={event => setGroupWebsite(event.target.value)} placeholder="northstar.example"/></label> : <><label>Division type<select value={divisionType} onChange={event => setDivisionType(event.target.value as BrandDivisionType)}><option value="brand">Brand</option><option value="product_line">Product line</option><option value="market">Market</option><option value="region">Region</option></select></label><label>Parent division <select value={parentDivisionId} onChange={event => setParentDivisionId(event.target.value)}><option value="">None</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></>}<button className="button button-primary" type="submit"><Plus size={15}/> Add {groupLabel}</button></form><form onSubmit={invite}><h3>{workspace.kind === "agency" ? "Add client reviewer" : "Add review access"}</h3><label>{groupLabel[0].toUpperCase() + groupLabel.slice(1)}<select required value={collaboratorGroup} onChange={event => setCollaboratorGroup(event.target.value)}><option value="">Choose {groupLabel}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label>Email<input required type="email" value={collaboratorEmail} onChange={event => setCollaboratorEmail(event.target.value)} placeholder="reviewer@company.com"/></label>{workspace.kind === "brand" ? <label>Access role<select value={collaboratorRole} onChange={event => setCollaboratorRole(event.target.value as GroupCollaboratorRole)}><option value="internal_stakeholder">Internal stakeholder</option><option value="agency_collaborator">Agency collaborator</option></select></label> : null}<button className="button button-secondary" type="submit" disabled={!groups.length}><UserPlus size={15}/> Add access</button></form></div>{groups.length ? <div className="group-directory">{groups.map(group => { const assigned = collaborators.filter(item => item.groupId === group.id); return <article key={group.id}><span className="group-mark"><Building2 size={16}/></span><div><strong>{group.name}</strong><small>{group.kind === "division" ? group.divisionType?.replaceAll("_", " ") : group.website || "Client account"}</small></div><span>{assigned.length} {workspace.kind === "agency" ? "reviewers" : "collaborators"}</span></article>; })}</div> : null}</section> : null}
    {creating ? <form className="create-campaign-panel" onSubmit={create}><header><div><p className="eyebrow">New campaign</p><h2>Start with the working brief</h2></div><button type="button" className="text-button" onClick={() => setCreating(false)}>Cancel</button></header><label>Campaign name<input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="Festive creator launch"/></label><label>Goal<input required value={goal} onChange={event => setGoal(event.target.value)} placeholder="Drive consideration with trusted creators"/></label>{workspace.kind !== "talent" ? <label>{groupLabel[0].toUpperCase() + groupLabel.slice(1)}<select value={campaignGroup} onChange={event => setCampaignGroup(event.target.value)}><option value="">Unassigned</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label> : null}<fieldset className="campaign-platforms"><legend>Platforms</legend>{(["instagram", "facebook", "tiktok", "youtube", "twitter"] as Platform[]).map(platform => <label key={platform}><input type="checkbox" checked={platforms.includes(platform)} onChange={() => togglePlatform(platform)}/><span>{platformLabel(platform)}</span></label>)}</fieldset><label>Currency<select value={currency} onChange={event => setCurrency(event.target.value)}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label><label>Budget (optional)<input type="number" min="0" step="1" value={budget} onChange={event => setBudget(event.target.value)} placeholder="No budget set"/></label><label>Start date (optional)<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)}/></label><label>End date (optional)<input type="date" min={startsOn || undefined} value={endsOn} onChange={event => setEndsOn(event.target.value)}/></label>{createError ? <p className="campaign-form-error" role="alert">{createError}</p> : null}<div className="campaign-create-action"><button className="button button-primary" type="submit">Create campaign</button></div></form> : null}
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
