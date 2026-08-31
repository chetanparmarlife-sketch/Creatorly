import { ArrowLeft, Bot, ChevronDown, FileBarChart, History, Inbox, LogOut, Megaphone, Menu, Plug, Search, Settings, ShieldCheck, UserRound, Users, Workflow, X } from "lucide-react";
import { createContext, useState, type ReactNode } from "react";
import type { Viewer } from "../types";
import { Logo } from "./Logo";
import { NotificationCenter } from "./NotificationCenter";
import type { AppRoute } from "../hooks/useRoute";
import "./AppShell.css";

const PLANNED_ITEMS = [
  { label: "AI Agents", icon: Bot },
  { label: "Inbox", icon: Inbox },
  { label: "Automations", icon: Workflow },
  { label: "Reports", icon: FileBarChart },
  { label: "Integrations", icon: Plug },
] as const;

const CONTEXT_NAV = {
  creators: { title: "Creators", items: [{ label: "Creator CRM", icon: Users, route: { name: "creators" } as AppRoute }, { label: "Discover creators", icon: Search, route: { name: "discover" } as AppRoute }] },
  campaigns: { title: "Campaigns", items: [{ label: "All campaigns", icon: Megaphone, route: { name: "campaigns" } as AppRoute }, { label: "Find creators", icon: Search, route: { name: "discover" } as AppRoute }] },
  history: { title: "History", items: [{ label: "Contact history", icon: History, route: { name: "history" } as AppRoute }, { label: "Creator CRM", icon: Users, route: { name: "creators" } as AppRoute }] },
  settings: { title: "Settings", items: [{ label: "Workspace settings", icon: Settings, route: { name: "settings" } as AppRoute }, { label: "Plans and billing", icon: FileBarChart, route: { name: "pricing" } as AppRoute }] },
  admin: { title: "Admin", items: [{ label: "Admin queue", icon: ShieldCheck, route: { name: "admin" } as AppRoute }, { label: "Contact history", icon: History, route: { name: "history" } as AppRoute }] },
} as const;

const CREATOR_PROFILE_CONTEXT = {
  eyebrow: "Discovery",
  title: "Creator profile",
  items: [
    { label: "Back to discovery", icon: ArrowLeft, route: { name: "discover" } as AppRoute },
    { label: "Creator CRM", icon: Users, route: { name: "creators" } as AppRoute },
  ],
} as const;

export const AppSidebarTargetContext = createContext<HTMLDivElement | null>(null);

export function AppShell({
  viewer,
  activePage, contextView, navigate,
  onHistory,
  onAdmin,
  showAdmin,
  onSignOut,
  children,
}: {
  viewer: Viewer | null;
  activePage: "search" | "creators" | "campaigns" | "history" | "settings" | "admin";
  contextView?: "creator-profile";
  navigate(route: AppRoute): void;
  onHistory(): void;
  onAdmin(): void;
  showAdmin: boolean;
  onSignOut(): void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarTarget, setSidebarTarget] = useState<HTMLDivElement | null>(null);
  const go = (route: AppRoute) => { setMobileOpen(false); navigate(route); };
  const contextNav = contextView === "creator-profile"
    ? CREATOR_PROFILE_CONTEXT
    : activePage === "search"
      ? null
      : { eyebrow: "Workspace", ...CONTEXT_NAV[activePage] };
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => go({ name: "discover" })} aria-label="Go to creator discovery">
          <Logo />
        </button>
        <div className={`sidebar-panel ${mobileOpen ? "is-open" : ""}`}>
          <nav aria-label="Primary navigation">
            <button title="Discover" className={`nav-item ${activePage === "search" ? "is-active" : ""}`} onClick={() => go({ name: "discover" })} aria-current={activePage === "search" ? "page" : undefined}>
              <Search size={17} aria-hidden="true" /> <span className="nav-label" aria-hidden="true">Discover</span><span className="sr-only">Search</span>
            </button>
            <button title="Creators" className={`nav-item ${activePage === "creators" ? "is-active" : ""}`} onClick={() => go({ name: "creators" })} aria-current={activePage === "creators" ? "page" : undefined}><Users size={17}/><span className="nav-label">Creators</span></button>
            <button title="Campaigns" className={`nav-item ${activePage === "campaigns" ? "is-active" : ""}`} onClick={() => go({ name: "campaigns" })} aria-current={activePage === "campaigns" ? "page" : undefined}><Megaphone size={17}/><span className="nav-label">Campaigns</span></button>
            <div className="nav-divider" aria-hidden="true" />
            <section className="sidebar-planned" role="group" aria-label="Planned features">
              <ul>{PLANNED_ITEMS.map(({ label, icon: Icon }) => <li title={`${label} · Planned`} className="planned-nav-item" key={label}><Icon size={17} aria-hidden="true"/><span>{label}</span><small>Planned</small></li>)}</ul>
            </section>
            <div className="nav-divider" aria-hidden="true" />
            <button title="History" className={`nav-item ${activePage === "history" ? "is-active" : ""}`} onClick={onHistory} aria-current={activePage === "history" ? "page" : undefined}>
              <History size={17} aria-hidden="true" /><span className="nav-label">History</span>
            </button>
            <button title="Settings" className={`nav-item ${activePage === "settings" ? "is-active" : ""}`} onClick={() => go({ name: "settings" })} aria-current={activePage === "settings" ? "page" : undefined}><Settings size={17}/><span className="nav-label">Settings</span></button>
            {showAdmin ? <button title="Admin" className={`nav-item ${activePage === "admin" ? "is-active" : ""}`} onClick={onAdmin} aria-current={activePage === "admin" ? "page" : undefined}>
              <ShieldCheck size={17} aria-hidden="true" /><span className="nav-label">Admin</span>
            </button> : null}
          </nav>
          <div className="account-strip">
            <NotificationCenter/>
            <div className="profile-menu"><button className="profile-trigger" title="Account" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}><UserRound size={17}/><span><strong>{viewer?.name ?? "Account"}</strong><small>{viewer?.companyName || "Creatorly workspace"}</small></span><ChevronDown size={13}/></button>{profileOpen ? <div className="profile-popover"><button onClick={() => { setProfileOpen(false); go({ name: "settings" }); }}><Settings size={15}/> Account settings</button><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></div> : null}</div>
          </div>
        </div>
        <button className="icon-button mobile-menu-button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X size={18}/> : <Menu size={18}/>}</button>
      </header>
      <AppSidebarTargetContext.Provider value={sidebarTarget}>
        <aside className="context-sidebar" aria-label={contextNav ? `${contextNav.title} tools` : "Creator filters"}>
          <div id="app-context-sidebar-content" ref={setSidebarTarget}>
            {contextNav ? <><header><p>{contextNav.eyebrow}</p><h2>{contextNav.title}</h2></header><nav aria-label={`${contextNav.title} navigation`}>{contextNav.items.map(({ label, icon: Icon, route }) => <button type="button" key={label} className={contextView !== "creator-profile" && route.name === (activePage === "creators" ? "creators" : activePage === "campaigns" ? "campaigns" : activePage) ? "is-active" : ""} onClick={() => go(route)}><Icon size={17}/><span>{label}</span></button>)}</nav></> : null}
          </div>
        </aside>
        <div className="app-content">{children}</div>
      </AppSidebarTargetContext.Provider>
    </div>
  );
}
