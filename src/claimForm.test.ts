import { describe, expect, it } from "vitest";
import type { CreatorClaim } from "./types";
import { claimFormFromClaim, mergeUntouchedClaimForm } from "./features/claim/claimForm";

function claim(overrides: Partial<CreatorClaim> = {}): CreatorClaim {
  return {
    _id: "claim-1",
    instagramHandle: "@maya",
    instagramUrl: "https://instagram.com/maya",
    displayName: "Maya",
    categories: [],
    languages: [],
    contactPreference: "direct",
    rates: [],
    status: "enrichment_pending",
    updatedAt: 1,
    assets: [],
    ...overrides,
  };
}

describe("claim form enrichment merge", () => {
  it("fills untouched fields when Apify completes after the wizard opens", () => {
    const initial = claimFormFromClaim(claim());
    const enriched = claim({
      biography: "Public Instagram biography",
      categories: ["Digital creator"],
      websiteUrl: "https://maya.example",
      enrichmentStatus: "complete",
    });

    expect(mergeUntouchedClaimForm(initial, enriched, new Set())).toEqual(expect.objectContaining({
      biography: "Public Instagram biography",
      categories: "Digital creator",
      websiteUrl: "https://maya.example",
    }));
  });

  it("never replaces fields the claimant already edited", () => {
    const current = { ...claimFormFromClaim(claim()), biography: "My own biography" };
    const enriched = claim({ biography: "Public Instagram biography", categories: ["Digital creator"] });
    const merged = mergeUntouchedClaimForm(current, enriched, new Set(["biography"]));

    expect(merged.biography).toBe("My own biography");
    expect(merged.categories).toBe("Digital creator");
  });
});
