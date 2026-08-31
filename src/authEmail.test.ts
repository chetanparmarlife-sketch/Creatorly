import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateEmailVerificationCode, isEmailVerificationConfigured, resolveEmailVerificationMode, resolveEmailVerificationProviderMode, warnTemporaryBypassSignup } from "../convex/lib/authEmail";

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

  it("allows a 24-hour production bypass only when Resend is unconfigured", () => {
    const bypassEnvironment = {
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2026-09-01T18:30:00.000Z",
    };
    expect(resolveEmailVerificationMode(bypassEnvironment, Date.parse("2026-08-31T18:30:00.000Z"))).toBe("temporary_bypass");
    expect(resolveEmailVerificationMode({
      ...bypassEnvironment,
      RESEND_API_KEY: "re_test",
      AUTH_EMAIL_FROM: "Creatorly <onboarding@resend.dev>",
    }, Date.parse("2026-08-31T18:30:00.000Z"))).toBe("enabled");
  });

  it("rejects a temporary bypass more than 72 hours in the future", () => {
    expect(() => resolveEmailVerificationMode({
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2030-01-01T00:00:00.000Z",
    }, Date.parse("2026-08-31T18:30:00.000Z"))).toThrow("cannot be more than 72 hours in the future");
  });

  it("defers temporary bypass time checks until a signup request", () => {
    const environment = {
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2026-09-02T18:29:59.000Z",
    };
    expect(resolveEmailVerificationProviderMode(environment)).toBe("temporary_bypass");
    expect(resolveEmailVerificationMode(environment, Date.parse("2026-08-31T18:30:00.000Z"))).toBe("temporary_bypass");
    expect(() => resolveEmailVerificationMode(environment, Date.parse("2026-09-02T18:30:00.000Z"))).toThrow("Creatorly email verification is not configured");
  });

  it("keeps invalid bypass dates on the existing missing-configuration path", () => {
    expect(() => resolveEmailVerificationMode({
      CREATORLY_ENVIRONMENT: "production",
      AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "not-a-date",
    })).toThrow("Creatorly email verification is not configured");
  });

  it("warns on a bypass signup with the exact expiry", () => {
    const warnings: string[] = [];
    warnTemporaryBypassSignup({ AUTH_EMAIL_TEMPORARY_BYPASS_UNTIL: "2026-09-01T18:30:00.000Z" }, message => warnings.push(message));
    expect(warnings).toEqual(["Creatorly email verification temporary bypass is active for this signup until 2026-09-01T18:30:00.000Z."]);
    const authSource = readFileSync("convex/auth.ts", "utf8");
    expect(authSource).toContain('params.flow === "signUp" && emailVerificationMode === "temporary_bypass"');
    expect(authSource).toContain("resolveEmailVerificationMode();");
  });
});
