export type MatchableCreator = {
  handle: string;
  normalizedHandle: string;
  displayName: string;
};

const LEADING_PREFIX = /^(?:the|real)(?=[a-z0-9])/;
const TRAILING_SUFFIX = /official$/;
const NON_ALPHANUMERIC = /[^a-z0-9]/g;

export function normalizeCreatorQuery(value: string): string {
  let normalized = value.trim().toLowerCase().replace(/^@/, "");
  normalized = normalized.replace(NON_ALPHANUMERIC, "");
  normalized = normalized.replace(LEADING_PREFIX, "");
  normalized = normalized.replace(TRAILING_SUFFIX, "");
  return normalized;
}

export function rankCreatorMatch(
  query: string,
  creator: MatchableCreator,
): number | null {
  const rawQuery = query.trim().toLowerCase().replace(/^@/, "");
  if (!rawQuery) return null;

  const handle = creator.handle.toLowerCase().replace(/^@/, "");
  if (rawQuery === handle) return 100;

  const normalizedQuery = normalizeCreatorQuery(rawQuery);
  if (!normalizedQuery) return null;
  if (normalizedQuery === creator.normalizedHandle) return 90;

  const normalizedName = normalizeCreatorQuery(creator.displayName);
  if (normalizedName === normalizedQuery) return 80;
  if (
    normalizedQuery.length >= 3 &&
    (creator.normalizedHandle.includes(normalizedQuery) ||
      normalizedName.includes(normalizedQuery))
  ) {
    return 60 - Math.abs(creator.normalizedHandle.length - normalizedQuery.length);
  }

  return null;
}
