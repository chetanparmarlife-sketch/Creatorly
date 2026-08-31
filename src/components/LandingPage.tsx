import {
  ArrowRight, BadgeCheck, Bot, Camera, Check, Database, FileBarChart, Globe2,
  FolderKanban, Inbox, MapPin, Plus, Search, Sparkles, Upload,
  Users, Workflow,
} from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import { Logo } from "./Logo";
import "./LandingPage.css";

const products = [
  { number: "01", icon: Database, name: "Creator search", title: "Find creators who fit your campaign.", body: "Choose the topic, follower count, and location you need. Compare creators from Instagram, YouTube, and Facebook, then save the best people for your campaign.", points: ["Search in India or worldwide", "Find creators from 1K followers", "See followers, likes, comments, and location"], visual: "discovery" as const },
  { number: "02", icon: Users, name: "Your creator list", title: "Keep every creator and contact in one list.", body: "Save creators you find in Creatorly, upload a spreadsheet, or add someone by hand. Your team can see the contact details, notes, owner, and next step.", points: ["Upload a spreadsheet or add people by hand", "Keep contact details and notes together", "See who owns each relationship"], visual: "crm" as const },
  { number: "03", icon: Globe2, name: "Browser extension", title: "Save creators while you browse social media.", body: "When you find a creator online, check whether your team already knows them. See available contact details and add them to your list without leaving the page.", points: ["See if your team saved them before", "Find available contact details", "Add them to your team list in one click"], visual: "extension" as const },
  { number: "04", icon: FolderKanban, name: "Campaign manager", title: "Keep every campaign clear and on time.", body: "Put the brief, creators, posts, approvals, and results in one place. Everyone can see what is done, what is late, and what needs attention.", points: ["Keep work separate for each client or brand", "Track creators, posts, and approvals", "Share a clear campaign report"], visual: "campaign" as const },
] as const;

const addons = [
  { icon: Bot, title: "AI helpers", body: "Get help researching creators and building a first list for your campaign." },
  { icon: Inbox, title: "Messages", body: "Keep creator conversations with the campaign they belong to." },
  { icon: Workflow, title: "Follow-ups", body: "Send reminders and move routine work to the right teammate." },
  { icon: FileBarChart, title: "Live reports", body: "See campaign results from your social and outreach channels in one report." },
] as const;

const heroCreators = [
  { initials: "MS", name: "Meera Shah", handle: "@meerashah", followers: "82.4K", engagement: "4.8%", city: "Mumbai", tone: "blue" },
  { initials: "AK", name: "Aarav Khanna", handle: "@aaravcreates", followers: "46.1K", engagement: "5.2%", city: "Delhi", tone: "violet" },
  { initials: "NI", name: "Naina Iyer", handle: "@naina.iyer", followers: "31.8K", engagement: "6.1%", city: "Bengaluru", tone: "coral" },
] as const;

const creatorSteps = [
  { number: "01", title: "Find your profile", body: "Search for the creator profile brands already see." },
  { number: "02", title: "Make it yours", body: "Add your bio, content categories, languages, and starting rates." },
  { number: "03", title: "Choose your contact", body: "Tell brands whether to contact you or your manager." },
  { number: "04", title: "Get discovered", body: "Publish a trusted profile that is ready for brand opportunities." },
] as const;

function ProductVisual({ type, onContinue }: { type: typeof products[number]["visual"]; onContinue(): void }) {
  if (type === "discovery") return <div className="product-ui discovery-ui"><div className="ui-search"><Search size={16}/><span>wellness creators in Mumbai</span><kbd>Search</kbd></div><div className="ui-filters"><span>Instagram</span><span>1K–10K</span><span className="selected">Saved</span></div><div className="ui-table"><div className="ui-table-head"><span>Creator</span><span>Audience</span><span>Contact</span></div>{[["MK","Maya Kapoor","9.8K","Pending"],["AM","Aanchal Mehta","6.4K","Pending"],["NK","Noor Khan","2.9K","Pending"]].map(row => <div className="ui-row" key={row[1]}><span className="ui-person"><i>{row[0]}</i><b>{row[1]}</b></span><strong>{row[2]}</strong><em>{row[3]}</em></div>)}</div></div>;
  if (type === "crm") return <div className="product-ui crm-ui"><header><div><span>Your creator list</span><strong>248 creators</strong></div><button type="button" onClick={onContinue}><Upload size={14}/> Add creators</button></header><div className="crm-columns"><span>Creator</span><span>Added from</span><span>Status</span></div>{[["RS","Riya Shah","Found in Creatorly","Contacted"],["AV","Aarav Verma","Team spreadsheet","Discussing price"],["NS","Nisha Sen","Added by hand","Saved for campaign"]].map(row => <div className="crm-preview-row" key={row[1]}><span className="ui-person"><i>{row[0]}</i><b>{row[1]}</b></span><em>{row[2]}</em><strong>{row[3]}</strong></div>)}</div>;
  if (type === "extension") return <div className="product-ui browser-ui"><div className="browser-address"><span/><span/><span/><p>instagram.com/maya_creates</p></div><div className="social-profile"><i>MK</i><strong>Maya Kapoor</strong><small>Wellness creator · Mumbai</small></div><aside><header><Logo/><span>Connected</span></header><small>QA Agency team</small><div className="match-state"><BadgeCheck size={16}/><span><b>Creator found</b><small>Already saved by your team</small></span></div><button type="button" onClick={onContinue}>Open creator <ArrowRight size={14}/></button></aside></div>;
  return <div className="product-ui campaign-ui"><header><span>Campaigns</span><button type="button" onClick={onContinue}>+ Create campaign</button></header><div className="campaign-tabs"><span>All campaigns <b>8</b></span><span className="selected">Northstar Foods <b>3</b></span><span>Aperture Labs <b>2</b></span></div><div className="campaign-card-preview"><small>Northstar Foods</small><strong>Festive creator launch</strong><p>Work with lifestyle creators to launch the festive range.</p><footer><span><Users size={13}/> 12 creators</span><span>INR 500,000</span></footer></div></div>;
}

function HeroDiscovery({ onContinue }: { onContinue(): void }) {
  return <div className="hero-discovery" aria-label="Creator search preview">
    <header><div><Logo compact/><span>Creator search</span></div><small><i/> Ready to search</small></header>
    <div className="hero-search"><Search size={16}/><span>Skincare creators in Mumbai</span><kbd>⌘ K</kbd></div>
    <div className="hero-filter-row"><span><Camera size={12}/> Instagram</span><span>10K–100K</span><span>Mumbai</span><button type="button" onClick={onContinue}>Edit filters</button></div>
    <div className="hero-results-head"><span>Best matches</span><small>Based on available profile data</small></div>
    <div className="hero-creator-list">{heroCreators.map((creator, index) => <article className={index === 0 ? "is-featured" : ""} key={creator.handle}>
      <div className={`hero-avatar ${creator.tone}`}>{creator.initials}<span><Camera size={9}/></span></div>
      <div className="hero-creator-name"><strong>{creator.name}</strong><small>{creator.handle}</small></div>
      <dl><div><dt>Followers</dt><dd>{creator.followers}</dd></div><div><dt>Likes &amp; comments</dt><dd>{creator.engagement}</dd></div><div><dt>Location</dt><dd>{creator.city}</dd></div></dl>
      <button type="button" aria-label={`Add ${creator.name} to your workspace`} onClick={onContinue}>{index === 0 ? <Check size={14}/> : <Plus size={14}/>}</button>
    </article>)}</div>
    <footer><div className="hero-shortlist-avatars">{heroCreators.map(creator => <span className={creator.tone} key={creator.initials}>{creator.initials}</span>)}</div><span><strong>Saved for campaign</strong><small>3 creators ready to contact</small></span><button type="button" onClick={onContinue}>View creators <ArrowRight size={14}/></button></footer>
  </div>;
}

export function LandingPage({ navigate }: { navigate(route: AppRoute): void }) {
  const startFree = () => navigate({ name: "signup" });
  const claimProfile = () => navigate({ name: "claim" });
  const continueFromPreview = () => navigate({ name: "signup", reason: "workspace" });
  return <main className="home-page">
    <header className="home-nav"><Logo/><nav aria-label="Landing navigation"><a href="#platform">For teams</a><a href="#for-creators">For creators</a><a href="#workflow">How it works</a><button onClick={() => navigate({ name: "pricing" })}>Pricing</button></nav><div className="home-nav-actions"><button className="text-button" onClick={() => navigate({ name: "login" })}>Log in</button><button className="button button-primary" onClick={startFree}>Start free</button></div></header>
    <section className="home-hero" aria-labelledby="home-title"><div className="home-hero-copy"><p className="home-kicker"><Sparkles size={14}/> Influencer marketing, all in one place</p><h1 id="home-title">Find creators. <span>Run better campaigns.</span></h1><p>Creatorly helps your team find influencers, save their contact details, manage campaign work, and share results—without juggling spreadsheets.</p><div className="home-market-note"><MapPin size={15}/><span><strong>Start with India</strong><small>Search creators in India or anywhere else</small></span></div><div className="home-hero-actions"><button className="button button-primary" onClick={startFree}>Start free <ArrowRight size={17}/></button><a href="#for-creators">I’m a creator</a></div><div className="home-trust"><span><Check size={14}/> 25 free credits</span><span><Check size={14}/> No card needed</span><span><Check size={14}/> Your work stays private</span></div></div><HeroDiscovery onContinue={continueFromPreview}/></section>
    <section className="home-audience" aria-label="Creatorly platform coverage"><p>Find creators where they already post</p><div><span>Instagram creators</span><span>YouTube creators</span><span>Facebook creators</span><span>From 1K followers</span></div></section>
    <section className="home-creators" id="for-creators" aria-labelledby="creator-path-title"><div className="creator-path-copy"><p className="eyebrow">For creators</p><h2 id="creator-path-title">Make your Creatorly profile work for you.</h2><p>Claim the profile brands already see. Show what you create, share your starting rates, and choose who receives brand enquiries.</p><ul><li><Check size={15}/> Keep your public details accurate</li><li><Check size={15}/> Help the right brands understand your work</li><li><Check size={15}/> Send opportunities to you or your manager</li></ul><button className="button button-primary" onClick={claimProfile}>Find and claim my profile <ArrowRight size={17}/></button></div><div className="creator-passport"><header><span><BadgeCheck size={18}/> Your creator profile</span><small>Owned by you</small></header><ol>{creatorSteps.map(step => <li key={step.number}><span>{step.number}</span><div><strong>{step.title}</strong><p>{step.body}</p></div></li>)}</ol><footer><span>Profile ready for brands</span><BadgeCheck size={19}/></footer></div></section>
    <section className="home-products" id="platform"><header className="home-section-head"><p className="eyebrow">How Creatorly helps</p><h2>One place for the whole campaign.</h2><p>Find the right people. Save their details. Keep the work on track. Share what happened.</p></header>{products.map(({ number, icon: Icon, name, title, body, points, visual }, index) => <article className={`home-product-row ${index % 2 ? "reverse" : ""}`} id={index === 0 ? "workflow" : undefined} key={name}><div className="home-product-copy"><span className="product-number">Step {number}</span><div className="product-name"><Icon size={18}/>{name}</div><h3>{title}</h3><p>{body}</p><ul>{points.map(point => <li key={point}><Check size={14}/>{point}</li>)}</ul></div><div className="home-product-stage"><ProductVisual type={visual} onContinue={continueFromPreview}/></div></article>)}</section>
    <section className="home-addons" id="addons"><header><div><p className="eyebrow">Coming next</p><h2>More help for busy teams.</h2></div><p>We are building these tools now. They are not available yet.</p></header><div>{addons.map(({ icon: Icon, title, body }) => <article key={title}><span><Icon size={19}/></span><div><small>Coming later</small><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
    <section className="home-final"><span><FolderKanban size={18}/> Your next campaign, without the chaos</span><h2>Find creators and keep the work moving.</h2><p>Start free. No card needed.</p><button className="button" onClick={startFree}>Start free <ArrowRight size={18}/></button></section>
    <footer className="home-footer"><Logo/><span>© 2026 Creatorly · Built for influencer teams in India</span><nav aria-label="Footer navigation"><a href="#platform">For teams</a><a href="#for-creators">For creators</a><button onClick={() => navigate({ name: "pricing" })}>Pricing</button></nav></footer>
  </main>;
}
