# Guardar leads, leer CSV, comprobar cambios

import csv
import os
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import LEADS_FILE

_CSV_LOCK = threading.Lock()
_DANGEROUS_CSV_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def save_lead(user_message, bot_message, meta):
    path = Path(LEADS_FILE)

    with _CSV_LOCK:
        file_exists = path.is_file()
        path.parent.mkdir(parents=True, exist_ok=True)

        with path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            if not file_exists:
                writer.writerow([
                    "timestamp", "ip", "user_agent",
                    "language", "referer", "response_time",
                    "user_message", "bot_message",
                ])

            writer.writerow([
                datetime.now().isoformat(),
                meta["ip"], meta["user_agent"],
                meta["language"], meta["referer"],
                meta["response_time"], _safe_csv_cell(user_message), _safe_csv_cell(bot_message),
            ])

def get_last_modified():
    if os.path.exists(LEADS_FILE):
        return os.path.getmtime(LEADS_FILE)
    return 0


def _safe_csv_cell(value: Any) -> str:
    text = str(value)
    return f"'{text}" if text.startswith(_DANGEROUS_CSV_PREFIXES) else text
