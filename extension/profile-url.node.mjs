import assert from "node:assert/strict";
import test from "node:test";
import "./profile-url.js";

const { detectCreatorProfile, canonicalProfileUrl } = globalThis.CreatorlyProfileUrl;

test("detects supported creator profile URLs with canonical URLs", () => {
  assert.deepEqual(detectCreatorProfile("https://instagram.com/kapilsharma/"), {
    platform: "instagram", handle: "kapilsharma", url: "https://www.instagram.com/kapilsharma/",
  });
  assert.equal(detectCreatorProfile("https://youtube.com/@kapilsharma").platform, "youtube");
  assert.equal(detectCreatorProfile("https://www.linkedin.com/in/kapil-sharma/details/"), null);
  assert.equal(detectCreatorProfile("https://www.linkedin.com/in/kapil-sharma/").platform, "linkedin");
  assert.equal(detectCreatorProfile("https://twitter.com/kapilsharma").url, "https://x.com/kapilsharma");
  assert.equal(detectCreatorProfile("https://x.com/explore"), null);
  assert.equal(detectCreatorProfile("https://instagram.com/reels/"), null);
});

test("builds complete profile URLs", () => {
  assert.equal(canonicalProfileUrl("youtube", "@Creatorly"), "https://www.youtube.com/@Creatorly");
  assert.equal(canonicalProfileUrl("linkedin", "creator-ly"), "https://www.linkedin.com/in/creator-ly/");
});
