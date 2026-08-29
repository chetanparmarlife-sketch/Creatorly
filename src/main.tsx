import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/dm-sans";
import { App } from "./App";
import { ConvexDataProvider, DemoDataProvider } from "./data/AppData";
import "./styles.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function ConnectedApp() {
  const { isAuthenticated } = useConvexAuth();
  return (
    <ConvexDataProvider authenticated={isAuthenticated}>
      <App />
    </ConvexDataProvider>
  );
}

function Root() {
  if (!convexUrl) {
    return (
      <DemoDataProvider>
        <App />
      </DemoDataProvider>
    );
  }

  return (
    <ConvexAuthProvider client={convexClient!}>
      <ConnectedApp />
    </ConvexAuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
