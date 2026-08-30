import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { DemoDataProvider } from "./data/AppData";
import { demoData } from "./lib/demoData";
import { DemoWorkspaceDataProvider } from "./features/workspace/WorkspaceData";

function renderDemo() {
  return render(
    <DemoDataProvider>
      <DemoWorkspaceDataProvider><App /></DemoWorkspaceDataProvider>
    </DemoDataProvider>,
  );
}

function storedCreditBalance() {
  return JSON.parse(window.localStorage.getItem("creatorly.demo.user.v1") ?? "{}").creditBalance;
}

describe("Creatorly M1 user journey", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/search");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not show a signed-out screen while a saved session is being restored", () => {
    render(
      <DemoDataProvider authLoading>
        <DemoWorkspaceDataProvider><App /></DemoWorkspaceDataProvider>
      </DemoDataProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Restoring your session");
    expect(screen.queryByRole("button", { name: /create free account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /go from shortlist/i })).not.toBeInTheDocument();
  });

  it("positions live products before clearly labelled future add-ons", () => {
    window.history.replaceState({}, "", "/");
    renderDemo();

    expect(screen.getByRole("heading", { name: /find the right creators. run the whole campaign/i })).toBeInTheDocument();
    const pageText = document.body.textContent ?? "";
    expect(pageText.indexOf("Creatorly Discovery")).toBeLessThan(pageText.indexOf("Private creator CRM"));
    expect(pageText.indexOf("Private creator CRM")).toBeLessThan(pageText.indexOf("Chrome extension"));
    expect(pageText.indexOf("Chrome extension")).toBeLessThan(pageText.indexOf("Campaign workspace"));
    expect(screen.getAllByText("Future add-on")).toHaveLength(4);
  });

  it("signs up, searches, unlocks once, and preserves access after remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(await screen.findByRole("heading", { name: /discover creators/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/app");
    await user.type(screen.getByLabelText("Creator name or handle"), "maya.creates.official");
    const mayaResult = await screen.findByRole("button", { name: /Maya Kapoor/i });
    expect(mayaResult.closest("article")).toHaveTextContent("Lifestyle");
    await user.click(mayaResult);

    expect(await screen.findByRole("heading", { name: /creator profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /similar creators/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /reveal 1 contact/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /unlock for 5 credits/i }));

    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();
    await waitFor(() => expect(storedCreditBalance()).toBe(20));

    firstRender.unmount();
    renderDemo();

    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();
    expect(storedCreditBalance()).toBe(20);
    expect(screen.queryByRole("button", { name: /unlock for 5 credits/i })).not.toBeInTheDocument();
  });

  it("keeps pending contacts unavailable without charging or revealing them", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await user.type(await screen.findByLabelText("Creator name or handle"), "pending import");
    await user.click(await screen.findByRole("button", { name: /Pending Import/i }));

    expect(await screen.findByRole("heading", { name: /contact is unavailable/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unavailable until verified/i })).toBeDisabled();
    await expect(demoData.unlock("pending-import")).rejects.toThrow(/unavailable while verification is in progress/i);
    expect((await demoData.viewer())?.creditBalance).toBe(25);
    expect(screen.queryByText("pending@example.test")).not.toBeInTheDocument();
  });

  it("persists a wrong-contact report from every revealed contact card", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await user.type(await screen.findByLabelText("Creator name or handle"), "maya creates");
    await user.click(await screen.findByRole("button", { name: /Maya Kapoor/i }));
    await user.click(await screen.findByRole("button", { name: /unlock for 5 credits/i }));
    await user.click(await screen.findByRole("button", { name: /report wrong contact/i }));

    expect(await screen.findByRole("button", { name: /report received/i })).toBeDisabled();
    const flags = JSON.parse(window.localStorage.getItem("creatorly.demo.contact-flags.v1") ?? "[]") as Array<{ contactId: string; reason: string }>;
    expect(flags).toEqual(expect.arrayContaining([{ contactId: "maya-direct", reason: "wrong_contact", id: expect.any(String), userId: "demo-user", status: "open", createdAt: expect.any(Number) }]));
  });

  it("shows empty history, then reopens an active unlock without charging again", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    await user.click(await screen.findByRole("button", { name: /^history$/i }));
    expect(await screen.findByRole("heading", { name: /no unlocks yet/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^search$/i }));
    await user.type(screen.getByLabelText("Creator name or handle"), "maya creates");
    await user.click(await screen.findByRole("button", { name: /Maya Kapoor/i }));
    await user.click(await screen.findByRole("button", { name: /unlock for 5 credits/i }));
    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^history$/i }));
    expect(await screen.findByRole("heading", { name: /unlock history/i })).toBeInTheDocument();
    expect(await screen.findByText(/days remaining/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /view Maya Kapoor contact/i }));

    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();
    expect(storedCreditBalance()).toBe(20);
  });

  it("re-unlocks expired history for five credits", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    const expiredAt = Date.now() - 24 * 60 * 60 * 1000;
    window.localStorage.setItem("creatorly.demo.unlocks.v1", JSON.stringify({
      "maya-creates": {
        unlockedAt: expiredAt - 30 * 24 * 60 * 60 * 1000,
        expiresAt: expiredAt,
        creditsSpent: 5,
      },
    }));

    await user.click(await screen.findByRole("button", { name: /^history$/i }));
    await user.click(await screen.findByRole("tab", { name: /expired 1/i }));
    await user.click(screen.getByRole("button", { name: /re-unlock · 5 credits/i }));

    expect(await screen.findByText(/days remaining/i)).toBeInTheDocument();
    await waitFor(() => expect(storedCreditBalance()).toBe(20));
    expect(screen.getByRole("tab", { name: /active 1/i })).toHaveAttribute("aria-selected", "true");
  });

  it("submits a missing creator request with its platform and notes", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    await user.type(await screen.findByLabelText("Creator name or handle"), "@new.creator");
    await user.click(await screen.findByRole("button", { name: /request contact/i }));
    expect(screen.getByRole("dialog", { name: /request a creator contact/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Creator handle")).toHaveValue("@new.creator");
    await user.selectOptions(screen.getByLabelText("Platform"), "instagram");
    await user.type(screen.getByLabelText("Notes (optional)"), "Need the campaign manager.");
    await user.click(screen.getByRole("button", { name: /^submit request$/i }));

    expect(await screen.findByRole("heading", { name: /request received/i })).toBeInTheDocument();
    expect(screen.getByText(/email when this contact is added/i)).toBeInTheDocument();
  });

  it("explains repository coverage when MrBeast has no results", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    expect(screen.queryByRole("combobox", { name: /followers/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/count not supplied/i)).not.toBeInTheDocument();
    await user.type(await screen.findByLabelText("Creator name or handle"), "MrBeast");

    expect(await screen.findByRole("heading", { name: /no creator found/i })).toBeInTheDocument();
    expect(screen.getByText(/India-focused Instagram creators/i)).toBeInTheDocument();
    expect(screen.getByText(/YouTube creator data is not loaded yet/i)).toBeInTheDocument();
  });

  it("lets a demo admin fulfill a pending request", async () => {
    const user = userEvent.setup();
    renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Creatorly Admin");
    await user.type(screen.getByLabelText("Agency name"), "Creatorly");
    await user.type(screen.getByLabelText("Work email"), "admin@creatorly.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    await user.type(await screen.findByLabelText("Creator name or handle"), "@new.creator");
    await user.click(await screen.findByRole("button", { name: /request contact/i }));
    await user.click(screen.getByRole("button", { name: /^submit request$/i }));
    await user.click(await screen.findByRole("button", { name: /^close$/i }));
    await user.click(screen.getByRole("button", { name: /^admin$/i }));

    expect(await screen.findByRole("heading", { name: /fulfillment queue/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /@new.creator/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Creator display name"), "New Creator");
    await user.type(screen.getByLabelText("Follower count"), "125000");
    await user.type(screen.getByLabelText("Location"), "Mumbai, India");
    await user.type(screen.getByLabelText("Contact name"), "Nina Manager");
    await user.type(screen.getByLabelText("Contact email"), "nina.manager@example.test");
    await user.click(screen.getByRole("button", { name: /mark fulfilled/i }));

    expect(await screen.findByText(/fulfilled 1 matching request/i)).toBeInTheDocument();
    expect(await screen.findByText(/queue is clear/i)).toBeInTheDocument();
  });

  it("does not simulate a paid upgrade when the Dodo backend is unavailable", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await user.click(await screen.findByRole("button", { name: /^settings$/i }));
    expect(await screen.findByRole("heading", { name: /plan and credits/i })).toBeInTheDocument();
    expect(screen.queryByTitle("Credits available")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /manage billing/i }));
    await user.click(screen.getByRole("button", { name: /choose pro/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Dodo checkout requires the connected Creatorly backend/i);
    const savedUser = JSON.parse(window.localStorage.getItem("creatorly.demo.user.v1") ?? "{}") as Record<string, unknown>;
    expect(savedUser.currentPlanTier).toBe("free");
    expect(savedUser.creditBalance).toBe(25);
  });

  it("returns to workspace onboarding step 3 after a hard-refresh-style remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await screen.findByRole("heading", { name: /discover creators/i });

    const savedUser = JSON.parse(window.localStorage.getItem("creatorly.demo.user.v1") ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem("creatorly.demo.user.v1", JSON.stringify({ ...savedUser, onboardingCompleted: false, onboardingStep: 1 }));
    firstRender.unmount();
    window.history.replaceState({}, "", "/onboarding");

    const onboardingRender = renderDemo();
    expect(await screen.findByRole("heading", { name: /who is running creator campaigns/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^continue/i }));
    expect(await screen.findByRole("heading", { name: /what should creatorly help/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^continue/i }));
    expect(await screen.findByRole("heading", { name: /set the first campaign owner/i })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("creatorly.demo.user.v1") ?? "{}").onboardingStep).toBe(3);

    onboardingRender.unmount();
    renderDemo();
    expect(await screen.findByRole("heading", { name: /set the first campaign owner/i })).toBeInTheDocument();
  });

  it("does not trap onboarding when progress syncing fails", async () => {
    window.localStorage.setItem("creatorly.demo.session.v1", "active");
    window.localStorage.setItem("creatorly.demo.user.v1", JSON.stringify({
      id: "demo-user",
      name: "Aisha Shah",
      email: "aisha@northstar.test",
      companyName: "Northstar Agency",
      role: "user",
      currentPlanTier: "free",
      creditBalance: 25,
      subscriptionStatus: "active",
      onboardingCompleted: false,
      onboardingStep: 4,
      onboardingPlanTier: "free",
      isEmailVerified: true,
      notificationPreferences: { requestFulfilled: true, lowBalance: true, expirationWarning: true, weeklySummary: false },
    }));
    window.history.replaceState({}, "", "/onboarding");
    vi.spyOn(demoData, "updateOnboardingStep").mockRejectedValueOnce(new Error("Backend unavailable"));
    const user = userEvent.setup();
    renderDemo();

    expect(await screen.findByRole("heading", { name: /connect data and outreach/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^continue/i }));

    expect(await screen.findByRole("heading", { name: /where should we take you first/i })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not sync, but you can keep going/i);
  });

  it("persists a brand workspace from onboarding without creating a duplicate", async () => {
    window.localStorage.setItem("creatorly.demo.session.v1", "active");
    window.localStorage.setItem("creatorly.demo.user.v1", JSON.stringify({
      id: "demo-user",
      name: "Aisha Shah",
      email: "aisha@northstar.test",
      companyName: "Northstar Agency",
      role: "user",
      currentPlanTier: "free",
      creditBalance: 25,
      subscriptionStatus: "active",
      onboardingCompleted: false,
      onboardingStep: 1,
      onboardingPlanTier: "free",
      isEmailVerified: true,
      notificationPreferences: { requestFulfilled: true, lowBalance: true, expirationWarning: true, weeklySummary: false },
    }));
    window.history.replaceState({}, "", "/onboarding");
    const user = userEvent.setup();
    const firstRender = renderDemo();

    await user.click(await screen.findByRole("button", { name: /^brand/i }));
    const workspaceName = screen.getByLabelText(/workspace name/i);
    await user.clear(workspaceName);
    await user.type(workspaceName, "Northstar Beauty");
    await user.click(screen.getByRole("button", { name: /^continue/i }));
    await user.click(await screen.findByRole("button", { name: /^continue/i }));
    await user.click(await screen.findByRole("button", { name: /^continue/i }));
    await user.click(await screen.findByRole("button", { name: /^continue/i }));
    await user.click(await screen.findByRole("button", { name: /open workspace/i }));

    expect(await screen.findByRole("heading", { name: /discover creators/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter creator column")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter platform column")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter audience column")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter category column")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter city or country column")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter contact column")).toBeInTheDocument();
    await screen.findByRole("button", { name: /view Pending Import profile/i });
    await user.selectOptions(screen.getByLabelText("Filter contact column"), "missing");
    expect(screen.getByRole("button", { name: /view Pending Import profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view Maya Kapoor profile/i })).not.toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("creatorly.workspace.v1") ?? "{}") as Record<string, unknown>;
    expect(saved).toMatchObject({ name: "Northstar Beauty", kind: "brand", role: "owner" });
    expect(saved.goals).toEqual(["Discover creators", "Manage campaigns"]);
    const workspaceId = saved.id;

    firstRender.unmount();
    window.history.replaceState({}, "", "/app/home");
    renderDemo();
    expect(await screen.findByRole("heading", { name: /discover creators/i })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("creatorly.workspace.v1") ?? "{}").id).toBe(workspaceId);
  });

  it("adds manual and CSV creators to the private CRM with source labels", async () => {
    window.localStorage.setItem("creatorly.demo.session.v1", "active");
    window.localStorage.setItem("creatorly.demo.user.v1", JSON.stringify({
      id: "demo-user", name: "Aisha Shah", email: "aisha@northstar.test", companyName: "Northstar Beauty", role: "user",
      currentPlanTier: "free", creditBalance: 25, subscriptionStatus: "active", onboardingCompleted: true, onboardingStep: 5,
      onboardingPlanTier: "free", isEmailVerified: true,
      notificationPreferences: { requestFulfilled: true, lowBalance: true, expirationWarning: true, weeklySummary: false },
    }));
    window.localStorage.setItem("creatorly.workspace.v1", JSON.stringify({ id: "demo-workspace", name: "Northstar Beauty", kind: "brand", role: "owner" }));
    window.history.replaceState({}, "", "/app/creators");
    const user = userEvent.setup();
    const firstRender = renderDemo();

    await user.click(await screen.findByRole("button", { name: /add creators/i }));
    const manualTab = screen.getByRole("button", { name: /add manually/i });
    await user.click(manualTab);
    await user.type(screen.getByLabelText(/creator name/i), "Nina Studio");
    await user.selectOptions(screen.getByLabelText(/^platform/i), "instagram");
    await user.type(screen.getByLabelText(/^handle/i), "@nina.studio");
    await user.type(screen.getByLabelText(/^email/i), "team@nina.test");
    await user.click(screen.getByRole("button", { name: /^add private creator$/i }));

    expect(await screen.findByText("Added manually")).toBeInTheDocument();
    expect(screen.getByText("team@nina.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add creators/i }));
    const file = new File([
      "name,platform,handle,email\nNina duplicate,instagram,@nina.studio,\nArjun Tech,youtube,@arjuntech,hello@arjun.test\n,instagram,@broken,",
    ], "creators.csv", { type: "text/csv" });
    await user.upload(screen.getByLabelText(/csv file/i), file);
    const previewSummary = await screen.findByLabelText("Import preview summary");
    expect(previewSummary).toHaveTextContent("1 ready");
    expect(previewSummary).toHaveTextContent("1 duplicate");
    expect(previewSummary).toHaveTextContent("1 error");
    expect(screen.getByRole("button", { name: /download error report/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /import 1 ready/i }));

    expect(await screen.findByText("Uploaded by your team")).toBeInTheDocument();
    expect(screen.getByText("hello@arjun.test")).toBeInTheDocument();
    const createObjectUrl = vi.fn(() => "blob:creatorly-crm");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(createObjectUrl).toHaveBeenCalledOnce();

    firstRender.unmount();
    renderDemo();
    expect(await screen.findByText("Added manually")).toBeInTheDocument();
    expect(screen.getByText("Uploaded by your team")).toBeInTheDocument();
  });

  it("updates profile and notification settings", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await user.click(await screen.findByRole("button", { name: /^settings$/i }));
    const company = screen.getByDisplayValue("Northstar Agency");
    await user.clear(company);
    await user.type(company, "Northstar Studio");
    await user.click(screen.getByRole("button", { name: /save profile/i }));
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /weekly usage summary/i }));
    await user.click(screen.getByRole("button", { name: /save notifications/i }));
    expect(await screen.findByText("Notification preferences saved.")).toBeInTheDocument();
  });

  it("executes a creator campaign from discovery through content approval", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    await user.click(await screen.findByRole("button", { name: /^search$/i }));
    const search = await screen.findByLabelText("Creator name or handle");
    await user.type(search, "Riya On The Go");
    await user.click(within(search.closest("section")!).getByRole("button", { name: /^search$/i }));
    const row = await screen.findByRole("button", { name: /view Riya On The Go profile/i });
    const resultRow = row.closest("article");
    expect(resultRow).not.toBeNull();
    await user.click(within(resultRow!).getByRole("button", { name: /^save$/i }));

    await user.click(screen.getByRole("button", { name: /^creators$/i }));
    expect(await screen.findByText("@riyaonthego")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^campaigns$/i }));
    await user.click((await screen.findAllByRole("button", { name: /create campaign/i }))[0]);
    const campaignName = screen.getByPlaceholderText("Festive creator launch");
    await user.type(campaignName, "Monsoon Escape");
    await user.type(screen.getByPlaceholderText(/drive consideration/i), "Launch a travel collection");
    await user.click(within(campaignName.closest("form")!).getByRole("button", { name: /^create campaign$/i }));
    expect(await screen.findByRole("heading", { name: "Monsoon Escape" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Saved creator"), screen.getByRole("option", { name: "Riya On The Go" }));
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await user.click(await screen.findByRole("button", { name: /^rail$/i }));
    const stage = await screen.findByLabelText(/move Riya On The Go/i);
    await user.selectOptions(stage, "contacted");
    await waitFor(() => expect(screen.getByLabelText(/move Riya On The Go/i)).toHaveValue("contacted"));

    const rail = screen.getByRole("region", { name: /campaign creator rail/i });
    await user.click(within(rail).getByRole("button", { name: /Riya On The Go/i }));
    const drawer = await screen.findByRole("complementary", { name: /campaign execution details/i });
    await user.type(within(drawer).getByLabelText(/agreed fee/i), "75000");
    await user.click(within(drawer).getByRole("button", { name: /save fee/i }));
    await user.type(within(drawer).getByPlaceholderText("Confirm usage rights"), "Confirm usage rights");
    await user.click(within(drawer).getByRole("button", { name: /^add task$/i }));
    await user.type(within(drawer).getByPlaceholderText("Launch reel"), "Launch reel");
    await user.click(within(drawer).getByRole("button", { name: /^add deliverable$/i }));
    await user.click(await within(drawer).findByRole("button", { name: /Launch reel/i }));
    await user.type(within(drawer).getByLabelText("Review URL"), "https://example.test/review");
    await user.click(within(drawer).getByRole("button", { name: /submit for review/i }));
    expect(await within(drawer).findByText("In review")).toBeInTheDocument();
    await user.type(within(drawer).getByLabelText("Review note"), "Tighten the opening frame");
    await user.click(within(drawer).getByRole("button", { name: /request changes/i }));
    expect((await within(drawer).findAllByText("Changes requested")).length).toBeGreaterThan(0);
    await user.click(within(drawer).getByRole("button", { name: /^approve$/i }));
    expect((await within(drawer).findAllByText("Approved")).length).toBeGreaterThan(0);
  });

  it("groups agency campaigns by client and shows brand division review roles", async () => {
    const user = userEvent.setup();
    await demoData.signUp({ name: "Aisha Shah", companyName: "Northstar Agency", email: "aisha@northstar.test", password: "creatorly123" });
    window.localStorage.setItem("creatorly.workspace.v1", JSON.stringify({ id: "demo-workspace", name: "Northstar Agency", kind: "agency", role: "owner" }));
    window.history.replaceState({}, "", "/app/campaigns");
    const agency = renderDemo();

    await user.click(await screen.findByRole("button", { name: /manage clients/i }));
    await user.type(screen.getByLabelText("Client name"), "Northstar Foods");
    await user.click(screen.getByRole("button", { name: /^add client$/i }));
    expect(await screen.findByRole("button", { name: /Northstar Foods 0/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add client reviewer/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /create campaign/i })[0]);
    await user.type(screen.getByLabelText("Campaign name"), "Festive Creator Launch");
    await user.click(within(screen.getByLabelText("Campaign name").closest("form")!).getByRole("button", { name: /^create campaign$/i }));
    const savedCampaigns = JSON.parse(window.localStorage.getItem("creatorly.campaigns.v1.demo-workspace") ?? "[]") as Array<{ clientId?: string }>;
    expect(savedCampaigns[0].clientId).toBeTruthy();

    agency.unmount();
    window.localStorage.setItem("creatorly.workspace.v1", JSON.stringify({ id: "demo-workspace", name: "Northstar Brand", kind: "brand", role: "owner" }));
    window.localStorage.removeItem("creatorly.workspace-groups.v1.demo-workspace");
    window.history.replaceState({}, "", "/app/campaigns");
    renderDemo();
    await user.click(await screen.findByRole("button", { name: /manage divisions/i }));
    expect(screen.getByRole("option", { name: "Product line" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Market" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Region" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Internal stakeholder" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Agency collaborator" })).toBeInTheDocument();
  });
});
