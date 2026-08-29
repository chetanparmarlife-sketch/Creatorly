import { useState } from "react";
import { ArrowRight, Check, Puzzle } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import type { PlanTier, Viewer } from "../types";
import { useAppData } from "../data/AppData";

export function OnboardingView({ viewer, navigate, refresh }: { viewer: Viewer; navigate(route: AppRoute): void; refresh(): void }) {
  const data = useAppData();
  const [step, setStep] = useState(1);
  const [tier, setTier] = useState<PlanTier>(viewer.currentPlanTier);
  const steps = ["Account", "Plan", "DemoPay", "Extension"];
  async function finish() { await data.completeOnboarding(); refresh(); navigate({ name: "search", query: "" }); }
  return <main className="onboarding-page"><div className="onboarding-card">
    <div className="stepper">{steps.map((label, index) => <span className={index + 1 <= step ? "is-active" : ""} key={label}><i>{index + 1 < step ? <Check size={13}/> : index + 1}</i>{label}</span>)}</div>
    {step === 1 ? <section><p className="eyebrow">Account ready</p><h1>Welcome, {viewer.name.split(" ")[0]}.</h1><p>Your email is verified in this demo environment. You have 25 starter credits.</p><button className="button button-primary" onClick={() => setStep(2)}>Choose a plan <ArrowRight size={17}/></button></section> : null}
    {step === 2 ? <section><p className="eyebrow">Choose access</p><h1>Who do you need to reach?</h1><div className="mini-plans">{(["free","basic","pro"] as PlanTier[]).map(item => <button className={tier === item ? "is-selected" : ""} onClick={() => setTier(item)} key={item}><strong>{item}</strong><span>{item === "pro" ? "Creators + managers" : "Creator contacts"}</span></button>)}</div><button className="button button-primary" onClick={() => tier === "free" ? setStep(4) : setStep(3)}>{tier === "free" ? "Continue free" : "Continue to DemoPay"}</button></section> : null}
    {step === 3 ? <section><p className="eyebrow">DemoPay</p><h1>No real charge will be made.</h1><p>This build uses a mock payment partner. Confirming adds plan credits to your account for product testing.</p><button className="button button-primary" onClick={async () => { await data.changePlan(tier, "monthly", `demo_onboard_${Date.now()}`); refresh(); setStep(4); }}>Confirm demo payment</button><button className="text-button" onClick={() => setStep(2)}>Back</button></section> : null}
    {step === 4 ? <section><span className="onboarding-icon"><Puzzle/></span><p className="eyebrow">Browser companion</p><h1>Find contacts while you browse.</h1><p>Install the unpacked Chrome extension from the repository, or continue to the dashboard now.</p><div className="onboarding-actions"><a className="button button-secondary" href="https://github.com/chetanparmarlife-sketch/Creatorly/tree/main/extension" target="_blank" rel="noreferrer">Extension instructions</a><button className="button button-primary" onClick={finish}>Open dashboard</button></div></section> : null}
  </div></main>;
}
