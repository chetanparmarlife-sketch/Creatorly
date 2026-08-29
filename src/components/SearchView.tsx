import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import type { CreatorSearchResult, Platform } from "../types";
import { CreatorResult } from "./CreatorResult";
import { RequestContactModal } from "./RequestContactModal";

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
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (deferredQuery.length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setResults([]);
      data.search(deferredQuery, platform)
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
  }, [data, deferredQuery, platform]);

  const visibleResults = deferredQuery.length >= 2 ? results : [];
  const isSearching = deferredQuery.length >= 2 && loading;
  const visibleError = deferredQuery.length >= 2 ? error : "";

  return (
    <main className="workspace search-workspace">
      <section className="search-intro">
        <div>
          <p className="eyebrow">Creator discovery</p>
          <h1>Who do you need to reach?</h1>
          <p>Search a handle or name. We’ll match common profile variations.</p>
        </div>
        <div className="search-proof">
          <Sparkles size={17} aria-hidden="true" />
          <span><strong>6 demo creators</strong> ready to test</span>
        </div>
      </section>

      <section className="search-console" aria-label="Creator search">
        <label className="search-input-wrap">
          <Search size={22} aria-hidden="true" />
          <span className="sr-only">Creator name or handle</span>
          <input
            autoFocus
            aria-label="Creator name or handle"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try @maya_creates or Rishi Verma"
          />
          {isSearching ? <span className="spinner" aria-label="Searching" /> : <kbd>⌘ K</kbd>}
        </label>
        <div className="platform-tabs" aria-label="Filter by platform">
          {[
            [undefined, "All"],
            ["instagram", "Instagram"],
            ["youtube", "YouTube"],
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
      </section>

      <section className="results-section" aria-live="polite">
        <div className="results-heading">
          <h2>{deferredQuery.length >= 2 ? `${visibleResults.length} ${visibleResults.length === 1 ? "match" : "matches"}` : "Start with a creator"}</h2>
          {visibleResults.length > 0 ? <span>Ranked by profile match</span> : null}
        </div>

        {visibleError ? <div className="state-card state-error">{visibleError}</div> : null}
        {!visibleError && deferredQuery.length < 2 ? (
          <div className="search-empty">
            <span className="empty-orbit" aria-hidden="true"><Search size={23} /></span>
            <h3>Search the working set</h3>
            <p>Try Maya Kapoor, Tech Rishi, Aanchal, Kabir, Noor, or Money Made Clear.</p>
          </div>
        ) : null}
        {!visibleError && !isSearching && deferredQuery.length >= 2 && visibleResults.length === 0 ? (
          <div className="search-empty">
            <span className="empty-orbit" aria-hidden="true">?</span>
            <h3>No contact in this demo set</h3>
            <p>Try another spelling or ask our research queue to find the right contact.</p>
            <button className="button button-primary request-empty-action" onClick={() => setRequestOpen(true)}>Request contact</button>
          </div>
        ) : null}
        {visibleResults.length > 0 ? (
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
