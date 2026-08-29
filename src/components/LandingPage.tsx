import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import { Logo } from "./Logo";

const workflowSteps = [
  { number: "01", label: "Profile matched", detail: "Maya Kapoor · 842K followers", icon: Search },
  { number: "02", label: "Role confirmed", detail: "Manager · Brand partnerships", icon: UserRoundCheck },
  { number: "03", label: "Contact ready", detail: "Verified and available to unlock", icon: Mail },
] as const;

const benefits = [
  {
    icon: Search,
    title: "Search the shortlist you already have",
    body: "Find creators by name, handle, platform, category, audience size, or location.",
  },
  {
    icon: ShieldCheck,
    title: "See the role before you unlock",
    body: "Know whether you are reaching the creator, manager, agent, assistant, or PR team.",
  },
  {
    icon: Clock3,
    title: "Come back without paying twice",
    body: "Every unlocked contact stays available in your workspace for 30 days.",
  },
] as const;

export function LandingPage({ navigate }: { navigate(route: AppRoute): void }) {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <button onClick={() => navigate({ name: "pricing" })}>Pricing</button>
        </nav>
        <div className="landing-nav-actions">
          <button className="text-button" onClick={() => navigate({ name: "login" })}>Sign in</button>
          <button className="button button-primary" onClick={() => navigate({ name: "signup" })}>Find a contact</button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">Creator contacts, without the guesswork</p>
          <h1>Go from shortlist to the right inbox in 5 minutes.</h1>
          <p>
            Search 17,709 creator profiles, see who handles partnerships, and
            unlock a verified contact with the role and context your outreach needs.
          </p>
          <div className="landing-actions">
            <button className="button button-primary button-large" onClick={() => navigate({ name: "signup" })}>
              Find my first contact <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a className="button button-secondary button-large" href="#how-it-works">See how it works</a>
          </div>
          <div className="landing-assurances" aria-label="Free account details">
            <span><Check size={14} aria-hidden="true" /> 25 credits included</span>
            <span><Check size={14} aria-hidden="true" /> No card needed</span>
            <span><Check size={14} aria-hidden="true" /> 5 free unlocks</span>
          </div>
        </div>

        <div className="landing-signal" aria-label="Creatorly contact workflow preview">
          <div className="landing-signal-head">
            <span>Contact path</span>
            <small><i /> Live repository</small>
          </div>
          <div className="signal-search">
            <Search size={18} aria-hidden="true" />
            <span>@maya_creates</span>
            <kbd>Matched</kbd>
          </div>
          <div className="landing-workflow">
            {workflowSteps.map(({ number, label, detail, icon: Icon }) => (
              <div className="landing-workflow-step" key={number}>
                <span className="workflow-number">{number}</span>
                <span className="workflow-icon"><Icon size={16} aria-hidden="true" /></span>
                <span className="workflow-copy"><strong>{label}</strong><small>{detail}</small></span>
                <CheckCircle2 size={17} aria-hidden="true" />
              </div>
            ))}
          </div>
          <div className="landing-contact">
            <div className="landing-contact-head">
              <p><BadgeCheck size={15} aria-hidden="true" /> VERIFIED CONTACT</p>
              <span>PRO ACCESS</span>
            </div>
            <strong>Rhea Malhotra</strong>
            <span>Manager · Brand partnerships</span>
            <i><Mail size={15} aria-hidden="true" /> rhea.manager@example.test</i>
          </div>
        </div>
      </section>

      <section className="landing-problem" aria-label="Why Creatorly">
        <div className="landing-problem-copy">
          <p className="eyebrow">The outreach gap</p>
          <h2>A creator profile tells you who they are. It rarely tells you who handles the deal.</h2>
        </div>
        <div className="landing-proof-card">
          <span className="landing-proof-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div>
            <strong>Creatorly adds the missing context.</strong>
            <p>Contact role, verification state, access tier, and notes appear before you start writing the email.</p>
          </div>
        </div>
      </section>

      <section className="landing-process" id="how-it-works">
        <header>
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Three clear steps. No tab archaeology.</h2>
          </div>
          <p>Start from a creator name or profile. Finish with the contact responsible for partnerships.</p>
        </header>
        <div className="landing-features">
          {benefits.map(({ icon: Icon, title, body }, index) => (
            <article key={title}>
              <span className="landing-feature-number">0{index + 1}</span>
              <Icon size={20} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <span><BadgeCheck size={17} aria-hidden="true" /> 17,709 creator profiles ready to search</span>
        <h2>Your shortlist is ready. Find the person behind it.</h2>
        <p>Create a free workspace with 25 credits and unlock up to five contacts.</p>
        <button className="button button-primary button-large" onClick={() => navigate({ name: "signup" })}>
          Find my first contact <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>

      <footer className="landing-footer">
        <Logo />
        <span>© 2026 Creatorly · Demo environment</span>
        <nav aria-label="Footer navigation">
          <a href="#how-it-works">How it works</a>
          <button onClick={() => navigate({ name: "pricing" })}>Pricing</button>
        </nav>
      </footer>
    </main>
  );
}
