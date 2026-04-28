# Packaging Notes

This project can be packaged as a local desktop launcher for non-technical users. The packaged app still runs the same FastAPI web app locally and opens it in the user's browser.

## When to Rebuild

Rebuild the packaged app after changes to:

- `backend/`
- `templates/`
- `static/`
- Python dependencies in `pyproject.toml` or `uv.lock`
- default runtime behavior that users should receive

Rebuilding is not needed for:

- user project data
- uploaded RIS files
- locally saved API keys
- documentation-only changes

## macOS `.app`

Build on macOS:

```bash
./build_mac_app.sh
```

Output:

```text
dist/LLM Abstract Screening.app
```

The Finder item with `Kind = Application` is the app users should double-click. Do not use the similarly named `Unix Executable File`, and users do not need to open the generated support folder.

The app is not Apple Developer signed or notarized. On first launch, macOS may block it. Use right-click, then `Open`, then confirm.

Apple Silicon builds are intended for Apple Silicon Macs. Intel Macs should be built on Intel macOS or with a deliberate universal-build workflow.

## Windows `.exe`

Build on Windows:

```powershell
.\build_windows_exe.ps1
```

Output:

```text
dist\LLM_Abstract_Screening.exe
```

Build the Windows executable on Windows. PyInstaller should not be treated as a reliable macOS-to-Windows cross-compiler.

## Runtime Behavior

The packaged launcher:

- starts Uvicorn on `127.0.0.1`
- prefers port `8000`
- falls back to a free local port if `8000` is already in use
- opens the browser automatically after `/health` responds
- stores project/run/review data in the user's application data directory
- stores API keys per user through the app settings UI

API keys are not bundled into the app and should not be stored in `.env` for shared builds.

## PyInstaller Lessons Learned

Use an explicit imported app object in `backend/desktop.py`:

```python
from backend.main import app

uvicorn.run(app, host="127.0.0.1", port=port)
```

Avoid using only the string form:

```python
uvicorn.run("backend.main:app", ...)
```

The string form can fail after packaging because PyInstaller may not discover the dynamically imported `backend` package. The symptom is that double-clicking the `.app` appears to do nothing because the windowless app exits immediately.

`backend/main.py` must resolve bundled resources with `sys._MEIPASS` so `templates/` and `static/` work inside PyInstaller builds.

## Debugging a Silent macOS Launch

If double-clicking the `.app` appears to do nothing, run the internal executable from Terminal to see the traceback:

```bash
"dist/LLM Abstract Screening.app/Contents/MacOS/LLM Abstract Screening"
```

Then check whether the app is listening:

```bash
lsof -nP -iTCP -sTCP:LISTEN | rg 'LLM|8000'
```

Check the health endpoint:

```bash
curl -sS http://127.0.0.1:8000/health
```

A healthy launch returns:

```json
{"status":"ok"}
```

If running inside a restricted sandbox, binding to localhost may fail with `PermissionError: [Errno 1] Operation not permitted`. Verify outside the sandbox before treating that as an app bug.

## Verification Checklist

After rebuilding:

1. Launch the packaged app.
2. Confirm the browser opens.
3. Confirm `/health` returns `{"status":"ok"}`.
4. Run the test suite:

```bash
uv sync --extra dev --extra package
uv run pytest
```

5. Stop any test-launched app process after verification.
