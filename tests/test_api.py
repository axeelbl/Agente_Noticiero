import csv
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.backend import csv_utils
from app.backend.Bots.chat import _fallback_decision
from app.backend.main import app


class NewsApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_health_and_security_headers(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        response = self.client.get("/health")
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertIn("connect-src 'self'", response.headers["content-security-policy"])

    def test_chat_payload_limits_are_enforced(self):
        self.assertEqual(self.client.post("/chat", json={"user_message": ""}).status_code, 422)
        self.assertEqual(
            self.client.post("/chat", json={"user_message": "x" * 501}).status_code,
            422,
        )

    def test_missing_chat_configuration_returns_503(self):
        with patch(
            "app.backend.services.chat_service.ask_groq",
            side_effect=RuntimeError("missing key"),
        ):
            response = self.client.post("/chat", json={"user_message": "hola"})
        self.assertEqual(response.status_code, 503)

    def test_fallback_router_recognizes_news_requests(self):
        decision = _fallback_decision("Dame noticias de tecnologia")
        self.assertEqual(decision["action"], "SEARCH_NEWS")
        self.assertEqual(decision["response_style"], "summary")

    def test_csv_cells_are_protected_against_formulas(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "leads.csv"
            with patch.object(csv_utils, "LEADS_FILE", str(output)):
                csv_utils.save_lead("=2+2", "respuesta", {
                    "ip": "",
                    "user_agent": "",
                    "language": "",
                    "referer": "",
                    "response_time": 0,
                })

            with output.open(encoding="utf-8", newline="") as file:
                rows = list(csv.reader(file))
            self.assertEqual(rows[1][-2], "'=2+2")


if __name__ == "__main__":
    unittest.main()
