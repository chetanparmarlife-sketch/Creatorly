import { CheckCircle2, XCircle } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
export function PaymentResultView({ status, navigate }: { status: "success" | "failure"; navigate(route: AppRoute): void }) {
  const success = status === "success";
  return <main className="workspace center-state-page"><section className="center-state">{success ? <CheckCircle2/> : <XCircle/>}<p className="eyebrow">DemoPay</p><h1>{success ? "Demo payment complete" : "Demo payment failed"}</h1><p>{success ? "Your plan or credits are active. This was a simulation and no money was collected." : "Nothing changed on your account. You can try the simulation again."}</p><button className="button button-primary" onClick={() => navigate(success ? { name: "search", query: "" } : { name: "pricing" })}>{success ? "Return to search" : "Try again"}</button></section></main>;
}
