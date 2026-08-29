import { CheckCircle2 } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
export function VerificationView({ navigate }: { navigate(route: AppRoute): void }) {
  return <main className="center-state-page"><section className="center-state"><CheckCircle2/><p className="eyebrow">Demo verification</p><h1>Email verified</h1><p>Email delivery is simulated in this build, so your account is ready immediately.</p><button className="button button-primary" onClick={() => navigate({ name: "onboarding" })}>Continue to plan selection</button></section></main>;
}
