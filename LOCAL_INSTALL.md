# Local Source Install

This is the recommended option for non-technical Windows users.

The source launcher is more debuggable than the packaged `.exe` when Windows blocks the app with antivirus, SmartScreen, missing runtime components, or PyInstaller-specific issues. It requires Python once, but after setup the user starts the app by double-clicking the same launcher each time.

## Which Windows Package to Use

Prefer:

```text
LLM_Abstract_Screening_Source_Local_Install.zip
```

Use:

```text
LLM_Abstract_Screening_Windows_x64.zip
```

only when the user cannot install Python and accepts possible Windows security prompts or packaged-app compatibility issues.

The `.exe` does not require a separate Python install because PyInstaller bundles a Python runtime, the app code, dependencies, templates, and static files into the executable. That convenience also makes the `.exe` more sensitive to Windows security tools and packaged runtime behavior.

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

If startup fails, the terminal window should show the actual Python or dependency error. This is easier to diagnose than many packaged `.exe` failures.

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

Users can reuse the app repeatedly. Previous projects, runs, review projects, results, and saved API keys remain available when the app is launched again.

Replacing the source package or downloading a newer release usually does not remove user data because the data is stored outside the unzipped app folder. Data is removed only if the user deletes the local data directory, switches to another OS user account, or uses a different computer without copying the data directory.
