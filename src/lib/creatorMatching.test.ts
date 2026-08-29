import { describe, expect, it } from "vitest";
import {
  normalizeCreatorQuery,
  rankCreatorMatch,
  type MatchableCreator,
} from "./creatorMatching";

const creator: MatchableCreator = {
  handle: "@maya_creates",
  normalizedHandle: "mayacreates",
  displayName: "Maya Kapoor",
};

describe("normalizeCreatorQuery", () => {
  it("removes handles, punctuation, and official suffixes", () => {
    expect(normalizeCreatorQuery(" @Maya.Creates_Official ")).toBe("mayacreates");
  });

  it("removes common real and the prefixes", () => {
    expect(normalizeCreatorQuery("the_maya")).toBe("maya");
    expect(normalizeCreatorQuery("real.maya")).toBe("maya");
  });
});

describe("rankCreatorMatch", () => {
  it("ranks an exact handle first", () => {
    expect(rankCreatorMatch("@maya_creates", creator)).toBe(100);
  });

  it("ranks a normalized handle second", () => {
    expect(rankCreatorMatch("maya.creates.official", creator)).toBe(90);
  });

  it("matches an exact display name", () => {
    expect(rankCreatorMatch("Maya Kapoor", creator)).toBe(80);
  });

  it("supports useful partial matches", () => {
    expect(rankCreatorMatch("kapoor", creator)).toBeGreaterThan(0);
  });

  it("rejects empty and unrelated searches", () => {
    expect(rankCreatorMatch("", creator)).toBeNull();
    expect(rankCreatorMatch("northstar", creator)).toBeNull();
  });
});
