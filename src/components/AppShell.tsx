import { LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { Viewer } from "../types";
import { Logo } from "./Logo";

export function AppShell({
  viewer,
  onSearch,
  onSignOut,
  children,
}: {
  viewer: Viewer | null;
  onSearch(): void;
  onSignOut(): void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={onSearch} aria-label="Go to creator search">
          <Logo />
        </button>
        <nav aria-label="Primary navigation">
          <button className="nav-item is-active" onClick={onSearch}>
            <Search size={17} aria-hidden="true" /> Search
          </button>
          <span className="nav-soon">M1 live slice</span>
        </nav>
        <div className="account-strip">
          <div className="credit-pill" title="Credits available">
            <span className="credit-dot" aria-hidden="true" />
            <strong>{viewer?.creditBalance ?? "—"}</strong> credits
          </div>
          <span className="plan-badge">{viewer?.currentPlanTier ?? "free"}</span>
          <button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
