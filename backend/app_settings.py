import json
import os
import sys
from pathlib import Path
from typing import Literal


ProviderLiteral = Literal["dashscope", "deepseek"]

APP_NAME = "LLM Abstract Screening"
PROVIDER_LABELS: dict[ProviderLiteral, str] = {
    "dashscope": "DashScope",
    "deepseek": "DeepSeek",
}


class UserSettingsStore:
    def __init__(self, config_dir: Path | None = None) -> None:
        self._config_dir = config_dir or _default_config_dir()
        self._config_path = self._config_dir / "settings.json"

    @property
    def config_path(self) -> Path:
        return self._config_path

    def get_local_api_key(self, provider: ProviderLiteral) -> str | None:
        value = self._read_payload().get("api_keys", {}).get(provider)
        if not isinstance(value, str):
            return None
        value = value.strip()
        return value or None

    def get_effective_api_key(self, provider: ProviderLiteral, fallback: str | None = None) -> str | None:
        return self.get_local_api_key(provider) or (fallback.strip() if fallback else None)

    def save_api_key(self, provider: ProviderLiteral, api_key: str) -> None:
        payload = self._read_payload()
        api_keys = payload.setdefault("api_keys", {})
        api_keys[provider] = api_key.strip()
        self._write_payload(payload)

    def get_status(self, provider: ProviderLiteral, fallback: str | None = None) -> dict[str, object]:
        local_key = self.get_local_api_key(provider)
        env_key = fallback.strip() if fallback else None
        key = local_key or env_key
        return {
            "provider": provider,
            "provider_label": PROVIDER_LABELS[provider],
            "has_api_key": bool(key),
            "key_preview": mask_api_key(key),
            "source": "local" if local_key else "environment" if env_key else "none",
        }

    def _read_payload(self) -> dict[str, object]:
        if not self._config_path.exists():
            return {}
        try:
            payload = json.loads(self._config_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return payload if isinstance(payload, dict) else {}

    def _write_payload(self, payload: dict[str, object]) -> None:
        self._config_dir.mkdir(parents=True, exist_ok=True)
        temporary_path = self._config_path.with_suffix(".tmp")
        temporary_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        try:
            temporary_path.chmod(0o600)
        except OSError:
            pass
        temporary_path.replace(self._config_path)


def model_provider(model: str) -> ProviderLiteral:
    return "deepseek" if model.startswith("deepseek-") else "dashscope"


def mask_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None
    cleaned = api_key.strip()
    if len(cleaned) <= 8:
        return "*" * len(cleaned)
    return f"{cleaned[:4]}{'*' * 8}{cleaned[-4:]}"


def _default_config_dir() -> Path:
    override = os.getenv("LLM_ABSTRACT_SCREENING_CONFIG_DIR")
    if override:
        return Path(override).expanduser()

    if sys.platform == "win32":
        base = os.getenv("APPDATA")
        return Path(base).expanduser() / APP_NAME if base else Path.home() / "AppData" / "Roaming" / APP_NAME

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME

    return Path(os.getenv("XDG_CONFIG_HOME", Path.home() / ".config")).expanduser() / APP_NAME
