$ErrorActionPreference = "Stop"

Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

function Get-PythonCommand {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return @("py", "-3")
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return @("python")
    }

    throw "Python was not found. Install Python 3.11 or newer from https://www.python.org/downloads/windows/ and tick 'Add python.exe to PATH' during installation."
}

function Invoke-Python {
    param(
        [Parameter(Mandatory = $true)]
        [string[]] $PythonCommand,
        [Parameter(Mandatory = $true)]
        [string[]] $Arguments
    )

    $executable = $PythonCommand[0]
    $prefixArguments = @()
    if ($PythonCommand.Length -gt 1) {
        $prefixArguments = $PythonCommand[1..($PythonCommand.Length - 1)]
    }

    & $executable @prefixArguments @Arguments
}

$pythonCommand = Get-PythonCommand

Write-Host "Checking Python..."
Invoke-Python -PythonCommand $pythonCommand -Arguments @("--version")

$uv = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uv) {
    Write-Host "uv was not found. Installing uv for this Windows user..."
    Invoke-Python -PythonCommand $pythonCommand -Arguments @("-m", "pip", "install", "--user", "uv")
}

$uv = Get-Command uv -ErrorAction SilentlyContinue
if ($uv) {
    Write-Host "Syncing dependencies with uv..."
    & $uv.Source sync

    Write-Host "Starting LLM Abstract Screening..."
    & $uv.Source run python -m backend.desktop
} else {
    Write-Host "uv is installed but is not on PATH in this terminal. Starting through Python instead..."
    Invoke-Python -PythonCommand $pythonCommand -Arguments @("-m", "uv", "sync")
    Invoke-Python -PythonCommand $pythonCommand -Arguments @("-m", "uv", "run", "python", "-m", "backend.desktop")
}
