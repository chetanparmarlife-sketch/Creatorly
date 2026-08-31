import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Clapperboard, Dumbbell, MapPin, Palette, Plane, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import type { CreatorSearchResult, Platform } from "../types";
import { CreatorResult } from "./CreatorResult";
import { RequestContactModal } from "./RequestContactModal";

const CATEGORIES = ["Fashion", "Lifestyle", "Photography", "Entertainment", "Sports", "Beauty", "Luxury", "Decor", "Art", "Travel", "Food", "Fitness", "Gadgets & Tech", "Make-up", "Business", "Health", "Education", "Gaming"];
const REPOSITORY_SCOPE = "India-first coverage with Instagram, YouTube, and Facebook creators worldwide, from 1K followers upward.";
const CATEGORY_SHORTCUTS = [
  { label: "Lifestyle", icon: Sparkles },
  { label: "Entertainment", icon: Clapperboard },
  { label: "Fitness", icon: Dumbbell },
  { label: "Travel", icon: Plane },
  { label: "Art", icon: Palette },
] as const;

export function SearchView({
  initialQuery,
  initialPlatform,
  navigate,
}: {
  initialQuery: string;
  initialPlatform?: Platform;
  navigate(route: AppRoute): void;
}) {
  const data = useAppData();
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query.trim());
  const [platform, setPlatform] = useState<Platform | undefined>(initialPlatform);
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const deferredLocation = useDeferredValue(location.trim());
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestOpen, setRequestOpen] = useState(() => new URLSearchParams(window.location.search).get("request") === "1");
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (deferredQuery.length === 1) {
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setResults([]);
      data.search(deferredQuery, { platform, category: category || undefined, location: deferredLocation || undefined, verifiedOnly })
        .then((nextResults) => {
          if (currentRequest === requestId.current) setResults(nextResults);
        })
        .catch(() => {
          if (currentRequest === requestId.current) setError("Search is unavailable right now. Try again.");
        })
        .finally(() => {
          if (currentRequest === requestId.current) setLoading(false);
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [category, data, deferredLocation, deferredQuery, platform, verifiedOnly]);

  const visibleResults = deferredQuery.length === 1 ? [] : results;
  const isSearching = deferredQuery.length !== 1 && loading;
  const visibleError = deferredQuery.length !== 1 ? error : "";
  const hasFilters = Boolean(platform || category || location || verifiedOnly);

  function clearFilters() {
    setPlatform(undefined);
    setCategory("");
    setLocation("");
    setVerifiedOnly(false);
  }

  return (
    <main className="workspace search-workspace">
      <section className="search-intro">
        <div>
          <p className="eyebrow">Creator discovery</p>
          <h1>Find your next creator.</h1>
          <p>Start with India or search creators worldwide.</p>
        </div>
        <div className="search-proof">
          <Sparkles size={17} aria-hidden="true" />
          <span><strong>7,580 real profiles</strong> ready to discover</span>
        </div>
      </section>

      <section className="search-console" aria-label="Creator search">
        <p className="repository-scope">{REPOSITORY_SCOPE}</p>
        <label className="search-input-wrap">
          <Search size={22} aria-hidden="true" />
          <span className="sr-only">Creator name or handle</span>
          <input
            autoFocus
            aria-label="Creator name or handle"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search @handle or creator name"
          />
          {isSearching ? <span className="spinner" aria-label="Searching" /> : <kbd>⌘ K</kbd>}
        </label>
        <div className="discovery-categories" aria-label="Browse creator categories">
          {CATEGORY_SHORTCUTS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={category === label ? "is-active" : ""}
              aria-label={`Browse ${label} creators`}
              aria-pressed={category === label}
              onClick={() => setCategory(current => current === label ? "" : label)}
            >
              <span><Icon size={21} aria-hidden="true" /></span>
              {label}
            </button>
          ))}
        </div>
        <div className="platform-tabs" aria-label="Filter by platform">
          {[
            [undefined, "All"],
            ["instagram", "Instagram"],
            ["youtube", "YouTube"],
            ["facebook", "Facebook"],
          ].map(([value, label]) => (
            <button
              key={label}
              className={platform === value ? "is-active" : ""}
              onClick={() => setPlatform(value as Platform | undefined)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="discovery-filters" aria-label="Discovery filters">
          <span className="filter-heading"><SlidersHorizontal size={15} /> Filters</span>
          <label className="filter-control">
            <span>Primary category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="filter-control filter-location">
            <span>Location</span>
            <span className="filter-input"><MapPin size={14} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or state" /></span>
          </label>
          <label className="verified-filter">
            <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
            Platform badge only
          </label>
          {hasFilters ? <button className="clear-filters" onClick={clearFilters}><X size={14} /> Clear</button> : null}
        </div>
      </section>

      <section className="results-section" aria-live="polite">
        <div className="results-heading">
          <h2>{deferredQuery.length >= 2 ? `${visibleResults.length} ${visibleResults.length === 1 ? "match" : "matches"}` : `Discover creators${visibleResults.length ? ` · ${visibleResults.length}` : ""}`}</h2>
          {visibleResults.length > 0 ? <span>{deferredQuery.length >= 2 ? "Ranked by profile match" : "Highest reach first"}</span> : null}
        </div>

        {visibleError ? <div className="state-card state-error">{visibleError}</div> : null}
        {!visibleError && deferredQuery.length === 1 ? (
          <div className="search-empty compact-empty">
            <h3>Type one more character</h3>
            <p>Two characters are enough to start matching handles and names.</p>
          </div>
        ) : null}
        {!visibleError && isSearching ? (
          <div className="creator-list discovery-loading" aria-label="Loading creators">
            {[0, 1, 2, 3].map(item => <span key={item} />)}
          </div>
        ) : null}
        {!visibleError && !isSearching && deferredQuery.length !== 1 && visibleResults.length === 0 ? (
          <div className="search-empty">
            <span className="empty-orbit" aria-hidden="true">?</span>
            <h3>{deferredQuery.length >= 2 ? "No creator found" : "No creators match these filters"}</h3>
            <p>{deferredQuery.length >= 2 ? REPOSITORY_SCOPE : "Widen the category, platform, or location to see more creators."}</p>
            {deferredQuery.length >= 2 ? <button className="button button-primary request-empty-action" onClick={() => setRequestOpen(true)}>Request contact</button> : <button className="button button-primary request-empty-action" onClick={clearFilters}>Clear filters</button>}
          </div>
        ) : null}
        {!isSearching && visibleResults.length > 0 ? (
          <div className="creator-list">
            {visibleResults.map((creator, index) => (
              <CreatorResult
                key={creator.id}
                creator={creator}
                bestMatch={index === 0 && creator.matchScore >= 80}
                onOpen={() => navigate({ name: "creator", creatorId: creator.id })}
              />
            ))}
          </div>
        ) : null}
      </section>
      {requestOpen ? <RequestContactModal initialHandle={query} initialPlatform={platform ?? "instagram"} onClose={() => setRequestOpen(false)} /> : null}
    </main>
  );
}
