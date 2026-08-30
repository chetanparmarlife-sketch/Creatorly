import { CheckCircle2, XCircle } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
export function PaymentResultView({ status, navigate }: { status: "success" | "failure"; navigate(route: AppRoute): void }) {
  const success = status === "success";
  return <main className="workspace center-state-page"><section className="center-state">{success ? <CheckCircle2/> : <XCircle/>}<p className="eyebrow">Dodo Payments</p><h1>{success ? "Payment submitted" : "Checkout was not completed"}</h1><p>{success ? "Dodo is confirming the payment now. Your plan or contact credits will update after Creatorly receives the signed confirmation—usually within a few seconds." : "Your plan and credits were not changed. You can return to pricing and try again."}</p><button className="button button-primary" onClick={() => navigate(success ? { name: "pricing" } : { name: "pricing" })}>{success ? "Check billing status" : "Try again"}</button></section></main>;
}
