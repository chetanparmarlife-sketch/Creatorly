import { describe, expect, it } from "vitest";
import { generateEmailVerificationCode } from "../convex/lib/authEmail";

describe("Creatorly email verification", () => {
  it("creates six-digit numeric codes", () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(generateEmailVerificationCode()).toMatch(/^\d{6}$/);
    }
  });
});
