# LLM Abstract Screening

Project-based web app for title and abstract screening with a generative LLM.

## What is included

- Project homepage with persistent project cards
- Per-project step workflow for:
  - project setup
  - manual inclusion and exclusion criteria entry
  - RIS import and deduplication
  - screening run launch and live progress tracking
- Background run pipeline that:
  - writes `results.csv` incrementally
  - exports `results.xlsx`
  - retries failed model calls
  - resumes interrupted runs that were already marked as `running`
- A raw `/screen` API for one-record screening if you want to call the model directly

## Stack

- FastAPI
- Jinja2 templates + vanilla JavaScript
- DashScope OpenAI-compatible API with `qwen3.6-flash`
- RIS parsing with `rispy`

## Quick start

1. Install dependencies:

```bash
uv sync --extra dev
```

2. Optional: set local storage paths and runtime defaults in `.env`:

```env
SCREENING_MODEL_A=qwen3.6-flash
SCREENING_MODEL_B=deepseek-v4-flash
ENABLE_THINKING=true
PROJECTS_DIR=data/projects
RUNS_DIR=data/runs
MAX_CONCURRENCY=2
MAX_RETRIES=3
```

API keys are not configured in `.env`. Open the project settings page, paste the user's own DashScope or DeepSeek API key, and click `Save & test API key`.

3. Run the app:

```bash
uv run uvicorn backend.main:app --reload
```

4. Open the UI:

```text
http://127.0.0.1:8000/
```

## Recommended Windows Local Install

For non-technical Windows users, the recommended distribution is:

```text
LLM_Abstract_Screening_Source_Local_Install.zip
```

This source launcher is more debuggable than the packaged `.exe` and is less likely to be blocked by Windows security tools or PyInstaller-specific runtime issues.

1. Install Python 3.11 or newer from `python.org` and tick `Add python.exe to PATH`.
2. Download `LLM_Abstract_Screening_Source_Local_Install.zip` from the GitHub release.
3. Unzip it.
4. Double-click `Start-Windows.bat`.

The first launch installs `uv` for that Windows user, downloads dependencies, starts the local app, and opens the browser. After that, users keep launching the app by double-clicking `Start-Windows.bat`.

Use the `.exe` mainly when users cannot install Python. The `.exe` bundles Python and dependencies, so it does not require a separate Python install, but it is more likely to hit SmartScreen, antivirus, or PyInstaller runtime differences. See [LOCAL_INSTALL.md](LOCAL_INSTALL.md).

## Build a Windows `.exe`

Detailed packaging notes and troubleshooting are in [PACKAGING.md](PACKAGING.md).

Build the executable on a Windows machine, because PyInstaller does not reliably cross-compile a Windows `.exe` from macOS.

1. Install `uv` on Windows.
2. Open PowerShell in this project folder.
3. Run:

```powershell
.\build_windows_exe.ps1
```

The output is:

```text
dist\LLM_Abstract_Screening.exe
```

Non-technical users can double-click the exe. It starts the local web app, opens the browser automatically, and stores project data under the user's application data folder. API keys are entered in the project settings page and saved per user.

## Build a macOS `.app`

Detailed packaging notes and troubleshooting are in [PACKAGING.md](PACKAGING.md).

Build the app on macOS:

```bash
./build_mac_app.sh
```

The output is:

```text
dist/LLM Abstract Screening.app
```

Users can double-click the app. It starts the local web app and opens the browser automatically. The app is not code-signed, so macOS may require right-clicking the app and choosing `Open` the first time.

Rebuild the app after changing backend code, templates, static files, or dependencies. Rebuilding is not needed for user data, uploaded RIS files, or locally saved API keys.

## UI workflow

1. Create a project from the homepage.
2. Open the project and complete the step flow.
3. Enter inclusion and exclusion criteria one line at a time.
4. Save the criteria exactly as you want them injected into the screening prompt.
5. Upload one or more `.ris` files.
6. Review the deduplication summary.
7. Click `Run screening`.
8. Track progress and download `CSV` or `XLSX`.

## Criteria entry

Criteria are not rewritten by the model.

- Users enter each inclusion criterion manually.
- Users enter each exclusion criterion manually.
- The saved criteria are injected directly into the screening instruction.

This keeps the screening prompt auditable and avoids semantic drift from criteria rewriting.

## Deduplication rules

- First priority: normalized DOI
- Second priority: normalized title
- Fallback: title plus abstract if title is missing after normalization

Normalization lowercases text, strips extra whitespace, and removes punctuation for title comparison.

## Storage layout

During development, projects are stored under `data/projects/<project_id>/`:

- `project.json`
- `studies.jsonl`

Runs are stored under `data/runs/<run_id>/`:

- `state.json`
- `studies.jsonl`
- `results.csv`
- `errors.csv`
- `results.xlsx`

Packaged desktop builds and source launchers store reusable user data outside the app folder:

Windows:

```text
%LOCALAPPDATA%\LLM Abstract Screening\data
```

macOS:

```text
~/Library/Application Support/LLM Abstract Screening/data
```

This means users can close and reopen the app, replace an older `.exe`, or replace an older source package without losing previous projects, screening runs, review projects, exported results, or saved API keys. Data is lost only if the user deletes that local data directory, changes OS user accounts, or moves to another computer without migrating the data directory.

## Main pages

- `GET /` homepage with project list
- `GET /projects/{project_id}` redirect to the recommended next step
- `GET /projects/{project_id}/project` project settings step
- `GET /projects/{project_id}/criteria` criteria entry step
- `GET /projects/{project_id}/import` RIS import step
- `GET /projects/{project_id}/run` screening run step

## Main API endpoints

- `GET /api/projects` list projects
- `POST /api/projects` create a project
- `GET /api/projects/{project_id}` fetch one project
- `PUT /api/projects/{project_id}` update project metadata
- `PUT /api/projects/{project_id}/criteria` save manual criteria
- `POST /api/projects/{project_id}/import-ris` import and deduplicate RIS files
- `POST /api/projects/{project_id}/runs` create and start a screening run
- `GET /api/runs/{run_id}/status` fetch run progress
- `GET /api/runs/{run_id}/results.csv` download live CSV output
- `GET /api/runs/{run_id}/results.xlsx` download XLSX export
- `POST /screen` single-record direct screening

## Single-record `/screen` request

```bash
curl -X POST http://127.0.0.1:8000/screen \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Evaluation of ChatGPT Performance on Emergency Medicine Board Examination Questions",
    "abstract": "This study evaluates ChatGPT on emergency medicine board-style questions...",
    "inclusion_criteria": [
      {
        "id": "I1",
        "text": "Any study that evaluates a generative large language model in healthcare or medicine."
      }
    ],
    "exclusion_criteria": [
      {
        "id": "E1",
        "text": "All reviews, reports, surveys, and editorials."
      }
    ]
  }'
```
