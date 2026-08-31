import { describe, expect, it } from "vitest";
import type { CreatorSearchResult } from "../types";
import { rankSimilarCreators } from "./similarCreators";

function creator(overrides: Partial<CreatorSearchResult> & Pick<CreatorSearchResult, "id" | "displayName">): CreatorSearchResult {
  return {
    platform: "instagram",
    handle: `@${overrides.id}`,
    followerCount: 100_000,
    categories: ["Lifestyle"],
    location: "Mumbai, India",
    contentLanguages: ["Hindi", "English"],
    profileType: "Individual creator",
    contentQuality: "Studio",
    managementType: "self_managed",
    isVerified: true,
    isDemo: false,
    contactCount: 1,
    matchScore: 0,
    ...overrides,
  };
}

describe("rankSimilarCreators", () => {
  it("prefers shared niche and a comparable audience over raw reach", () => {
    const current = creator({ id: "current", displayName: "Current", followerCount: 120_000 });
    const closeFit = creator({ id: "close", displayName: "Close fit", followerCount: 150_000 });
    const highReach = creator({ id: "large", displayName: "Large", followerCount: 2_000_000, categories: ["Technology"], location: "Delhi, India", contentLanguages: ["English"] });

    const matches = rankSimilarCreators(current, [highReach, closeFit]);

    expect(matches[0].creator.id).toBe("close");
    expect(matches[0].reasons).toEqual(expect.arrayContaining(["Lifestyle niche", "Comparable audience"]));
  });

  it("uses profile signals when category data is unavailable", () => {
    const current = creator({ id: "current", displayName: "Current", categories: undefined });
    const sameProfile = creator({ id: "same", displayName: "Same profile", categories: undefined });
    const differentProfile = creator({ id: "different", displayName: "Different profile", platform: "youtube", categories: undefined, profileType: "Creator brand", contentQuality: "Mobile", managementType: "talent_managed", location: "Pune, India", contentLanguages: ["Marathi"] });

    const matches = rankSimilarCreators(current, [differentProfile, sameProfile]);

    expect(matches[0].creator.id).toBe("same");
    expect(matches[0].reasons).toContain("Comparable audience");
  });

  it("never recommends the profile being viewed", () => {
    const current = creator({ id: "current", displayName: "Current" });
    expect(rankSimilarCreators(current, [current])).toEqual([]);
  });
});
