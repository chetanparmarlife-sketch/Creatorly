import { describe, expect, it } from "vitest";
import {
  isAllowedProfileImageSource,
  isAllowedProfileImageType,
  MAX_PROFILE_IMAGE_BYTES,
} from "../convex/lib/profileImagePolicy";

describe("profile image migration policy", () => {
  it("accepts only the known HTTPS Instagram, YouTube, and Facebook profile-image hosts", () => {
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
    expect(isAllowedProfileImageSource(
      "https://yt3.ggpht.com/iwLF5_ed1bgYnGg4puu3glr6NROmS0gpH59WJ81tCcw8vCva59EodRtQ1sMRmyIZ4Cj6ShJEdqw=s800-c-k-c0x00ffffff-no-rj",
    )).toBe(true);
    expect(isAllowedProfileImageSource("https://yt3.googleusercontent.com/profile-image")).toBe(false);
    expect(isAllowedProfileImageSource("https://yt3.ggpht.com.evil.example/profile-image")).toBe(false);
    expect(isAllowedProfileImageSource("http://yt3.ggpht.com/profile-image")).toBe(false);
    expect(isAllowedProfileImageSource("https://scontent-bom1-1.xx.fbcdn.net/v/t39.30808-1/profile.jpg?x=1")).toBe(true);
    expect(isAllowedProfileImageSource("https://example.fbcdn.net/v/t39.30808-1/profile.jpg")).toBe(false);
    expect(isAllowedProfileImageSource("https://scontent-bom1-1.xx.fbcdn.net.evil.example/profile.jpg")).toBe(false);
    expect(isAllowedProfileImageSource("http://scontent-bom1-1.xx.fbcdn.net/profile.jpg")).toBe(false);
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
