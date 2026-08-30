import { describe, expect, it } from "vitest";
import { exportCreatorsCsv, importErrorsCsv, parseCreatorCsv } from "./creatorImport";

describe("customer-owned creator imports", () => {
  it("parses and normalizes a valid creator row", () => {
    const preview = parseCreatorCsv(
      "name,platform,handle,email,followers,tags\nMaya,Instagram,@Maya,HELLO@maya.test,12500,beauty|lifestyle",
      [],
    );

    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 2,
      status: "ready",
      input: {
        displayName: "Maya",
        platform: "instagram",
        handle: "@Maya",
        email: "hello@maya.test",
        followerCount: 12500,
        tags: ["beauty", "lifestyle"],
      },
    });
  });

  it("reports invalid rows without preparing them for import", () => {
    const preview = parseCreatorCsv("name,platform,handle\n,Instagram,@missing\nNo identity,MySpace,", []);

    expect(preview.readyCount).toBe(0);
    expect(preview.errorCount).toBe(2);
    expect(preview.rows[0]).toMatchObject({ status: "error", errors: ["Creator name is required."] });
    expect(preview.rows[1].errors).toEqual(expect.arrayContaining(["Platform must be Instagram, TikTok, YouTube, or X.", "Add a handle, email, phone, or WhatsApp number."]));
  });

  it("detects duplicates against the CRM and within the same file", () => {
    const preview = parseCreatorCsv(
      "name,platform,handle\nMaya,instagram,@Maya\nMaya duplicate,instagram,maya",
      [{ platform: "instagram", handle: "@maya" }],
    );

    expect(preview.rows.map(row => row.status)).toEqual(["duplicate", "duplicate"]);
    expect(preview.duplicateCount).toBe(2);
  });

  it("supports quoted CSV fields and escapes exported CRM data", () => {
    const preview = parseCreatorCsv('name,platform,handle,notes\n"Maya, Studio",youtube,@maya,"Said ""yes"""', []);
    expect(preview.rows[0].input).toMatchObject({ displayName: "Maya, Studio", notes: 'Said "yes"' });

    const csv = exportCreatorsCsv([{ displayName: "Maya, Studio", notes: 'Said "yes"' }]);
    expect(csv).toContain('"Maya, Studio"');
    expect(csv).toContain('"Said ""yes"""');
  });

  it("exports duplicate and invalid rows as an import error report", () => {
    const preview = parseCreatorCsv(
      "name,platform,handle\nMaya,instagram,@maya\n,instagram,@broken",
      [{ platform: "instagram", handle: "@maya" }],
    );

    const report = importErrorsCsv(preview.rows);
    expect(report).toContain("2,duplicate,Maya");
    expect(report).toContain("3,error,,instagram,@broken");
    expect(report).toContain("Creator name is required.");
  });
});
