import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreatorResult } from "./components/CreatorResult";

describe("CreatorResult Instagram metrics", () => {
  it("shows supplied comment and engagement metrics in discovery", () => {
    render(<CreatorResult
      creator={{
        id: "creator-maya",
        platform: "instagram",
        handle: "@maya.creates",
        displayName: "Maya Kapoor",
        followerCount: 1250,
        isVerified: true,
        isDemo: false,
        contactCount: 1,
        matchScore: 80,
        instagramMetrics: { averageComments: 18, engagementRatePercent: 3.4 },
        sourceLabel: "Creatorly database",
        lastUpdatedAt: new Date("2026-08-12T00:00:00Z").getTime(),
        metricProvenance: "supplied",
      }}
      bestMatch={false}
      onOpen={vi.fn()}
    />);

    expect(screen.getByText("18 avg comments · 3.4% engagement")).toBeInTheDocument();
    expect(screen.getByText(/Creatorly database · 12 Aug 2026 · Supplied metrics/)).toBeInTheDocument();
  });

  it("renders the imported profile picture in discovery", () => {
    const { container } = render(<CreatorResult
      creator={{
        id: "creator-photo",
        platform: "instagram",
        handle: "@photo.creator",
        displayName: "Photo Creator",
        followerCount: 2500,
        isVerified: false,
        isDemo: false,
        contactCount: 0,
        matchScore: 0,
        profileImageUrl: "https://cdn.example.com/profile.jpg",
      }}
      bestMatch={false}
      onOpen={vi.fn()}
    />);

    expect(container.querySelector(".creator-portrait img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/profile.jpg",
    );
  });
});
