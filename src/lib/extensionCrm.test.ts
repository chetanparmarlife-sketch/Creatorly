import { describe, expect, it } from "vitest";
import {
  canExtensionMemberSave,
  extensionProfileKey,
  normalizeExtensionHandle,
} from "../../convex/lib/extensionCrm";

describe("extension CRM identity", () => {
  it("normalizes social handles consistently", () => {
    expect(normalizeExtensionHandle(" @Maya.Creates_Official ")).toBe("maya.creates_official");
  });

  it("builds a workspace duplicate key from platform and handle", () => {
    expect(extensionProfileKey("instagram", "@Maya.Creates")).toBe("instagram:maya.creates");
  });

  it("allows operating roles and blocks read-only reviewers", () => {
    expect(canExtensionMemberSave("owner")).toBe(true);
    expect(canExtensionMemberSave("contributor")).toBe(true);
    expect(canExtensionMemberSave("reviewer")).toBe(false);
  });
});
