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
from urllib.parse import urlparse

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
HANDLE_IN_URL = re.compile(
    r"(?=instagram\.com/@?([A-Za-z0-9._]{2,30})(?:[/?#\s]|$))", re.I
)
HANDLE_IN_TEXT = re.compile(r"@([A-Za-z0-9._]{2,30})")
RESERVED = {"accounts", "about", "direct", "explore", "https", "invites", "p", "reel", "reels", "stories", "web"}


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


def choose_display_name(row: dict[str, str], handle: str) -> str:
    name = re.sub(r"\s+", " ", (row.get("name") or "")).strip()
    category_names = {item.casefold() for item in split_categories(row.get("categories") or "")}
    if not name or name.casefold() in category_names or "http" in name.casefold() or "@" in name:
        return f"@{handle}"
    return name


def prepare_rows(source: Path) -> tuple[list[dict], dict]:
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/private/creator-import.jsonl"))
    parser.add_argument("--report", type=Path, default=Path("data/creator-import-report.json"))
    args = parser.parse_args()
    rows, report = prepare_rows(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as target:
        for row in rows:
            target.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
