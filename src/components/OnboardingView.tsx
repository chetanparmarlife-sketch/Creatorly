import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Search } from "lucide-react";
import type { AppRoute } from "../hooks/useRoute";
import type { Viewer, WorkspaceKind, WorkspaceRole } from "../types";
import { useAppData } from "../data/AppData";
import { useWorkspaceData } from "../features/workspace/WorkspaceData";

const goals = ["Discover creators", "Manage campaigns", "Centralize outreach", "Report results"];

export function OnboardingView({ viewer, navigate, refresh }: { viewer: Viewer; navigate(route: AppRoute): void; refresh(): Promise<void> }) {
  const data = useAppData();
  const workspaceData = useWorkspaceData();
  const [step, setStep] = useState<1 | 2 | 3>(Math.min(viewer.onboardingStep ?? 1, 3) as 1 | 2 | 3);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [kind, setKind] = useState<WorkspaceKind>("agency");
  const [workspaceName, setWorkspaceName] = useState(viewer.companyName);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["Discover creators", "Manage campaigns"]);
  const [role, setRole] = useState<WorkspaceRole>("manager");
  const [firstAction, setFirstAction] = useState<"discover" | "campaigns">("discover");
  const labels = ["Workspace", "Goals", "First result"];
  async function go(next: 1 | 2 | 3) {
    setStep(next);
    setSaveError("");
    setSaving(true);
    try {
      await data.updateOnboardingStep(next);
    } catch {
      setSaveError("Your progress could not sync, but you can keep going. Opening the workspace will try again.");
    } finally {
      setSaving(false);
    }
  }
  async function finish() {
    setSaveError("");
    setSaving(true);
    try {
      await workspaceData.completeWorkspaceOnboarding({
        name: workspaceName,
        kind,
        role,
        goals: selectedGoals,
      });
      await refresh();
      navigate({ name: firstAction });
    } catch {
      setSaveError("We could not open your workspace yet. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  function toggleGoal(goal: string) { setSelectedGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal]); }

  return <main className="onboarding-page workspace-onboarding"><header><strong>Creatorly</strong><span>Step {step} of 3</span></header><div className="onboarding-progress"><i style={{ width: `${step * (100 / 3)}%` }}/></div><div className="onboarding-layout"><aside><p className="eyebrow">Workspace setup</p><h2>Build the operating system around your creator team.</h2><ol>{labels.map((label, index) => <li className={index + 1 === step ? "is-current" : index + 1 < step ? "is-done" : ""} key={label}><span>{index + 1 < step ? <Check size={13}/> : index + 1}</span>{label}</li>)}</ol></aside><section className="onboarding-workarea">
    {step === 1 ? <div><span className="onboarding-glyph"><Building2/></span><p className="eyebrow">Your workspace</p><h1>Who is running creator campaigns?</h1><p>This sets the language and structure your team will see.</p><div className="choice-grid">{(["agency","brand","talent"] as WorkspaceKind[]).map(item => <button className={kind === item ? "is-selected" : ""} onClick={() => setKind(item)} key={item}><strong>{item === "talent" ? "Talent team" : item}</strong><span>{item === "agency" ? "Manage campaigns across clients" : item === "brand" ? "Run partnerships for one brand" : "Represent a creator roster"}</span></button>)}</div><div className="onboarding-form-grid"><label className="onboarding-field">Workspace name<input value={workspaceName} onChange={event => setWorkspaceName(event.target.value)} required/></label><label>Your day-to-day role<select value={role} onChange={event => setRole(event.target.value as WorkspaceRole)}><option value="owner">Owner</option><option value="admin">Admin</option><option value="manager">Campaign manager</option><option value="contributor">Contributor</option><option value="reviewer">Reviewer</option></select></label></div></div> : null}
    {step === 2 ? <div><span className="onboarding-glyph"><Search/></span><p className="eyebrow">Your goals</p><h1>What should Creatorly help your team accomplish?</h1><p>Choose every workflow you want ready in the workspace.</p><div className="goal-grid">{goals.map(goal => <button className={selectedGoals.includes(goal) ? "is-selected" : ""} onClick={() => toggleGoal(goal)} key={goal}>{selectedGoals.includes(goal) ? <Check size={16}/> : <span/>}{goal}</button>)}</div></div> : null}
    {step === 3 ? <div><span className="onboarding-glyph"><ArrowRight/></span><p className="eyebrow">First result</p><h1>Where should we take you first?</h1><p>Your workspace is ready. Start with the action that creates value now.</p><div className="choice-grid first-action-grid"><button className={firstAction === "discover" ? "is-selected" : ""} onClick={() => setFirstAction("discover")}><Search/><strong>Discover creators</strong><span>Search the database and save a shortlist</span></button><button className={firstAction === "campaigns" ? "is-selected" : ""} onClick={() => setFirstAction("campaigns")}><Building2/><strong>Create a campaign</strong><span>Start the brief and add creators later</span></button></div></div> : null}
    {saveError ? <p className="onboarding-save-error" role="alert">{saveError}</p> : null}
    <footer>{step > 1 ? <button className="button button-secondary" disabled={saving} onClick={() => void go((step - 1) as 1 | 2)}><ArrowLeft size={16}/> Back</button> : <span/>}{step < 3 ? <button className="button button-primary" disabled={saving || (step === 1 && !workspaceName.trim()) || (step === 2 && !selectedGoals.length)} onClick={() => void go((step + 1) as 2 | 3)}>{saving ? "Saving…" : "Continue"} {saving ? null : <ArrowRight size={16}/>}</button> : <button className="button button-primary" disabled={saving} onClick={() => void finish()}>{saving ? "Saving…" : "Open workspace"} {saving ? null : <ArrowRight size={16}/>}</button>}</footer>
  </section></div></main>;
}
