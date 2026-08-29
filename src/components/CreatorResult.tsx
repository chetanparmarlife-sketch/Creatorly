import { ArrowUpRight, BadgeCheck, Camera, PlaySquare } from "lucide-react";
import { formatFollowers, initials } from "../lib/format";
import type { CreatorSearchResult } from "../types";

export function CreatorResult({
  creator,
  bestMatch,
  onOpen,
}: {
  creator: CreatorSearchResult;
  bestMatch: boolean;
  onOpen(): void;
}) {
  return (
    <button className="creator-row" onClick={onOpen}>
      <span className={`creator-avatar creator-avatar-${creator.platform}`} aria-hidden="true">
        {initials(creator.displayName)}
      </span>
      <span className="creator-identity">
        <span className="creator-name">
          {creator.displayName}
          {creator.isVerified ? <BadgeCheck size={16} aria-label="Platform verified" /> : null}
        </span>
        <span className="creator-handle">
          {creator.platform === "instagram" ? <Camera size={14} /> : <PlaySquare size={15} />}
          {creator.handle}
        </span>
      </span>
      <span className="creator-metric">
        <strong>{formatFollowers(creator.followerCount)}</strong>
        <small>followers</small>
      </span>
      <span className="creator-location">{creator.location ?? "Location unavailable"}</span>
      <span className="availability">
        <span>{creator.contactCount} {creator.contactCount === 1 ? "contact" : "contacts"}</span>
        {bestMatch ? <em>Best match</em> : null}
      </span>
      <ArrowUpRight className="row-arrow" size={19} aria-hidden="true" />
    </button>
  );
}
