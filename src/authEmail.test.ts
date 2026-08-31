import { describe, expect, it } from "vitest";
import { generateEmailVerificationCode, isEmailVerificationConfigured, resolveEmailVerificationMode } from "../convex/lib/authEmail";

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

  it("fails loudly when verification settings are missing", () => {
    expect(() => resolveEmailVerificationMode({ RESEND_API_KEY: "re_test" })).toThrow("Add AUTH_EMAIL_FROM to Convex");
    expect(() => resolveEmailVerificationMode({ AUTH_EMAIL_FROM: "Creatorly <verify@example.com>" })).toThrow("Add RESEND_API_KEY to Convex");
    expect(() => resolveEmailVerificationMode({})).toThrow("Add RESEND_API_KEY and AUTH_EMAIL_FROM to Convex");
  });

  it("allows only an explicit development skip", () => {
    expect(resolveEmailVerificationMode({
      CREATORLY_ENVIRONMENT: "development",
      AUTH_EMAIL_ALLOW_UNCONFIGURED_DEVELOPMENT: "true",
    })).toBe("development_skipped");
    expect(() => resolveEmailVerificationMode({
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_ALLOW_UNCONFIGURED_DEVELOPMENT: "true",
    })).toThrow("Creatorly email verification is not configured");
  });

  it("allows an explicitly dated production bypass only before it expires", () => {
    const environment = {
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2026-09-02T18:29:59.000Z",
      RESEND_API_KEY: "re_test",
      AUTH_EMAIL_FROM: "Creatorly <onboarding@resend.dev>",
    };
    expect(resolveEmailVerificationMode(environment, Date.parse("2026-08-31T18:30:00.000Z"))).toBe("temporary_bypass");
    expect(resolveEmailVerificationMode(environment, Date.parse("2026-09-02T18:30:00.000Z"))).toBe("enabled");
  });
});
