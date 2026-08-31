import { describe, expect, it } from "vitest";
import { buildImportedCreatorFields, facebookPageUrl, importedPlatform } from "../convex/lib/creatorImportMapping";

describe("Facebook creator import mapping", () => {
  it("keeps Facebook identity and supplied metrics", () => {
    const fields = buildImportedCreatorFields({
      platform: "facebook",
      displayName: "Maya Creates",
      followerCount: 12_500,
      categories: ["Digital creator"],
      facebookPageId: "123456",
      facebookMetrics: {
        engagementRatePercent: 3.4,
        pageEngagedUsers: 6_400,
        audience: [{ ageGroup: "18-24", gender: "Female", value: 4_200 }],
      },
    }, 1_725_100_000_000);

    expect(importedPlatform({ platform: "facebook" })).toBe("facebook");
    expect(fields.facebookPageId).toBe("123456");
    expect(fields.facebookMetrics).toMatchObject({ engagementRatePercent: 3.4, pageEngagedUsers: 6_400 });
    expect(fields.engagementRatePercent).toBe(3.4);
    expect(fields.engagementRateBasis).toBe("followers");
    expect(fields.primaryCategory).toBe("digital creator");
  });

  it("builds a username URL and falls back to the stable page ID", () => {
    expect(facebookPageUrl("123456", "@maya.creates")).toBe("https://www.facebook.com/maya.creates");
    expect(facebookPageUrl("123456")).toBe("https://www.facebook.com/profile.php?id=123456");
  });
});
