"""Unit tests for privacy-scoped Live session authorization."""

import unittest
from tempfile import TemporaryDirectory
from pathlib import Path

from app.services.collab_service import ConnectionManager


class LiveSessionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory()
        self.manager = ConnectionManager(Path(self.temporary.name))
        self.session, self.host_token, self.host = self.manager.create_live_session(
            "host-device", "Host", "#2563eb", "team", True, 60, 10
        )

    def tearDown(self):
        self.temporary.cleanup()

    def test_code_is_discovery_only_and_approval_issues_scoped_token(self):
        with self.assertRaises(ValueError):
            self.manager.authorize(self.session.session_id, self.session.session_id)
        session, guest, token = self.manager.request_join(
            self.session.session_id, "guest-device", "Guest", "#dc2626"
        )
        self.assertIsNone(token)
        self.assertEqual(guest.status, "pending")
        self.manager.approve(session.session_id, guest.request_id, self.host_token, True)
        _, approved, issued = self.manager.join_status(guest.request_id)
        self.assertTrue(issued)
        self.assertEqual(self.manager.authorize(session.session_id, issued)[1], approved)

    def test_host_can_change_role_and_revoke_access(self):
        session, guest, _ = self.manager.request_join(
            self.session.session_id, "guest-device", "Guest", "#dc2626"
        )
        self.manager.approve(session.session_id, guest.request_id, self.host_token, True)
        _, guest, token = self.manager.join_status(guest.request_id)
        self.manager.change_role(session.session_id, guest.participant_id, self.host_token, "viewer")
        self.assertEqual(self.manager.authorize(session.session_id, token)[1].role, "viewer")
        self.manager.remove_participant(session.session_id, guest.participant_id, self.host_token)
        with self.assertRaises(ValueError):
            self.manager.authorize(session.session_id, token)

    def test_join_attempts_are_throttled(self):
        for _ in range(5):
            self.manager.check_join_rate("client")
        with self.assertRaisesRegex(ValueError, "Too many"):
            self.manager.check_join_rate("client")


if __name__ == "__main__":
    unittest.main()
