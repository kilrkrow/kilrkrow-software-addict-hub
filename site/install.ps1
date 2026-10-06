#Requires -RunAsAdministrator
<#
  Killercrow / kilrkrow one-shot installer (all catalog tools).
  Pronunciation: kilrkrow = killercrow

  Elevated PowerShell (Chris Titus–style):
    Set-ExecutionPolicy Bypass -Scope Process -Force
    irm https://kilrkrow.github.io/kilrkrow-software-addict-hub/install.ps1 | iex
  or download this file and:
    .\install.ps1

  Prefer winget, then Chocolatey when an id is set; else GitHub Release download.
  For a custom subset, use the hub site "Install selected" button instead.
#>
$ErrorActionPreference = 'Stop'

$Root = Join-Path $env:LOCALAPPDATA 'Killercrow\apps'
New-Item -ItemType Directory -Force -Path $Root | Out-Null

function Test-Cmd([string]$Name) { [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
function Install-Winget([string]$Id) {
  if (-not (Test-Cmd winget)) { return $false }
  winget install --id $Id -e --accept-package-agreements --accept-source-agreements
  return $true
}
function Install-Choco([string]$Id) {
  if (-not (Test-Cmd choco)) { return $false }
  choco install $Id -y
  return $true
}
function Install-Url([string]$Name, [string]$Url, [string]$Kind) {
  $destDir = Join-Path $Root $Name
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  $file = Join-Path $destDir ([IO.Path]::GetFileName(($Url -split '\?')[0]))
  Write-Host "Downloading $Name ..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $Url -OutFile $file -UseBasicParsing
  if ($Kind -eq 'zip') {
    Expand-Archive -Path $file -DestinationPath $destDir -Force
    Write-Host "Extracted to $destDir"
  } else {
    Write-Host "Saved $file"
  }
}

# Keep in sync with site/js/catalog.js
$Tools = @(
  @{ id='sideclip'; name='Sideclip'; wingetId=$null; chocoId=$null; downloadUrl='https://github.com/kilrkrow/sideclip/releases/download/v0.1.0/Sideclip-win-x64-v0.1.0.zip'; installKind='zip' },
  @{ id='netpulse'; name='NetPulse'; wingetId=$null; chocoId=$null; downloadUrl='https://github.com/kilrkrow/netpulse/releases/download/v0.1.0/NetPulse-win-x64-v0.1.0.zip'; installKind='zip' },
  @{ id='voltdesk'; name='VoltDesk'; wingetId=$null; chocoId='voltdesk'; downloadUrl='https://github.com/kilrkrow/voltdesk/releases/download/v1.0.2/VoltDesk.exe'; installKind='exe' },
  @{ id='win-service-buddy'; name='Win Service Buddy'; wingetId=$null; chocoId=$null; downloadUrl='https://github.com/kilrkrow/win-service-buddy/releases/download/v0.2.0/wsbuddy-app-win-x64-v0.2.0.zip'; installKind='zip' },
  @{ id='audio-mixer'; name='KilrKrow Mixer'; wingetId=$null; chocoId=$null; downloadUrl='https://github.com/kilrkrow/audio-mixer/releases/download/v0.1.1/AudioMixer-win-x64-v0.1.1.zip'; installKind='zip' }
)

foreach ($t in $Tools) {
  Write-Host "==> $($t.name)" -ForegroundColor Green
  if ($t.wingetId -and (Install-Winget $t.wingetId)) { continue }
  if ($t.chocoId -and (Install-Choco $t.chocoId)) { continue }
  Install-Url $t.id $t.downloadUrl $t.installKind
}

Write-Host "Done. Portable downloads under $Root" -ForegroundColor Cyan
Write-Host "Fill wingetId/chocoId in site/js/catalog.js when packages are published." -ForegroundColor DarkYellow
