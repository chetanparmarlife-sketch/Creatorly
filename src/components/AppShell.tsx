import { Bot, ChevronDown, FileBarChart, History, Inbox, LogOut, Megaphone, Menu, Search, Settings, ShieldCheck, UserRound, Users, Workflow, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Viewer } from "../types";
import { Logo } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";
import type { AppRoute } from "../hooks/useRoute";
import "./AppShell.css";

const PLANNED_ITEMS = [
  { label: "AI Agents", detail: "Shortlists and research", icon: Bot },
  { label: "Unified Inbox", detail: "Creator conversations", icon: Inbox },
  { label: "Automations", detail: "Follow-ups and handoffs", icon: Workflow },
  { label: "Connected reporting", detail: "Live campaign results", icon: FileBarChart },
] as const;

export function AppShell({
  viewer,
  activePage, navigate,
  onHistory,
  onAdmin,
  showAdmin,
  onSignOut,
  children,
}: {
  viewer: Viewer | null;
  activePage: "search" | "creators" | "campaigns" | "history" | "settings" | "admin";
  navigate(route: AppRoute): void;
  onHistory(): void;
  onAdmin(): void;
  showAdmin: boolean;
  onSignOut(): void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const go = (route: AppRoute) => { setMobileOpen(false); navigate(route); };
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => go({ name: "discover" })} aria-label="Go to creator discovery">
          <Logo />
        </button>
        <div className={`sidebar-panel ${mobileOpen ? "is-open" : ""}`}>
          <nav aria-label="Primary navigation">
            <button className={`nav-item ${activePage === "search" ? "is-active" : ""}`} onClick={() => go({ name: "discover" })} aria-current={activePage === "search" ? "page" : undefined}>
              <Search size={17} aria-hidden="true" /> <span aria-hidden="true">Discover</span><span className="sr-only">Search</span>
            </button>
            <button className={`nav-item ${activePage === "creators" ? "is-active" : ""}`} onClick={() => go({ name: "creators" })} aria-current={activePage === "creators" ? "page" : undefined}><Users size={17}/> Creators</button>
            <button className={`nav-item ${activePage === "history" ? "is-active" : ""}`} onClick={onHistory} aria-current={activePage === "history" ? "page" : undefined}>
              <History size={17} aria-hidden="true" /> History
            </button>
            <button className={`nav-item ${activePage === "campaigns" ? "is-active" : ""}`} onClick={() => go({ name: "campaigns" })} aria-current={activePage === "campaigns" ? "page" : undefined}><Megaphone size={17}/> Campaigns</button>
            <div className="nav-divider" aria-hidden="true" />
            <section className="sidebar-planned" role="group" aria-labelledby="sidebar-planned-title">
              <h2 id="sidebar-planned-title">Planned</h2>
              <ul>{PLANNED_ITEMS.map(({ label, detail, icon: Icon }) => <li key={label}><Icon size={16} aria-hidden="true"/><span><strong>{label}</strong><small>{detail}</small></span></li>)}</ul>
            </section>
            <div className="nav-divider" aria-hidden="true" />
            <button className={`nav-item ${activePage === "settings" ? "is-active" : ""}`} onClick={() => go({ name: "settings" })} aria-current={activePage === "settings" ? "page" : undefined}><Settings size={17}/> Settings</button>
            {showAdmin ? <button className={`nav-item ${activePage === "admin" ? "is-active" : ""}`} onClick={onAdmin} aria-current={activePage === "admin" ? "page" : undefined}>
              <ShieldCheck size={17} aria-hidden="true" /> Admin
            </button> : null}
          </nav>
          <div className="account-strip">
            <NotificationCenter/>
            <div className="profile-menu"><button className="profile-trigger" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><UserRound size={17}/><span><strong>{viewer?.name ?? "Account"}</strong><small>{viewer?.companyName || "Creatorly workspace"}</small></span><ChevronDown size={13}/></button>{profileOpen ? <div className="profile-popover"><button onClick={() => { setProfileOpen(false); go({ name: "settings" }); }}><Settings size={15}/> Account settings</button><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></div> : null}</div>
          </div>
        </div>
        <button className="icon-button mobile-menu-button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={18}/> : <Menu size={18}/>}</button>
      </header>
      {children}
    </div>
  );
}
