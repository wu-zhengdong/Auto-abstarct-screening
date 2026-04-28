# Local Source Install

This is the more debuggable option for Windows users when the packaged `.exe` is blocked by antivirus, SmartScreen, missing runtime components, or PyInstaller-specific issues.

## Windows

1. Install Python 3.11 or newer from:

```text
https://www.python.org/downloads/windows/
```

During installation, tick:

```text
Add python.exe to PATH
```

2. Download and unzip the source package.
3. Double-click:

```text
Start-Windows.bat
```

The first launch installs `uv` for the current Windows user, downloads Python dependencies, starts the local app, and opens the browser.

After the first launch, users can keep double-clicking `Start-Windows.bat`.

## macOS

If the `.app` is blocked, use the source package:

```bash
chmod +x Start-macOS.command
./Start-macOS.command
```

## Data and API Keys

The source launcher uses the same local data behavior as the packaged desktop app.

Windows data is stored under:

```text
%LOCALAPPDATA%\LLM Abstract Screening\data
```

macOS data is stored under:

```text
~/Library/Application Support/LLM Abstract Screening/data
```

API keys are saved per user through the app settings UI. They are not included in the source package and are not uploaded to GitHub.
