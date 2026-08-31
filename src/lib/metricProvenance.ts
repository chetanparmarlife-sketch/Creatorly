export function metricProvenanceLabel(provenance: "supplied" | "live" | "apify" | undefined) {
  if (provenance === "live") return "Live metrics";
  if (provenance === "apify") return "Apify snapshot";
  return "Supplied metrics";
}
