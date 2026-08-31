export function metricProvenanceLabel(provenance: "supplied" | "live" | "apify" | undefined) {
  if (provenance === "live") return "Live metrics";
  if (provenance === "apify") return "Recently refreshed";
  return "Supplied metrics";
}
