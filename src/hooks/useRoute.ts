import { useCallback, useEffect, useState } from "react";
import type { Platform } from "../types";

export type AppRoute =
  | { name: "landing" }
  | { name: "login" }
  | { name: "signup" }
  | { name: "onboarding" }
  | { name: "verification" }
  | { name: "pricing" }
  | { name: "settings" }
  | { name: "payment"; status: "success" | "failure" }
  | { name: "search"; query: string; platform?: Platform }
  | { name: "history" }
  | { name: "admin" }
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
  const params = new URLSearchParams(window.location.search);
  const platform = params.get("platform");
  return {
    name: "search",
    query: params.get("q") ?? "",
    platform:
      platform === "instagram" || platform === "youtube" ? platform : undefined,
  };
}

export function useRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    const url = next.name === "creator"
      ? `/creator/${encodeURIComponent(next.creatorId)}`
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
        : `/search${next.query ? `?${new URLSearchParams({
          q: next.query,
          ...(next.platform ? { platform: next.platform } : {}),
        })}` : ""}`;
    window.history.pushState({}, "", url);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { route, navigate };
}
