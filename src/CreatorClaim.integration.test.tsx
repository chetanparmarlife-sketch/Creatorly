import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { DemoDataProvider } from "./data/AppData";
import { DemoWorkspaceDataProvider } from "./features/workspace/WorkspaceData";

function renderDemo() {
  return render(<DemoDataProvider><DemoWorkspaceDataProvider><App/></DemoWorkspaceDataProvider></DemoDataProvider>);
}

describe("creator profile claim", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/claim");
  });
  afterEach(cleanup);

  it("starts from an Instagram handle and reaches the creator profile editor", async () => {
    const user = userEvent.setup();
    renderDemo();

    expect(screen.getByRole("heading", { name: /own the profile brands see/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Instagram URL or handle"), "@maya.creator");
    await user.click(screen.getByRole("button", { name: /claim my profile/i }));

    expect(window.location.pathname).toBe("/signup");
    expect(screen.queryByLabelText("Agency name")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Full name"), "Maya Kapoor");
    await user.type(screen.getByLabelText("Work email"), "maya@creator.test");
    await user.type(screen.getByLabelText("Password"), "creatorly123");
    await user.click(screen.getByRole("button", { name: /continue profile claim/i }));

    await waitFor(() => expect(window.location.pathname).toBe("/claim/profile"));
    await user.click(await screen.findByRole("button", { name: /start claim/i }));
    expect(await screen.findByRole("heading", { name: /shape your public profile/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("maya.creator")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("creatorly.demoCreatorClaim") ?? "null")).toEqual(expect.objectContaining({ instagramHandle: "@maya.creator", contactPreference: "direct" }));
  });
});
