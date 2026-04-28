#!/bin/zsh
set -e

cd "$(dirname "$0")"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv was not found. Installing uv for this macOS user..."
  python3 -m pip install --user uv
fi

echo "Syncing dependencies with uv..."
uv sync

echo "Starting LLM Abstract Screening..."
uv run python -m backend.desktop
