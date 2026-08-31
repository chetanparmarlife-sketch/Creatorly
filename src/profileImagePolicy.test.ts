import { describe, expect, it } from "vitest";
import {
  isAllowedProfileImageSource,
  isAllowedProfileImageType,
  MAX_PROFILE_IMAGE_BYTES,
} from "../convex/lib/profileImagePolicy";

describe("profile image migration policy", () => {
  it("accepts only the known HTTPS Opportune profile-image path", () => {
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com/opportune-production.appspot.com/scrapedInstagramInfluencers/9c44a65c07/image1732998900",
    )).toBe(true);
    expect(isAllowedProfileImageSource(
      "http://storage.googleapis.com/opportune-production.appspot.com/scrapedInstagramInfluencers/id/image1",
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com/another-bucket/scrapedInstagramInfluencers/id/image1",
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com/opportune-production.appspot.com/not-profile-images/image1",
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com.evil.example/opportune-production.appspot.com/scrapedInstagramInfluencers/id/image1",
    )).toBe(false);
    expect(isAllowedProfileImageSource("not a url")).toBe(false);
  });

  it("accepts web image types and caps each source file at one MiB", () => {
    expect(isAllowedProfileImageType("image/jpeg")).toBe(true);
    expect(isAllowedProfileImageType("image/png; charset=binary")).toBe(true);
    expect(isAllowedProfileImageType("image/webp")).toBe(true);
    expect(isAllowedProfileImageType("image/svg+xml")).toBe(false);
    expect(isAllowedProfileImageType("text/html")).toBe(false);
    expect(MAX_PROFILE_IMAGE_BYTES).toBe(1_048_576);
  });
});
