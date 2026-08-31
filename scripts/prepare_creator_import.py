#!/usr/bin/env python3
"""Prepare a private Creatorly import without copying contact data into Git."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlparse

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
HANDLE_IN_URL = re.compile(
    r"(?=instagram\.com/@?([A-Za-z0-9._]{2,30})(?:[/?#\s]|$))", re.I
)
HANDLE_IN_TEXT = re.compile(r"@([A-Za-z0-9._]{2,30})")
RESERVED = {"accounts", "about", "direct", "explore", "https", "invites", "p", "reel", "reels", "stories", "web"}
INSTAGRAM_PROFILE_COLUMNS = {"Username", "Followers", "Following", "Average Comments"}
YOUTUBE_PROFILE_COLUMNS = {"Influencer Id", "channel_id", "Subscribers", "YouTube API Response"}
FACEBOOK_PROFILE_COLUMNS = {"Influencer Id", "Facebook Profile Name", "Follower Count", "facebook_id"}


def extract_instagram_handle(value: str) -> str:
    text = (value or "").strip()
    mentioned = [item.strip(".") for item in HANDLE_IN_TEXT.findall(text)]
    candidates = mentioned + [item.strip(".") for item in HANDLE_IN_URL.findall(text)]
    valid = [item for item in candidates if item and item.lower() not in RESERVED]
    return valid[-1] if valid else ""


def normalize_handle(value: str) -> str:
    base = re.sub(r"[^a-z0-9]", "", value.lower())
    base = re.sub(r"^(?:the|real)", "", base)
    return re.sub(r"official$", "", base)


def normalize_email(value: str) -> str:
    email = (value or "").strip().lower()
    return email if EMAIL.fullmatch(email) else ""


def normalize_indian_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return f"+91{digits}" if len(digits) == 10 and digits[0] in "6789" else ""


def normalize_location(value: str) -> str:
    parts = [re.sub(r"\s+", " ", part).strip() for part in (value or "").split(",")]
    clean = []
    for part in parts:
        if part and (not clean or clean[-1].casefold() != part.casefold()):
            clean.append(part)
    return ", ".join(clean)


def parse_number(value: str) -> int:
    try:
        return max(0, round(float((value or "0").replace(",", ""))))
    except ValueError:
        return 0


def parse_optional_number(value: str) -> int | float | None:
    text = (value or "").strip().replace(",", "").replace("%", "")
    if not text:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if number < 0:
        return None
    return int(number) if number.is_integer() else number


def parse_optional_bool(value: str) -> bool | None:
    text = (value or "").strip().casefold()
    if text in {"1", "true", "yes", "y"}:
        return True
    if text in {"0", "false", "no", "n"}:
        return False
    return None


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def clean_handle(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._]", "", (value or "").strip().lstrip("@")).strip(".")


def split_categories(value: str) -> list[str]:
    result = []
    for item in (value or "").split(","):
        clean = re.sub(r"\s+", " ", item).strip()
        if clean and clean.casefold() not in {existing.casefold() for existing in result}:
            result.append(clean)
    return result


def valid_youtube_url(value: str) -> str:
    text = (value or "").strip()
    try:
        host = urlparse(text).netloc.lower().removeprefix("www.")
    except ValueError:
        return ""
    return text if host in {"youtube.com", "youtu.be"} else ""


def valid_web_url(value: str, https_only: bool = False) -> str:
    text = (value or "").strip()
    try:
        parsed = urlparse(text)
    except ValueError:
        return ""
    allowed_schemes = {"https"} if https_only else {"http", "https"}
    return text if parsed.scheme.lower() in allowed_schemes and bool(parsed.netloc) else ""


def choose_display_name(row: dict[str, str], handle: str) -> str:
    name = re.sub(r"\s+", " ", (row.get("name") or "")).strip()
    category_names = {item.casefold() for item in split_categories(row.get("categories") or "")}
    if not name or name.casefold() in category_names or "http" in name.casefold() or "@" in name:
        return f"@{handle}"
    return name


def prepare_legacy_rows(source: Path, contacts_verified: bool = False) -> tuple[list[dict], dict]:
    with source.open(newline="", encoding="utf-8-sig") as handle:
        source_rows = list(csv.DictReader(handle))

    groups: dict[str, list[dict]] = defaultdict(list)
    rejected = defaultdict(int)
    invalid_emails = 0
    invalid_phones = 0

    for line, row in enumerate(source_rows, start=2):
        instagram_handle = extract_instagram_handle(row.get("instagram_url") or "")
        email = normalize_email(row.get("email") or "")
        whatsapp = normalize_indian_phone(row.get("whatsapp_no") or "")
        if (row.get("email") or "").strip() and not email:
            invalid_emails += 1
        if (row.get("whatsapp_no") or "").strip() and not whatsapp:
            invalid_phones += 1
        if not instagram_handle:
            rejected["invalid_instagram_handle"] += 1
            continue
        if not email and not whatsapp:
            rejected["no_valid_contact"] += 1
            continue
        groups[instagram_handle.casefold()].append({
            "line": line,
            "row": row,
            "handle": instagram_handle,
            "email": email,
            "whatsapp": whatsapp,
        })

    output = []
    total_contacts = 0
    category_names_replaced = 0
    for exact_handle in sorted(groups):
        entries = groups[exact_handle]
        best = max(entries, key=lambda item: (
            bool((item["row"].get("name") or "").strip()),
            parse_number(item["row"].get("instagram_followers") or ""),
            bool(item["row"].get("location")),
        ))
        row = best["row"]
        display_name = choose_display_name(row, best["handle"])
        if display_name.startswith("@"):
            category_names_replaced += 1
        contacts = []
        seen_contacts = set()
        for item in entries:
            key = (item["email"], item["whatsapp"])
            if key in seen_contacts:
                continue
            seen_contacts.add(key)
            contact = {}
            if item["email"]:
                contact["email"] = item["email"]
            if item["whatsapp"]:
                contact["whatsapp"] = item["whatsapp"]
            contacts.append(contact)
        total_contacts += len(contacts)
        categories = []
        for item in entries:
            for category in split_categories(item["row"].get("categories") or ""):
                if category.casefold() not in {existing.casefold() for existing in categories}:
                    categories.append(category)
        youtube = next((valid_youtube_url(item["row"].get("youtube_channel_url") or "") for item in entries if valid_youtube_url(item["row"].get("youtube_channel_url") or "")), "")
        prepared = {
            "sourceKey": hashlib.sha256(exact_handle.encode()).hexdigest()[:24],
            "handle": f"@{best['handle']}",
            "normalizedHandle": normalize_handle(best["handle"]),
            "displayName": display_name,
            "followerCount": max(parse_number(item["row"].get("instagram_followers") or "") for item in entries),
            "isVerified": any((item["row"].get("is_verified_instagram") or "").strip().casefold() == "true" for item in entries),
            "categories": categories,
            "contacts": contacts,
            "contactVerificationStatus": "verified" if contacts_verified else "pending_verification",
        }
        location = next((normalize_location(item["row"].get("location") or "") for item in entries if normalize_location(item["row"].get("location") or "")), "")
        if location:
            prepared["location"] = location
        if youtube:
            prepared["youtubeUrl"] = youtube
        output.append(prepared)

    report = {
        "sourceFile": source.name,
        "sourceRows": len(source_rows),
        "acceptedSourceRows": sum(len(items) for items in groups.values()),
        "creatorProfiles": len(output),
        "contactRecords": total_contacts,
        "exactDuplicateRowsMerged": sum(len(items) - 1 for items in groups.values()),
        "categoryNamesReplacedWithHandle": category_names_replaced,
        "invalidNonblankEmails": invalid_emails,
        "invalidNonblankWhatsApp": invalid_phones,
        "rejectedRows": sum(rejected.values()),
        "rejectedByReason": dict(sorted(rejected.items())),
        "contactVerificationStatus": "pending_verification",
    }
    return output, report


INSTAGRAM_METRIC_COLUMNS = {
    "Following": "followingCount",
    "Number of Posts": "postCount",
    "Highlight Reel Count": "highlightReelCount",
    "IGTV Video Count": "igtvVideoCount",
    "Average Likes": "averageLikes",
    "Average Comments": "averageComments",
    "Average Video Views": "averageVideoViews",
    "Average Reel Views": "averageReelViews",
    "Engagement Rate (%)": "engagementRatePercent",
    "Min Likes": "minLikes",
    "Min Comments": "minComments",
    "Min Video Views": "minVideoViews",
    "Min Reel Views": "minReelViews",
    "Max Likes": "maxLikes",
    "Max Comments": "maxComments",
    "Max Video Views": "maxVideoViews",
    "Max Reel Views": "maxReelViews",
}


def prepare_instagram_profile_row(row: dict[str, str], contacts_verified: bool = False) -> dict | None:
    handle = clean_handle(row.get("Username") or row.get("Scraped Username") or "")
    follower_count = parse_number(row.get("Followers") or "")
    if not handle or follower_count < 1000:
        return None

    categories = []
    for column in ("Primary Content Niche", "Secondary Content Niche"):
        for category in split_categories(row.get(column) or ""):
            if category.casefold() not in {item.casefold() for item in categories}:
                categories.append(category)

    full_name = clean_text(row.get("Full Name") or row.get("Name") or "")
    display_name = full_name if full_name and "http" not in full_name.casefold() else f"@{handle}"
    metrics = {
        target: value
        for source, target in INSTAGRAM_METRIC_COLUMNS.items()
        if (value := parse_optional_number(row.get(source) or "")) is not None
    }
    is_business = parse_optional_bool(row.get("Is Business Account") or "")
    if is_business is not None:
        metrics["isBusinessAccount"] = is_business
    business_category = clean_text(row.get("Business Category Name") or "")
    if business_category:
        metrics["businessCategoryName"] = business_category

    contact = {}
    email = normalize_email(row.get("Email") or "")
    phone = normalize_indian_phone(row.get("Contact Number") or "")
    if email:
        contact["email"] = email
    if phone:
        contact["phone"] = phone

    profile = {
        "sourceKey": hashlib.sha256(handle.casefold().encode()).hexdigest()[:24],
        "handle": f"@{handle}",
        "normalizedHandle": normalize_handle(handle),
        "displayName": display_name,
        "followerCount": follower_count,
        "isVerified": parse_optional_bool(row.get("Verified") or "") is True,
        "categories": categories,
        "contacts": [contact] if contact else [],
        "contactVerificationStatus": "verified" if contacts_verified else "pending_verification",
        "instagramMetrics": metrics,
    }

    optional_text = {
        "biography": clean_text(row.get("Biography") or ""),
        "profileImageUrl": clean_text(
            row.get("Profile Picture Stored in Firebase")
            or row.get("Profile Pic URL")
            or ""
        ),
        "gender": clean_text(row.get("Gender") or ""),
        "instagramAccountId": clean_text(row.get("Instagram ID") or ""),
        "profileType": business_category,
    }
    profile.update({key: value for key, value in optional_text.items() if value})
    age = parse_optional_number(row.get("Age") or "")
    if age is not None:
        profile["age"] = age
    languages = split_categories(row.get("Language") or "")
    if languages:
        profile["contentLanguages"] = languages
    location = normalize_location(", ".join(filter(None, [row.get("City") or "", row.get("State") or ""])))
    if location:
        profile["location"] = location
    return profile


def merge_instagram_profiles(existing: dict, incoming: dict) -> dict:
    preferred, other = (incoming, existing) if len(json.dumps(incoming)) > len(json.dumps(existing)) else (existing, incoming)
    merged = dict(preferred)
    for key, value in other.items():
        if key not in merged or merged[key] in (None, "", [], {}):
            merged[key] = value
    merged["followerCount"] = max(existing["followerCount"], incoming["followerCount"])
    merged["isVerified"] = existing["isVerified"] or incoming["isVerified"]
    merged["categories"] = list(dict.fromkeys(existing["categories"] + incoming["categories"]))
    merged["contentLanguages"] = list(dict.fromkeys(existing.get("contentLanguages", []) + incoming.get("contentLanguages", [])))
    metrics = dict(existing.get("instagramMetrics", {}))
    metrics.update(incoming.get("instagramMetrics", {}))
    merged["instagramMetrics"] = metrics
    contacts = []
    for contact in existing["contacts"] + incoming["contacts"]:
        if contact and contact not in contacts:
            contacts.append(contact)
    merged["contacts"] = contacts
    return merged


def prepare_instagram_profile_rows(source: Path, contacts_verified: bool = False) -> tuple[list[dict], dict]:
    profiles: dict[str, dict] = {}
    rejected = defaultdict(int)
    source_rows = 0
    eligible_rows = 0
    with source.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            source_rows += 1
            raw_handle = clean_handle(row.get("Username") or row.get("Scraped Username") or "")
            if not raw_handle:
                rejected["invalid_instagram_handle"] += 1
                continue
            if parse_number(row.get("Followers") or "") < 1000:
                rejected["below_1000_followers"] += 1
                continue
            prepared = prepare_instagram_profile_row(row, contacts_verified)
            if not prepared:
                rejected["invalid_profile"] += 1
                continue
            eligible_rows += 1
            key = raw_handle.casefold()
            profiles[key] = merge_instagram_profiles(profiles[key], prepared) if key in profiles else prepared

    output = [profiles[key] for key in sorted(profiles)]
    report = {
        "sourceFile": source.name,
        "sourceFormat": "detailed_instagram_profiles",
        "sourceRows": source_rows,
        "eligibleSourceRows": eligible_rows,
        "creatorProfiles": len(output),
        "contactRecords": sum(len(profile["contacts"]) for profile in output),
        "exactDuplicateRowsMerged": eligible_rows - len(output),
        "rejectedRows": sum(rejected.values()),
        "rejectedByReason": dict(sorted(rejected.items())),
        "minimumFollowerCount": 1000,
        "contactVerificationStatus": "verified" if contacts_verified else "pending_verification",
        "excludedOperationalColumns": ["Scraping Status", "Scraping In Progress"],
        "profilesWithPermanentImage": sum(
            profile.get("profileImageUrl", "").startswith("https://storage.googleapis.com/")
            for profile in output
        ),
        "profilesWithBiography": sum(bool(profile.get("biography")) for profile in output),
        "profilesWithAverageComments": sum("averageComments" in profile["instagramMetrics"] for profile in output),
        "profilesWithEngagementRate": sum("engagementRatePercent" in profile["instagramMetrics"] for profile in output),
    }
    return output, report


YOUTUBE_METRIC_COLUMNS = {
    "Number of Videos": "videoCount",
    "Total Video Views": "totalVideoViews",
    "Likes": "likes",
    "Dislikes": "dislikes",
    "Comments": "comments",
    "Shares": "shares",
    "Views": "views",
    "Average View Duration": "averageViewDuration",
    "Average View Percentage": "averageViewPercentage",
    "Estimated Minutes Watched": "estimatedMinutesWatched",
    "Integrated Video Rate - Min": "integratedVideoRateMin",
    "Integrated Video Rate - Max": "integratedVideoRateMax",
    "Sponsored Video Rate - Min": "sponsoredVideoRateMin",
    "Sponsored Video Rate - Max": "sponsoredVideoRateMax",
    "Average Rate": "averageRate",
}


def youtube_api_channel(api_response: dict) -> dict:
    for key in ("channel_stats", "channelDetails"):
        value = api_response.get(key)
        if isinstance(value, dict):
            return value
    return {}


def youtube_topic_name(value: str) -> str:
    raw = unquote((value or "").rstrip("/").rsplit("/", 1)[-1]).replace("_", " ")
    return re.sub(r"\s*\([^)]*\)\s*$", "", raw).strip()


def youtube_country_name(value: str) -> str:
    code = (value or "").strip().upper()
    return {"IN": "India"}.get(code, code)


def youtube_audience_entry(row: dict[str, str]) -> dict | None:
    age_group = clean_text(row.get("Age Group (Audience Gender and Age Breakup)") or "")
    gender = clean_text(row.get("Gender (Audience Gender and Age Breakup)") or "")
    percentage = parse_optional_number(row.get("Value (Audience Gender and Age Breakup)") or "")
    if not age_group or not gender or percentage is None:
        return None
    return {"ageGroup": age_group, "gender": gender, "percentage": percentage}


def prepare_youtube_profile_row(row: dict[str, str], audience_rows: list[dict[str, str]]) -> dict | None:
    channel_id = clean_text(row.get("channel_id") or "")
    display_name = clean_text(row.get("Channel Name") or "")
    subscriber_count = parse_number(row.get("Subscribers") or "")
    if not channel_id or not display_name or subscriber_count < 1000:
        return None

    api_response = {}
    raw_api_response = clean_text(row.get("YouTube API Response") or "")
    if raw_api_response:
        try:
            parsed = json.loads(raw_api_response)
            api_response = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            api_response = {}
    channel = youtube_api_channel(api_response)
    snippet = channel.get("snippet") if isinstance(channel.get("snippet"), dict) else {}
    branding = channel.get("brandingSettings") if isinstance(channel.get("brandingSettings"), dict) else {}
    branding_channel = branding.get("channel") if isinstance(branding.get("channel"), dict) else {}
    topic_details = channel.get("topicDetails") if isinstance(channel.get("topicDetails"), dict) else {}

    custom_handle = clean_handle(str(snippet.get("customUrl") or ""))
    handle = f"@{custom_handle}" if custom_handle else channel_id
    topic_values = topic_details.get("topicCategories") if isinstance(topic_details.get("topicCategories"), list) else []
    categories = []
    for value in topic_values:
        category = youtube_topic_name(str(value))
        if category and category.casefold() not in {item.casefold() for item in categories}:
            categories.append(category)

    metrics = {
        target: value
        for source, target in YOUTUBE_METRIC_COLUMNS.items()
        if (value := parse_optional_number(row.get(source) or "")) is not None
    }
    string_metrics = {
        "subscriberRange": clean_text(row.get("Subscriber Range") or ""),
        "priceRange": clean_text(row.get("Price Range") or ""),
        "uploadsPlaylistId": clean_text(row.get("Uploads Playlist ID") or ""),
        "bannerImageUrl": clean_text(row.get("Banner External URL") or ""),
    }
    metrics.update({key: value for key, value in string_metrics.items() if value})
    audience_by_key = {}
    for audience_row in audience_rows:
        entry = youtube_audience_entry(audience_row)
        if entry:
            audience_by_key[(entry["ageGroup"].casefold(), entry["gender"].casefold())] = entry
    if audience_by_key:
        metrics["audience"] = list(audience_by_key.values())

    profile = {
        "sourceKey": hashlib.sha256(channel_id.casefold().encode()).hexdigest()[:24],
        "platform": "youtube",
        "handle": handle,
        "normalizedHandle": normalize_handle(custom_handle or channel_id),
        "displayName": display_name,
        "followerCount": subscriber_count,
        "isVerified": False,
        "categories": categories,
        "contacts": [],
        "contactVerificationStatus": "pending_verification",
        "youtubeChannelId": channel_id,
        "youtubeUrl": f"https://www.youtube.com/channel/{channel_id}",
        "youtubeMetrics": metrics,
    }
    biography = clean_text(row.get("Channel Description") or snippet.get("description") or branding_channel.get("description") or "")
    profile_image_url = clean_text(row.get("Image") or "")
    if not profile_image_url:
        thumbnails = snippet.get("thumbnails") if isinstance(snippet.get("thumbnails"), dict) else {}
        high = thumbnails.get("high") if isinstance(thumbnails.get("high"), dict) else {}
        profile_image_url = clean_text(str(high.get("url") or ""))
    country = youtube_country_name(str(snippet.get("country") or branding_channel.get("country") or ""))
    language = clean_text(str(snippet.get("defaultLanguage") or branding_channel.get("defaultLanguage") or ""))
    if biography:
        profile["biography"] = biography
    if profile_image_url:
        profile["profileImageUrl"] = profile_image_url
    if country:
        profile["location"] = country
    if language:
        profile["contentLanguages"] = [language]
    return profile


def merge_youtube_profiles(existing: dict, incoming: dict) -> dict:
    merged = dict(existing)
    for key, value in incoming.items():
        if key not in merged or merged[key] in (None, "", [], {}):
            merged[key] = value
    merged["followerCount"] = max(existing["followerCount"], incoming["followerCount"])
    merged["categories"] = list(dict.fromkeys(existing["categories"] + incoming["categories"]))
    merged["contentLanguages"] = list(dict.fromkeys(existing.get("contentLanguages", []) + incoming.get("contentLanguages", [])))
    metrics = dict(existing.get("youtubeMetrics", {}))
    incoming_metrics = incoming.get("youtubeMetrics", {})
    existing_audience = metrics.pop("audience", [])
    incoming_audience = incoming_metrics.get("audience", [])
    metrics.update({key: value for key, value in incoming_metrics.items() if key != "audience"})
    audience = {}
    for entry in existing_audience + incoming_audience:
        audience[(entry["ageGroup"].casefold(), entry["gender"].casefold())] = entry
    if audience:
        metrics["audience"] = list(audience.values())
    merged["youtubeMetrics"] = metrics
    return merged


def prepare_youtube_profile_rows(source: Path, contacts_verified: bool = False) -> tuple[list[dict], dict]:
    del contacts_verified
    profiles: dict[str, dict] = {}
    rejected = defaultdict(int)
    source_rows = 0
    source_profiles = 0
    eligible_profiles = 0
    current_row: dict[str, str] | None = None
    current_audience: list[dict[str, str]] = []

    def finish_current() -> None:
        nonlocal eligible_profiles
        if current_row is None:
            return
        channel_id = clean_text(current_row.get("channel_id") or "")
        display_name = clean_text(current_row.get("Channel Name") or "")
        subscriber_count = parse_number(current_row.get("Subscribers") or "")
        if not channel_id:
            rejected["invalid_youtube_channel_id"] += 1
            return
        if not display_name:
            rejected["missing_channel_name"] += 1
            return
        if subscriber_count < 1000:
            rejected["below_1000_subscribers"] += 1
            return
        prepared = prepare_youtube_profile_row(current_row, current_audience)
        if not prepared:
            rejected["invalid_profile"] += 1
            return
        eligible_profiles += 1
        key = channel_id.casefold()
        profiles[key] = merge_youtube_profiles(profiles[key], prepared) if key in profiles else prepared

    with source.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            source_rows += 1
            is_profile_row = bool(clean_text(row.get("Influencer Id") or "") or clean_text(row.get("channel_id") or ""))
            if is_profile_row:
                finish_current()
                source_profiles += 1
                current_row = row
                current_audience = [row]
            elif current_row is not None:
                current_audience.append(row)
            elif youtube_audience_entry(row):
                rejected["orphan_audience_row"] += 1
        finish_current()

    output = [profiles[key] for key in sorted(profiles)]
    report = {
        "sourceFile": source.name,
        "sourceFormat": "youtube_profiles_with_audience_continuations",
        "sourceRows": source_rows,
        "sourceProfiles": source_profiles,
        "eligibleSourceProfiles": eligible_profiles,
        "creatorProfiles": len(output),
        "exactDuplicateChannelsMerged": eligible_profiles - len(output),
        "rejectedProfiles": sum(rejected.values()),
        "rejectedByReason": dict(sorted(rejected.items())),
        "minimumSubscriberCount": 1000,
        "profilesWithImage": sum(bool(profile.get("profileImageUrl")) for profile in output),
        "profilesWithBiography": sum(bool(profile.get("biography")) for profile in output),
        "profilesWithAudienceData": sum(bool(profile["youtubeMetrics"].get("audience")) for profile in output),
        "profilesWithPricingData": sum(any(key in profile["youtubeMetrics"] for key in ("integratedVideoRateMin", "integratedVideoRateMax", "sponsoredVideoRateMin", "sponsoredVideoRateMax")) for profile in output),
        "excludedColumns": ["YouTube API Response", "Created On", "Updated On"],
    }
    return output, report


FACEBOOK_METRIC_COLUMNS = {
    "Engagement Rate": "engagementRatePercent",
    "Average Rate": "averageRate",
    "Story Rate - Min": "storyRateMin",
    "Story Rate - Max": "storyRateMax",
    "Post Rate - Min": "postRateMin",
    "Post Rate - Max": "postRateMax",
    "Video Rate - Min": "videoRateMin",
    "Video Rate - Max": "videoRateMax",
    "Page Engaged User": "pageEngagedUsers",
    "Page Impression": "pageImpressions",
    "Page Impression Organic": "pageImpressionsOrganic",
    "Page Impression Paid": "pageImpressionsPaid",
    "Page Post Engagement": "pagePostEngagements",
    "Page Views Total": "pageViewsTotal",
    "Page Impression Unique": "pageImpressionsUnique",
    "Page Impression Organic Unique": "pageImpressionsOrganicUnique",
    "Page Impression Paid Unique": "pageImpressionsPaidUnique",
    "Page Views Logged In Unique": "pageViewsLoggedInUnique",
}


def facebook_audience_entry(row: dict[str, str]) -> dict | None:
    age_group = clean_text(row.get("Age Group (Audience Gender and Age Breakup)") or "")
    gender = clean_text(row.get("Gender (Audience Gender and Age Breakup)") or "")
    value = parse_optional_number(row.get("Value (Audience Gender and Age Breakup)") or "")
    if not age_group or not gender or value is None:
        return None
    return {"ageGroup": age_group, "gender": gender, "value": value}


def facebook_city_entry(row: dict[str, str]) -> dict | None:
    city = clean_text(row.get("City (Audience City)") or "")
    value = parse_optional_number(row.get("Value (Audience City)") or "")
    if not city or value is None:
        return None
    return {"city": city, "value": value}


def prepare_facebook_profile_row(row: dict[str, str], audience_rows: list[dict[str, str]]) -> dict | None:
    page_id = clean_text(row.get("facebook_id") or "")
    username = clean_handle(row.get("Username") or "")
    display_name = clean_text(row.get("Facebook Profile Name") or "")
    follower_count = parse_number(row.get("Follower Count") or "")
    if not page_id or not display_name or follower_count < 1000:
        return None

    metrics = {
        target: value
        for source, target in FACEBOOK_METRIC_COLUMNS.items()
        if (value := parse_optional_number(row.get(source) or "")) is not None
    }
    string_metrics = {
        "followerRange": clean_text(row.get("Follower Range") or ""),
        "priceRange": clean_text(row.get("Price Range") or ""),
        "coverImageUrl": valid_web_url(row.get("Cover") or "", https_only=True),
        "websiteUrl": valid_web_url(row.get("Website") or ""),
    }
    metrics.update({key: value for key, value in string_metrics.items() if value})

    audience = {}
    cities = {}
    for audience_row in audience_rows:
        if entry := facebook_audience_entry(audience_row):
            audience[(entry["ageGroup"].casefold(), entry["gender"].casefold())] = entry
        if entry := facebook_city_entry(audience_row):
            cities[entry["city"].casefold()] = entry
    if audience:
        metrics["audience"] = list(audience.values())
    if cities:
        metrics["audienceCities"] = list(cities.values())

    categories = split_categories(row.get("Category") or "")
    handle = f"@{username}" if username else page_id
    profile = {
        "sourceKey": hashlib.sha256(f"facebook:{page_id.casefold()}".encode()).hexdigest()[:24],
        "platform": "facebook",
        "handle": handle,
        "normalizedHandle": normalize_handle(username or page_id),
        "displayName": display_name,
        "followerCount": follower_count,
        "isVerified": False,
        "categories": categories,
        "contacts": [],
        "contactVerificationStatus": "pending_verification",
        "facebookPageId": page_id,
        "facebookUrl": f"https://www.facebook.com/{username}" if username else f"https://www.facebook.com/profile.php?id={page_id}",
        "facebookMetrics": metrics,
    }
    optional_text = {
        "biography": clean_text(row.get("About") or ""),
        "profileImageUrl": valid_web_url(row.get("Profile Picture") or "", https_only=True),
        "profileType": categories[0] if categories else "",
    }
    profile.update({key: value for key, value in optional_text.items() if value})
    return profile


def merge_facebook_profiles(existing: dict, incoming: dict) -> dict:
    preferred, other = (incoming, existing) if len(json.dumps(incoming)) > len(json.dumps(existing)) else (existing, incoming)
    merged = dict(preferred)
    for key, value in other.items():
        if key not in merged or merged[key] in (None, "", [], {}):
            merged[key] = value
    merged["followerCount"] = max(existing["followerCount"], incoming["followerCount"])
    merged["categories"] = list(dict.fromkeys(existing["categories"] + incoming["categories"]))
    metrics = dict(existing.get("facebookMetrics", {}))
    incoming_metrics = incoming.get("facebookMetrics", {})
    existing_audience = metrics.pop("audience", [])
    existing_cities = metrics.pop("audienceCities", [])
    incoming_audience = incoming_metrics.get("audience", [])
    incoming_cities = incoming_metrics.get("audienceCities", [])
    metrics.update({key: value for key, value in incoming_metrics.items() if key not in {"audience", "audienceCities"}})
    audience = {(item["ageGroup"].casefold(), item["gender"].casefold()): item for item in existing_audience + incoming_audience}
    cities = {item["city"].casefold(): item for item in existing_cities + incoming_cities}
    if audience:
        metrics["audience"] = list(audience.values())
    if cities:
        metrics["audienceCities"] = list(cities.values())
    merged["facebookMetrics"] = metrics
    return merged


def prepare_facebook_profile_rows(source: Path, contacts_verified: bool = False) -> tuple[list[dict], dict]:
    del contacts_verified
    profiles: dict[str, dict] = {}
    rejected = defaultdict(int)
    source_rows = 0
    source_profiles = 0
    eligible_profiles = 0
    current_row: dict[str, str] | None = None
    current_audience: list[dict[str, str]] = []

    def finish_current() -> None:
        nonlocal eligible_profiles
        if current_row is None:
            return
        page_id = clean_text(current_row.get("facebook_id") or "")
        display_name = clean_text(current_row.get("Facebook Profile Name") or "")
        follower_count = parse_number(current_row.get("Follower Count") or "")
        if not page_id:
            rejected["missing_facebook_page_id"] += 1
            return
        if not display_name:
            rejected["missing_profile_name"] += 1
            return
        if follower_count < 1000:
            rejected["below_1000_followers"] += 1
            return
        prepared = prepare_facebook_profile_row(current_row, current_audience)
        if not prepared:
            rejected["invalid_profile"] += 1
            return
        eligible_profiles += 1
        key = page_id.casefold()
        profiles[key] = merge_facebook_profiles(profiles[key], prepared) if key in profiles else prepared

    with source.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            source_rows += 1
            is_profile_row = bool(clean_text(row.get("Influencer Id") or "") or clean_text(row.get("facebook_id") or "") or clean_text(row.get("Facebook Profile Name") or ""))
            if is_profile_row:
                finish_current()
                source_profiles += 1
                current_row = row
                current_audience = [row]
            elif current_row is not None:
                current_audience.append(row)
            elif facebook_audience_entry(row) or facebook_city_entry(row):
                rejected["orphan_audience_row"] += 1
        finish_current()

    output = [profiles[key] for key in sorted(profiles)]
    report = {
        "sourceFile": source.name,
        "sourceFormat": "facebook_profiles_with_audience_continuations",
        "sourceRows": source_rows,
        "sourceProfiles": source_profiles,
        "eligibleSourceProfiles": eligible_profiles,
        "creatorProfiles": len(output),
        "exactDuplicatePagesMerged": eligible_profiles - len(output),
        "rejectedProfiles": sum(rejected.values()),
        "rejectedByReason": dict(sorted(rejected.items())),
        "minimumFollowerCount": 1000,
        "profilesWithImage": sum(bool(profile.get("profileImageUrl")) for profile in output),
        "profilesWithBiography": sum(bool(profile.get("biography")) for profile in output),
        "profilesWithAudienceData": sum(bool(profile["facebookMetrics"].get("audience")) for profile in output),
        "profilesWithAudienceCityData": sum(bool(profile["facebookMetrics"].get("audienceCities")) for profile in output),
        "profilesWithPricingData": sum(any(key in profile["facebookMetrics"] for key in ("averageRate", "storyRateMin", "postRateMin", "videoRateMin")) for profile in output),
        "excludedColumns": ["Created On", "Updated On"],
    }
    return output, report


def prepare_rows(source: Path, contacts_verified: bool = False) -> tuple[list[dict], dict]:
    with source.open(newline="", encoding="utf-8-sig") as handle:
        fieldnames = set(csv.DictReader(handle).fieldnames or [])
    if INSTAGRAM_PROFILE_COLUMNS.issubset(fieldnames):
        return prepare_instagram_profile_rows(source, contacts_verified)
    if YOUTUBE_PROFILE_COLUMNS.issubset(fieldnames):
        return prepare_youtube_profile_rows(source, contacts_verified)
    if FACEBOOK_PROFILE_COLUMNS.issubset(fieldnames):
        return prepare_facebook_profile_rows(source, contacts_verified)
    return prepare_legacy_rows(source, contacts_verified)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/private/creator-import.jsonl"))
    parser.add_argument("--report", type=Path, default=Path("data/creator-import-report.json"))
    parser.add_argument("--contacts-verified", action="store_true", help="Treat supplied contacts as verified by the data owner.")
    args = parser.parse_args()
    rows, report = prepare_rows(args.source, contacts_verified=args.contacts_verified)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as target:
        for row in rows:
            target.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
