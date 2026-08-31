import { ArrowUpRight, BadgeCheck, Camera, PlaySquare } from "lucide-react";
import { formatFollowers } from "../lib/format";
import type { CreatorSearchResult } from "../types";
import { CreatorPortrait } from "./CreatorPortrait";

export function CreatorResult({
  creator,
  bestMatch,
  onOpen,
}: {
  creator: CreatorSearchResult;
  bestMatch: boolean;
  onOpen(): void;
}) {
  const updatedLabel = creator.lastUpdatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(creator.lastUpdatedAt) : "Update date unavailable";
  const performance = [
    creator.instagramMetrics?.averageComments !== undefined ? `${creator.instagramMetrics.averageComments.toLocaleString("en-IN", { maximumFractionDigits: 1 })} avg comments` : "",
    creator.instagramMetrics?.engagementRatePercent !== undefined ? `${creator.instagramMetrics.engagementRatePercent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}% engagement` : "",
  ].filter(Boolean);

  return (
    <button className="creator-row" onClick={onOpen}>
      <CreatorPortrait name={creator.displayName} platform={creator.platform} imageUrl={creator.profileImageUrl} />
      <span className="creator-identity">
        <span className="creator-name">
          {creator.displayName}
          {creator.isVerified ? <BadgeCheck size={16} aria-label="Platform verified" /> : null}
        </span>
        <span className="creator-category">{creator.categories?.[0] ?? "Independent creator"}</span>
        <span className="creator-handle">
          {creator.platform === "instagram" ? <Camera size={14} /> : <PlaySquare size={15} />}
          {formatFollowers(creator.followerCount)}
          <span aria-hidden="true">·</span>
          {creator.handle}
        </span>
        {performance.length ? <span className="creator-engagement">{performance.join(" · ")}</span> : null}
        <span className="creator-provenance">{creator.sourceLabel ?? "Creatorly database"} · {updatedLabel} · {creator.metricProvenance === "live" ? "Live metrics" : "Supplied metrics"}</span>
      </span>
      <span className="creator-metric">
        <strong>{creator.followerCount > 0 ? formatFollowers(creator.followerCount) : "—"}</strong>
        <small>{creator.followerCount > 0 ? "followers" : "count not supplied"}</small>
      </span>
      <span className="creator-context creator-location">
        <strong>{creator.location ?? "Location unavailable"}</strong>
        <small>{creator.location ?? "Location unavailable"}</small>
      </span>
      <span className="availability">
        <span>{creator.contactCount} {creator.contactCount === 1 ? "contact" : "contacts"}</span>
        {bestMatch ? <em>Best match</em> : null}
      </span>
      <ArrowUpRight className="row-arrow" size={19} aria-hidden="true" />
    </button>
  );
}
