import { describe, expect, it } from "vitest";
import { formatFollowers } from "./format";

describe("formatFollowers", () => {
  it("does not round imported follower counts up to the same 10K label", () => {
    expect(formatFollowers(9_996)).toBe("9,996");
    expect(formatFollowers(9_550)).toBe("9,550");
  });

  it("distinguishes unavailable counts and compacts larger audiences", () => {
    expect(formatFollowers(0)).toBe("—");
    expect(formatFollowers(12_500)).toBe("12.5K");
  });
});
