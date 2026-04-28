#!/usr/bin/env bash
set -euo pipefail

uv sync --extra package
uv run pyinstaller --clean --noconfirm LLM_Abstract_Screening_mac.spec

echo
echo "Done: dist/LLM Abstract Screening.app"
echo "You can copy this .app to Applications or share it with another Mac using the same CPU architecture."
