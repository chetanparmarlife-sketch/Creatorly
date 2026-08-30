import { useCallback, useEffect, useState } from "react";
export type AppRoute =
  | { name: "landing" }
  | { name: "login" }
  | { name: "signup" }
  | { name: "onboarding" }
  | { name: "verification" }
  | { name: "pricing" }
  | { name: "settings" }
  | { name: "payment"; status: "success" | "failure" }
  | { name: "history" }
  | { name: "admin" }
  | { name: "discover" }
  | { name: "creators" }
  | { name: "campaigns" }
  | { name: "campaign"; campaignId: string }
  | { name: "creator"; creatorId: string };

function readRoute(): AppRoute {
  const path = window.location.pathname;
  if (path === "/") return { name: "landing" };
  if (path === "/login") return { name: "login" };
  if (path === "/signup") return { name: "signup" };
  if (path === "/onboarding") return { name: "onboarding" };
  if (path === "/verify") return { name: "verification" };
  if (path === "/pricing") return { name: "pricing" };
  if (path === "/settings") return { name: "settings" };
  if (path === "/payment/success") return { name: "payment", status: "success" };
  if (path === "/payment/failure") return { name: "payment", status: "failure" };
  const creatorMatch = path.match(/^\/creator\/([^/]+)$/);
  if (creatorMatch) {
    return { name: "creator", creatorId: decodeURIComponent(creatorMatch[1]) };
  }
  if (path === "/history") return { name: "history" };
  if (path === "/admin") return { name: "admin" };
  if (path === "/app" || path === "/app/home" || path === "/app/discover" || path === "/search") return { name: "discover" };
  if (path === "/app/creators") return { name: "creators" };
  if (path === "/app/campaigns") return { name: "campaigns" };
  const campaignMatch = path.match(/^\/app\/campaigns\/([^/]+)$/);
  if (campaignMatch) return { name: "campaign", campaignId: decodeURIComponent(campaignMatch[1]) };
  return { name: "discover" };
}

export function useRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    if (["/search", "/app/home", "/app/discover"].includes(window.location.pathname)) {
      window.history.replaceState({}, "", "/app");
    }
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    const url = next.name === "creator"
      ? `/creator/${encodeURIComponent(next.creatorId)}`
      : next.name === "campaign" ? `/app/campaigns/${encodeURIComponent(next.campaignId)}`
      : next.name === "discover" ? "/app"
      : next.name === "creators" ? "/app/creators"
      : next.name === "campaigns" ? "/app/campaigns"
      : next.name === "history"
        ? "/history"
        : next.name === "admin"
          ? "/admin"
        : next.name === "landing" ? "/"
        : next.name === "login" ? "/login"
        : next.name === "signup" ? "/signup"
        : next.name === "onboarding" ? "/onboarding"
        : next.name === "verification" ? "/verify"
        : next.name === "pricing" ? "/pricing"
        : next.name === "settings" ? "/settings"
        : next.name === "payment" ? `/payment/${next.status}`
        : "/app";
    window.history.pushState({}, "", url);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { route, navigate };
}
