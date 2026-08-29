import type { Platform } from "../types";
import { initials } from "../lib/format";

function portraitTone(name: string) {
  return [...name].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
}

export function CreatorPortrait({
  name,
  platform,
  size = "medium",
}: {
  name: string;
  platform: Platform;
  size?: "small" | "medium" | "large";
}) {
  return (
    <span
      className={`creator-portrait creator-portrait-${size} creator-portrait-tone-${portraitTone(name)} creator-portrait-${platform}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
