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
});
