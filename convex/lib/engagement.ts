type EngagementSource = {
  engagementRatePercent?: number;
  engagementRateBasis?: EngagementRateBasis;
  platform?: string;
  instagramMetrics?: { engagementRatePercent?: number };
  facebookMetrics?: { engagementRatePercent?: number };
  youtubeMetrics?: { likes?: number; comments?: number; shares?: number; views?: number };
};

export type EngagementRateBasis = "followers" | "views";

export function creatorEngagementRatePercent(creator: EngagementSource) {
  if (
    creator.engagementRatePercent !== undefined
    && creator.engagementRateBasis !== undefined
    && Number.isFinite(creator.engagementRatePercent)
    && creator.engagementRatePercent >= 0
  ) {
    return { percent: creator.engagementRatePercent, basis: creator.engagementRateBasis };
  }
  const supplied = creator.engagementRatePercent
    ?? creator.instagramMetrics?.engagementRatePercent
    ?? creator.facebookMetrics?.engagementRatePercent;
  if (supplied !== undefined && Number.isFinite(supplied) && supplied >= 0 && creator.platform !== "youtube") {
    return { percent: supplied, basis: "followers" as const };
  }

  const views = creator.youtubeMetrics?.views;
  if (views === undefined || !Number.isFinite(views) || views <= 0) return undefined;
  const interactions = (creator.youtubeMetrics?.likes ?? 0)
    + (creator.youtubeMetrics?.comments ?? 0)
    + (creator.youtubeMetrics?.shares ?? 0);
  return interactions > 0 ? { percent: (interactions / views) * 100, basis: "views" as const } : undefined;
}
