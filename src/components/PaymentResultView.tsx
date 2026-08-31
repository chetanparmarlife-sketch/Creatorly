import { CheckCircle2, XCircle } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
export function PaymentResultView({ status, onboardingCompleted, navigate }: { status: "success" | "failure"; onboardingCompleted: boolean; navigate(route: AppRoute): void }) {
  const success = status === "success";
  const successRoute: AppRoute = onboardingCompleted ? { name: "settings" } : { name: "onboarding" };
  return <main className="workspace center-state-page"><section className="center-state">{success ? <CheckCircle2/> : <XCircle/>}<p className="eyebrow">Dodo Payments</p><h1>{success ? "Payment submitted" : "Checkout was not completed"}</h1><p>{success ? "Dodo is confirming the payment now. Your plan or contact credits will update after Creatorly receives the signed confirmation—usually within a few seconds." : "Your plan and credits were not changed. You can return to pricing and try again."}</p><button className="button button-primary" onClick={() => navigate(success ? successRoute : { name: "pricing" })}>{success ? (onboardingCompleted ? "Open billing settings" : "Continue workspace setup") : "Return to pricing"}</button></section></main>;
}
