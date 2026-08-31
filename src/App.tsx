import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useAppData } from "./data/AppData";
import { useRoute } from "./hooks/useRoute";
import type { Viewer } from "./types";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { CreatorDetail } from "./components/CreatorDetail";
import { HistoryView } from "./components/HistoryView";
import { LandingPage } from "./components/LandingPage";
import { OnboardingView } from "./components/OnboardingView";
import { PaymentResultView } from "./components/PaymentResultView";
import { PricingView } from "./components/PricingView";
import { SettingsView } from "./components/SettingsView";
import { VerificationView } from "./components/VerificationView";
import { CampaignDetailWorkspace, CampaignsWorkspace, CreatorsWorkspace, DiscoveryWorkspace } from "./features/workspace/WorkspaceViews";
import { useWorkspaceData } from "./features/workspace/WorkspaceData";
import type { WorkspaceSummary } from "./types";

const AdminView = lazy(() => import("./components/AdminView").then((module) => ({ default: module.AdminView })));

export function App() {
  const data = useAppData();
  const { route, navigate } = useRoute();
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const workspaceData = useWorkspaceData();

  const loadViewer = useCallback(async () => {
    setViewer(await data.getViewer());
  }, [data]);

  useEffect(() => {
    let active = true;
    if (viewer?.onboardingCompleted) workspaceData.ensureWorkspace(viewer).then(item => { if (active) setWorkspace(item); });
    return () => { active = false; };
  }, [viewer, workspaceData]);

  useEffect(() => {
    let active = true;
    if (data.authenticated) {
      data.getViewer().then((nextViewer) => {
        if (active) setViewer(nextViewer);
      });
    }
    return () => { active = false; };
  }, [data]);

  if (data.authLoading) {
    return <main className="auth-restore-state" role="status" aria-live="polite">Restoring your session…</main>;
  }

  if (route.name === "landing") return <LandingPage navigate={navigate}/>;

  if (!data.authenticated) {
    if (route.name === "login") return <AuthScreen initialMode="signin" navigate={navigate}/>;
    if (route.name === "signup") return <AuthScreen initialMode="signup" navigate={navigate} showVerificationAfterSignup purchase={route.plan && route.cycle ? { tier: route.plan, billingCycle: route.cycle } : undefined} signupReason={route.reason}/>;
    if (route.name === "pricing") return <PricingView viewer={null} navigate={navigate} refresh={() => {}}/>;
    return <AuthScreen initialMode="signup" navigate={navigate}/>;
  }

  if (viewer === null) return <main className="workspace detail-skeleton"><span/><span/><span/></main>;
  if (!viewer.onboardingCompleted && route.name !== "verification" && route.name !== "onboarding") {
    return <OnboardingView viewer={viewer} navigate={navigate} refresh={loadViewer}/>;
  }
  if (route.name === "verification") return <VerificationView navigate={navigate} purchase={route.plan && route.cycle ? { tier: route.plan, billingCycle: route.cycle } : undefined}/>;
  if (route.name === "onboarding") return <OnboardingView viewer={viewer} navigate={navigate} refresh={loadViewer}/>;

  return (
    <AppShell
      viewer={viewer}
      activePage={route.name === "creators" ? "creators" : route.name === "campaigns" || route.name === "campaign" ? "campaigns" : route.name === "history" ? "history" : route.name === "pricing" || route.name === "settings" ? "settings" : route.name === "admin" ? "admin" : "search"}
      navigate={navigate}
      onSearch={() => navigate({ name: "discover" })}
      onHistory={() => navigate({ name: "history" })}
      onAdmin={() => navigate({ name: "admin" })}
      showAdmin={viewer?.role === "admin"}
      onSignOut={async () => {
        await data.signOut();
        setViewer(null);
        navigate({ name: "landing" });
      }}
    >
      {data.mode === "demo" ? <div className="workspace-mode">Local demo · connect Convex for shared data</div> : null}
      {route.name === "discover" ? workspace ? <DiscoveryWorkspace workspace={workspace} navigate={navigate}/> : <main className="workspace detail-skeleton"><span/><span/><span/></main>
      : route.name === "creators" ? workspace ? <CreatorsWorkspace workspace={workspace} navigate={navigate}/> : <main className="workspace detail-skeleton"><span/><span/><span/></main>
      : route.name === "campaigns" ? workspace ? <CampaignsWorkspace workspace={workspace} navigate={navigate}/> : <main className="workspace detail-skeleton"><span/><span/><span/></main>
      : route.name === "campaign" ? workspace ? <CampaignDetailWorkspace workspace={workspace} campaignId={route.campaignId} navigate={navigate}/> : <main className="workspace detail-skeleton"><span/><span/><span/></main>
      : route.name === "pricing" ? <PricingView viewer={viewer} navigate={navigate} refresh={loadViewer}/>
      : route.name === "settings" ? <SettingsView viewer={viewer} navigate={navigate} refresh={loadViewer}/>
      : route.name === "payment" ? <PaymentResultView status={route.status} navigate={navigate}/>
      : route.name === "creator" ? (
        <CreatorDetail creatorId={route.creatorId} navigate={navigate} onBalanceChange={loadViewer} />
      ) : route.name === "history" ? (
        <HistoryView navigate={navigate} onBalanceChange={loadViewer} />
      ) : route.name === "admin" ? (
        viewer === null ? <main className="workspace detail-skeleton"><span /><span /><span /></main>
          : viewer.role === "admin" ? <Suspense fallback={<main className="workspace detail-skeleton"><span /><span /><span /></main>}><AdminView /></Suspense>
            : <main className="workspace admin-denied"><p className="eyebrow">Restricted</p><h1>Admin access required</h1><p>This queue is only available to Creatorly administrators.</p></main>
      ) : workspace ? <DiscoveryWorkspace workspace={workspace} navigate={navigate}/> : <main className="workspace detail-skeleton"><span/><span/><span/></main>}
    </AppShell>
  );
}
