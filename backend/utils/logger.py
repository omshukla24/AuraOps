"""
AuraOps Logger — Dual output: console + timestamped log file.
"""

import os
from datetime import datetime

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "logs")
os.makedirs(LOG_DIR, exist_ok=True)

_run_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
_log_file_path = os.path.join(LOG_DIR, f"run_{_run_timestamp}.log")
_log_file = None


def _open_log_file():
    """Open the log file for this run."""
    global _log_file
    if _log_file is None:
        _log_file = open(_log_file_path, "a", encoding="utf-8")
    return _log_file


def log(message: str):
    """Print a timestamped log message to console AND log file."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {message}"
    try:
        print(line)
    except UnicodeEncodeError:
        print(line.encode("ascii", errors="replace").decode())
    try:
        f = _open_log_file()
        f.write(line + "\n")
        f.flush()
    except Exception:
        pass


def get_log_file_path() -> str:
    """Return the current log file path."""
    return _log_file_path
