import { useCallback, useEffect, useState } from "react";
import type { BillingCycle, PaidPlanTier } from "../lib/billingCatalog";

type PurchaseRouteContext = { plan?: PaidPlanTier; cycle?: BillingCycle };
type SignupRouteContext = PurchaseRouteContext & { reason?: "workspace" | "creator-claim" };

export type AppRoute =
  | { name: "landing" }
  | { name: "claim" }
  | { name: "claimProfile" }
  | { name: "login" }
  | ({ name: "signup" } & SignupRouteContext)
  | { name: "onboarding" }
  | ({ name: "verification" } & PurchaseRouteContext)
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

function purchaseContext(searchParams: URLSearchParams): PurchaseRouteContext {
  const plan = searchParams.get("plan");
  const cycle = searchParams.get("cycle");
  if ((plan === "basic" || plan === "pro") && (cycle === "monthly" || cycle === "annual")) {
    return { plan, cycle };
  }
  return {};
}

function contextualRouteUrl(path: "/signup" | "/verify", context: SignupRouteContext) {
  const searchParams = new URLSearchParams();
  if (context.plan && context.cycle) {
    searchParams.set("plan", context.plan);
    searchParams.set("cycle", context.cycle);
  }
  if (path === "/signup" && context.reason) searchParams.set("reason", context.reason);
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function readRoute(): AppRoute {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  if (path === "/") return { name: "landing" };
  if (path === "/claim") return { name: "claim" };
  if (path === "/claim/profile") return { name: "claimProfile" };
  if (path === "/login") return { name: "login" };
  if (path === "/signup") {
    const reason = searchParams.get("reason");
    return { name: "signup", ...purchaseContext(searchParams), reason: reason === "workspace" || reason === "creator-claim" ? reason : undefined };
  }
  if (path === "/onboarding") return { name: "onboarding" };
  if (path === "/verify") return { name: "verification", ...purchaseContext(searchParams) };
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
    if (window.location.pathname === "/search" || window.location.pathname === "/app" || window.location.pathname === "/app/home") {
      window.history.replaceState({}, "", "/app/discover");
    }
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((next: AppRoute) => {
    const url = next.name === "creator"
      ? `/creator/${encodeURIComponent(next.creatorId)}`
      : next.name === "campaign" ? `/app/campaigns/${encodeURIComponent(next.campaignId)}`
      : next.name === "discover" ? "/app/discover"
      : next.name === "creators" ? "/app/creators"
      : next.name === "campaigns" ? "/app/campaigns"
      : next.name === "claim" ? "/claim"
      : next.name === "claimProfile" ? "/claim/profile"
      : next.name === "history"
        ? "/history"
        : next.name === "admin"
          ? "/admin"
        : next.name === "landing" ? "/"
        : next.name === "login" ? "/login"
        : next.name === "signup" ? contextualRouteUrl("/signup", next)
        : next.name === "onboarding" ? "/onboarding"
        : next.name === "verification" ? contextualRouteUrl("/verify", next)
        : next.name === "pricing" ? "/pricing"
        : next.name === "settings" ? "/settings"
        : next.name === "payment" ? `/payment/${next.status}`
        : "/app/discover";
    window.history.pushState({}, "", url);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return { route, navigate };
}
