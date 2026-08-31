import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import "@fontsource-variable/plus-jakarta-sans";
import { App } from "./App";
import { ConvexDataProvider, DemoDataProvider } from "./data/AppData";
import { ConvexWorkspaceDataProvider, DemoWorkspaceDataProvider } from "./features/workspace/WorkspaceData";
import "./styles.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
const hasProductionConfigurationError = import.meta.env.PROD && !convexUrl;

if (hasProductionConfigurationError) {
  console.error("[Creatorly] CONFIGURATION ERROR: VITE_CONVEX_URL is missing from this production build. The application has been stopped to prevent demo data from being shown.");
}

function ConnectedApp() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <ConvexDataProvider authenticated={isAuthenticated} authLoading={isLoading}>
      <ConvexWorkspaceDataProvider><App /></ConvexWorkspaceDataProvider>
    </ConvexDataProvider>
  );
}

function Root() {
  if (hasProductionConfigurationError) {
    return <main className="center-state" role="alert"><h1>Configuration error</h1><p>Creatorly is not configured correctly. Please contact support.</p></main>;
  }

  if (!convexUrl) {
    return (
      <DemoDataProvider>
        <DemoWorkspaceDataProvider><App /></DemoWorkspaceDataProvider>
      </DemoDataProvider>
    );
  }

  return (
    <ConvexAuthProvider client={convexClient!} storage={window.localStorage}>
      <ConnectedApp />
    </ConvexAuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
