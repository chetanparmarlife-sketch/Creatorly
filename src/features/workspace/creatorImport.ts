import type { CreatorImportPreview, CreatorImportPreviewRow, Platform, PrivateCreatorInput } from "../../types";

type DuplicateCandidate = Pick<PrivateCreatorInput, "platform" | "handle" | "email">;
export type CreatorExportRow = {
  displayName: string;
  source?: string;
  platform?: string;
  handle?: string;
  followerCount?: number;
  location?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  stage?: string;
  owner?: string;
  nextAction?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
};

const platformNames: Record<string, Platform> = {
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  yt: "youtube",
  x: "twitter",
  twitter: "twitter",
};

const headerAliases: Record<string, keyof PrivateCreatorInput> = {
  name: "displayName",
  creator: "displayName",
  creator_name: "displayName",
  display_name: "displayName",
  platform: "platform",
  channel: "platform",
  handle: "handle",
  username: "handle",
  followers: "followerCount",
  follower_count: "followerCount",
  audience: "followerCount",
  location: "location",
  market: "location",
  email: "email",
  phone: "phone",
  whatsapp: "whatsapp",
  whatsapp_number: "whatsapp",
  notes: "notes",
  tags: "tags",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeHandle(value?: string) {
  return value?.trim().toLowerCase().replace(/^@/, "") || undefined;
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

function duplicateKeys(input: DuplicateCandidate) {
  const keys: string[] = [];
  const handle = normalizeHandle(input.handle);
  const email = normalizeEmail(input.email);
  if (input.platform && handle) keys.push(`profile:${input.platform}:${handle}`);
  if (email) keys.push(`email:${email}`);
  return keys;
}

export function creatorDuplicateKey(input: DuplicateCandidate) {
  return duplicateKeys(input)[0] ?? "";
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function parsePlatform(value: string): Platform | undefined {
  return platformNames[value.trim().toLowerCase()];
}

function rowInput(headers: Array<keyof PrivateCreatorInput | undefined>, values: string[]) {
  const raw: Partial<Record<keyof PrivateCreatorInput, string>> = {};
  headers.forEach((header, index) => { if (header) raw[header] = values[index]?.trim() ?? ""; });
  const followerValue = raw.followerCount?.replaceAll(",", "");
  const followerCount = followerValue ? Number(followerValue) : undefined;
  return {
    displayName: raw.displayName?.trim() ?? "",
    platform: raw.platform ? parsePlatform(raw.platform) : undefined,
    handle: raw.handle?.trim() || undefined,
    followerCount,
    location: raw.location?.trim() || undefined,
    email: normalizeEmail(raw.email),
    phone: raw.phone?.trim() || undefined,
    whatsapp: raw.whatsapp?.trim() || undefined,
    notes: raw.notes?.trim() || undefined,
    tags: raw.tags ? raw.tags.split(/[|;]/).map(tag => tag.trim()).filter(Boolean) : [],
  } satisfies PrivateCreatorInput;
}

function validateInput(input: PrivateCreatorInput, rawPlatform?: string) {
  const errors: string[] = [];
  if (!input.displayName) errors.push("Creator name is required.");
  if (rawPlatform?.trim() && !input.platform) errors.push("Platform must be Instagram, TikTok, YouTube, or X.");
  if (input.followerCount !== undefined && (!Number.isInteger(input.followerCount) || input.followerCount < 0)) errors.push("Followers must be a whole number of zero or more.");
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push("Email address is not valid.");
  if (!input.handle && !input.email && !input.phone && !input.whatsapp) errors.push("Add a handle, email, phone, or WhatsApp number.");
  return errors;
}

export function parseCreatorCsv(text: string, existing: DuplicateCandidate[]): CreatorImportPreview {
  const parsed = parseCsvRows(text);
  if (!parsed.length) return { rows: [], readyCount: 0, duplicateCount: 0, errorCount: 0 };
  const headers = parsed[0].map(header => headerAliases[normalizeHeader(header)]);
  const platformIndex = headers.findIndex(header => header === "platform");
  const known = new Set(existing.flatMap(duplicateKeys));
  const seen = new Set<string>();
  const rows: CreatorImportPreviewRow[] = parsed.slice(1).filter(values => values.some(value => value.trim())).map((values, index) => {
    const input = rowInput(headers, values);
    const errors = validateInput(input, platformIndex >= 0 ? values[platformIndex] : undefined);
    const keys = duplicateKeys(input);
    const duplicate = !errors.length && keys.some(key => known.has(key) || seen.has(key));
    keys.forEach(key => seen.add(key));
    return { rowNumber: index + 2, status: errors.length ? "error" : duplicate ? "duplicate" : "ready", input, errors };
  });
  return {
    rows,
    readyCount: rows.filter(row => row.status === "ready").length,
    duplicateCount: rows.filter(row => row.status === "duplicate").length,
    errorCount: rows.filter(row => row.status === "error").length,
  };
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportCreatorsCsv(rows: CreatorExportRow[]) {
  const columns: Array<[string, keyof CreatorExportRow]> = [
    ["name", "displayName"], ["source", "source"], ["platform", "platform"], ["handle", "handle"],
    ["followers", "followerCount"], ["location", "location"], ["email", "email"], ["phone", "phone"],
    ["whatsapp", "whatsapp"], ["stage", "stage"], ["owner", "owner"], ["next_action", "nextAction"],
    ["priority", "priority"], ["tags", "tags"], ["notes", "notes"],
  ];
  return [columns.map(([heading]) => heading).join(","), ...rows.map(row => columns.map(([, key]) => csvCell(row[key])).join(","))].join("\n");
}

export function importErrorsCsv(rows: CreatorImportPreviewRow[]) {
  return ["row,status,name,platform,handle,email,errors", ...rows.filter(row => row.status !== "ready").map(row => [row.rowNumber, row.status, row.input.displayName, row.input.platform, row.input.handle, row.input.email, row.status === "duplicate" ? "Duplicate creator in this workspace or file." : row.errors.join(" ")].map(csvCell).join(","))].join("\n");
}
