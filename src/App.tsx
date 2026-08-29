import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useAppData } from "./data/AppData";
import { useRoute } from "./hooks/useRoute";
import type { Viewer } from "./types";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { CreatorDetail } from "./components/CreatorDetail";
import { HistoryView } from "./components/HistoryView";

const AdminView = lazy(() => import("./components/AdminView").then((module) => ({ default: module.AdminView })));
import { SearchView } from "./components/SearchView";

export function App() {
  const data = useAppData();
  const { route, navigate } = useRoute();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const loadViewer = useCallback(async () => {
    setViewer(await data.getViewer());
  }, [data]);

  useEffect(() => {
    let active = true;
    if (data.authenticated) {
      data.getViewer().then((nextViewer) => {
        if (active) setViewer(nextViewer);
      });
    }
    return () => { active = false; };
  }, [data]);

  if (!data.authenticated) return <AuthScreen />;

  return (
    <AppShell
      viewer={viewer}
      activePage={route.name === "history" ? "history" : route.name === "admin" ? "admin" : "search"}
      onSearch={() => navigate({ name: "search", query: "" })}
      onHistory={() => navigate({ name: "history" })}
      onAdmin={() => navigate({ name: "admin" })}
      showAdmin={viewer?.role === "admin"}
      onSignOut={async () => {
        await data.signOut();
        navigate({ name: "search", query: "" });
      }}
    >
      {data.mode === "demo" ? <div className="workspace-mode">Local demo · connect Convex for shared data</div> : null}
      {route.name === "creator" ? (
        <CreatorDetail creatorId={route.creatorId} navigate={navigate} onBalanceChange={loadViewer} />
      ) : route.name === "history" ? (
        <HistoryView navigate={navigate} onBalanceChange={loadViewer} />
      ) : route.name === "admin" ? (
        viewer === null ? <main className="workspace detail-skeleton"><span /><span /><span /></main>
          : viewer.role === "admin" ? <Suspense fallback={<main className="workspace detail-skeleton"><span /><span /><span /></main>}><AdminView /></Suspense>
            : <main className="workspace admin-denied"><p className="eyebrow">Restricted</p><h1>Admin access required</h1><p>This queue is only available to Creatorly administrators.</p></main>
      ) : (
        <SearchView initialQuery={route.query} initialPlatform={route.platform} navigate={navigate} />
      )}
    </AppShell>
  );
}
