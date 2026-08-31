import { CheckCircle2, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AppRoute } from "../hooks/useRoute";
import { useAppData } from "../data/AppData";
import type { BillingCycle, PaidPlanTier } from "../lib/billingCatalog";

export function VerificationView({ navigate, purchase }: { navigate(route: AppRoute): void; purchase?: { tier: PaidPlanTier; billingCycle: BillingCycle } }) {
  const data = useAppData();
  const email = window.sessionStorage.getItem("creatorly.pendingVerificationEmail") ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function openSelectedCheckout() {
    if (!purchase) return;
    setBusy(true);
    setError("");
    try {
      const { checkoutUrl } = await data.createCheckout({ kind: "core_plan", ...purchase });
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start. Try again.");
      setBusy(false);
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await data.verifyEmail(email, code);
      window.sessionStorage.removeItem("creatorly.pendingVerificationEmail");
      setVerified(true);
      if (purchase) await openSelectedCheckout();
      else navigate({ name: "onboarding" });
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "The code is invalid or expired.");
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await data.resendEmailVerification(email);
      setNotice("A new six-digit code was sent.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "A new code could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (!email && !verified) {
    return <main className="center-state-page"><section className="center-state verification-state"><MailCheck/><p className="eyebrow">Email verification</p><h1>Start verification again</h1><p>Your verification session is no longer available. Return to sign in to request a new code.</p><button className="button button-primary" onClick={() => navigate({ name: "login" })}>Return to sign in</button></section></main>;
  }

  return <main className="center-state-page"><section className="center-state verification-state">
    {verified ? <CheckCircle2/> : <MailCheck/>}
    <p className="eyebrow">Secure your account</p>
    <h1>{verified ? "Email verified" : "Check your email"}</h1>
    <p>{verified
      ? purchase ? `Opening ${purchase.tier === "pro" ? "Pro" : "Basic"} checkout, billed ${purchase.billingCycle === "annual" ? "annually" : "monthly"}.` : "Your Creatorly account is ready."
      : <>We sent a six-digit verification code to <strong>{email}</strong>. It expires in 15 minutes.</>}</p>
    {!verified ? <form className="verification-form" onSubmit={verify}>
      <label htmlFor="verification-code">Verification code</label>
      <input id="verification-code" aria-label="Verification code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" autoFocus/>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="verification-notice" role="status">{notice}</p> : null}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Verifying…" : "Verify email"}</button>
      <button className="text-button" type="button" disabled={busy} onClick={() => void resend()}>Send a new code</button>
      <button className="text-button" type="button" disabled={busy} onClick={() => navigate({ name: "signup", plan: purchase?.tier, cycle: purchase?.billingCycle })}>Use a different email</button>
    </form> : purchase && error ? <><p className="form-error" role="alert">{error}</p><button className="button button-primary" disabled={busy} onClick={() => void openSelectedCheckout()}>{busy ? "Opening checkout…" : "Try checkout again"}</button></> : purchase ? <p role="status">Opening secure checkout…</p> : null}
  </section></main>;
}
