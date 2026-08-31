import { describe, expect, it } from "vitest";
import { generateEmailVerificationCode, isEmailVerificationConfigured } from "../convex/lib/authEmail";

describe("Creatorly email verification", () => {
  it("creates six-digit numeric codes", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(generateEmailVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it("enables verification only when both Resend settings exist", () => {
    expect(isEmailVerificationConfigured({ RESEND_API_KEY: "re_test", AUTH_EMAIL_FROM: "Creatorly <verify@example.com>" })).toBe(true);
    expect(isEmailVerificationConfigured({ RESEND_API_KEY: "re_test", AUTH_EMAIL_FROM: undefined })).toBe(false);
    expect(isEmailVerificationConfigured({ RESEND_API_KEY: undefined, AUTH_EMAIL_FROM: "Creatorly <verify@example.com>" })).toBe(false);
    expect(isEmailVerificationConfigured({ RESEND_API_KEY: " ", AUTH_EMAIL_FROM: " " })).toBe(false);
  });
});
