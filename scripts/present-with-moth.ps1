[CmdletBinding()]
param(
    [int]$Port = 4200,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$siteDir = Join-Path $repoRoot "site-prezentare"
$mothScript = Join-Path $repoRoot "examples\moth_camouflage.py"
$presentationUrl = "http://localhost:$Port/presentation.html"

function Resolve-RequiredCommand {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Required command '$Name' was not found on PATH."
    }

    return $command
}

if (-not (Test-Path -LiteralPath $siteDir)) {
    throw "Presentation directory not found: $siteDir"
}

if (-not (Test-Path -LiteralPath $mothScript)) {
    throw "Moth animation not found: $mothScript"
}

$quartoCommand = Resolve-RequiredCommand "quarto"
$uvCommand = Get-Command "uv" -ErrorAction SilentlyContinue

if ($uvCommand) {
    $mothCommand = $uvCommand.Source
    $mothArgs = @("run", "python", "`"$mothScript`"")
} else {
    $pythonCommand = Resolve-RequiredCommand "python"
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $py5Check = & $pythonCommand.Source -c "import py5" 2>&1
        $py5ExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($py5ExitCode -ne 0) {
        throw "Command 'uv' was not found, and fallback Python cannot import py5. Install uv or activate a Python environment with py5 before running this launcher."
    }

    $mothCommand = $pythonCommand.Source
    $mothArgs = @("`"$mothScript`"")
}

if ($CheckOnly) {
    Write-Host "Quarto command: $($quartoCommand.Source)"
    Write-Host "Presentation URL: $presentationUrl"
    Write-Host "Moth command: $mothCommand $($mothArgs -join ' ')"
    exit 0
}

Write-Host "Starting presentation preview at $presentationUrl"
$quartoProcess = Start-Process `
    -FilePath $quartoCommand.Source `
    -ArgumentList @("preview", ".", "--no-browser", "--port", $Port.ToString()) `
    -WorkingDirectory $siteDir `
    -WindowStyle Hidden `
    -PassThru

try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $presentationUrl -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -lt 500) {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    if (-not $ready) {
        Write-Warning "Presentation server did not respond yet; opening the URL anyway."
    }

    Start-Process $presentationUrl

    Write-Host "Starting full py5 moth animation."
    Start-Process `
        -FilePath $mothCommand `
        -ArgumentList $mothArgs `
        -WorkingDirectory $repoRoot

    Write-Host ""
    Write-Host "Presentation and moth animation are running."
    Write-Host "Close this PowerShell window or press Enter here to stop the Quarto preview server."
    [void][Console]::ReadLine()
} finally {
    if ($quartoProcess -and -not $quartoProcess.HasExited) {
        Stop-Process -Id $quartoProcess.Id -ErrorAction SilentlyContinue
    }
}
