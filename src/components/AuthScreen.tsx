import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { useAppData } from "../data/AppData";
import { Logo } from "./Logo";

export function AuthScreen() {
  const data = useAppData();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        await data.signUp({
          name: String(form.get("name") ?? ""),
          companyName: String(form.get("companyName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });
      } else {
        await data.signIn(
          String(form.get("email") ?? ""),
          String(form.get("password") ?? ""),
        );
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
        <Logo />
        <div className="auth-story-copy">
          <p className="eyebrow">Your creator contact desk</p>
          <h1 id="auth-title">From shortlist to the right inbox in minutes.</h1>
          <p>
            Search a creator, see who handles partnerships, and unlock the contact
            your campaign actually needs.
          </p>
        </div>
        <div className="signal-demo" aria-hidden="true">
          <span className="signal-step is-done"><Search size={16} /> Maya Kapoor</span>
          <span className="signal-line" />
          <span className="signal-step is-done"><ShieldCheck size={16} /> Match verified</span>
          <span className="signal-line" />
          <span className="signal-step is-active"><CheckCircle2 size={16} /> Contact ready</span>
        </div>
        <p className="auth-note">25 starter credits · 5 contact unlocks · no card needed</p>
      </section>

      <section className="auth-panel" aria-label={mode === "signup" ? "Create account" : "Sign in"}>
        {data.mode === "demo" ? (
          <div className="demo-banner" role="status">
            Local demo mode — data stays in this browser until Convex is connected.
          </div>
        ) : null}
        <div className="auth-form-wrap">
          <p className="eyebrow">{mode === "signup" ? "Start free" : "Welcome back"}</p>
          <h2>{mode === "signup" ? "Create your workspace" : "Sign in to Creatorly"}</h2>
          <p className="supporting-copy">
            {mode === "signup"
              ? "Get 25 credits and find your first contact."
              : "Continue where your last creator search ended."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div className="field-row">
                <label>
                  <span>Full name</span>
                  <input name="name" autoComplete="name" required placeholder="Chetan Parmar" />
                </label>
                <label>
                  <span>Agency name</span>
                  <input name="companyName" autoComplete="organization" required placeholder="Wondrlab" />
                </label>
              </div>
            ) : null}
            <label>
              <span>Work email</span>
              <input name="email" type="email" autoComplete="email" required placeholder="you@agency.com" />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required placeholder="At least 8 characters" />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-wide" disabled={busy}>
              {busy ? "Working…" : mode === "signup" ? "Create free account" : "Sign in"}
              {busy ? null : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <button className="text-button" type="button" onClick={() => {
            setMode((current) => current === "signup" ? "signin" : "signup");
            setError("");
          }}>
            {mode === "signup" ? "Already have an account? Sign in" : "New to Creatorly? Create an account"}
          </button>
        </div>
      </section>
    </main>
  );
}
