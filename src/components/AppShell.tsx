import { Bot, ChartNoAxesCombined, ChevronDown, CreditCard, History, Home, Inbox, LogOut, Megaphone, Menu, Plug, Search, Settings, ShieldCheck, UserRound, Users, Workflow, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Viewer } from "../types";
import { Logo } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";
import type { AppRoute } from "../hooks/useRoute";

export function AppShell({
  viewer,
  activePage, navigate,
  onSearch,
  onHistory,
  onAdmin,
  showAdmin,
  onSignOut,
  children,
}: {
  viewer: Viewer | null;
  activePage: "home" | "search" | "creators" | "campaigns" | "history" | "pricing" | "settings" | "admin";
  navigate(route: AppRoute): void;
  onSearch(): void;
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
        <button className="brand-button" onClick={() => go({ name: "home" })} aria-label="Go to workspace home">
          <Logo />
        </button>
        <nav className={mobileOpen ? "is-open" : ""} aria-label="Primary navigation">
          <button className={`nav-item ${activePage === "home" ? "is-active" : ""}`} onClick={() => go({ name: "home" })} aria-current={activePage === "home" ? "page" : undefined}>
            <Home size={17} aria-hidden="true" /> Home
          </button>
          <button className={`nav-item ${activePage === "search" ? "is-active" : ""}`} onClick={onSearch} aria-current={activePage === "search" ? "page" : undefined}>
            <Search size={17} aria-hidden="true" /> <span aria-hidden="true">Discover</span><span className="sr-only">Search</span>
          </button>
          <button className={`nav-item ${activePage === "creators" ? "is-active" : ""}`} onClick={() => go({ name: "creators" })} aria-current={activePage === "creators" ? "page" : undefined}><Users size={17}/> Creators</button>
          <button className={`nav-item ${activePage === "campaigns" ? "is-active" : ""}`} onClick={() => go({ name: "campaigns" })} aria-current={activePage === "campaigns" ? "page" : undefined}><Megaphone size={17}/> Campaigns</button>
          <div className="nav-divider" />
          <button className="nav-item is-planned" disabled><Inbox size={17}/> Inbox <small>Planned</small></button>
          <button className="nav-item is-planned" disabled><Workflow size={17}/> Automations <small>Planned</small></button>
          <button className="nav-item is-planned" disabled><ChartNoAxesCombined size={17}/> Reports <small>Planned</small></button>
          <button className="nav-item is-planned" disabled><Bot size={17}/> Agents <small>Planned</small></button>
          <button className="nav-item is-planned" disabled><Plug size={17}/> Integrations <small>Planned</small></button>
          <div className="nav-divider" />
          <button className={`nav-item ${activePage === "history" ? "is-active" : ""}`} onClick={onHistory} aria-current={activePage === "history" ? "page" : undefined}>
            <History size={17} aria-hidden="true" /> History
          </button>
          <button className={`nav-item ${activePage === "pricing" ? "is-active" : ""}`} onClick={() => go({ name: "pricing" })} aria-current={activePage === "pricing" ? "page" : undefined}><CreditCard size={17}/> Pricing</button>
          <button className={`nav-item ${activePage === "settings" ? "is-active" : ""}`} onClick={() => go({ name: "settings" })} aria-current={activePage === "settings" ? "page" : undefined}><Settings size={17}/> Settings</button>
          {showAdmin ? <button className={`nav-item ${activePage === "admin" ? "is-active" : ""}`} onClick={onAdmin} aria-current={activePage === "admin" ? "page" : undefined}>
            <ShieldCheck size={17} aria-hidden="true" /> Admin
          </button> : null}
        </nav>
        <div className="account-strip">
          <div className={`credit-pill ${(viewer?.creditBalance ?? 99) <= 5 ? "is-low" : ""}`} title={(viewer?.creditBalance ?? 99) <= 5 ? "Low credit balance" : "Credits available"}>
            <span className="credit-dot" aria-hidden="true" />
            <strong>{viewer?.creditBalance ?? "—"}</strong> credits
          </div>
          <span className="plan-badge">{viewer?.currentPlanTier ?? "free"}</span>
          <NotificationCenter/>
          <div className="profile-menu"><button className="profile-trigger" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><UserRound size={17}/><span>{viewer?.name?.split(" ")[0] ?? "Account"}</span><ChevronDown size={13}/></button>{profileOpen ? <div className="profile-popover"><button onClick={() => { setProfileOpen(false); go({ name: "settings" }); }}><UserRound size={15}/> Account</button><button onClick={() => { setProfileOpen(false); go({ name: "pricing" }); }}><CreditCard size={15}/> Billing</button><button onClick={() => { setProfileOpen(false); go({ name: "settings" }); }}><Settings size={15}/> Notifications</button><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></div> : null}</div>
          <button className="icon-button mobile-menu-button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={18}/> : <Menu size={18}/>}</button>
        </div>
      </header>
      {children}
    </div>
  );
}
