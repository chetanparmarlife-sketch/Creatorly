import { describe, expect, it } from "vitest";
import {
  isAllowedProfileImageSource,
  isAllowedProfileImageType,
  MAX_PROFILE_IMAGE_BYTES,
} from "../convex/lib/profileImagePolicy";

describe("profile image migration policy", () => {
  const configuredSource = {
    PROFILE_IMAGE_SOURCE_HOST: "storage.googleapis.com",
    PROFILE_IMAGE_SOURCE_PREFIX: "/creator-images-test/",
  };

  it("accepts only the known HTTPS Instagram, YouTube, and Facebook profile-image hosts", () => {
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com/creator-images-test/account/image1",
      configuredSource,
    )).toBe(true);
    expect(isAllowedProfileImageSource(
      "http://storage.googleapis.com/creator-images-test/account/image1",
      configuredSource,
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com/another-path/account/image1",
      configuredSource,
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://another-storage.example/creator-images-test/account/image1",
      configuredSource,
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://storage.googleapis.com.evil.example/creator-images-test/account/image1",
      configuredSource,
    )).toBe(false);
    expect(isAllowedProfileImageSource(
      "https://yt3.ggpht.com/iwLF5_ed1bgYnGg4puu3glr6NROmS0gpH59WJ81tCcw8vCva59EodRtQ1sMRmyIZ4Cj6ShJEdqw=s800-c-k-c0x00ffffff-no-rj",
      configuredSource,
    )).toBe(true);
    expect(isAllowedProfileImageSource("https://yt3.googleusercontent.com/profile-image", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("https://yt3.ggpht.com.evil.example/profile-image", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("http://yt3.ggpht.com/profile-image", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("https://scontent-bom1-1.xx.fbcdn.net/v/t39.30808-1/profile.jpg?x=1", configuredSource)).toBe(true);
    expect(isAllowedProfileImageSource("https://scontent.fudr1-1.fna.fbcdn.net/v/t39.30808-1/profile.jpg?x=1", configuredSource)).toBe(true);
    expect(isAllowedProfileImageSource("https://example.fbcdn.net/v/t39.30808-1/profile.jpg", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("https://scontent-bom1-1.xx.fbcdn.net.evil.example/profile.jpg", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("http://scontent-bom1-1.xx.fbcdn.net/profile.jpg", configuredSource)).toBe(false);
    expect(isAllowedProfileImageSource("not a url", configuredSource)).toBe(false);
  });

  it("fails closed when the configured source host or prefix is missing", () => {
    const imageUrl = "https://storage.googleapis.com/creator-images-test/account/image1";
    expect(isAllowedProfileImageSource(imageUrl, {})).toBe(false);
    expect(isAllowedProfileImageSource(imageUrl, { PROFILE_IMAGE_SOURCE_HOST: configuredSource.PROFILE_IMAGE_SOURCE_HOST })).toBe(false);
    expect(isAllowedProfileImageSource(imageUrl, { PROFILE_IMAGE_SOURCE_PREFIX: configuredSource.PROFILE_IMAGE_SOURCE_PREFIX })).toBe(false);
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
