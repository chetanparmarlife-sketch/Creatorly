import { describe, expect, it } from "vitest";
import { isRepositoryEligible, MIN_REPOSITORY_FOLLOWERS } from "../../convex/lib/repositoryPolicy";

describe("repository follower policy", () => {
  it("stores only creators with at least 1,000 followers", () => {
    expect(MIN_REPOSITORY_FOLLOWERS).toBe(1_000);
    expect(isRepositoryEligible(999)).toBe(false);
    expect(isRepositoryEligible(1_000)).toBe(true);
    expect(isRepositoryEligible(9_996)).toBe(true);
  });
});
