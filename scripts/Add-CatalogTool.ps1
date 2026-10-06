<#
.SYNOPSIS
  Generate and append a Killercrow catalog.js entry from a GitHub repo URL.

.DESCRIPTION
  Uses `gh` for repo metadata + latest release, picks a Windows download asset,
  optionally looks up winget / Chocolatey package IDs, and inserts a catalog
  object matching site/js/catalog.js schema.

.PARAMETER RepoUrl
  GitHub repo URL, e.g. https://github.com/kilrkrow/sideclip

.PARAMETER DryRun
  Print the entry; do not write catalog.js

.PARAMETER Blurb
  Override blurb text

.PARAMETER Name
  Override display name

.PARAMETER Id
  Override catalog id (kebab slug)

.EXAMPLE
  .\scripts\Add-CatalogTool.ps1 -RepoUrl https://github.com/kilrkrow/netpulse -DryRun

.EXAMPLE
  .\scripts\Add-CatalogTool.ps1 -RepoUrl https://github.com/kilrkrow/netpulse
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,

  [switch]$DryRun,

  [string]$Blurb,

  [string]$Name,

  [string]$Id
)

$ErrorActionPreference = "Stop"

function Get-RepoSlug {
  param([string]$Url)
  $u = $Url.Trim().TrimEnd("/")
  $u = $u -replace '\.git$', ''
  if ($u -match 'github\.com[/:](?<owner>[^/]+)/(?<repo>[^/]+)$') {
    return @{ Owner = $Matches.owner; Repo = $Matches.repo }
  }
  throw "Could not parse owner/repo from URL: $Url (expected https://github.com/OWNER/REPO)"
}

function ConvertTo-KebabSlug {
  param([string]$Text)
  $s = $Text.ToLowerInvariant()
  $s = $s -replace "[^a-z0-9]+", "-"
  $s = $s.Trim("-")
  if ([string]::IsNullOrWhiteSpace($s)) { throw "Could not derive id slug from '$Text'" }
  return $s
}

function ConvertTo-TitleCaseName {
  param([string]$Text)
  $parts = ($Text -replace "[_\-]+", " ").Trim() -split "\s+"
  $cult = [System.Globalization.CultureInfo]::InvariantCulture
  $ti = $cult.TextInfo
  $out = foreach ($p in $parts) {
    if ($p.Length -eq 0) { continue }
    $ti.ToTitleCase($p.ToLowerInvariant())
  }
  return ($out -join " ")
}

function Truncate-Blurb {
  param([string]$Text, [int]$Max = 120)
  if ([string]::IsNullOrWhiteSpace($Text)) {
    return "kilrkrow Windows utility."
  }
  $t = ($Text -replace "\s+", " ").Trim()
  if ($t.Length -le $Max) { return $t }
  $cut = $t.Substring(0, $Max - 1)
  $sp = $cut.LastIndexOf(" ")
  if ($sp -gt [Math]::Floor($Max * 0.6)) { $cut = $cut.Substring(0, $sp) }
  return ($cut.TrimEnd(".", ",", ";", ":") + [char]0x2026)
}

function Select-ReleaseAsset {
  param([object[]]$Assets)
  if (-not $Assets -or $Assets.Count -eq 0) {
    throw "Latest release has no assets. Publish a Windows .zip or .exe release first."
  }

  $names = @($Assets | ForEach-Object { $_.name })
  Write-Host ("Release assets: " + ($names -join ", "))

  $zipWinX64 = @(
    $Assets | Where-Object {
      $_.name -match '\.zip$' -and $_.name -match '(?i)(win-?x64|windows.?x64|x64.*win|win64)'
    }
  ) | Select-Object -First 1
  if ($zipWinX64) { return $zipWinX64 }

  $zipWin = @(
    $Assets | Where-Object {
      $_.name -match '\.zip$' -and $_.name -match '(?i)(win|windows)'
    }
  ) | Select-Object -First 1
  if ($zipWin) { return $zipWin }

  $exeWin = @(
    $Assets | Where-Object {
      $_.name -match '\.exe$' -and $_.name -match '(?i)(win|windows|setup|portable|installer)'
    }
  ) | Select-Object -First 1
  if ($exeWin) { return $exeWin }

  $anyZip = @($Assets | Where-Object { $_.name -match '\.zip$' }) | Select-Object -First 1
  if ($anyZip) { return $anyZip }

  $anyExe = @($Assets | Where-Object { $_.name -match '\.exe$' }) | Select-Object -First 1
  if ($anyExe) { return $anyExe }

  throw ("No .zip or .exe asset found on latest release. Assets: " + ($names -join ", "))
}

function Get-InstallKind {
  param([string]$AssetName)
  if ($AssetName -match '\.zip$') { return "zip" }
  if ($AssetName -match '\.exe$') { return "exe" }
  throw "Unsupported asset extension for installKind: $AssetName"
}

function Find-WingetId {
  param([string]$Query)
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Host "winget not found; wingetId = null"
    return $null
  }
  try {
    $out = & winget search --query $Query --disable-interactivity 2>&1 | Out-String
  } catch {
    Write-Host "winget search failed; wingetId = null"
    return $null
  }
  if ($out -match "(?i)No package found" -or [string]::IsNullOrWhiteSpace($out)) {
    return $null
  }

  $candidates = New-Object System.Collections.Generic.List[object]
  foreach ($line in ($out -split "`r?`n")) {
    if ($line -match '^\s*$') { continue }
    if ($line -match '^Name\s+Id\s+') { continue }
    if ($line -match '^-{3,}') { continue }
    # Publisher.Package Id (no spaces). Avoid capturing Version column.
    if ($line -match '(?i)\b([A-Za-z][A-Za-z0-9_+-]*\.[A-Za-z][A-Za-z0-9_.+-]*)\b') {
      $id = $Matches[1]
      $parts = [regex]::Split($line.Trim(), '\s{2,}') | Where-Object { $_ -ne '' }
      $nameGuess = if ($parts.Count -ge 1) { $parts[0].Trim() } else { $Query }
      $candidates.Add([pscustomobject]@{ Name = $nameGuess; Id = $id })
      continue
    }
    $parts = [regex]::Split($line.Trim(), '\s{2,}') | Where-Object { $_ -ne '' }
    if ($parts.Count -ge 2 -and ($parts[1] -notmatch '\s') -and ($parts[1] -notmatch '^\d+\.')) {
      $candidates.Add([pscustomobject]@{ Name = $parts[0].Trim(); Id = $parts[1].Trim() })
    }
  }
  if ($candidates.Count -eq 0) { return $null }

  $escaped = [regex]::Escape($Query)

  $prefer = @(
    $candidates | Where-Object { $_.Id -match '(?i)kilrkrow|killercrow' }
  ) | Select-Object -First 1
  if ($prefer) {
    Write-Host ("wingetId candidate: " + $prefer.Id)
    return $prefer.Id
  }

  # Exact Id only (e.g. "voltdesk") — do NOT accept unrelated Publisher.Query packages.
  $exact = @(
    $candidates | Where-Object { $_.Id -ieq $Query }
  ) | Select-Object -First 1
  if ($exact) {
    Write-Host ("wingetId candidate: " + $exact.Id)
    return $exact.Id
  }

  Write-Host ("winget found " + $candidates.Count + " hit(s) but none kilrkrow/exact Id; leaving null (first was " + $candidates[0].Id + ")")
  return $null
}

function Find-ChocoId {
  param([string]$Query)
  $choco = Get-Command choco -ErrorAction SilentlyContinue
  if (-not $choco) {
    Write-Host "choco not found; chocoId = null"
    return $null
  }
  try {
    $lines = & choco search $Query -r 2>&1
  } catch {
    Write-Host "choco search failed; chocoId = null"
    return $null
  }
  if (-not $lines) { return $null }
  foreach ($line in @($lines)) {
    $s = "$line".Trim()
    if ($s -match '^([^|]+)\|') {
      $pkgId = $Matches[1]
      if ($pkgId -ieq $Query) {
        Write-Host ("chocoId exact match: " + $pkgId)
        return $pkgId
      }
    }
  }
  Write-Host ("No exact choco id match for '" + $Query + "'; chocoId = null")
  return $null
}

function Format-CatalogEntryJs {
  param(
    [string]$Id,
    [string]$Name,
    [string]$Blurb,
    [string]$Repo,
    [string]$Tag,
    [string]$DownloadUrl,
    $WingetId,
    $ChocoId,
    [string]$InstallKind
  )

  function Esc([string]$s) {
    if ($null -eq $s) { return "" }
    $t = $s -replace "\\", "\\"
    $t = $t -replace '"', '\"'
    $t = $t -replace "`r", ""
    $t = $t -replace "`n", " "
    return $t
  }

  function NullOrStr($v) {
    if ($null -eq $v -or $v -eq "") { return "null" }
    return ('"' + (Esc ([string]$v)) + '"')
  }

  $lines = New-Object System.Collections.Generic.List[string]
  [void]$lines.Add("  {")
  [void]$lines.Add('    id: "' + (Esc $Id) + '",')
  [void]$lines.Add('    name: "' + (Esc $Name) + '",')
  [void]$lines.Add('    blurb: "' + (Esc $Blurb) + '",')
  [void]$lines.Add('    repo: "' + (Esc $Repo) + '",')
  [void]$lines.Add('    tag: "' + (Esc $Tag) + '",')
  [void]$lines.Add('    downloadUrl: "' + (Esc $DownloadUrl) + '",')
  [void]$lines.Add("    wingetId: " + (NullOrStr $WingetId) + ",")
  [void]$lines.Add("    chocoId: " + (NullOrStr $ChocoId) + ",")
  [void]$lines.Add('    installKind: "' + (Esc $InstallKind) + '"')
  [void]$lines.Add("  }")
  return ($lines -join "`n")
}

# --- main ---
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) { throw "`gh` CLI is required (https://cli.github.com/). Not found on PATH." }

$slug = Get-RepoSlug -Url $RepoUrl
$owner = $slug.Owner
$repoName = $slug.Repo
$canonicalRepo = "https://github.com/$owner/$repoName"
Write-Host "Repo: $canonicalRepo"

Write-Host "Fetching repo metadata..."
$repoJson = & gh api "repos/$owner/$repoName" | ConvertFrom-Json
$desc = $repoJson.description

Write-Host "Fetching latest release..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$relOut = & gh api "repos/$owner/$repoName/releases/latest" 2>&1
$relExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($relExit -ne 0) {
  throw "No latest release for $owner/$repoName. Publish a release with a Windows .zip/.exe asset first. Detail: $relOut"
}
$release = ($relOut | Out-String) | ConvertFrom-Json

$tag = $release.tag_name
if ([string]::IsNullOrWhiteSpace($tag)) { throw "Latest release has empty tag_name." }
Write-Host "Latest tag: $tag"

$asset = Select-ReleaseAsset -Assets @($release.assets)
$downloadUrl = $asset.browser_download_url
$installKind = Get-InstallKind -AssetName $asset.name
Write-Host ("Picked asset: " + $asset.name + " (" + $installKind + ")")

$finalId = if ($Id) { ConvertTo-KebabSlug $Id } else { ConvertTo-KebabSlug $repoName }
if ($Name) {
  $finalName = $Name
} else {
  # Prefer product token from asset name (e.g. NetPulse-win-x64-....zip)
  $assetBase = [System.IO.Path]::GetFileNameWithoutExtension($asset.name)
  if ($assetBase -match '^(?<prod>[A-Za-z][A-Za-z0-9]+)(?=[-_]|(?i)win|windows|x64|setup|portable|v?\d)') {
    $finalName = $Matches.prod
  } else {
    $finalName = ConvertTo-TitleCaseName $repoName
  }
}
$finalBlurb = if ($Blurb) { Truncate-Blurb $Blurb } else { Truncate-Blurb $desc }

Write-Host "Looking up winget..."
$wingetId = Find-WingetId -Query $repoName
if (-not $wingetId) {
  $compact = ($finalName -replace "\s+", "")
  if ($compact -and $compact -ne $repoName) {
    $wingetId = Find-WingetId -Query $compact
  }
}

Write-Host "Looking up Chocolatey..."
$chocoId = Find-ChocoId -Query $repoName
if (-not $chocoId -and $finalId -ne $repoName) {
  $chocoId = Find-ChocoId -Query $finalId
}

$entryJs = Format-CatalogEntryJs -Id $finalId -Name $finalName -Blurb $finalBlurb `
  -Repo $canonicalRepo -Tag $tag -DownloadUrl $downloadUrl `
  -WingetId $wingetId -ChocoId $chocoId -InstallKind $installKind

Write-Host ""
Write-Host "=== generated entry ==="
Write-Host $entryJs
Write-Host "======================="

if ($DryRun) {
  Write-Host "DryRun: catalog.js not modified."
  exit 0
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$catalogPath = Join-Path $repoRoot "site\js\catalog.js"
if (-not (Test-Path $catalogPath)) {
  throw "catalog.js not found at $catalogPath"
}

$catalogText = Get-Content -Path $catalogPath -Raw -Encoding UTF8
$idPattern = 'id:\s*["'']' + [regex]::Escape($finalId) + '["'']'
if ([regex]::IsMatch($catalogText, $idPattern)) {
  throw "Duplicate catalog id '$finalId' already present in $catalogPath. Aborting."
}

$trimmed = $catalogText.TrimEnd()
$endPat = '\]\s*;\s*$'
if (-not [regex]::IsMatch($trimmed, $endPat)) {
  throw "Could not find trailing ]; in catalog.js - unexpected format."
}

$body = [regex]::Replace($trimmed, $endPat, "")
$body = $body.TrimEnd()
$bracePat = '\}\s*$'
$braceCommaPat = '\},\s*$'
if ([regex]::IsMatch($body, $bracePat) -and -not [regex]::IsMatch($body, $braceCommaPat)) {
  $body = [regex]::Replace($body, $bracePat, "},")
}

$nl = [Environment]::NewLine
$newContent = $body + $nl + $entryJs + $nl + "];" + $nl
[System.IO.File]::WriteAllText($catalogPath, $newContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "Appended '$finalId' to $catalogPath"
Write-Host "Preview the site, then commit when ready."