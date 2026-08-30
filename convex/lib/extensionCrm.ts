export type ExtensionWorkspaceRole = "owner" | "admin" | "manager" | "contributor" | "reviewer";

export function normalizeExtensionHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function extensionProfileKey(platform: string, handle: string) {
  return `${platform}:${normalizeExtensionHandle(handle)}`;
}

export function canExtensionMemberSave(role: ExtensionWorkspaceRole) {
  return role !== "reviewer";
}
