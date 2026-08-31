import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { useAppData } from "../data/AppData";
import { Logo } from "./Logo";
import type { AppRoute } from "../hooks/useRoute";
import type { BillingCycle, PaidPlanTier } from "../lib/billingCatalog";

export function AuthScreen({ initialMode = "signup", navigate, purchase, signupReason }: { initialMode?: "signup" | "signin"; navigate?(route: AppRoute): void; purchase?: { tier: PaidPlanTier; billingCycle: BillingCycle }; signupReason?: "workspace" }) {
  const data = useAppData();
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        const result = await data.signUp({
          name: String(form.get("name") ?? ""),
          companyName: String(form.get("companyName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });
        if (result.verificationRequired) {
          window.sessionStorage.setItem("creatorly.pendingVerificationEmail", result.email);
          navigate?.({ name: "verification", plan: purchase?.tier, cycle: purchase?.billingCycle });
        }
      } else {
        const result = await data.signIn(
          String(form.get("email") ?? ""),
          String(form.get("password") ?? ""),
        );
        if (result.verificationRequired) {
          window.sessionStorage.setItem("creatorly.pendingVerificationEmail", result.email);
          navigate?.({ name: "verification" });
        }
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-labelledby="auth-title">
        <button className="brand-button" onClick={() => navigate?.({ name: "landing" })}><Logo /></button>
        <div className="auth-story-copy">
          <p className="eyebrow">India-first creator workspace</p>
          <h1 id="auth-title">{mode === "signin" ? <><span>Your creator work</span> is ready.</> : <><span>Build your creator team’s</span> new home.</>}</h1>
          <p>
            {mode === "signin"
              ? "Return to your creators, contacts, and campaigns in one private workspace."
              : "Find creators across India and worldwide, then manage every relationship and campaign."}
          </p>
        </div>
        <div className="signal-demo" aria-hidden="true">
          <span className="signal-step is-done"><i>01</i><Search size={16} /><b>Find the creator</b><small>Maya Kapoor · Wellness</small></span>
          <span className="signal-line" />
          <span className="signal-step is-done"><i>02</i><ShieldCheck size={16} /><b>Match the profile</b><small>India · Instagram</small></span>
          <span className="signal-line" />
          <span className="signal-step is-active"><i>03</i><CheckCircle2 size={16} /><b>Reach the right contact</b><small>Ready for outreach</small></span>
        </div>
        <p className="auth-note"><ShieldCheck size={14}/> Private workspace data · built for Indian creator teams</p>
      </section>

      <section className="auth-panel" aria-label={mode === "signup" ? "Create account" : "Sign in"}>
        {data.mode === "demo" ? (
          <div className="demo-banner" role="status">
            Local demo mode — data stays in this browser until Convex is connected.
          </div>
        ) : null}
        <div className="auth-form-wrap">
          <button className="brand-button auth-mobile-brand" onClick={() => navigate?.({ name: "landing" })}><Logo /></button>
          <p className="eyebrow">{mode === "signup" ? "Start free" : "Sign in to your workspace"}</p>
          <h2>{mode === "signup" ? "Create your workspace" : "Welcome back"}</h2>
          <p className="supporting-copy">
            {mode === "signup"
              ? "Get 25 credits and find your first contact."
              : "Your creator work is waiting for you."}
          </p>
          {mode === "signup" && purchase ? <div className="auth-context-note"><strong>Your plan</strong><span>You’re signing up for {purchase.tier === "pro" ? "Pro" : "Basic"}, billed {purchase.billingCycle === "annual" ? "annually" : "monthly"}.</span></div> : null}
          {mode === "signup" && signupReason === "workspace" ? <div className="auth-context-note" role="status"><strong>Create a workspace to continue</strong><span>Your account keeps creator and campaign work private to your team.</span></div> : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div className="field-row">
                <label>
                  <span>Full name</span>
                  <input name="name" autoComplete="name" required placeholder="Aisha Shah" />
                </label>
                <label>
                  <span>Agency name</span>
                  <input name="companyName" autoComplete="organization" required placeholder="Northstar Agency" />
                </label>
              </div>
            ) : null}
            <label>
              <span>Work email</span>
              <input name="email" type="email" autoComplete="email" required placeholder="you@agency.com" />
            </label>
            <label>
              <span className="auth-label-row"><span>Password</span>{mode === "signin" ? <button className="forgot-link" type="button" onClick={() => setError("Password reset email is simulated in this build. Contact the workspace admin to reset access.")}>Forgot password?</button> : null}</span>
              <input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required placeholder="At least 8 characters" />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-wide" disabled={busy}>
              {busy ? "Working…" : mode === "signup" ? "Create free account" : "Sign in"}
              {busy ? null : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
          <p className="auth-security-note"><LockKeyhole size={14}/> Your workspace stays private to your team.</p>

          <button className="text-button" type="button" onClick={() => {
            setMode((current) => current === "signup" ? "signin" : "signup");
            setError("");
          }}>
            {mode === "signup" ? "Already have an account? Sign in" : "New to Creatorly? Create an account"}
          </button>
          <button className="text-button auth-home-link" type="button" onClick={() => navigate?.({ name: "landing" })}><ArrowLeft size={14}/> Back to homepage</button>
        </div>
      </section>
    </main>
  );
}
