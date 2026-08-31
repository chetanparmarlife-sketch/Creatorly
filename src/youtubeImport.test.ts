import { describe, expect, it } from "vitest";
import { buildImportedCreatorFields, importedPlatform, youtubeChannelUrl } from "../convex/lib/creatorImportMapping";

describe("YouTube repository import mapping", () => {
  it("keeps legacy staging rows on Instagram", () => {
    expect(importedPlatform({})).toBe("instagram");
    expect(importedPlatform({ platform: "youtube" })).toBe("youtube");
  });

  it("maps YouTube channel identity and performance without raw source fields", () => {
    const fields = buildImportedCreatorFields({
      platform: "youtube",
      displayName: "Maya Creates",
      followerCount: 12_500,
      categories: ["Lifestyle"],
      isVerified: false,
      youtubeChannelId: "UC123",
      youtubeMetrics: { videoCount: 81, views: 10_000, likes: 300, comments: 50, shares: 10, averageViewPercentage: 62.5 },
    }, 1_725_000_000_000);

    expect(fields).toMatchObject({
      displayName: "Maya Creates",
      followerCount: 12_500,
      youtubeChannelId: "UC123",
      youtubeMetrics: { videoCount: 81, views: 10_000, likes: 300, comments: 50, shares: 10, averageViewPercentage: 62.5 },
      engagementRateBasis: "views",
      isDemo: false,
      lastUpdatedAt: 1_725_000_000_000,
    });
    expect(fields).not.toHaveProperty("youtubeApiResponse");
    expect(fields.engagementRatePercent).toBeCloseTo(3.6);
  });

  it("uses a stable channel-id URL", () => {
    expect(youtubeChannelUrl("UC123")).toBe("https://www.youtube.com/channel/UC123");
  });
});
