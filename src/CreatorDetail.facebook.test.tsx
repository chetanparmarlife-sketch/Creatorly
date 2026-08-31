import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorDetail } from "./components/CreatorDetail";
import type { CreatorDetailData } from "./types";

const { getDetailMock, searchMock } = vi.hoisted(() => ({
  getDetailMock: vi.fn(),
  searchMock: vi.fn(),
}));

vi.mock("./data/AppData", () => ({
  useAppData: () => ({
    getDetail: getDetailMock,
    search: searchMock,
    unlock: vi.fn(),
  }),
}));

const facebookDetail: CreatorDetailData = {
  creator: {
    id: "facebook-1",
    platform: "facebook",
    handle: "@maya.creates",
    displayName: "Maya Creates",
    followerCount: 12_500,
    categories: ["Digital creator"],
    isVerified: false,
    isDemo: false,
    facebookPageId: "123456",
    facebookMetrics: {
      engagementRatePercent: 3.4,
      pageEngagedUsers: 6_400,
      pageImpressions: 22_000,
      postRateMin: 5_000,
      postRateMax: 9_000,
      websiteUrl: "https://maya.example",
      audience: [{ ageGroup: "18-24", gender: "Female", value: 4_200 }],
      audienceCities: [{ city: "Mumbai", value: 2_300 }],
    },
    socialProfiles: [{
      platform: "facebook",
      handle: "@maya.creates",
      url: "https://www.facebook.com/maya.creates",
      followerCount: 12_500,
    }],
    sourceLabel: "Creatorly database",
    lastUpdatedAt: 1_725_000_000_000,
    metricProvenance: "supplied",
  },
  isUnlocked: false,
  expiresAt: null,
  creditBalance: 25,
  currentPlanTier: "free",
  availableContactCount: 0,
  hiddenProContactCount: 0,
  pendingContactCount: 0,
  contacts: [],
};

describe("Facebook creator detail", () => {
  beforeEach(() => {
    getDetailMock.mockResolvedValue(facebookDetail);
    searchMock.mockResolvedValue([]);
  });

  it("shows supplied Facebook performance, audience, city, and profile URL", async () => {
    render(<CreatorDetail creatorId="facebook-1" navigate={vi.fn()} onBalanceChange={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Maya Creates" })).toBeInTheDocument();
    expect(screen.getByText("Engaged users")).toBeInTheDocument();
    expect(screen.getByText("6,400")).toBeInTheDocument();
    expect(screen.getByText("Page impressions")).toBeInTheDocument();
    expect(screen.getByText("22K")).toBeInTheDocument();
    expect(screen.getByText("up to 9,000")).toBeInTheDocument();
    expect(screen.getByText("18-24 · Female")).toBeInTheDocument();
    expect(screen.getByText("Mumbai")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open Maya Creates on facebook/i })).toHaveAttribute("href", "https://www.facebook.com/maya.creates");
  });
});
