<#
  ldk-check.ps1 - deterministic validation for Lovable Driven Kit state.
  Usage:
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\ldk-check.ps1 -Root .

  Validates discovery, project, roadmap, ledger, plans and proof reports. This script is intentionally ASCII-only.
#>

param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$RootAbs = (Resolve-Path -LiteralPath $Root).Path
$script:Errors = 0
$script:Warnings = 0

function ErrorMsg($m) {
  Write-Host "ERROR $m"
  $script:Errors++
}

function WarnMsg($m) {
  Write-Host "WARN  $m"
  $script:Warnings++
}

function Rel($p) {
  $full = [System.IO.Path]::GetFullPath($p)
  if ($full.StartsWith($RootAbs)) {
    return $full.Substring($RootAbs.Length).TrimStart('\','/').Replace('\','/')
  }
  return $full.Replace('\','/')
}

function Text($p) {
  return Get-Content -Raw -Encoding UTF8 -LiteralPath $p
}

function InsideRoot($p) {
  $full = [System.IO.Path]::GetFullPath($p)
  $prefix = $RootAbs.TrimEnd('\','/') + [System.IO.Path]::DirectorySeparatorChar
  return $full.Equals($RootAbs, [System.StringComparison]::OrdinalIgnoreCase) -or
    $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function CleanCell($v) {
  return ($v.Trim() -replace '^`|`$', '')
}

function RankProof($v) {
  switch ($v) {
    "P1" { return 1 }
    "P2" { return 2 }
    "P3" { return 3 }
    "P4" { return 4 }
    "none" { return 0 }
    default { return -1 }
  }
}

function Marker($text, $name) {
  $pattern = "(?m)^" + [regex]::Escape($name) + ":\s*(.+?)\s*$"
  $m = [regex]::Match($text, $pattern)
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return $null
}

$allowedRisk = @("trivial", "baixo", "medio", "alto")
$allowedState = @("idea", "planned", "approved", "building", "proof-pending", "done", "partial", "blocked", "reopened")
$allowedProof = @("P1", "P2", "P3", "P4")
$allowedTaskState = @("backlog", "ready", "in-progress", "proof-pending", "done", "blocked")
$expectedTaskHeader = @("ID", "Descricao", "AC", "Arquivos esperados", "Verificacao", "State")
$expectedVersion = "0.2.0"
$expectedSchema = "2"
$allowedDiscoveryStatus = @("draft", "external-review", "awaiting-approval", "approved")
$allowedAutonomy = @("guided", "balanced", "autopilot")
$allowedRoadmapStatus = @("current", "stale")
$allowedPlanStatus = @("planned", "approved", "building", "proof-pending", "done", "partial", "blocked", "reopened")

$discoveryRevision = $null
$discoveryStatus = $null
$discovery = Join-Path $RootAbs "ldk\discovery.md"
if (-not (Test-Path -LiteralPath $discovery)) {
  ErrorMsg "missing ldk/discovery.md"
} else {
  $discoveryText = Text $discovery
  $discoveryVersion = Marker $discoveryText "LDK Version"
  $discoverySchema = Marker $discoveryText "LDK Schema"
  $discoveryStatus = Marker $discoveryText "Status"
  $discoveryRevision = Marker $discoveryText "Revision"
  $approvedAt = Marker $discoveryText "Approved at"
  $approvedBy = Marker $discoveryText "Approved by"

  if ($discoveryVersion -ne $expectedVersion) { ErrorMsg "ldk/discovery.md: LDK Version must be '$expectedVersion'" }
  if ($discoverySchema -ne $expectedSchema) { ErrorMsg "ldk/discovery.md: LDK Schema must be '$expectedSchema'" }
  if ($allowedDiscoveryStatus -notcontains $discoveryStatus) { ErrorMsg "ldk/discovery.md: invalid Status '$discoveryStatus'" }
  if ($discoveryRevision -notmatch '^[1-9][0-9]*$') { ErrorMsg "ldk/discovery.md: Revision must be a positive integer" }
  if ($discoveryStatus -eq "approved") {
    if ([string]::IsNullOrWhiteSpace($approvedAt)) { ErrorMsg "ldk/discovery.md: approved discovery needs Approved at" }
    if ([string]::IsNullOrWhiteSpace($approvedBy)) { ErrorMsg "ldk/discovery.md: approved discovery needs Approved by" }
  }
}

$downstreamPaths = @(
  (Join-Path $RootAbs "ldk\project.md"),
  (Join-Path $RootAbs "ldk\ledger.md"),
  (Join-Path $RootAbs "ldk\roadmap.md"),
  (Join-Path $RootAbs "ldk\features")
)
if ($discoveryStatus -and $discoveryStatus -ne "approved" -and ($downstreamPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)) {
  ErrorMsg "ldk/discovery.md: Status '$discoveryStatus' does not authorize project, ledger, roadmap, plan or build artifacts"
}

$project = Join-Path $RootAbs "ldk\project.md"
if (-not (Test-Path -LiteralPath $project)) {
  ErrorMsg "missing ldk/project.md"
} else {
  $projectText = Text $project
  if ((Marker $projectText "LDK Version") -ne $expectedVersion) { ErrorMsg "ldk/project.md: LDK Version must be '$expectedVersion'" }
  if ((Marker $projectText "LDK Schema") -ne $expectedSchema) { ErrorMsg "ldk/project.md: LDK Schema must be '$expectedSchema'" }
  $projectRevision = Marker $projectText "Discovery revision"
  if ($projectRevision -notmatch '^[1-9][0-9]*$') { ErrorMsg "ldk/project.md: Discovery revision must be a positive integer" }
  elseif ($discoveryRevision -and $projectRevision -ne $discoveryRevision) { ErrorMsg "ldk/project.md: Discovery revision '$projectRevision' differs from discovery '$discoveryRevision'" }
  $autonomy = Marker $projectText "Autonomy mode"
  if ($allowedAutonomy -notcontains $autonomy) { ErrorMsg "ldk/project.md: invalid Autonomy mode '$autonomy'" }
}

$roadmap = Join-Path $RootAbs "ldk\roadmap.md"
if (Test-Path -LiteralPath $roadmap) {
  $roadmapText = Text $roadmap
  $roadmapStatus = Marker $roadmapText "Status"
  $roadmapRevision = Marker $roadmapText "Discovery revision"
  if ($allowedRoadmapStatus -notcontains $roadmapStatus) { ErrorMsg "ldk/roadmap.md: invalid Status '$roadmapStatus'" }
  if ($roadmapRevision -notmatch '^[1-9][0-9]*$') { ErrorMsg "ldk/roadmap.md: Discovery revision must be a positive integer" }
  if ($roadmapStatus -eq "current" -and $discoveryRevision -and $roadmapRevision -ne $discoveryRevision) {
    ErrorMsg "ldk/roadmap.md: current roadmap revision '$roadmapRevision' differs from discovery '$discoveryRevision'"
  }
}

$ledger = Join-Path $RootAbs "ldk\ledger.md"
if (-not (Test-Path -LiteralPath $ledger)) {
  ErrorMsg "missing ldk/ledger.md"
} else {
  $ledgerLines = Get-Content -Encoding UTF8 -LiteralPath $ledger
  $ledgerHeader = $ledgerLines | Where-Object { $_ -match '^\|\s*ID\s*\|' } | Select-Object -First 1
  if (-not $ledgerHeader -or $ledgerHeader.Trim() -ne '| ID | Feature | Risk | State | Proof required | Last evidence |') {
    ErrorMsg "ldk/ledger.md: header must be exactly '| ID | Feature | Risk | State | Proof required | Last evidence |'"
  }
  foreach ($line in $ledgerLines) {
    if ($line -notmatch '^\|') { continue }
    if ($line -match '^\|\s*(-+|ID)\s*\|') { continue }
    $cells = $line.Trim() -split '\|'
    if ($cells.Count -lt 8) {
      ErrorMsg "ldk/ledger.md: malformed row: $line"
      continue
    }

    $id = CleanCell $cells[1]
    $feature = CleanCell $cells[2]
    $risk = CleanCell $cells[3]
    $state = CleanCell $cells[4]
    $required = CleanCell $cells[5]
    $evidence = CleanCell $cells[6]

    if ($id -notmatch '^F[0-9]+$') {
      ErrorMsg "ldk/ledger.md: row ID '$id' must match F plus digits (example: F1)"
    }
    if ($allowedRisk -notcontains $risk) {
      ErrorMsg "ldk/ledger.md: ${id} has invalid Risk '$risk'"
    }
    if ($allowedState -notcontains $state) {
      ErrorMsg "ldk/ledger.md: ${id} has invalid State '$state'"
    }
    if ($allowedProof -notcontains $required) {
      ErrorMsg "ldk/ledger.md: ${id} has invalid Proof required '$required'"
    }

    if (-not [string]::IsNullOrWhiteSpace($evidence) -and $evidence -ne "-") {
      $evidenceCandidate = [System.IO.Path]::GetFullPath((Join-Path $RootAbs ($evidence -replace '/', '\')))
      if (-not (InsideRoot $evidenceCandidate)) {
        ErrorMsg "ldk/ledger.md: ${id} Last evidence escapes project root '$evidence'"
      }
      if ($evidence -match '(?i)(^|/)(plan|brief)\.md$') {
        ErrorMsg "ldk/ledger.md: ${id} Last evidence must not point to plan/brief '$evidence'"
      }
      if (@("idea", "planned", "approved", "building", "proof-pending") -contains $state) {
        ErrorMsg "ldk/ledger.md: ${id} state '$state' must keep Last evidence empty"
      }
      if (@("partial", "blocked") -contains $state -and -not (Test-Path -LiteralPath $evidenceCandidate)) {
        ErrorMsg "ldk/ledger.md: ${id} state '$state' points to missing evidence '$evidence'"
      }
    }

    if ($state -eq "done") {
      if ([string]::IsNullOrWhiteSpace($evidence) -or $evidence -eq "-") {
        ErrorMsg "ldk/ledger.md: ${id} is done but Last evidence is empty"
        continue
      }

      $proofPath = [System.IO.Path]::GetFullPath((Join-Path $RootAbs ($evidence -replace '/', '\')))
      if (-not (InsideRoot $proofPath)) {
        ErrorMsg "ldk/ledger.md: ${id} proof path escapes project root '$evidence'"
        continue
      }
      if (-not (Test-Path -LiteralPath $proofPath)) {
        ErrorMsg "ldk/ledger.md: ${id} points to missing proof '$evidence'"
        continue
      }

      $proofText = Text $proofPath
      $status = Marker $proofText "Status"
      $proofRisk = Marker $proofText "Risk"
      $proofRequired = Marker $proofText "Proof level required"
      $achieved = Marker $proofText "Proof level achieved"
      $proofRevision = Marker $proofText "Discovery revision"

      if ($status -ne "DONE") {
        ErrorMsg "$(Rel $proofPath): ledger is done but proof Status is '$status'"
      }
      if ($proofRisk -and $proofRisk -ne $risk) {
        WarnMsg "$(Rel $proofPath): proof Risk '$proofRisk' differs from ledger '$risk'"
      }
      if ($proofRequired -ne $required) {
        ErrorMsg "$(Rel $proofPath): proof required '$proofRequired' differs from ledger '$required'"
      }
      if ((RankProof $achieved) -lt (RankProof $required)) {
        ErrorMsg "$(Rel $proofPath): achieved '$achieved' is lower than required '$required'"
      }
      if ($discoveryRevision -and $proofRevision -ne $discoveryRevision) {
        ErrorMsg "$(Rel $proofPath): Discovery revision '$proofRevision' differs from discovery '$discoveryRevision'"
      }
      if ($proofText -match '(?mi)^\s*-\s*AC[0-9]+:\s*not covered\b') {
        ErrorMsg "$(Rel $proofPath): DONE proof has not covered AC"
      }

      $selfChecksYes = @(
        "Required proof identified",
        "All essential AC covered",
        "Evidence exists for every covered AC",
        "Evidence references are current and observable",
        "Proof level achieved >= required"
      )
      foreach ($check in $selfChecksYes) {
        $pattern = "(?mi)^[ \t]*-[ \t]*" + [regex]::Escape($check) + ":[ \t]*yes\b"
        if ($proofText -notmatch $pattern) {
          ErrorMsg "$(Rel $proofPath): DONE proof self-check '$check' must be yes"
        }
      }
      if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*Critical errors known:[ \t]*no\b') {
        ErrorMsg "$(Rel $proofPath): DONE proof self-check 'Critical errors known' must be no"
      }
      if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*LDK engine drift detected:[ \t]*no\b') {
        ErrorMsg "$(Rel $proofPath): DONE proof self-check 'LDK engine drift detected' must be no"
      }

      $requiredRank = RankProof $required
      if ($requiredRank -ge 1 -and $proofText -notmatch '(?mi)^[ \t]*-[ \t]*Screenshot or visual observation:[ \t]*\S') {
        ErrorMsg "$(Rel $proofPath): P1+ proof needs screenshot or visual observation"
      }
      if ($requiredRank -ge 2 -and $proofText -notmatch '(?mi)^[ \t]*-[ \t]*Main user flow tested:[ \t]*yes\b') {
        ErrorMsg "$(Rel $proofPath): P2+ proof needs Main user flow tested: yes"
      }
      if ($requiredRank -ge 3 -and $proofText -notmatch '(?mi)^[ \t]*-[ \t]*Automated test result:[ \t]*pass\b') {
        ErrorMsg "$(Rel $proofPath): P3+ proof needs Automated test result: pass"
      }
      if ($requiredRank -ge 3 -and $proofText -notmatch '(?mi)^[ \t]*-[ \t]*Test command and exit code:[ \t]*\S') {
        ErrorMsg "$(Rel $proofPath): P3+ proof needs Test command and exit code reference"
      }
      if ($requiredRank -ge 4) {
        if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*CI result:[ \t]*pass\b') {
          ErrorMsg "$(Rel $proofPath): P4 proof needs CI result: pass"
        }
        if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*GitHub diff available:[ \t]*yes\b') {
          ErrorMsg "$(Rel $proofPath): P4 proof needs GitHub diff available: yes"
        }
        if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*Commit/diff reference:[ \t]*\S') {
          ErrorMsg "$(Rel $proofPath): P4 proof needs Commit/diff reference"
        }
        if ($proofText -notmatch '(?mi)^[ \t]*-[ \t]*CI reference:[ \t]*\S') {
          ErrorMsg "$(Rel $proofPath): P4 proof needs CI reference"
        }
      }

      $evidenceLog = Marker $proofText "Evidence log"
      if (-not $evidenceLog) {
        ErrorMsg "$(Rel $proofPath): DONE proof needs Evidence log marker (path or inline)"
      } elseif ($evidenceLog -ne "inline") {
        $evidenceAbs = [System.IO.Path]::GetFullPath((Join-Path $RootAbs ($evidenceLog -replace '/', '\')))
        if (-not (InsideRoot $evidenceAbs)) {
          ErrorMsg "$(Rel $proofPath): Evidence log escapes project root '$evidenceLog'"
        } elseif (-not (Test-Path -LiteralPath $evidenceAbs)) {
          ErrorMsg "$(Rel $proofPath): Evidence log points to missing file '$evidenceLog'"
        }
      }
    }
  }
}

$featureRoot = Join-Path $RootAbs "ldk\features"
if (Test-Path -LiteralPath $featureRoot) {
  foreach ($plan in Get-ChildItem -Path $featureRoot -Recurse -Filter "plan.md" -ErrorAction SilentlyContinue) {
    $planText = Text $plan.FullName
    $planStatus = Marker $planText "Status"
    $planRisk = Marker $planText "Risk"
    $planProof = Marker $planText "Proof required"
    $planRevision = Marker $planText "Discovery revision"
    $optionalTasks = Marker $planText "Optional tasks"
    if ($allowedPlanStatus -notcontains $planStatus) {
      ErrorMsg "$(Rel $plan.FullName): invalid Status '$planStatus'"
    }
    if ($allowedRisk -notcontains $planRisk) {
      ErrorMsg "$(Rel $plan.FullName): invalid Risk '$planRisk'"
    }
    if ($allowedProof -notcontains $planProof) {
      ErrorMsg "$(Rel $plan.FullName): invalid Proof required '$planProof'"
    }
    if ($planRevision -notmatch '^[1-9][0-9]*$') {
      ErrorMsg "$(Rel $plan.FullName): Discovery revision must be a positive integer"
    } elseif ($discoveryRevision -and $planRevision -ne $discoveryRevision) {
      ErrorMsg "$(Rel $plan.FullName): Discovery revision '$planRevision' differs from discovery '$discoveryRevision'"
    }
    $optionalTaskIds = @()
    if (-not $optionalTasks) {
      ErrorMsg "$(Rel $plan.FullName): missing Optional tasks marker"
    } elseif ($optionalTasks -ne "none") {
      foreach ($optionalId in ($optionalTasks -split ',')) {
        $cleanOptionalId = $optionalId.Trim()
        if ($cleanOptionalId -notmatch '^T[0-9]+$') {
          ErrorMsg "$(Rel $plan.FullName): invalid Optional tasks ID '$cleanOptionalId'"
        } else {
          $optionalTaskIds += $cleanOptionalId
        }
      }
    }
    $taskRows = 0
    $taskHeaderFound = $false
    $taskIds = @()
    foreach ($line in (Get-Content -Encoding UTF8 -LiteralPath $plan.FullName)) {
      if ($line -notmatch '^\|') { continue }
      $cells = $line.Trim() -split '\|'
      if ($cells.Count -lt 8) { continue }
      $first = CleanCell $cells[1]
      if ($first -eq "ID") {
        $taskHeaderFound = $true
        $actualHeader = @()
        for ($i = 1; $i -le 6; $i++) {
          $actualHeader += CleanCell $cells[$i]
        }
        if (($actualHeader -join "|") -ne ($expectedTaskHeader -join "|")) {
          ErrorMsg "$(Rel $plan.FullName): task table header must be exactly '| ID | Descricao | AC | Arquivos esperados | Verificacao | State |'"
        }
        continue
      }
      if ($line -match '^\|\s*-+\s*\|') { continue }
      $id = CleanCell $cells[1]
      $state = CleanCell $cells[$cells.Count - 2]
      if ($id -match '^T[0-9]+$') {
        $taskRows++
        $taskIds += $id
      }
      if ($id -notmatch '^T[0-9]+$') {
        ErrorMsg "$(Rel $plan.FullName): task row ID '$id' must match T plus digits (example: T1)"
      }
      if ($allowedTaskState -notcontains $state) {
        ErrorMsg "$(Rel $plan.FullName): invalid task state '$state'"
      }
    }
    if ($taskRows -eq 0) {
      ErrorMsg "$(Rel $plan.FullName): missing machine-readable task table with T rows"
    }
    if (-not $taskHeaderFound) {
      ErrorMsg "$(Rel $plan.FullName): missing exact task table header '| ID | Descricao | AC | Arquivos esperados | Verificacao | State |'"
    }
    foreach ($optionalTaskId in $optionalTaskIds) {
      if ($taskIds -notcontains $optionalTaskId) {
        ErrorMsg "$(Rel $plan.FullName): Optional tasks ID '$optionalTaskId' does not exist in the task table"
      }
    }
  }
}

$verifyTargets = @()
$ldkRoot = Join-Path $RootAbs "ldk"
if (Test-Path -LiteralPath $ldkRoot) {
  $verifyTargets += Get-ChildItem -Path $ldkRoot -Recurse -Filter "*.md" -ErrorAction SilentlyContinue
}
foreach ($f in $verifyTargets) {
  $count = ([regex]::Matches((Text $f.FullName), '\[VERIFY\]')).Count
  if ($count -gt 0) {
    Write-Host "INFO  $(Rel $f.FullName): $count [VERIFY]"
  }
}

Write-Host "----------------------------------------"
Write-Host "ldk-check: $($script:Errors) error(s), $($script:Warnings) warning(s)."
if ($script:Errors -gt 0) {
  exit 1
}
exit 0
