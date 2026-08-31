import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ConvexDataProvider } from "./data/AppData";
import { ConvexWorkspaceDataProvider } from "./features/workspace/WorkspaceData";
import type { CreatorDetailData, Viewer } from "./types";
import { CONTACT_ACCESS_WINDOW_MS, CONTACT_UNLOCK_COST } from "../convex/lib/creditPolicy";

const { authSignInMock, authSignOutMock } = vi.hoisted(() => ({
  authSignInMock: vi.fn(),
  authSignOutMock: vi.fn(),
}));

vi.mock("@convex-dev/auth/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("@convex-dev/auth/react")>();
  return {
    ...original,
    useAuthActions: () => ({ signIn: authSignInMock, signOut: authSignOutMock }),
  };
});

const viewer: Viewer = {
  id: "user-1",
  name: "Aisha Shah",
  email: "aisha@example.test",
  companyName: "Northstar Agency",
  role: "user",
  currentPlanTier: "free",
  creditBalance: 25,
  subscriptionStatus: "active",
  onboardingCompleted: true,
  onboardingStep: 5,
  onboardingPlanTier: "free",
  isEmailVerified: true,
  notificationPreferences: {
    requestFulfilled: true,
    lowBalance: true,
    expirationWarning: true,
    weeklySummary: false,
  },
};

function creatorDetail(unlocked: boolean, creditBalance: number): CreatorDetailData {
  return {
    creator: {
      id: "creator-real",
      platform: "instagram",
      handle: "real.creator",
      displayName: "Real Creator",
      followerCount: 125_000,
      location: "Mumbai, India",
      categories: ["Lifestyle"],
      isVerified: true,
      isDemo: false,
      socialProfiles: [{ platform: "instagram", handle: "real.creator", url: "https://instagram.com/real.creator", followerCount: 125_000, isVerified: true }],
      contentLanguages: ["English"],
      profileType: "Creator",
      contentQuality: "Verified",
      managementType: "self_managed",
    },
    isUnlocked: unlocked,
    expiresAt: unlocked ? Date.now() + CONTACT_ACCESS_WINDOW_MS : null,
    creditBalance,
    currentPlanTier: "free",
    availableContactCount: 1,
    hiddenProContactCount: 0,
    pendingContactCount: 0,
    contacts: unlocked ? [{
      id: "contact-1",
      contactType: "creator_direct",
      name: "Real Creator",
      email: "creator@example.test",
      verificationStatus: "verified",
      lastVerifiedAt: Date.now(),
      isDemo: false,
    }] : [],
  };
}

function renderConnected(options: { onUnlock?: () => void; authenticated?: boolean; campaignLoad?: "missing" | "error" } = {}) {
  const client = new ConvexReactClient("https://example.convex.cloud");
  let creditBalance = 25;
  let unlocked = false;
  const queryMock = vi.spyOn(client, "query").mockImplementation((async (reference: FunctionReference<"query">) => {
    const functionName = getFunctionName(reference);
    if (functionName === "users:viewer") return { ...viewer, creditBalance };
    if (functionName === "workspaces:listMine") return [{ id: "workspace-1", name: "Northstar Agency", kind: "agency", role: "owner" }];
    if (functionName === "notifications:listMine" || functionName === "billing:listTransactions") return [];
    if (functionName === "creators:getById") return creatorDetail(unlocked, creditBalance);
    if (functionName === "creators:search") return [];
    if (functionName === "creators:browsePage") return { page: [], continueCursor: "", isDone: true, totalCount: 0 };
    if (functionName === "creators:countPage") return { count: 0, continueCursor: "", isDone: true };
    if (functionName === "creators:listLocationFacets") return { countries: [], cities: [], postalCodes: [] };
    if (functionName === "savedCreators:list") return [];
    if (functionName === "campaigns:list") return [];
    if (functionName === "campaignExecution:getCampaign") {
      if (options.campaignLoad === "error") throw new Error("Connection interrupted.");
      if (options.campaignLoad === "missing") return null;
    }
    throw new Error(`Unexpected query: ${functionName}`);
  }) as typeof client.query);
  const mutationMock = vi.spyOn(client, "mutation").mockImplementation((async (reference: FunctionReference<"mutation">) => {
    const functionName = getFunctionName(reference);
    if (functionName === "unlocks:unlock") {
      creditBalance -= CONTACT_UNLOCK_COST;
      unlocked = true;
      options.onUnlock?.();
      return { status: "unlocked", creditBalance };
    }
    throw new Error(`Unexpected mutation: ${functionName}`);
  }) as typeof client.mutation);
  const actionMock = vi.spyOn(client, "action").mockImplementation((async (reference: FunctionReference<"action">) => {
    const functionName = getFunctionName(reference);
    if (functionName === "billing:createCheckout") return { checkoutUrl: "#checkout" };
    throw new Error(`Unexpected action: ${functionName}`);
  }) as typeof client.action);

  const rendered = render(
    <ConvexProvider client={client}>
      <ConvexDataProvider authenticated={options.authenticated ?? true} authLoading={false}>
        <ConvexWorkspaceDataProvider><App /></ConvexWorkspaceDataProvider>
      </ConvexDataProvider>
    </ConvexProvider>,
  );

  return { ...rendered, actionMock, mutationMock, queryMock, getCreditBalance: () => creditBalance, close: () => client.close() };
}

describe("Creatorly connected Convex provider journeys", () => {
  afterEach(() => {
    cleanup();
    authSignInMock.mockReset();
    authSignOutMock.mockReset();
    vi.restoreAllMocks();
  });

  it("sends /app to Discovery with the connected Convex provider", async () => {
    window.history.replaceState({}, "", "/app");
    const connected = renderConnected();

    expect(await screen.findByRole("heading", { name: /^Discover creators$/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/app/discover");
    expect(screen.queryByRole("button", { name: /^Home$/i })).not.toBeInTheDocument();
    connected.close();
  });

  it("verifies the emailed code before starting the selected checkout", async () => {
    window.history.replaceState({}, "", "/signup?plan=pro&cycle=annual");
    authSignInMock
      .mockResolvedValueOnce({ signingIn: false })
      .mockResolvedValueOnce({ signingIn: true });
    const connected = renderConnected({ authenticated: false });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@example.com");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(await screen.findByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    expect(connected.actionMock).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => expect(authSignInMock).toHaveBeenLastCalledWith("password", expect.any(FormData)));
    const verificationForm = authSignInMock.mock.calls.at(-1)?.[1] as FormData;
    expect(Object.fromEntries(verificationForm.entries())).toMatchObject({
      flow: "email-verification",
      email: "aisha@example.com",
      code: "123456",
    });
    await waitFor(() => expect(connected.actionMock).toHaveBeenCalled());
    const checkoutCall = connected.actionMock.mock.calls.find(([reference]) => getFunctionName(reference) === "billing:createCheckout");
    expect(checkoutCall?.[1]).toEqual({ purchase: { kind: "core_plan", tier: "pro", billingCycle: "annual" } });
    connected.close();
  });

  it("unlocks through the Convex provider, decrements the balance, and reveals contacts", async () => {
    window.history.replaceState({}, "", "/creator/creator-real");
    const onUnlock = vi.fn();
    const connected = renderConnected({ onUnlock });
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /unlock for 5 credits/i }));

    expect(await screen.findByText("creator@example.test")).toBeInTheDocument();
    expect(connected.getCreditBalance()).toBe(20);
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(connected.mutationMock.mock.calls.some(([reference]) => getFunctionName(reference) === "unlocks:unlock")).toBe(true);
    connected.close();
  });

  it("shows annual totals and sends the matching annual plan to Convex checkout", async () => {
    window.history.replaceState({}, "", "/pricing");
    const connected = renderConnected();
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: /₹1,499\/month/i })).toBeInTheDocument();
    expect(screen.queryByText(/billed annually/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /annual 2 months free/i }));

    expect(screen.getByRole("heading", { name: /₹1,249\.17\/month equivalent/i })).toBeInTheDocument();
    expect(screen.getByText("billed annually ₹14,990")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /₹2,915\.83\/month equivalent/i })).toBeInTheDocument();
    expect(screen.getByText("billed annually ₹34,990")).toBeInTheDocument();
    expect(screen.getAllByText(/billed annually/i)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /choose basic/i }));
    await waitFor(() => expect(connected.actionMock).toHaveBeenCalled());
    const checkoutCall = connected.actionMock.mock.calls.find(([reference]) => getFunctionName(reference) === "billing:createCheckout");
    expect(checkoutCall?.[1]).toEqual({ purchase: { kind: "core_plan", tier: "basic", billingCycle: "annual" } });
    connected.close();
  });

  it("does not start checkout when the verification session is missing", async () => {
    window.history.replaceState({}, "", "/verify?plan=pro&cycle=annual");
    const connected = renderConnected();

    expect(await screen.findByRole("heading", { name: /start verification again/i })).toBeInTheDocument();
    expect(connected.actionMock).not.toHaveBeenCalled();
    connected.close();
  });

  it("distinguishes a missing campaign from a failed campaign load", async () => {
    window.history.replaceState({}, "", "/app/campaigns/campaign-1");
    const missing = renderConnected({ campaignLoad: "missing" });
    expect(await screen.findByRole("heading", { name: "Campaign not found" })).toBeInTheDocument();
    expect(screen.queryByText("Loading campaign…")).not.toBeInTheDocument();
    missing.unmount();
    missing.close();

    const failed = renderConnected({ campaignLoad: "error" });
    expect(await screen.findByRole("heading", { name: "Campaign could not load" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Connection interrupted.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    failed.close();
  });
});
