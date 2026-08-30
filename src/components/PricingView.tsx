import { Check, Coins, Crown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppRoute } from "../hooks/useRoute";
import type { CreditTransaction, PlanTier, Viewer } from "../types";
import { useAppData } from "../data/AppData";
import type { BillingPurchase, PaidPlanTier } from "../lib/billingCatalog";

const plans: Array<{ tier: PlanTier; price: string; credits: number; features: string[] }> = [
  { tier: "free", price: "₹0", credits: 25, features: ["5 starter unlocks", "Creator direct contacts", "Basic creator search"] },
  { tier: "basic", price: "₹1,499", credits: 100, features: ["Creatorly Discovery", "Private creator CRM", "Chrome extension", "Campaign workspace"] },
  { tier: "pro", price: "₹3,499", credits: 250, features: ["Everything in Basic", "Creator + manager contacts", "Agent and assistant contacts", "Higher contact allowance"] },
];

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
      navigate({ name: "signup" });
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
    <header className="pricing-intro">
      <div><p className="eyebrow">Core plans and contact credits</p><h1>Pay for the workspace you use.</h1><p>Core plans cover Discovery, private CRM, the extension, and campaigns. Dodo Payments handles checkout; Creatorly grants access only after a signed payment confirmation.</p></div>
      <div className="billing-toggle"><button className={!annual ? "is-active" : ""} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "is-active" : ""} onClick={() => setAnnual(true)}>Annual <small>2 months free</small></button></div>
    </header>
    {error ? <div className="form-error" role="alert">{error}</div> : null}
    {viewer ? <section className="current-plan"><div><span>Current plan</span><strong>{viewer.currentPlanTier}</strong></div><div><span>Available balance</span><strong>{viewer.creditBalance} credits</strong></div><div><span>Status</span><strong>{viewer.subscriptionStatus}</strong></div></section> : null}
    <section className="plan-grid">{plans.map((plan) => <article className={plan.tier === "pro" ? "is-featured" : ""} key={plan.tier}>
      {plan.tier === "pro" ? <span className="popular-label"><Crown size={13}/> Manager access</span> : null}
      <p className="eyebrow">{plan.tier}</p><h2>{plan.price}<small>/month</small></h2><p>{plan.credits} credits included</p>
      <ul>{plan.features.map((feature) => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
      <button className={`button ${plan.tier === "pro" ? "button-primary" : "button-secondary"} button-wide`} disabled={(viewer?.currentPlanTier === plan.tier && hasDodoCustomer) || Boolean(busyKey)} onClick={() => selectPlan(plan.tier)}>
        {viewer?.currentPlanTier === plan.tier && hasDodoCustomer ? "Current plan" : busyKey === `plan-${plan.tier}` || busyKey === "portal" ? "Opening Dodo…" : viewer ? plan.tier === "free" ? hasDodoCustomer ? "Manage in Dodo" : "Dodo not activated" : viewer.currentPlanTier === plan.tier ? `Activate ${plan.tier} in Dodo` : `Choose ${plan.tier}` : `Start with ${plan.tier}`}
      </button>
    </article>)}</section>
    {viewer ? <section className="credit-packs"><div><Coins/><p className="eyebrow">One-time top-up</p><h2>Need more verified introductions?</h2><p>Contact packs do not change your core plan.</p></div><button disabled={Boolean(busyKey)} onClick={() => void openCheckout({ kind: "contact_credits", credits: 50 }, "credits-50")}><strong>{busyKey === "credits-50" ? "Opening Dodo…" : "50 credits"}</strong><span>₹699 · 10 unlocks</span></button><button disabled={Boolean(busyKey)} onClick={() => void openCheckout({ kind: "contact_credits", credits: 100 }, "credits-100")}><strong>{busyKey === "credits-100" ? "Opening Dodo…" : "100 credits"}</strong><span>₹1,199 · 20 unlocks</span></button></section> : null}
    {viewer?.currentPlanTier !== "free" && hasDodoCustomer ? <button className="button button-secondary" disabled={Boolean(busyKey)} onClick={() => void openPortal()}><ExternalLink size={15}/> Manage subscription and invoices in Dodo</button> : null}
    {viewer?.currentPlanTier !== "free" && !hasDodoCustomer ? <p className="provider-note">Your current access predates Dodo billing. Complete a test checkout to activate subscription management and invoices.</p> : null}
    {transactions.length ? <section className="transactions"><h2>Credit activity</h2>{transactions.slice(0, 6).map((item) => <div key={item._id}><span><strong>{item.description}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></span><b className={item.amount > 0 ? "positive" : ""}>{item.amount > 0 ? "+" : ""}{item.amount}</b></div>)}</section> : null}
    <section className="future-billing"><p className="eyebrow">Future add-ons</p><h2>Inbox, AI Agents, and connected reporting</h2><p>These products are not charged yet. Pricing will be introduced only when the features and usage controls are ready.</p></section>
  </main>;
}
