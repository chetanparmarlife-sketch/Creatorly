import { describe, expect, it } from "vitest";
import { metricProvenanceLabel } from "./lib/metricProvenance";

describe("metric provenance labels", () => {
  it("distinguishes Apify snapshots from supplied and live metrics", () => {
    expect(metricProvenanceLabel("apify")).toBe("Recently refreshed");
    expect(metricProvenanceLabel("live")).toBe("Live metrics");
    expect(metricProvenanceLabel("supplied")).toBe("Supplied metrics");
    expect(metricProvenanceLabel(undefined)).toBe("Supplied metrics");
  });
});
