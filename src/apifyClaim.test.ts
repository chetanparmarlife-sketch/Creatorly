import { describe, expect, it } from "vitest";
import { biographyContainsVerificationCode, mapApifyClaimProfile } from "../convex/lib/apifyClaim";

describe("Apify creator-claim mapping", () => {
  it("maps the matching profile and derives recent-post engagement", () => {
    expect(mapApifyClaimProfile([{
      username: "maya.creator",
      fullName: "Maya Kapoor",
      biography: "Beauty and wellness",
      followersCount: 10_000,
      followsCount: 250,
      postsCount: 80,
      businessCategoryName: "Digital creator",
      externalUrl: "https://maya.example",
      businessEmail: "HELLO@MAYA.EXAMPLE",
      profilePicUrlHD: "https://images.example/maya.jpg",
      verified: true,
      private: false,
      isBusinessAccount: true,
      about: { country: "India" },
      latestPosts: [{ likesCount: 500, commentsCount: 50 }, { likesCount: 400, commentsCount: 50 }],
    }], "@maya.creator")).toEqual(expect.objectContaining({
      displayName: "Maya Kapoor",
      followerCount: 10_000,
      followingCount: 250,
      postCount: 80,
      engagementRatePercent: 5,
      businessEmail: "hello@maya.example",
      businessCategoryName: "Digital creator",
      country: "India",
      categories: ["Digital creator"],
      isVerified: true,
    }));
  });

  it("rejects empty and mismatched results", () => {
    expect(() => mapApifyClaimProfile([], "maya")).toThrow(/no Instagram profile/i);
    expect(() => mapApifyClaimProfile([{ username: "someone_else" }], "maya")).toThrow(/different Instagram profile/i);
  });

  it("passes only when the Instagram biography contains the issued code", () => {
    expect(biographyContainsVerificationCode("Beauty creator · CRLY-A1B2C3D4", "crly-a1b2c3d4")).toBe(true);
    expect(biographyContainsVerificationCode("Beauty creator · collabs by email", "CRLY-A1B2C3D4")).toBe(false);
  });
});
