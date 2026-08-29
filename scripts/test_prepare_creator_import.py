import tempfile
import unittest
from pathlib import Path

from prepare_creator_import import (
    choose_display_name,
    extract_instagram_handle,
    normalize_email,
    normalize_indian_phone,
    normalize_location,
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


if __name__ == "__main__":
    unittest.main()
