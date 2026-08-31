import type { CreatorClaim, CreatorClaimLookup, CreatorClaimProfileInput, CreatorVerificationMethod } from "../../types";

const CLAIM_KEY = "creatorly.demoCreatorClaim";

function readClaim(): CreatorClaim | null {
  const raw = window.localStorage.getItem(CLAIM_KEY);
  return raw ? JSON.parse(raw) as CreatorClaim : null;
}

function writeClaim(claim: CreatorClaim) {
  window.localStorage.setItem(CLAIM_KEY, JSON.stringify(claim));
  return claim;
}

export const demoClaimData = {
  async lookupInstagram(input: string): Promise<CreatorClaimLookup> {
    const candidate = input.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(candidate)) throw new Error("Enter a valid Instagram profile URL or handle.");
    return { normalizedHandle: candidate.toLowerCase(), instagramUrl: `https://www.instagram.com/${candidate}/`, match: null };
  },
  async getMine() { return readClaim(); },
  async start(input: string) {
    const identity = await this.lookupInstagram(input);
    const existing = readClaim();
    if (existing) return { claimId: existing._id };
    const now = Date.now();
    const claim = writeClaim({
      _id: `demo-claim-${now}`,
      instagramHandle: `@${identity.normalizedHandle}`,
      instagramUrl: identity.instagramUrl,
      displayName: identity.normalizedHandle,
      categories: [], languages: [], contactPreference: "direct", rates: [],
      status: "enrichment_pending", enrichmentStatus: "queued", updatedAt: now, assets: [],
    });
    return { claimId: claim._id };
  },
  async saveProfile(input: CreatorClaimProfileInput) {
    const claim = readClaim();
    if (!claim) throw new Error("Start a profile claim first.");
    const ready = Boolean(input.displayName && input.categories.length && input.languages.length && input.country && (input.contactPreference === "not_contactable" || input.businessEmail || input.whatsapp || input.managerEmail || input.managerWhatsapp));
    writeClaim({ ...claim, ...input, status: ready ? "ready_for_verification" : "draft", updatedAt: Date.now() });
  },
  async uploadAsset(claimId: string, kind: "media_kit" | "audience_screenshot", file: File, label?: string) {
    const claim = readClaim();
    if (!claim || claim._id !== claimId) throw new Error("Claim not found.");
    const asset = { _id: `demo-asset-${Date.now()}`, kind, fileName: file.name, contentType: file.type, byteSize: file.size, label, url: null, createdAt: Date.now() };
    writeClaim({ ...claim, assets: kind === "media_kit" ? [...claim.assets.filter(item => item.kind !== kind), asset] : [...claim.assets, asset], updatedAt: Date.now() });
  },
  async removeAsset(assetId: string) {
    const claim = readClaim();
    if (claim) writeClaim({ ...claim, assets: claim.assets.filter(item => item._id !== assetId), updatedAt: Date.now() });
  },
  async issueVerification(claimId: string, method: CreatorVerificationMethod) {
    const claim = readClaim();
    if (!claim || claim._id !== claimId) throw new Error("Claim not found.");
    const code = `CRLY-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const expiresAt = Date.now() + 86_400_000;
    writeClaim({ ...claim, verificationMethod: method, verificationCode: code, verificationExpiresAt: expiresAt, status: "ready_for_verification", updatedAt: Date.now() });
    return { code, expiresAt };
  },
  async submitVerification(claimId: string) {
    const claim = readClaim();
    if (!claim || claim._id !== claimId || !claim.verificationCode) throw new Error("Choose a verification method first.");
    writeClaim({ ...claim, status: "ownership_claimed_by_user", verificationSubmittedAt: Date.now(), updatedAt: Date.now() });
  },
  async submitForReview(claimId: string, acceptTerms: boolean) {
    const claim = readClaim();
    if (!claim || claim._id !== claimId) throw new Error("Claim not found.");
    if (!acceptTerms) throw new Error("Accept the profile declaration before submitting.");
    writeClaim({ ...claim, status: "review_required", termsAcceptedAt: Date.now(), updatedAt: Date.now() });
  },
};
