import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const creatorClaimsSource = readFileSync("convex/creatorClaims.ts", "utf8");
const adminViewSource = readFileSync("src/components/AdminView.tsx", "utf8");
const seedSource = readFileSync("convex/seed.ts", "utf8");

function exportedHandlerBody(name: string, nextName: string) {
  const start = creatorClaimsSource.indexOf(`export const ${name}`);
  const end = nextName ? creatorClaimsSource.indexOf(`export const ${nextName}`, start) : creatorClaimsSource.length;
  return creatorClaimsSource.slice(start, end);
}

describe("creator claim write boundaries", () => {
  it("keeps enrichment on the claim row and never patches the canonical creator", () => {
    const applyEnrichment = exportedHandlerBody("applyEnrichment", "saveProfile");
    expect(applyEnrichment).toContain("enrichedFollowerCount: result.followerCount");
    expect(applyEnrichment).toContain("enrichedBusinessCategoryName: result.businessCategoryName");
    expect(applyEnrichment).not.toContain("claim.creatorId");
    expect(applyEnrichment).not.toContain('db.patch(creator');
  });

  it("keeps canonical claim data writes inside the admin review handler", () => {
    const review = exportedHandlerBody("review", "");
    expect(review).toContain("await requireAdmin(ctx)");
    expect(review).toContain('db.insert("creators"');
    expect(review).toContain("db.patch(creator._id, canonical)");
    expect(review).toContain('metricProvenance: "apify"');
    expect(review).toContain("businessCategoryName: claim.enrichedBusinessCategoryName");
    expect(review).toContain("!args.contactVerified");
    expect(review).toContain('verificationStatus: "verified"');
    expect(creatorClaimsSource.match(/db\.insert\("creators"/g)).toHaveLength(1);
    expect(creatorClaimsSource.match(/db\.patch\(creator\._id, canonical\)/g)).toHaveLength(1);
    expect(seedSource).toContain("export const run = internalMutation");
    expect(seedSource).not.toContain("export const run = mutation");
  });

  it("keeps published-profile repair internal and records its audit event", () => {
    const maintenance = exportedHandlerBody("republishFromEnrichment", "");
    expect(maintenance).toContain("internalMutation");
    expect(maintenance).toContain("published_profile_refreshed_from_apify");
    expect(maintenance).toContain('verificationStatus: "verified"');
  });

  it("uses truthful ownership state and audit names", () => {
    expect(creatorClaimsSource).not.toContain("verification_pending");
    expect(creatorClaimsSource).not.toContain("verification_submitted");
    expect(creatorClaimsSource).toContain("ownership_claimed_by_user");
    expect(creatorClaimsSource).toContain("ownership_asserted_by_claimant");
    expect(creatorClaimsSource).toContain("ownership_verified_instagram_bio");
    expect(adminViewSource).toContain("Instagram bio verified automatically");
    expect(adminViewSource).toContain("asserted by claimant, not checked");
  });
});
