import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppRoute } from "../hooks/useRoute";
import { useAppData } from "../data/AppData";
import type { BillingCycle, PaidPlanTier } from "../lib/billingCatalog";

export function VerificationView({ navigate, purchase }: { navigate(route: AppRoute): void; purchase?: { tier: PaidPlanTier; billingCycle: BillingCycle } }) {
  const data = useAppData();
  const checkoutStarted = useRef(false);
  const [error, setError] = useState("");

  const openSelectedCheckout = useCallback(async () => {
    setError("");
    try {
      const { checkoutUrl } = await data.createCheckout({ kind: "core_plan", ...purchase! });
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start. Try again.");
    }
  }, [data, purchase]);

  useEffect(() => {
    if (!purchase || checkoutStarted.current) return;
    checkoutStarted.current = true;
    void openSelectedCheckout();
  }, [openSelectedCheckout, purchase]);

  return <main className="center-state-page"><section className="center-state"><CheckCircle2/><p className="eyebrow">Demo verification</p><h1>Email verified</h1><p>{purchase ? `Your account is ready. Opening ${purchase.tier === "pro" ? "Pro" : "Basic"} checkout, billed ${purchase.billingCycle === "annual" ? "annually" : "monthly"}.` : "Email delivery is simulated in this build, so your account is ready immediately."}</p>{error ? <><p className="form-error" role="alert">{error}</p><button className="button button-primary" onClick={() => void openSelectedCheckout()}>Try checkout again</button></> : purchase ? <p role="status">Opening secure checkout…</p> : <button className="button button-primary" onClick={() => navigate({ name: "onboarding" })}>Continue to plan selection</button>}</section></main>;
}
