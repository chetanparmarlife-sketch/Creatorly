import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { DemoDataProvider } from "./data/AppData";

function renderDemo() {
  return render(
    <DemoDataProvider>
      <App />
    </DemoDataProvider>,
  );
}

describe("Creatorly M1 user journey", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/search");
  });

  afterEach(cleanup);

  it("signs up, searches, unlocks once, and preserves access after remount", async () => {
    const user = userEvent.setup();
    const firstRender = renderDemo();

    await user.type(screen.getByLabelText("Full name"), "Aisha Shah");
    await user.type(screen.getByLabelText("Agency name"), "Northstar Agency");
    await user.type(screen.getByLabelText("Work email"), "aisha@northstar.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /create free account/i }));

    expect(await screen.findByRole("heading", { name: /who do you need to reach/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Creator name or handle"), "maya.creates.official");
    await user.click(await screen.findByRole("button", { name: /Maya Kapoor/i }));

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
});
