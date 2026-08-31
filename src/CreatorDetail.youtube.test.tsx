import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorDetailData } from "./types";
import { CreatorDetail } from "./components/CreatorDetail";

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

const youtubeDetail: CreatorDetailData = {
  creator: {
    id: "youtube-1",
    platform: "youtube",
    handle: "@mayaCreates",
    displayName: "Maya Creates",
    followerCount: 12_500,
    location: "India",
    categories: ["Lifestyle"],
    isVerified: false,
    isDemo: false,
    youtubeChannelId: "UC123",
    youtubeMetrics: {
      videoCount: 81,
      totalVideoViews: 450_000,
      comments: 440,
      averageViewPercentage: 62.5,
      integratedVideoRateMin: 5_000,
      integratedVideoRateMax: 12_000,
      audience: [{ ageGroup: "18-24", gender: "Female", percentage: 42.5 }],
    },
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

describe("YouTube creator detail", () => {
  beforeEach(() => {
    getDetailMock.mockResolvedValue(youtubeDetail);
    searchMock.mockResolvedValue([]);
  });

  it("shows supplied YouTube performance, audience, and the channel-id profile URL", async () => {
    render(<CreatorDetail creatorId="youtube-1" navigate={vi.fn()} onBalanceChange={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Maya Creates" })).toBeInTheDocument();
    expect(screen.getByText("Lifetime views")).toBeInTheDocument();
    expect(screen.getByText("450K")).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
    expect(screen.getByText("440")).toBeInTheDocument();
    expect(screen.getByText("Integrated rate")).toBeInTheDocument();
    expect(screen.getByText("up to 12K")).toBeInTheDocument();
    expect(screen.getByText("42.5%")).toBeInTheDocument();
    expect(screen.getByText("18-24 · Female")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open Maya Creates on youtube/i })).toHaveAttribute("href", "https://www.youtube.com/channel/UC123");
  });
});
