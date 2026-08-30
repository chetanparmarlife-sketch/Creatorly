import { Check, Coins, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppRoute } from "../hooks/useRoute";
import type { CreditTransaction, PlanTier, Viewer } from "../types";
import { useAppData } from "../data/AppData";
import { DemoCheckout } from "./DemoCheckout";

type Purchase = { kind: "plan"; tier: PlanTier; amount: string } | { kind: "credits"; credits: 50 | 100; amount: string };
const plans: Array<{ tier: PlanTier; price: string; credits: number; features: string[] }> = [
  { tier: "free", price: "₹0", credits: 25, features: ["5 starter unlocks", "Creator direct contacts", "Basic creator search"] },
  { tier: "basic", price: "₹1,499", credits: 100, features: ["100 plan credits", "Creator direct contacts", "Full search filters"] },
  { tier: "pro", price: "₹3,499", credits: 250, features: ["250 plan credits", "Creator + manager contacts", "Agent and assistant contacts"] },
];
export function PricingView({ viewer, navigate, refresh }: { viewer?: Viewer | null; navigate(route: AppRoute): void; refresh(): void }) {
  const data = useAppData(); const [annual, setAnnual] = useState(false); const [purchase, setPurchase] = useState<Purchase | null>(null); const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  useEffect(() => { if (viewer) data.listTransactions().then(setTransactions); }, [data, viewer]);
  async function confirm() { if (!purchase) return; const paymentId = `demopay_${Date.now()}`; if (purchase.kind === "plan") await data.changePlan(purchase.tier, annual ? "annual" : "monthly", paymentId); else await data.purchaseCredits(purchase.credits, paymentId); refresh(); navigate({ name: "payment", status: "success" }); }
  return <main className="workspace pricing-workspace"><header className="pricing-intro"><div><p className="eyebrow">Plans and credits</p><h1>Pay for the access you need.</h1><p>Imported contacts remain unavailable while verification is in progress and never cost credits. DemoPay simulates checkout; no real payment is collected.</p></div><div className="billing-toggle"><button className={!annual ? "is-active" : ""} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "is-active" : ""} onClick={() => setAnnual(true)}>Annual <small>2 months free</small></button></div></header>
    {viewer ? <section className="current-plan"><div><span>Current plan</span><strong>{viewer.currentPlanTier}</strong></div><div><span>Available balance</span><strong>{viewer.creditBalance} credits</strong></div><div><span>Status</span><strong>{viewer.subscriptionStatus}</strong></div></section> : null}
    <section className="plan-grid">{plans.map(plan => <article className={plan.tier === "pro" ? "is-featured" : ""} key={plan.tier}>{plan.tier === "pro" ? <span className="popular-label"><Crown size={13}/> Manager access</span> : null}<p className="eyebrow">{plan.tier}</p><h2>{plan.price}<small>/month</small></h2><p>{plan.credits} credits included</p><ul>{plan.features.map(f => <li key={f}><Check size={15}/>{f}</li>)}</ul><button className={`button ${plan.tier === "pro" ? "button-primary" : "button-secondary"} button-wide`} disabled={viewer?.currentPlanTier === plan.tier} onClick={() => viewer ? setPurchase({ kind: "plan", tier: plan.tier, amount: plan.price }) : navigate({ name: "signup" })}>{viewer?.currentPlanTier === plan.tier ? "Current plan" : viewer ? plan.tier === "free" ? "Switch to Free" : `Choose ${plan.tier}` : `Start with ${plan.tier}`}</button></article>)}</section>
    {viewer ? <section className="credit-packs"><div><Coins/><p className="eyebrow">One-time top-up</p><h2>Need a few more introductions?</h2><p>Credit packs do not change your plan.</p></div><button onClick={() => setPurchase({ kind: "credits", credits: 50, amount: "₹699" })}><strong>50 credits</strong><span>₹699 · 10 unlocks</span></button><button onClick={() => setPurchase({ kind: "credits", credits: 100, amount: "₹1,199" })}><strong>100 credits</strong><span>₹1,199 · 20 unlocks</span></button></section> : null}
    {transactions.length ? <section className="transactions"><h2>Credit activity</h2>{transactions.slice(0,6).map(item => <div key={item._id}><span><strong>{item.description}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></span><b className={item.amount > 0 ? "positive" : ""}>{item.amount > 0 ? "+" : ""}{item.amount}</b></div>)}</section> : null}
    {purchase ? <DemoCheckout title={purchase.kind === "plan" ? `${purchase.tier} plan` : `${purchase.credits}-credit pack`} detail={purchase.kind === "plan" ? "Activates the plan and adds its included credits immediately." : "Adds credits without changing your current plan."} amount={purchase.amount} onClose={() => setPurchase(null)} onConfirm={confirm}/> : null}
  </main>;
}
