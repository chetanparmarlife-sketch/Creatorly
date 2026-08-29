import { History, LogOut, Search, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Viewer } from "../types";
import { Logo } from "./Logo";

export function AppShell({
  viewer,
  activePage,
  onSearch,
  onHistory,
  onAdmin,
  showAdmin,
  onSignOut,
  children,
}: {
  viewer: Viewer | null;
  activePage: "search" | "history" | "admin";
  onSearch(): void;
  onHistory(): void;
  onAdmin(): void;
  showAdmin: boolean;
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
          <button className={`nav-item ${activePage === "search" ? "is-active" : ""}`} onClick={onSearch} aria-current={activePage === "search" ? "page" : undefined}>
            <Search size={17} aria-hidden="true" /> Search
          </button>
          <button className={`nav-item ${activePage === "history" ? "is-active" : ""}`} onClick={onHistory} aria-current={activePage === "history" ? "page" : undefined}>
            <History size={17} aria-hidden="true" /> History
          </button>
          {showAdmin ? <button className={`nav-item ${activePage === "admin" ? "is-active" : ""}`} onClick={onAdmin} aria-current={activePage === "admin" ? "page" : undefined}>
            <ShieldCheck size={17} aria-hidden="true" /> Admin
          </button> : null}
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
