import { useCallback, useEffect, useState } from "react";
import type { Platform } from "../types";

export type AppRoute =
  | { name: "search"; query: string; platform?: Platform }
  | { name: "creator"; creatorId: string };

function readRoute(): AppRoute {
  const path = window.location.pathname;
  const creatorMatch = path.match(/^\/creator\/([^/]+)$/);
  if (creatorMatch) {
    return { name: "creator", creatorId: decodeURIComponent(creatorMatch[1]) };
  }
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
