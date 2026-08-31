import type { CreatorDetailData, CreatorSearchResult } from "../types";

type CreatorProfile = CreatorDetailData["creator"] | CreatorSearchResult;

export type SimilarCreatorMatch = {
  creator: CreatorSearchResult;
  score: number;
  reasons: string[];
};

function normalized(value?: string) {
  return value?.trim().toLocaleLowerCase("en-IN") ?? "";
}

function sharedValues(left: string[] = [], right: string[] = []) {
  const rightValues = new Set(right.map(normalized));
  return left.filter(value => rightValues.has(normalized(value)));
}

function sameValue(left?: string, right?: string) {
  return Boolean(left && right && normalized(left) === normalized(right));
}

function audienceRatio(left: number, right: number) {
  if (left <= 0 || right <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(left, right) / Math.min(left, right);
}

function managementLabel(value: CreatorProfile["managementType"]) {
  return value === "talent_managed" ? "Talent managed" : "Self managed";
}

function scoreCandidate(current: CreatorProfile, candidate: CreatorSearchResult): SimilarCreatorMatch {
  const sharedCategories = sharedValues(current.categories, candidate.categories);
  const sharedLanguages = sharedValues(current.contentLanguages, candidate.contentLanguages);
  const ratio = audienceRatio(current.followerCount, candidate.followerCount);
  const sameLocation = sameValue(current.location, candidate.location);
  const samePlatform = current.platform === candidate.platform;
  const sameProfileType = sameValue(current.profileType, candidate.profileType);
  const sameContentQuality = sameValue(current.contentQuality, candidate.contentQuality);
  const sameManagement = Boolean(current.managementType && current.managementType === candidate.managementType);
  const currentEngagement = current.instagramMetrics?.engagementRatePercent;
  const candidateEngagement = candidate.instagramMetrics?.engagementRatePercent;
  const engagementGap = currentEngagement !== undefined && candidateEngagement !== undefined
    ? Math.abs(currentEngagement - candidateEngagement)
    : Number.POSITIVE_INFINITY;

  let score = 0;
  score += Math.min(46, sharedCategories.length * 28);
  score += samePlatform ? 14 : 0;
  score += Number.isFinite(ratio) ? Math.max(0, 20 - Math.log2(ratio) * 7) : 0;
  score += sameLocation ? 10 : 0;
  score += Math.min(10, sharedLanguages.length * 5);
  score += sameProfileType ? 6 : 0;
  score += sameContentQuality ? 4 : 0;
  score += sameManagement ? 4 : 0;
  score += engagementGap <= 0.5 ? 10 : engagementGap <= 1.5 ? 6 : engagementGap <= 3 ? 3 : 0;

  const reasons: string[] = [];
  if (sharedCategories[0]) reasons.push(`${sharedCategories[0]} niche`);
  if (ratio <= 2) reasons.push("Comparable audience");
  if (sameLocation && current.location) reasons.push(`Same market · ${current.location}`);
  if (sharedLanguages[0]) reasons.push(`${sharedLanguages[0]} content`);
  if (engagementGap <= 1.5) reasons.push("Similar engagement");
  if (sameProfileType && current.profileType) reasons.push(current.profileType);
  if (sameContentQuality && current.contentQuality) reasons.push(`${current.contentQuality} production`);
  if (sameManagement && current.managementType) reasons.push(managementLabel(current.managementType));
  if (samePlatform) reasons.push(`Also on ${candidate.platform}`);

  return { creator: candidate, score, reasons: [...new Set(reasons)].slice(0, 2) };
}

export function rankSimilarCreators(
  current: CreatorProfile,
  candidates: CreatorSearchResult[],
  limit = 4,
) {
  return candidates
    .filter(candidate => candidate.id !== current.id)
    .map(candidate => scoreCandidate(current, candidate))
    .filter(match => match.score > 0)
    .sort((left, right) =>
      right.score - left.score
      || audienceRatio(current.followerCount, left.creator.followerCount) - audienceRatio(current.followerCount, right.creator.followerCount)
      || left.creator.displayName.localeCompare(right.creator.displayName)
    )
    .slice(0, limit);
}
