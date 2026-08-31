import csv
import tempfile
import unittest
from pathlib import Path

from prepare_creator_import import (
    choose_display_name,
    extract_instagram_handle,
    normalize_email,
    normalize_indian_phone,
    normalize_location,
    prepare_rows,
)


class CreatorImportCleanupTests(unittest.TestCase):
    def test_extracts_direct_nested_and_shared_handles(self):
        self.assertEqual(extract_instagram_handle("https://www.instagram.com/maya_creates/"), "maya_creates")
        self.assertEqual(extract_instagram_handle("https://www.instagram.com/https://instagram.com/maya.creates?x=1"), "maya.creates")
        self.assertEqual(extract_instagram_handle("I'm on Instagram as @maya_creates. Install the app"), "maya_creates")
        self.assertEqual(extract_instagram_handle("https://instagram.com/invites/contact/?i=1"), "")

    def test_normalizes_contact_values(self):
        self.assertEqual(normalize_email(" Person@Example.COM "), "person@example.com")
        self.assertEqual(normalize_email("not-an-email"), "")
        self.assertEqual(normalize_indian_phone("+91 98765-43210"), "+919876543210")
        self.assertEqual(normalize_indian_phone("09876543210"), "+919876543210")

    def test_uses_handle_for_category_names(self):
        row = {"name": "Fashion", "categories": "Fashion, Lifestyle"}
        self.assertEqual(choose_display_name(row, "maya_creates"), "@maya_creates")
        self.assertEqual(choose_display_name({"name": "Maya Kapoor", "categories": "Fashion"}, "maya"), "Maya Kapoor")

    def test_cleans_location(self):
        self.assertEqual(normalize_location("Bidar,  , India"), "Bidar, India")
        self.assertEqual(normalize_location("Mumbai, Maharashtra, India, India"), "Mumbai, Maharashtra, India")

    def test_prepares_detailed_instagram_profiles_above_the_repository_minimum(self):
        fieldnames = [
            "ID", "Username", "Full Name", "Biography", "Verified", "Is Business Account",
            "Business Category Name", "Profile Pic URL", "Followers", "Following", "Number of Posts",
            "Average Likes", "Average Comments", "Average Reel Views", "Engagement Rate (%)",
            "Min Likes", "Min Comments", "Min Reel Views", "Max Likes", "Max Comments", "Max Reel Views",
            "Primary Content Niche", "Secondary Content Niche", "Language", "Gender", "Age", "City", "State",
            "Email", "Contact Number", "Scraping Status", "Scraping In Progress",
            "Profile Picture Stored in Firebase",
        ]
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "profiles.csv"
            with source.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerow({"ID": "low", "Username": "under_limit", "Followers": "999", "Scraping Status": "Complete"})
                writer.writerow({
                    "ID": "valid", "Username": "maya.creates", "Full Name": "Maya Kapoor",
                    "Biography": "Wellness and travel", "Verified": "1", "Is Business Account": "1",
                    "Business Category Name": "Digital creator", "Profile Pic URL": "https://images.example/maya.jpg",
                    "Profile Picture Stored in Firebase": "https://storage.googleapis.com/example/maya.jpg",
                    "Followers": "1,250", "Following": "230", "Number of Posts": "91",
                    "Average Likes": "410.4", "Average Comments": "18.2", "Average Reel Views": "4,800",
                    "Engagement Rate (%)": "3.4", "Min Likes": "120", "Min Comments": "4", "Min Reel Views": "900",
                    "Max Likes": "900", "Max Comments": "42", "Max Reel Views": "12000",
                    "Primary Content Niche": "Wellness", "Secondary Content Niche": "Travel", "Language": "English",
                    "Gender": "Female", "Age": "24", "City": "Mumbai", "State": "Maharashtra",
                    "Email": "maya@example.com", "Contact Number": "+91 98765 43210",
                    "Scraping Status": "Complete", "Scraping In Progress": "0",
                })

            rows, report = prepare_rows(source, contacts_verified=True)

        self.assertEqual(len(rows), 1)
        profile = rows[0]
        self.assertEqual(profile["handle"], "@maya.creates")
        self.assertEqual(profile["followerCount"], 1250)
        self.assertEqual(profile["location"], "Mumbai, Maharashtra")
        self.assertEqual(profile["categories"], ["Wellness", "Travel"])
        self.assertEqual(profile["contentLanguages"], ["English"])
        self.assertEqual(profile["instagramMetrics"]["followingCount"], 230)
        self.assertEqual(profile["instagramMetrics"]["averageComments"], 18.2)
        self.assertEqual(profile["instagramMetrics"]["engagementRatePercent"], 3.4)
        self.assertEqual(profile["contacts"], [{"email": "maya@example.com", "phone": "+919876543210"}])
        self.assertEqual(profile["profileImageUrl"], "https://storage.googleapis.com/example/maya.jpg")
        self.assertEqual(profile["contactVerificationStatus"], "verified")
        self.assertFalse(any("scrap" in key.casefold() for key in profile))
        self.assertEqual(report["rejectedByReason"], {"below_1000_followers": 1})
        self.assertEqual(report["profilesWithPermanentImage"], 1)


if __name__ == "__main__":
    unittest.main()
