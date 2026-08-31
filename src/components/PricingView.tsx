import { ArrowRight, Check, Clock3, Coins, Crown, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppRoute } from "../hooks/useRoute";
import type { CreditTransaction, PlanTier, Viewer } from "../types";
import { useAppData } from "../data/AppData";
import type { BillingPurchase, PaidPlanTier } from "../lib/billingCatalog";
import { CONTACT_ACCESS_WINDOW_DAYS, CONTACT_UNLOCK_COST } from "../../convex/lib/creditPolicy";
import { Logo } from "./Logo";
import { EmailVerificationPrompt } from "./EmailVerificationPrompt";

const plans: Array<{ tier: PlanTier; monthlyPrice: number; credits: number; audience: string; description: string; features: string[] }> = [
  { tier: "free", monthlyPrice: 0, credits: 25, audience: "Explore Creatorly", description: "Search the database and unlock your first direct creator contacts.", features: ["Basic creator search", "Creator direct contacts", "Private creator workspace"] },
  { tier: "basic", monthlyPrice: 1499, credits: 100, audience: "Run active campaigns", description: "Use the complete workflow from creator discovery to campaign reporting.", features: ["Creatorly Discovery", "Private creator CRM", "Chrome extension", "Campaign workspace"] },
  { tier: "pro", monthlyPrice: 3499, credits: 250, audience: "Reach every contact route", description: "Add manager, agent, and assistant contacts when direct creator access is not enough.", features: ["Everything in Basic", "Creator + manager contacts", "Agent and assistant contacts", "Priority contact allowance"] },
];

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function formatRupees(amount: number) {
  return `₹${rupeeFormatter.format(amount)}`;
}

export function PricingView({ viewer, navigate }: { viewer?: Viewer | null; navigate(route: AppRoute): void; refresh(): void }) {
  const data = useAppData();
  const hasDodoCustomer = Boolean(viewer?.hasDodoCustomer);
  const [annual, setAnnual] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    if (viewer) data.listTransactions().then(setTransactions);
  }, [data, viewer]);

  async function openCheckout(purchase: BillingPurchase, key: string) {
    setBusyKey(key);
    setError("");
    try {
      const { checkoutUrl } = await data.createCheckout(purchase);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Dodo checkout could not start.");
      setBusyKey("");
    }
  }

  async function openPortal() {
    setBusyKey("portal");
    setError("");
    try {
      const { portalUrl } = await data.createCustomerPortal();
      window.location.assign(portalUrl);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Dodo billing management could not open.");
      setBusyKey("");
    }
  }

  function selectPlan(tier: PlanTier) {
    if (!viewer) {
      navigate(tier === "free" ? { name: "signup" } : { name: "signup", plan: tier as PaidPlanTier, cycle: annual ? "annual" : "monthly" });
      return;
    }
    if (tier === "free") {
      if (!hasDodoCustomer) {
        setError("Complete a Dodo checkout before managing or changing a subscription.");
        return;
      }
      void openPortal();
      return;
    }
    const purchase: BillingPurchase = { kind: "core_plan", tier: tier as PaidPlanTier, billingCycle: annual ? "annual" : "monthly" };
    void openCheckout(purchase, `plan-${tier}`);
  }

  return <main className="workspace pricing-workspace">
    {!viewer ? <nav className="pricing-public-nav" aria-label="Pricing navigation">
      <button className="brand-button" type="button" onClick={() => navigate({ name: "landing" })} aria-label="Go to Creatorly home"><Logo /></button>
      <button className="text-button" type="button" onClick={() => navigate({ name: "login" })}>Log in</button>
    </nav> : null}
    <header className="pricing-intro">
      <div><p className="eyebrow">Creatorly pricing</p><h1>Choose the access your team needs.</h1><p>Start free, use Basic for the full campaign workflow, or choose Pro when you need managers and agents.</p></div>
      <div className="billing-toggle" aria-label="Billing cycle"><button className={!annual ? "is-active" : ""} aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "is-active" : ""} aria-pressed={annual} onClick={() => setAnnual(true)}>Annual <small>2 months free</small></button></div>
    </header>
    {error ? <EmailVerificationPrompt error={error} navigate={navigate} returnTo="/pricing"/> : null}
    {viewer ? <section className="current-plan"><div><span>Current plan</span><strong>{viewer.currentPlanTier}</strong></div><div><span>Available balance</span><strong>{viewer.creditBalance} credits</strong></div><div><span>Status</span><strong>{viewer.subscriptionStatus}</strong></div></section> : null}
    <section className="plan-grid">{plans.map((plan) => {
      const annualTotal = plan.monthlyPrice * 10;
      const headlinePrice = annual && plan.monthlyPrice > 0 ? annualTotal / 12 : plan.monthlyPrice;
      const unlocks = plan.credits / CONTACT_UNLOCK_COST;
      return <article className={`plan-card ${plan.tier === "pro" ? "is-featured" : ""}`} key={plan.tier}>
        <header className="plan-card-head">
          <div><p className="eyebrow">{plan.tier}</p><span>{plan.audience}</span></div>
          {plan.tier === "pro" ? <span className="popular-label"><Crown size={13}/> Manager access</span> : null}
        </header>
        <p className="plan-description">{plan.description}</p>
        <div className="plan-price"><h2>{formatRupees(headlinePrice)}<small>{annual && plan.monthlyPrice > 0 ? "/month equivalent" : "/month"}</small></h2></div>
        {annual && plan.monthlyPrice > 0 ? <p className="plan-billing-detail">billed annually {formatRupees(annualTotal)} <span>Save {formatRupees(plan.monthlyPrice * 2)}</span></p> : <p className="plan-billing-detail plan-billing-placeholder">{plan.tier === "free" ? "No card required" : "Billed monthly"}</p>}
        <div className="plan-credit-summary"><span><Coins size={17}/><strong>{plan.credits} credits</strong></span><span><strong>{unlocks}</strong> contact unlocks</span></div>
        <div className="plan-includes"><small>What’s included</small><ul>{plan.features.map((feature) => <li key={feature}><Check size={15}/>{feature}</li>)}</ul></div>
        <button className={`button ${plan.tier === "pro" ? "button-primary" : "button-secondary"} button-wide`} disabled={(viewer?.currentPlanTier === plan.tier && hasDodoCustomer) || Boolean(busyKey)} onClick={() => selectPlan(plan.tier)}>
          {viewer?.currentPlanTier === plan.tier && hasDodoCustomer ? "Current plan" : busyKey === `plan-${plan.tier}` || busyKey === "portal" ? "Opening Dodo…" : viewer ? plan.tier === "free" ? hasDodoCustomer ? "Manage in Dodo" : "Dodo not activated" : viewer.currentPlanTier === plan.tier ? `Activate ${plan.tier} in Dodo` : `Choose ${plan.tier}` : `Start with ${plan.tier}`} {busyKey || (viewer?.currentPlanTier === plan.tier && hasDodoCustomer) ? null : <ArrowRight size={16} />}
        </button>
        <small className="plan-checkout-note">{plan.tier === "free" ? "Create your workspace in minutes" : "Secure checkout and billing by Dodo"}</small>
      </article>;
    })}</section>
    <section className="pricing-credit-guide">
      <div><span className="pricing-guide-icon"><Coins size={20}/></span><p className="eyebrow">How credits work</p><h2>One unlock. {CONTACT_UNLOCK_COST} credits. {CONTACT_ACCESS_WINDOW_DAYS} days of access.</h2><p>Unlock a contact once, then reopen it for {CONTACT_ACCESS_WINDOW_DAYS} days without spending more credits.</p></div>
      <dl><div><dt><ShieldCheck size={17}/> Clear access</dt><dd>Every plan shows exactly which contact roles it can unlock.</dd></div><div><dt><Clock3 size={17}/> Time to work</dt><dd>Use the contact details throughout the {CONTACT_ACCESS_WINDOW_DAYS}-day access window.</dd></div><div><dt><Coins size={17}/> Add more later</dt><dd>Top up with a credit pack without changing your plan.</dd></div></dl>
    </section>
    {viewer ? <section className="credit-packs"><div><Coins/><p className="eyebrow">One-time top-up</p><h2>Need more contacts?</h2><p>Add credits without changing your plan.</p></div><button disabled={Boolean(busyKey)} onClick={() => void openCheckout({ kind: "contact_credits", credits: 50 }, "credits-50")}><strong>{busyKey === "credits-50" ? "Opening Dodo…" : "50 credits"}</strong><span>₹699 · 10 unlocks</span></button><button disabled={Boolean(busyKey)} onClick={() => void openCheckout({ kind: "contact_credits", credits: 100 }, "credits-100")}><strong>{busyKey === "credits-100" ? "Opening Dodo…" : "100 credits"}</strong><span>₹1,199 · 20 unlocks</span></button></section> : null}
    {viewer?.currentPlanTier !== "free" && hasDodoCustomer ? <button className="button button-secondary" disabled={Boolean(busyKey)} onClick={() => void openPortal()}><ExternalLink size={15}/> Manage subscription and invoices in Dodo</button> : null}
    {transactions.length ? <section className="transactions"><h2>Credit activity</h2>{transactions.slice(0, 6).map((item) => <div key={item._id}><span><strong>{item.description}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></span><b className={item.amount > 0 ? "positive" : ""}>{item.amount > 0 ? "+" : ""}{item.amount}</b></div>)}</section> : null}
  </main>;
}
