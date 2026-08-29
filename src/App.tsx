import { useCallback, useEffect, useState } from "react";
import { useAppData } from "./data/AppData";
import { useRoute } from "./hooks/useRoute";
import type { Viewer } from "./types";
import { AppShell } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { CreatorDetail } from "./components/CreatorDetail";
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
      onSearch={() => navigate({ name: "search", query: "" })}
      onSignOut={async () => {
        await data.signOut();
        navigate({ name: "search", query: "" });
      }}
    >
      {data.mode === "demo" ? <div className="workspace-mode">Local demo · connect Convex for shared data</div> : null}
      {route.name === "creator" ? (
        <CreatorDetail creatorId={route.creatorId} navigate={navigate} onBalanceChange={loadViewer} />
      ) : (
        <SearchView initialQuery={route.query} initialPlatform={route.platform} navigate={navigate} />
      )}
    </AppShell>
  );
}
