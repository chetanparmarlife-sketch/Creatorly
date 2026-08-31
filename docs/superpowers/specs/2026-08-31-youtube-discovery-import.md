# YouTube Discovery Import Specification

## Goal

Add the supplied YouTube creator dataset to Creatorly Discovery using the same private staging approach as the Instagram import.

## Source

- File: `/Users/chetan/Downloads/YouTube Profile.csv`
- Keep the raw CSV and generated JSONL outside Git.
- Treat the owner-supplied records as valid source data, while still rejecting structurally invalid rows.

## Eligibility and identity

- Include only channels with at least 1,000 subscribers.
- Deduplicate by YouTube channel ID, not channel name.
- Prefer the YouTube custom handle when present and retain the channel ID for a stable profile URL.
- Exclude rows without a channel ID or usable channel name.

## Stored data

- Preserve subscribers, video count, lifetime views, likes, dislikes, comments, shares, views, average view duration, average view percentage, estimated minutes watched, quoted video rates, audience age/gender percentages, channel description, image, banner, country, language, and topic categories when supplied.
- Store no raw API response, scrape-control fields, or source database timestamps.
- Mark imported creators as real (`isDemo: false`) and set freshness to the import time.
- Copy external profile images into Creatorly-managed Convex storage after ingestion.

## Discovery behavior

- Make YouTube available beside Instagram in Discovery only after real YouTube records exist.
- Search and browse must filter by the selected platform and continue excluding demo creators.
- Creator detail must show YouTube-specific performance and audience data without changing the current visual style.
- YouTube profile links must use the stored channel ID when a custom handle is unavailable.

## Safety and verification

- Dry-run preparation before any hosted write.
- Audit every staged row for the 1,000-subscriber minimum, unique channel ID, valid profile image URL, and absence of raw API/scrape fields.
- Confirm production import counts, sample channels, image migration results, search results, and a real creator detail response.
- Preserve unrelated uncommitted work.
