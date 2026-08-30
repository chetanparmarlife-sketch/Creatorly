export const MIN_REPOSITORY_FOLLOWERS = 1_000;

export function isRepositoryEligible(followerCount: number) {
  return Number.isFinite(followerCount) && Number.isInteger(followerCount) && followerCount >= MIN_REPOSITORY_FOLLOWERS;
}
