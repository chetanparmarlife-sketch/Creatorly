import { MailCheck } from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";

export function isEmailVerificationRequired(error: string) {
  return error.toLowerCase().includes("verify your email first");
}

export function EmailVerificationPrompt({ error, navigate, returnTo }: {
  error: string;
  navigate(route: AppRoute): void;
  returnTo: string;
}) {
  const data = useAppData();
  if (!isEmailVerificationRequired(error)) return <p className="form-error" role="alert">{error}</p>;

  async function beginVerification() {
    const viewer = await data.getViewer().catch(() => null);
    if (viewer?.email) window.sessionStorage.setItem("creatorly.pendingVerificationEmail", viewer.email);
    window.sessionStorage.setItem("creatorly.authReturnTo", returnTo);
    navigate({ name: "verification" });
  }

  return <div className="form-error email-verification-prompt" role="alert">
    <span>{error}</span>
    <button className="text-button" type="button" onClick={() => void beginVerification()}><MailCheck size={15}/> Verify email</button>
  </div>;
}
