from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


SELECTABLE_SCREENING_MODELS = (
    "qwen3.6-plus",
    "qwen3.6-flash",
    "qwen3.5-plus",
    "qwen3.5-flash",
    "deepseek-v4-flash",
    "deepseek-v4-pro",
)

LEGACY_SCREENING_MODELS = (
    "deepseek-chat",
)

SUPPORTED_SCREENING_MODELS = SELECTABLE_SCREENING_MODELS + LEGACY_SCREENING_MODELS


class Settings(BaseSettings):
    dashscope_api_key: str | None = Field(default=None, alias="DASHSCOPE_API_KEY")
    dashscope_base_url: str = Field(
        default="https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1",
        alias="DASHSCOPE_BASE_URL",
    )
    deepseek_api_key: str | None = Field(default=None, alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(default="https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    screening_model_a: str = Field(default="qwen3.6-flash", alias="SCREENING_MODEL_A")
    screening_model_b: str = Field(default="deepseek-v4-flash", alias="SCREENING_MODEL_B")
    enable_thinking: bool = Field(default=True, alias="ENABLE_THINKING")
    projects_dir: Path = Field(default=Path("data/projects"), alias="PROJECTS_DIR")
    runs_dir: Path = Field(default=Path("data/runs"), alias="RUNS_DIR")
    review_sessions_dir: Path = Field(default=Path("data/review_sessions"), alias="REVIEW_SESSIONS_DIR")
    max_concurrency: int = Field(default=2, alias="MAX_CONCURRENCY")
    max_retries: int = Field(default=3, alias="MAX_RETRIES")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
