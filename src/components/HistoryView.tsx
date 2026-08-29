import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  History,
  PlaySquare,
  RotateCcw,
  Search,
} from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import { daysRemaining, formatDate, initials } from "../lib/format";
import type { UnlockHistoryItem } from "../types";

type HistoryFilter = "active" | "expired" | "all";

export function HistoryView({
  navigate,
  onBalanceChange,
}: {
  navigate(route: AppRoute): void;
  onBalanceChange(): Promise<void>;
}) {
  const data = useAppData();
  const [items, setItems] = useState<UnlockHistoryItem[]>([]);
  const [filter, setFilter] = useState<HistoryFilter>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await data.getHistory());
    } catch {
      setError("History is unavailable right now. Try again.");
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    let active = true;
    data.getHistory()
      .then((nextItems) => {
        if (active) setItems(nextItems);
      })
      .catch(() => {
        if (active) setError("History is unavailable right now. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [data]);

  const counts = useMemo(() => ({
    active: items.filter((item) => item.status === "active").length,
    expired: items.filter((item) => item.status === "expired").length,
    all: items.length,
  }), [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = filter === "all" || item.status === filter;
      const matchesQuery = !normalizedQuery
        || item.creator.displayName.toLowerCase().includes(normalizedQuery)
        || item.creator.handle.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const renew = async (item: UnlockHistoryItem) => {
    setRenewingId(item.id);
    setError("");
    try {
      await data.unlock(item.creator.id);
      await Promise.all([refreshHistory(), onBalanceChange()]);
      setFilter("active");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not renew access.");
    } finally {
      setRenewingId(null);
    }
  };

  return (
    <main className="workspace history-workspace">
      <section className="history-intro">
        <div>
          <p className="eyebrow">Contact access</p>
          <h1>Unlock history</h1>
          <p>Return to open contacts or renew an expired 30-day window.</p>
        </div>
        <div className="history-tally" aria-label={`${counts.active} active unlocks`}>
          <strong>{counts.active}</strong>
          <span>active now</span>
        </div>
      </section>

      <section className="history-controls" aria-label="Filter unlock history">
        <div className="history-tabs" role="tablist" aria-label="Access status">
          {(["active", "expired", "all"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
            >
              {value[0].toUpperCase() + value.slice(1)} <span>{counts[value]}</span>
            </button>
          ))}
        </div>
        <label className="history-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search unlock history</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creator" />
        </label>
      </section>

      {error ? <div className="state-card state-error history-error" role="alert">{error}</div> : null}
      {loading ? (
        <div className="history-list" aria-label="Loading unlock history">
          <div className="history-skeleton" /><div className="history-skeleton" />
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <section className="history-empty">
          <span className="empty-orbit" aria-hidden="true"><History size={23} /></span>
          <h2>No unlocks yet</h2>
          <p>Your paid contact windows will stay organized here.</p>
          <button className="button button-primary" onClick={() => navigate({ name: "search", query: "" })}>Find a creator</button>
        </section>
      ) : null}

      {!loading && items.length > 0 && visibleItems.length === 0 ? (
        <section className="history-empty history-empty-compact">
          <h2>No {filter === "all" ? "matching" : filter} unlocks</h2>
          <p>Try another filter or creator name.</p>
        </section>
      ) : null}

      {!loading && visibleItems.length > 0 ? (
        <section className="history-list" aria-live="polite">
          {visibleItems.map((item) => (
            <article className={`history-row history-row-${item.status}`} key={item.id}>
              <span className={`creator-avatar creator-avatar-${item.creator.platform}`} aria-hidden="true">
                {initials(item.creator.displayName)}
              </span>
              <div className="history-identity">
                <h2>{item.creator.displayName}{item.creator.isVerified ? <BadgeCheck size={16} aria-label="Platform verified" /> : null}</h2>
                <p>{item.creator.platform === "instagram" ? <Camera size={14} /> : <PlaySquare size={15} />}{item.creator.handle}</p>
              </div>
              <div className="history-date">
                <CalendarDays size={16} aria-hidden="true" />
                <span><small>Unlocked</small>{formatDate(item.unlockedAt)}</span>
              </div>
              <div className={`history-status history-status-${item.status}`}>
                <span>{item.status === "active" ? `${daysRemaining(item.expiresAt)} days remaining` : "Access expired"}</span>
                <small>{item.status === "active" ? `Until ${formatDate(item.expiresAt)}` : `Expired ${formatDate(item.expiresAt)}`}</small>
              </div>
              {item.status === "active" ? (
                <button className="history-action" aria-label={`View ${item.creator.displayName} contact`} onClick={() => navigate({ name: "creator", creatorId: item.creator.id })}>
                  View contact <ArrowUpRight size={17} aria-hidden="true" />
                </button>
              ) : (
                <button className="history-action history-renew" disabled={renewingId === item.id} onClick={() => void renew(item)}>
                  <RotateCcw size={16} aria-hidden="true" /> {renewingId === item.id ? "Renewing…" : "Re-unlock · 5 credits"}
                </button>
              )}
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
