$ErrorActionPreference = "Stop"

uv sync --extra package
uv run pyinstaller --clean --noconfirm LLM_Abstract_Screening.spec

Write-Host ""
Write-Host "Done: dist\LLM_Abstract_Screening.exe"
Write-Host "Share that .exe with colleagues. On first launch, Windows may show a security warning because the file is not code-signed."
