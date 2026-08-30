import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("Creatorly M1 user journey", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/search");
  });

  afterEach(cleanup);

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

  it("renders hero statuses as plain labels instead of controls", () => {
    window.history.replaceState({}, "", "/");
    renderDemo();

    const matched = screen.getByText("Matched");
    const access = screen.getByText("VERIFICATION IN PROGRESS");
    expect(matched.tagName).toBe("SPAN");
    expect(access.tagName).toBe("SPAN");
    expect(window.getComputedStyle(matched).cursor).not.toBe("pointer");
    expect(window.getComputedStyle(access).cursor).not.toBe("pointer");
  });

  it("signs up, searches, unlocks once, and preserves access after remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(await screen.findByRole("heading", { name: /who do you need to reach/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse lifestyle creators/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Creator name or handle"), "maya.creates.official");
    const mayaResult = await screen.findByRole("button", { name: /Maya Kapoor/i });
    expect(mayaResult).toHaveTextContent("Lifestyle");
    await user.click(mayaResult);

    expect(await screen.findByRole("heading", { name: /creator profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /similar creators/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /reveal 1 contact/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /unlock for 5 credits/i }));

    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("20")).toBeInTheDocument());

    firstRender.unmount();
    renderDemo();

    expect(await screen.findByText("hello.maya@example.test")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
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
    expect(screen.getByText("20")).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByText("20")).toBeInTheDocument());
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
    expect(screen.getAllByText(/India-focused Instagram creators/i)).toHaveLength(2);
    expect(screen.getAllByText(/YouTube coverage is not loaded yet/i)).toHaveLength(2);
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

  it("upgrades to Pro through DemoPay and adds plan credits", async () => {
    const user = userEvent.setup();
    renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await user.click(await screen.findByRole("button", { name: /^pricing$/i }));
    await user.click(screen.getByRole("button", { name: /choose pro/i }));
    expect(screen.getByRole("dialog", { name: /pro plan/i })).toHaveTextContent(/no real money/i);
    await user.click(screen.getByRole("button", { name: /confirm demo payment/i }));
    expect(await screen.findByRole("heading", { name: /demo payment complete/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /return to search/i }));
    await waitFor(() => expect(screen.getByTitle("Credits available")).toHaveTextContent("275"));
  });

  it("returns to workspace onboarding step 3 after a hard-refresh-style remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderDemo();
    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));
    await screen.findByRole("heading", { name: /who do you need to reach/i });

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
});
