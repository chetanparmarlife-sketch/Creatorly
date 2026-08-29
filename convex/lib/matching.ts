import type { Doc } from "../_generated/dataModel";

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

export function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(NON_ALPHANUMERIC, "")
    .replace(/^(?:the|real)(?=[a-z0-9])/, "")
    .replace(/official$/, "");
}

export function score(query: string, creator: Doc<"creators">) {
  const raw = query.trim().toLowerCase().replace(/^@/, "");
  if (!raw) return null;
  if (raw === creator.handle.toLowerCase().replace(/^@/, "")) return 100;

  const base = normalize(raw);
  if (!base) return null;
  if (base === creator.normalizedHandle) return 90;

  const displayName = normalize(creator.displayName);
  if (base === displayName) return 80;
  if (
    base.length >= 3 &&
    (creator.normalizedHandle.includes(base) || displayName.includes(base))
  ) {
    return 60 - Math.abs(creator.normalizedHandle.length - base.length);
  }
  return null;
}
