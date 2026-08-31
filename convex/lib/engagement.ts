type EngagementSource = {
  engagementRatePercent?: number;
  instagramMetrics?: { engagementRatePercent?: number };
  facebookMetrics?: { engagementRatePercent?: number };
  youtubeMetrics?: { likes?: number; comments?: number; shares?: number; views?: number };
};

export function creatorEngagementRatePercent(creator: EngagementSource) {
  const supplied = creator.engagementRatePercent
    ?? creator.instagramMetrics?.engagementRatePercent
    ?? creator.facebookMetrics?.engagementRatePercent;
  if (supplied !== undefined && Number.isFinite(supplied) && supplied >= 0) return supplied;

  const views = creator.youtubeMetrics?.views;
  if (views === undefined || !Number.isFinite(views) || views <= 0) return undefined;
  const interactions = (creator.youtubeMetrics?.likes ?? 0)
    + (creator.youtubeMetrics?.comments ?? 0)
    + (creator.youtubeMetrics?.shares ?? 0);
  return interactions > 0 ? (interactions / views) * 100 : undefined;
}
