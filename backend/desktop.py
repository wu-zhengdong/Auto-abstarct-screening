import os
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn

from backend.main import app


APP_NAME = "LLM Abstract Screening"


def main() -> None:
    port = _find_free_port()
    url = f"http://127.0.0.1:{port}/"
    _configure_writable_data_dirs()

    threading.Thread(target=_open_browser_when_ready, args=(url,), daemon=True).start()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )


def _find_free_port() -> int:
    preferred_port = int(os.getenv("LLM_ABSTRACT_SCREENING_PORT", "8000"))
    if _port_is_available(preferred_port):
        return preferred_port

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _port_is_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def _configure_writable_data_dirs() -> None:
    data_dir = _default_data_dir()
    os.environ.setdefault("PROJECTS_DIR", str(data_dir / "projects"))
    os.environ.setdefault("RUNS_DIR", str(data_dir / "runs"))
    os.environ.setdefault("REVIEW_SESSIONS_DIR", str(data_dir / "review_sessions"))


def _default_data_dir() -> Path:
    override = os.getenv("LLM_ABSTRACT_SCREENING_DATA_DIR")
    if override:
        return Path(override).expanduser()

    if sys.platform == "win32":
        base = os.getenv("LOCALAPPDATA") or os.getenv("APPDATA")
        root = Path(base).expanduser() if base else Path.home() / "AppData" / "Local"
        return root / APP_NAME / "data"

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME / "data"

    return Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share")).expanduser() / APP_NAME / "data"


def _open_browser_when_ready(url: str) -> None:
    for _ in range(60):
        if _url_is_ready(url):
            webbrowser.open(url)
            return
        time.sleep(0.25)
    webbrowser.open(url)


def _url_is_ready(url: str) -> bool:
    import urllib.request

    try:
        with urllib.request.urlopen(url + "health", timeout=0.5) as response:
            return response.status == 200
    except OSError:
        return False


if __name__ == "__main__":
    main()
