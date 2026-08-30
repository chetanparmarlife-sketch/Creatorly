import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bot, Check, CheckCircle2, Globe2,
  Clock3, Mail, Search, ShieldCheck, Sparkles, UserRoundSearch,
} from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import { Logo } from "./Logo";
import "./LandingPage.css";

const agents = [
  { icon: Search, name: "Discovery Agent", detail: "Builds the right creator shortlist", status: "Searching" },
  { icon: UserRoundSearch, name: "Contact Agent", detail: "Finds who handles the deal", status: "Matched" },
  { icon: Globe2, name: "Browser Agent", detail: "Works where your team researches", status: "Ready" },
  { icon: ShieldCheck, name: "Verification Agent", detail: "Keeps contact evidence current", status: "VERIFICATION IN PROGRESS" },
] as const;

const capabilities = [
  { icon: Search, title: "Creator discovery", body: "Search by handle, category, platform, audience size, location, and verification state." },
  { icon: Mail, title: "Decision-maker contacts", body: "See the creator, manager, agent, assistant, or PR contact responsible for partnerships." },
  { icon: Globe2, title: "In-browser research", body: "Open Creatorly from creator profiles and unlock contacts without losing your research flow." },
  { icon: ShieldCheck, title: "Evidence and review", body: "Track verification state, report wrong contacts, and route issues into an admin review queue." },
] as const;

export function LandingPage({ navigate }: { navigate(route: AppRoute): void }) {
  const startFree = () => navigate({ name: "signup" });

  return (
    <main className="home-page">
      <header className="home-nav">
        <Logo />
        <nav aria-label="Landing navigation">
          <a href="#agents">AI agents</a><a href="#platform">Platform</a>
          <button onClick={() => navigate({ name: "pricing" })}>Pricing</button>
        </nav>
        <div className="home-nav-actions">
          <button className="text-button" onClick={() => navigate({ name: "login" })}>Log in</button>
          <button className="button button-primary" onClick={startFree}>Start free</button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-kicker"><Sparkles size={14} /> AI agents for creator partnerships</p>
          <h1 id="home-title">Your next creator campaign starts with a team of agents.</h1>
          <p>Creatorly helps agencies and brands find creators, identify the right partnership contact, and keep every unlock organized in one workspace.</p>
        </div>
        <div className="home-command" aria-label="Creatorly agent command center preview">
          <div className="home-command-topbar"><span><i /> Creatorly command center</span><small>4 agents online</small></div>
          <div className="home-prompt">
            <div><span>Ask Creatorly</span><strong>Find verified wellness creators in Mumbai and show me who handles brand partnerships.</strong></div>
            <button onClick={startFree} aria-label="Run this agent workflow"><ArrowUpRight size={20} /></button>
          </div>
          <div className="home-prompt-chips"><span>Build a creator shortlist</span><span>Find partnership contacts</span><span>Review contact evidence</span></div>
          <div className="home-agent-rail">
            {agents.map(({ icon: Icon, name, detail, status }) => (
              <article key={name}><span className="home-agent-icon"><Icon size={18} /></span><div><strong>{name}</strong><small>{detail}</small></div><span className="home-agent-status"><CheckCircle2 size={12} /> {status}</span></article>
            ))}
          </div>
        </div>
        <button className="button home-hero-cta" onClick={startFree}>Launch your first agent <ArrowRight size={18} /></button>
        <div className="home-trust"><span><Check size={14} /> 25 credits included</span><span><Check size={14} /> No card needed</span><span><Check size={14} /> 5 free contact unlocks</span></div>
      </section>

      <section className="home-audience" aria-label="Built for creator partnership teams">
        <p>Built for teams running creator partnerships</p>
        <div><span>Creative agencies</span><span>Influencer teams</span><span>Consumer brands</span><span>Talent partners</span></div>
      </section>

      <section className="home-platform" id="agents">
        <header className="home-section-head"><p className="eyebrow">One connected workflow</p><h2>Four agents. One campaign-ready answer.</h2><p>Each agent handles a specific part of creator research, then passes the useful context to the next.</p></header>

        <article className="home-showcase">
          <header><span className="home-showcase-icon"><Search size={20} /></span><p className="eyebrow">Discovery Agent</p><h3>Turn a campaign brief into a focused creator shortlist.</h3><p>Search 17,709 profiles by platform, category, audience size, location, and verification.</p></header>
          <div className="home-product-stage">
            <div className="home-product-window">
              <div className="home-window-bar"><span /><span /><span /><small>Creator search</small></div>
              <div className="home-search-console"><Search size={18} /><strong>wellness creators in Mumbai</strong><kbd>⌘ K</kbd></div>
              <div className="home-filter-row"><span>Instagram</span><span>Wellness</span><span>100K–1M</span><span className="is-active">Verified only</span></div>
              <div className="home-result-list">
                <article><i>MK</i><div><strong>Maya Kapoor</strong><small>@maya_creates · Wellness</small></div><span>842K</span><em>3 contacts</em></article>
                <article><i>AM</i><div><strong>Aanchal Mehta</strong><small>@aanchal.moves · Fitness</small></div><span>416K</span><em>2 contacts</em></article>
                <article><i>NK</i><div><strong>Noor Khan</strong><small>@noortravels · Lifestyle</small></div><span>291K</span><em>1 contact</em></article>
              </div>
            </div>
          </div>
        </article>

        <article className="home-showcase">
          <header><span className="home-showcase-icon"><UserRoundSearch size={20} /></span><p className="eyebrow">Contact Agent</p><h3>Know who handles the deal before you write the email.</h3><p>See the person, role, verification state, access tier, and outreach context before spending a credit.</p></header>
          <div className="home-product-stage home-stage-contact">
            <div className="home-contact-map">
              <div className="home-creator-node"><span>MK</span><div><strong>Maya Kapoor</strong><small>@maya_creates · 842K</small></div><BadgeCheck size={18} /></div>
              <div className="home-route-line"><i /><i /><i /></div>
              <div className="home-contact-result">
                <div><span><BadgeCheck size={14} /> Verified contact</span><em>PRO ACCESS</em></div><strong>Rhea Malhotra</strong><small>Manager · Brand partnerships</small>
                <p><Mail size={16} /> rhea.manager@example.test</p><footer><Clock3 size={14} /> Verified 6 days ago · Handles long-term partnerships</footer>
              </div>
            </div>
          </div>
        </article>

        <article className="home-showcase" id="platform">
          <header><span className="home-showcase-icon"><Globe2 size={20} /></span><p className="eyebrow">Browser + Verification Agents</p><h3>Research in the browser. Send uncertain data to review.</h3><p>Open the extension on a creator profile, unlock the right contact, and report stale evidence without switching tools.</p></header>
          <div className="home-product-stage home-stage-browser">
            <div className="home-browser-window">
              <div className="home-browser-bar"><span /><span /><span /><div>instagram.com/maya_creates</div></div>
              <div className="home-browser-profile"><i>MK</i><div><strong>Maya Kapoor</strong><small>Creator · Wellness · Mumbai</small></div></div>
              <aside>
                <div className="home-extension-head"><Logo /><em>Connected</em></div><p className="eyebrow">Profile matched</p><h4>Maya Kapoor</h4><small>@maya_creates · 842K followers</small>
                <div className="home-extension-contact"><Mail size={16} /><div><strong>Manager contact available</strong><small>Verified 6 days ago</small></div></div>
                <button onClick={startFree}>Unlock for 5 credits</button><span><ShieldCheck size={13} /> Evidence tracked in your workspace</span>
              </aside>
            </div>
          </div>
        </article>
      </section>

      <section className="home-capabilities">
        <header className="home-section-head"><p className="eyebrow">Built for operational teams</p><h2>Everything your agency needs after the shortlist.</h2></header>
        <div className="home-capability-grid">
          {capabilities.map(({ icon: Icon, title, body }) => <article key={title}><Icon size={21} /><h3>{title}</h3><p>{body}</p><span>Included <ArrowUpRight size={14} /></span></article>)}
        </div>
      </section>

      <section className="home-final"><span><Bot size={18} /> Your agent team is ready</span><h2>Give Creatorly a campaign brief. Get the people who can move it forward.</h2><p>Create a free workspace with 25 credits and unlock up to five verified contacts.</p><button className="button" onClick={startFree}>Launch your first agent <ArrowRight size={18} /></button></section>
      <footer className="home-footer"><Logo /><span>© 2026 Creatorly · AI agents for creator partnerships</span><nav aria-label="Footer navigation"><a href="#agents">AI agents</a><button onClick={() => navigate({ name: "pricing" })}>Pricing</button></nav></footer>
    </main>
  );
}
