import { describe, expect, it } from "vitest";
import { creatorEngagementRatePercent } from "../convex/lib/engagement";

describe("creator engagement rate", () => {
  it("labels supplied Instagram engagement as follower based", () => {
    expect(creatorEngagementRatePercent({
      platform: "instagram",
      instagramMetrics: { engagementRatePercent: 4.8 },
    })).toEqual({ percent: 4.8, basis: "followers" });
  });

  it("labels calculated YouTube engagement as view based", () => {
    const result = creatorEngagementRatePercent({
      platform: "youtube",
      youtubeMetrics: { views: 10_000, likes: 300, comments: 50, shares: 10 },
    });
    expect(result?.basis).toBe("views");
    expect(result?.percent).toBeCloseTo(3.6);
  });
});
