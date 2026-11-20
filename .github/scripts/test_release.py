"""Tests for release.py. Run with: python3 -m unittest discover -s .github/scripts"""
import unittest

from release import Version, app_version, notes_start, published, validate

HISTORY = ["1.11.0", "v1.11.0", "v1.19.0", "v1.20.0", "v1.20.1-rc.1", "v1.20.1-rc.2", "nightly"]


def check(version, history=HISTORY, **kwargs):
    validate(Version(version), published(history), **kwargs)


class ValidateTest(unittest.TestCase):
    def test_accepts_next_versions(self):
        for version in ("1.20.1", "1.20.1-rc.3", "1.21.0", "1.21.0-rc.1", "3.0.0", "1.19.1"):
            check(version)

    def test_rejects_malformed(self):
        for version in ("v1.20.1", "1.20", "1.20.1-beta.1", "1.20.1-rc.0", "01.20.1", "1.20.1-rc1"):
            with self.assertRaises(ValueError):
                check(version)

    def test_rejects_existing_tag(self):
        with self.assertRaises(ValueError):
            check("1.20.1-rc.2")

    def test_rejects_lower_in_same_line(self):
        for version in ("1.20.1-rc.1", "1.20.0-rc.5", "1.19.0"):
            with self.assertRaises(ValueError):
                check(version)

    def test_rejects_candidate_after_final(self):
        with self.assertRaises(ValueError):
            check("1.20.1-rc.3", HISTORY + ["v1.20.1"])

    def test_ignores_tags_without_v(self):
        check("1.11.0", ["1.11.0"])

    def test_published_self(self):
        check("1.20.1", HISTORY + ["v1.20.1"], published_self=True)
        with self.assertRaises(ValueError):
            check("1.20.1", published_self=True)
        with self.assertRaises(ValueError):
            check("1.20.1-rc.1", published_self=True)


class AppVersionTest(unittest.TestCase):
    def test_final_matches_committed_version(self):
        app_version(Version("1.21.0"), "1.21.0")

    def test_candidate_matches_its_base(self):
        app_version(Version("3.0.0-rc.2"), "3.0.0")

    def test_rejects_other_committed_version(self):
        for committed in ("1.20.0", "1.21.0-rc.1", "1.21", ""):
            with self.assertRaises(ValueError):
                app_version(Version("1.21.0-rc.1"), committed)


class NotesStartTest(unittest.TestCase):
    def start(self, version, history=HISTORY):
        return notes_start(Version(version), published(history))

    def test_final_starts_from_previous_final(self):
        self.assertEqual(self.start("1.20.1"), "v1.20.0")

    def test_candidate_starts_from_previous_release(self):
        self.assertEqual(self.start("1.20.1-rc.3"), "v1.20.1-rc.2")
        self.assertEqual(self.start("1.20.1-rc.1", ["v1.20.0"]), "v1.20.0")

    def test_first_release(self):
        self.assertEqual(self.start("1.0.0", []), "")


if __name__ == "__main__":
    unittest.main()
