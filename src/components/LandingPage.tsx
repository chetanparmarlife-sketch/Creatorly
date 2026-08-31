import {
  ArrowRight, BadgeCheck, Bot, Camera, Check, Database, FileBarChart, Globe2,
  FolderKanban, Inbox, MapPin, Plus, Search, Sparkles, Upload,
  Users, Workflow,
} from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import { Logo } from "./Logo";
import "./LandingPage.css";

const products = [
  { number: "01", icon: Database, name: "Creatorly Discovery", title: "Find creators in India and beyond.", body: "Search Instagram, YouTube, and Facebook profiles by category, audience size, and location. Compare supplied metrics and save the best fits to your workspace.", points: ["India-first, global creator search", "Profiles from 1K followers", "Audience and engagement metrics"], visual: "discovery" as const },
  { number: "02", icon: Users, name: "Private creator CRM", title: "Keep every creator relationship in one place.", body: "Save Creatorly profiles beside creators your team adds. Track contacts, owners, stages, and next steps in one private workspace.", points: ["CSV upload and manual entry", "Private workspace contacts", "Stages, owners, notes, and next actions"], visual: "crm" as const },
  { number: "03", icon: Globe2, name: "Chrome extension", title: "Save creators while you browse.", body: "Match social profiles, check if they are already saved, unlock available contacts, and add new profiles to your workspace.", points: ["Shows the connected workspace", "Detects already-saved creators", "Saves matched and private profiles"], visual: "extension" as const },
  { number: "04", icon: FolderKanban, name: "Campaign workspace", title: "Run campaigns from brief to report.", body: "Organise campaigns by client or brand, add creators, track content and approvals, and export clear reports.", points: ["Client and division grouping", "Creator pipeline and deliverables", "Review access and scoped reports"], visual: "campaign" as const },
] as const;

const addons = [
  { icon: Bot, title: "AI Agents", body: "Agents that help build shortlists, research contacts, and prepare campaign work." },
  { icon: Inbox, title: "Inbox", body: "Creator conversations and replies connected to the campaign record." },
  { icon: Workflow, title: "Automations", body: "Controlled follow-ups, handoffs, reminders, and repetitive campaign actions." },
  { icon: FileBarChart, title: "Reports", body: "Live performance reporting from connected social and outreach channels." },
] as const;

const heroCreators = [
  { initials: "MS", name: "Meera Shah", handle: "@meerashah", followers: "82.4K", engagement: "4.8%", city: "Mumbai", tone: "blue" },
  { initials: "AK", name: "Aarav Khanna", handle: "@aaravcreates", followers: "46.1K", engagement: "5.2%", city: "Delhi", tone: "violet" },
  { initials: "NI", name: "Naina Iyer", handle: "@naina.iyer", followers: "31.8K", engagement: "6.1%", city: "Bengaluru", tone: "coral" },
] as const;

function ProductVisual({ type, onContinue }: { type: typeof products[number]["visual"]; onContinue(): void }) {
  if (type === "discovery") return <div className="product-ui discovery-ui"><div className="ui-search"><Search size={16}/><span>wellness creators in Mumbai</span><kbd>Search</kbd></div><div className="ui-filters"><span>Instagram</span><span>1K–10K</span><span className="selected">Imported</span></div><div className="ui-table"><div className="ui-table-head"><span>Creator</span><span>Audience</span><span>Contact</span></div>{[["MK","Maya Kapoor","9.8K","Pending"],["AM","Aanchal Mehta","6.4K","Pending"],["NK","Noor Khan","2.9K","Pending"]].map(row => <div className="ui-row" key={row[1]}><span className="ui-person"><i>{row[0]}</i><b>{row[1]}</b></span><strong>{row[2]}</strong><em>{row[3]}</em></div>)}</div></div>;
  if (type === "crm") return <div className="product-ui crm-ui"><header><div><span>Creator CRM</span><strong>248 creators</strong></div><button type="button" onClick={onContinue}><Upload size={14}/> Add creators</button></header><div className="crm-columns"><span>Creator</span><span>Source</span><span>Stage</span></div>{[["RS","Riya Shah","Creatorly data","Contacted"],["AV","Aarav Verma","Uploaded by your team","Negotiating"],["NS","Nisha Sen","Added manually","Shortlisted"]].map(row => <div className="crm-preview-row" key={row[1]}><span className="ui-person"><i>{row[0]}</i><b>{row[1]}</b></span><em>{row[2]}</em><strong>{row[3]}</strong></div>)}</div>;
  if (type === "extension") return <div className="product-ui browser-ui"><div className="browser-address"><span/><span/><span/><p>instagram.com/maya_creates</p></div><div className="social-profile"><i>MK</i><strong>Maya Kapoor</strong><small>Wellness creator · Mumbai</small></div><aside><header><Logo/><span>Connected</span></header><small>QA Agency workspace</small><div className="match-state"><BadgeCheck size={16}/><span><b>Profile matched</b><small>Already saved to Creator CRM</small></span></div><button type="button" onClick={onContinue}>Open saved creator <ArrowRight size={14}/></button></aside></div>;
  return <div className="product-ui campaign-ui"><header><span>Campaigns</span><button type="button" onClick={onContinue}>+ Create campaign</button></header><div className="campaign-tabs"><span>All campaigns <b>8</b></span><span className="selected">Northstar Foods <b>3</b></span><span>Aperture Labs <b>2</b></span></div><div className="campaign-card-preview"><small>Northstar Foods</small><strong>Festive creator launch</strong><p>Drive consideration with trusted lifestyle creators.</p><footer><span><Users size={13}/> 12 creators</span><span>INR 500,000</span></footer></div></div>;
}

function HeroDiscovery({ onContinue }: { onContinue(): void }) {
  return <div className="hero-discovery" aria-label="Creatorly discovery preview">
    <header><div><Logo compact/><span>Discovery</span></div><small><i/> Profiles ready to search</small></header>
    <div className="hero-search"><Search size={16}/><span>Skincare creators in Mumbai</span><kbd>⌘ K</kbd></div>
    <div className="hero-filter-row"><span><Camera size={12}/> Instagram</span><span>10K–100K</span><span>Mumbai</span><button type="button" onClick={onContinue}>Edit filters</button></div>
    <div className="hero-results-head"><span>Best matches</span><small>Updated from supplied source data</small></div>
    <div className="hero-creator-list">{heroCreators.map((creator, index) => <article className={index === 0 ? "is-featured" : ""} key={creator.handle}>
      <div className={`hero-avatar ${creator.tone}`}>{creator.initials}<span><Camera size={9}/></span></div>
      <div className="hero-creator-name"><strong>{creator.name}</strong><small>{creator.handle}</small></div>
      <dl><div><dt>Followers</dt><dd>{creator.followers}</dd></div><div><dt>Engagement</dt><dd>{creator.engagement}</dd></div><div><dt>Location</dt><dd>{creator.city}</dd></div></dl>
      <button type="button" aria-label={`Add ${creator.name} to your workspace`} onClick={onContinue}>{index === 0 ? <Check size={14}/> : <Plus size={14}/>}</button>
    </article>)}</div>
    <footer><div className="hero-shortlist-avatars">{heroCreators.map(creator => <span className={creator.tone} key={creator.initials}>{creator.initials}</span>)}</div><span><strong>Campaign shortlist</strong><small>3 creators ready to contact</small></span><button type="button" onClick={onContinue}>Open shortlist <ArrowRight size={14}/></button></footer>
  </div>;
}

export function LandingPage({ navigate }: { navigate(route: AppRoute): void }) {
  const startFree = () => navigate({ name: "signup" });
  const continueFromPreview = () => navigate({ name: "signup", reason: "workspace" });
  return <main className="home-page">
    <header className="home-nav"><Logo/><nav aria-label="Landing navigation"><a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#addons">Add-ons</a><button onClick={() => navigate({ name: "pricing" })}>Pricing</button></nav><div className="home-nav-actions"><button className="text-button" onClick={() => navigate({ name: "login" })}>Log in</button><button className="button button-primary" onClick={startFree}>Start free</button></div></header>
    <section className="home-hero" aria-labelledby="home-title"><div className="home-hero-copy"><p className="home-kicker"><Sparkles size={14}/> Built for Indian brands and agencies</p><h1 id="home-title">Find creators in India. <span>Run campaigns everywhere.</span></h1><p>Search creator profiles, build a private contact list, and move every campaign from shortlist to report in one workspace.</p><div className="home-market-note"><MapPin size={15}/><span><strong>India-first discovery</strong><small>Global creator reach when your brief needs it</small></span></div><div className="home-hero-actions"><button className="button button-primary" onClick={startFree}>Start free <ArrowRight size={17}/></button><a href="#workflow">See how it works</a></div><div className="home-trust"><span><Check size={14}/> 25 credits included</span><span><Check size={14}/> No card needed</span><span><Check size={14}/> Private workspace</span></div></div><HeroDiscovery onContinue={continueFromPreview}/></section>
    <section className="home-audience" aria-label="Creatorly platform coverage"><p>Built for India. Ready for global creator work.</p><div><span>Instagram profiles</span><span>YouTube profiles</span><span>Facebook profiles</span><span>Creators from 1K followers</span></div></section>
    <section className="home-products" id="platform"><header className="home-section-head"><p className="eyebrow">One connected workflow</p><h2>From creator search to live campaign.</h2><p>Keep the shortlist, contacts, approvals, and results together—without rebuilding the same spreadsheet every time.</p></header>{products.map(({ number, icon: Icon, name, title, body, points, visual }, index) => <article className={`home-product-row ${index % 2 ? "reverse" : ""}`} id={index === 0 ? "workflow" : undefined} key={name}><div className="home-product-copy"><span className="product-number">Step {number}</span><div className="product-name"><Icon size={18}/>{name}</div><h3>{title}</h3><p>{body}</p><ul>{points.map(point => <li key={point}><Check size={14}/>{point}</li>)}</ul></div><div className="home-product-stage"><ProductVisual type={visual} onContinue={continueFromPreview}/></div></article>)}</section>
    <section className="home-addons" id="addons"><header><div><p className="eyebrow">Coming later</p><h2>More tools are on the way.</h2></div><p>These features are planned and are not live yet.</p></header><div>{addons.map(({ icon: Icon, title, body }) => <article key={title}><span><Icon size={19}/></span><div><small>Planned</small><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
    <section className="home-final"><span><FolderKanban size={18}/> Start your creator workspace</span><h2>Run your next campaign in one place.</h2><p>Start free with the tools available today.</p><button className="button" onClick={startFree}>Start free <ArrowRight size={18}/></button></section>
    <footer className="home-footer"><Logo/><span>© 2026 Creatorly · Built for Indian creator teams</span><nav aria-label="Footer navigation"><a href="#platform">Platform</a><a href="#addons">Planned features</a><button onClick={() => navigate({ name: "pricing" })}>Pricing</button></nav></footer>
  </main>;
}
