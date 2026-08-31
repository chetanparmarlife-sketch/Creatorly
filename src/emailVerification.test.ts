import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isEmailVerificationBypassed, isEmailVerified, requireVerifiedEmail } from "../convex/lib/emailVerification";
import { isEmailVerificationRequired } from "./components/EmailVerificationPrompt";

describe("verified-email enforcement", () => {
  it("accepts either the auth timestamp or the legacy verified flag", () => {
    expect(isEmailVerified({ emailVerificationTime: 1, isEmailVerified: false })).toBe(true);
    expect(isEmailVerified({ isEmailVerified: true })).toBe(true);
    expect(isEmailVerified({ emailVerificationTime: undefined, isEmailVerified: false })).toBe(false);
  });

  it.each([
    "unlock creator contacts",
    "start checkout",
    "start an ownership claim",
  ])("refuses an unverified account before it can %s", (operation) => {
    const verificationEnabled = {
      RESEND_API_KEY: "re_test",
      AUTH_EMAIL_FROM: "Creatorly <verify@example.com>",
    };
    expect(() => requireVerifiedEmail({ isEmailVerified: false }, operation, verificationEnabled)).toThrow(`Verify your email first, then ${operation}.`);
    expect(() => requireVerifiedEmail({ emailVerificationTime: Date.now() }, operation, verificationEnabled)).not.toThrow();
  });

  it("honors the temporary production bypass until its exact expiry", () => {
    const environment = {
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2026-09-02T18:29:59.000Z",
    };
    const beforeExpiry = Date.parse("2026-09-02T18:29:58.000Z");
    const atExpiry = Date.parse("2026-09-02T18:29:59.000Z");

    expect(isEmailVerificationBypassed(environment, beforeExpiry)).toBe(true);
    expect(() => requireVerifiedEmail({ isEmailVerified: false }, "start an ownership claim", environment, beforeExpiry)).not.toThrow();
    expect(isEmailVerificationBypassed(environment, atExpiry)).toBe(false);
    expect(() => requireVerifiedEmail({ isEmailVerified: false }, "start an ownership claim", environment, atExpiry)).toThrow("Verify your email first");
  });

  it("keeps every protected handler wired to the shared rule", () => {
    const unlocks = readFileSync("convex/unlocks.ts", "utf8");
    const billing = readFileSync("convex/billing.ts", "utf8");
    const claims = readFileSync("convex/creatorClaims.ts", "utf8");
    expect(unlocks).toContain('requireVerifiedEmail(user, "unlock creator contacts")');
    expect(billing).toContain('requireVerifiedEmail(user, "start checkout")');
    expect(claims).toContain('requireVerifiedEmail(user, "start an ownership claim")');
  });

  it("recognizes the backend block so the UI can offer verification", () => {
    expect(isEmailVerificationRequired("Verify your email first, then start checkout.")).toBe(true);
    expect(isEmailVerificationRequired("Dodo Payments is not configured yet.")).toBe(false);
  });
});
