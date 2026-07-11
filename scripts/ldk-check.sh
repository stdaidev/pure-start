#!/usr/bin/env bash
# ldk-check.sh - deterministic validation for Lovable Driven Kit state and discovery gates.
set -uo pipefail

ROOT="${1:-.}"
ROOT="$(cd "$ROOT" 2>/dev/null && pwd -P)"
if [ -z "$ROOT" ]; then
  echo "ERROR invalid root"
  exit 1
fi

ERRORS=0
WARNINGS=0

error() { echo "ERROR $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo "WARN  $1"; WARNINGS=$((WARNINGS + 1)); }
rel() { printf '%s\n' "${1#"$ROOT"/}"; }

rank_proof() {
  case "$1" in
    P1) echo 1 ;;
    P2) echo 2 ;;
    P3) echo 3 ;;
    P4) echo 4 ;;
    none) echo 0 ;;
    *) echo -1 ;;
  esac
}

marker() {
  local file="$1" name="$2"
  grep -m1 -E "^${name}:[[:space:]]*" "$file" | sed -E "s/^${name}:[[:space:]]*//; s/[[:space:]]+$//" || true
}

clean_cell() {
  sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/^`//; s/`$//'
}

valid_in() {
  local value="$1"; shift
  local item
  for item in "$@"; do
    [ "$value" = "$item" ] && return 0
  done
  return 1
}

EXPECTED_VERSION="0.2.0"
EXPECTED_SCHEMA="2"
DISCOVERY_REVISION=""
DISCOVERY_STATUS=""

DISCOVERY="$ROOT/ldk/discovery.md"
if [ ! -f "$DISCOVERY" ]; then
  error "missing ldk/discovery.md"
else
  discovery_version="$(marker "$DISCOVERY" "LDK Version")"
  discovery_schema="$(marker "$DISCOVERY" "LDK Schema")"
  discovery_status="$(marker "$DISCOVERY" "Status")"
  DISCOVERY_STATUS="$discovery_status"
  DISCOVERY_REVISION="$(marker "$DISCOVERY" "Revision")"
  approved_at="$(marker "$DISCOVERY" "Approved at")"
  approved_by="$(marker "$DISCOVERY" "Approved by")"

  [ "$discovery_version" = "$EXPECTED_VERSION" ] || error "ldk/discovery.md: LDK Version must be '$EXPECTED_VERSION'"
  [ "$discovery_schema" = "$EXPECTED_SCHEMA" ] || error "ldk/discovery.md: LDK Schema must be '$EXPECTED_SCHEMA'"
  valid_in "$discovery_status" draft external-review awaiting-approval approved || error "ldk/discovery.md: invalid Status '$discovery_status'"
  echo "$DISCOVERY_REVISION" | grep -qE '^[1-9][0-9]*$' || error "ldk/discovery.md: Revision must be a positive integer"
  if [ "$discovery_status" = "approved" ]; then
    [ -n "$approved_at" ] || error "ldk/discovery.md: approved discovery needs Approved at"
    [ -n "$approved_by" ] || error "ldk/discovery.md: approved discovery needs Approved by"
  fi
fi

if [ -n "$DISCOVERY_STATUS" ] && [ "$DISCOVERY_STATUS" != "approved" ] && \
  { [ -e "$ROOT/ldk/project.md" ] || [ -e "$ROOT/ldk/ledger.md" ] || [ -e "$ROOT/ldk/roadmap.md" ] || [ -e "$ROOT/ldk/features" ]; }; then
  error "ldk/discovery.md: Status '$DISCOVERY_STATUS' does not authorize project, ledger, roadmap, plan or build artifacts"
fi

PROJECT="$ROOT/ldk/project.md"
if [ ! -f "$PROJECT" ]; then
  error "missing ldk/project.md"
else
  project_version="$(marker "$PROJECT" "LDK Version")"
  project_schema="$(marker "$PROJECT" "LDK Schema")"
  project_revision="$(marker "$PROJECT" "Discovery revision")"
  autonomy="$(marker "$PROJECT" "Autonomy mode")"
  [ "$project_version" = "$EXPECTED_VERSION" ] || error "ldk/project.md: LDK Version must be '$EXPECTED_VERSION'"
  [ "$project_schema" = "$EXPECTED_SCHEMA" ] || error "ldk/project.md: LDK Schema must be '$EXPECTED_SCHEMA'"
  echo "$project_revision" | grep -qE '^[1-9][0-9]*$' || error "ldk/project.md: Discovery revision must be a positive integer"
  [ -z "$DISCOVERY_REVISION" ] || [ "$project_revision" = "$DISCOVERY_REVISION" ] || error "ldk/project.md: Discovery revision '$project_revision' differs from discovery '$DISCOVERY_REVISION'"
  valid_in "$autonomy" guided balanced autopilot || error "ldk/project.md: invalid Autonomy mode '$autonomy'"
fi

ROADMAP="$ROOT/ldk/roadmap.md"
if [ -f "$ROADMAP" ]; then
  roadmap_status="$(marker "$ROADMAP" "Status")"
  roadmap_revision="$(marker "$ROADMAP" "Discovery revision")"
  valid_in "$roadmap_status" current stale || error "ldk/roadmap.md: invalid Status '$roadmap_status'"
  echo "$roadmap_revision" | grep -qE '^[1-9][0-9]*$' || error "ldk/roadmap.md: Discovery revision must be a positive integer"
  if [ "$roadmap_status" = "current" ] && [ -n "$DISCOVERY_REVISION" ] && [ "$roadmap_revision" != "$DISCOVERY_REVISION" ]; then
    error "ldk/roadmap.md: current roadmap revision '$roadmap_revision' differs from discovery '$DISCOVERY_REVISION'"
  fi
fi

LEDGER="$ROOT/ldk/ledger.md"
if [ ! -f "$LEDGER" ]; then
  error "missing ldk/ledger.md"
else
  ledger_header="$(grep -m1 -E '^\|[[:space:]]*ID[[:space:]]*\|' "$LEDGER" || true)"
  [ "$ledger_header" = '| ID | Feature | Risk | State | Proof required | Last evidence |' ] || \
    error "ldk/ledger.md: header must be exactly '| ID | Feature | Risk | State | Proof required | Last evidence |'"
  while IFS= read -r line; do
    echo "$line" | grep -qE '^\|' || continue
    echo "$line" | grep -qE '^\|[[:space:]]*(-+|ID)[[:space:]]*\|' && continue
    IFS='|' read -r _ id feature risk state required evidence _rest <<< "$line"
    id="$(printf '%s' "$id" | clean_cell)"
    feature="$(printf '%s' "$feature" | clean_cell)"
    risk="$(printf '%s' "$risk" | clean_cell)"
    state="$(printf '%s' "$state" | clean_cell)"
    required="$(printf '%s' "$required" | clean_cell)"
    evidence="$(printf '%s' "$evidence" | clean_cell)"

    echo "$id" | grep -qE '^F[0-9]+$' || error "ldk/ledger.md: row ID '$id' must match F plus digits (example: F1)"
    valid_in "$risk" trivial baixo medio alto || error "ldk/ledger.md: $id has invalid Risk '$risk'"
    valid_in "$state" idea planned approved building proof-pending done partial blocked reopened || error "ldk/ledger.md: $id has invalid State '$state'"
    valid_in "$required" P1 P2 P3 P4 || error "ldk/ledger.md: $id has invalid Proof required '$required'"

    if [ -n "$evidence" ] && [ "$evidence" != "-" ]; then
      echo "$evidence" | grep -qE '(^/|(^|/)\.\.(/|$))' && error "ldk/ledger.md: $id Last evidence escapes project root '$evidence'"
      echo "$evidence" | grep -qiE '(^|/)(plan|brief)\.md$' && \
        error "ldk/ledger.md: $id Last evidence must not point to plan/brief '$evidence'"
      case "$state" in
        idea|planned|approved|building|proof-pending)
          error "ldk/ledger.md: $id state '$state' must keep Last evidence empty"
          ;;
      esac
      case "$state" in
        partial|blocked)
          [ -f "$ROOT/$evidence" ] || error "ldk/ledger.md: $id state '$state' points to missing evidence '$evidence'"
          ;;
      esac
    fi

    if [ "$state" = "done" ]; then
      if [ -z "$evidence" ] || [ "$evidence" = "-" ]; then
        error "ldk/ledger.md: $id is done but Last evidence is empty"
        continue
      fi
      proof="$ROOT/${evidence//\\//}"
      if echo "$evidence" | grep -qE '(^/|(^|/)\.\.(/|$))'; then
        error "ldk/ledger.md: $id proof path escapes project root '$evidence'"
        continue
      fi
      if [ ! -f "$proof" ]; then
        error "ldk/ledger.md: $id points to missing proof '$evidence'"
        continue
      fi

      status="$(marker "$proof" "Status")"
      proof_risk="$(marker "$proof" "Risk")"
      proof_required="$(marker "$proof" "Proof level required")"
      achieved="$(marker "$proof" "Proof level achieved")"
      proof_revision="$(marker "$proof" "Discovery revision")"

      [ "$status" = "DONE" ] || error "$(rel "$proof"): ledger is done but proof Status is '$status'"
      [ -z "$proof_risk" ] || [ "$proof_risk" = "$risk" ] || warn "$(rel "$proof"): proof Risk '$proof_risk' differs from ledger '$risk'"
      [ "$proof_required" = "$required" ] || error "$(rel "$proof"): proof required '$proof_required' differs from ledger '$required'"

      if [ "$(rank_proof "$achieved")" -lt "$(rank_proof "$required")" ]; then
        error "$(rel "$proof"): achieved '$achieved' is lower than required '$required'"
      fi
      [ -z "$DISCOVERY_REVISION" ] || [ "$proof_revision" = "$DISCOVERY_REVISION" ] || \
        error "$(rel "$proof"): Discovery revision '$proof_revision' differs from discovery '$DISCOVERY_REVISION'"
      grep -qiE '^[[:space:]]*-[[:space:]]*AC[0-9]+:[[:space:]]*not covered\b' "$proof" && \
        error "$(rel "$proof"): DONE proof has not covered AC"

      for check in \
        "Required proof identified" \
        "All essential AC covered" \
        "Evidence exists for every covered AC" \
        "Evidence references are current and observable" \
        "Proof level achieved >= required"
      do
        grep -qiE "^[[:space:]]*-[[:space:]]*$check:[[:space:]]*yes\\b" "$proof" || \
          error "$(rel "$proof"): DONE proof self-check '$check' must be yes"
      done
      grep -qiE '^[[:space:]]*-[[:space:]]*Critical errors known:[[:space:]]*no\b' "$proof" || \
        error "$(rel "$proof"): DONE proof self-check 'Critical errors known' must be no"
      grep -qiE '^[[:space:]]*-[[:space:]]*LDK engine drift detected:[[:space:]]*no\b' "$proof" || \
        error "$(rel "$proof"): DONE proof self-check 'LDK engine drift detected' must be no"

      required_rank="$(rank_proof "$required")"
      if [ "$required_rank" -ge 1 ] && ! grep -qiE '^[[:space:]]*-[[:space:]]*Screenshot or visual observation:[[:space:]]*\S' "$proof"; then
        error "$(rel "$proof"): P1+ proof needs screenshot or visual observation"
      fi
      if [ "$required_rank" -ge 2 ] && ! grep -qiE '^[[:space:]]*-[[:space:]]*Main user flow tested:[[:space:]]*yes\b' "$proof"; then
        error "$(rel "$proof"): P2+ proof needs Main user flow tested: yes"
      fi
      if [ "$required_rank" -ge 3 ] && ! grep -qiE '^[[:space:]]*-[[:space:]]*Automated test result:[[:space:]]*pass\b' "$proof"; then
        error "$(rel "$proof"): P3+ proof needs Automated test result: pass"
      fi
      if [ "$required_rank" -ge 3 ] && ! grep -qiE '^[[:space:]]*-[[:space:]]*Test command and exit code:[[:space:]]*\S' "$proof"; then
        error "$(rel "$proof"): P3+ proof needs Test command and exit code reference"
      fi
      if [ "$required_rank" -ge 4 ]; then
        grep -qiE '^[[:space:]]*-[[:space:]]*CI result:[[:space:]]*pass\b' "$proof" || error "$(rel "$proof"): P4 proof needs CI result: pass"
        grep -qiE '^[[:space:]]*-[[:space:]]*GitHub diff available:[[:space:]]*yes\b' "$proof" || error "$(rel "$proof"): P4 proof needs GitHub diff available: yes"
        grep -qiE '^[[:space:]]*-[[:space:]]*Commit/diff reference:[[:space:]]*\S' "$proof" || error "$(rel "$proof"): P4 proof needs Commit/diff reference"
        grep -qiE '^[[:space:]]*-[[:space:]]*CI reference:[[:space:]]*\S' "$proof" || error "$(rel "$proof"): P4 proof needs CI reference"
      fi

      evidence_log="$(marker "$proof" "Evidence log")"
      if [ -z "$evidence_log" ]; then
        error "$(rel "$proof"): DONE proof needs Evidence log marker (path or inline)"
      elif [ "$evidence_log" != "inline" ]; then
        echo "$evidence_log" | grep -qE '(^/|(^|/)\.\.(/|$))' && \
          error "$(rel "$proof"): Evidence log escapes project root '$evidence_log'"
        [ -f "$ROOT/$evidence_log" ] || error "$(rel "$proof"): Evidence log points to missing file '$evidence_log'"
      fi
    fi
  done < "$LEDGER"
fi

if [ -d "$ROOT/ldk/features" ]; then
  while IFS= read -r plan; do
    plan_status="$(marker "$plan" "Status")"
    plan_risk="$(marker "$plan" "Risk")"
    plan_proof="$(marker "$plan" "Proof required")"
    plan_revision="$(marker "$plan" "Discovery revision")"
    optional_tasks="$(marker "$plan" "Optional tasks")"
    valid_in "$plan_status" planned approved building proof-pending done partial blocked reopened || \
      error "$(rel "$plan"): invalid Status '$plan_status'"
    valid_in "$plan_risk" trivial baixo medio alto || error "$(rel "$plan"): invalid Risk '$plan_risk'"
    valid_in "$plan_proof" P1 P2 P3 P4 || error "$(rel "$plan"): invalid Proof required '$plan_proof'"
    echo "$plan_revision" | grep -qE '^[1-9][0-9]*$' || error "$(rel "$plan"): Discovery revision must be a positive integer"
    [ -z "$DISCOVERY_REVISION" ] || [ "$plan_revision" = "$DISCOVERY_REVISION" ] || \
      error "$(rel "$plan"): Discovery revision '$plan_revision' differs from discovery '$DISCOVERY_REVISION'"
    optional_ids=()
    if [ -z "$optional_tasks" ]; then
      error "$(rel "$plan"): missing Optional tasks marker"
    elif [ "$optional_tasks" != "none" ]; then
      IFS=',' read -ra optional_ids <<< "$optional_tasks"
      for optional_index in "${!optional_ids[@]}"; do
        optional_id="${optional_ids[$optional_index]}"
        optional_id="$(printf '%s' "$optional_id" | clean_cell)"
        optional_ids[$optional_index]="$optional_id"
        echo "$optional_id" | grep -qE '^T[0-9]+$' || error "$(rel "$plan"): invalid Optional tasks ID '$optional_id'"
      done
    fi
    task_rows=0
    task_header_found=0
    task_ids=()
    while IFS= read -r line; do
      echo "$line" | grep -qE '^\|' || continue
      first="$(printf '%s\n' "$line" | awk -F'|' '{v=$2; gsub(/^[ \t]+|[ \t]+$/, "", v); print v}')"
      if [ "$first" = "ID" ]; then
        task_header_found=1
        header="$(printf '%s\n' "$line" | awk -F'|' '{
          out="";
          for (i=2; i<=NF-1; i++) {
            v=$i;
            gsub(/^[ \t]+|[ \t]+$/, "", v);
            out=(out == "" ? v : out "|" v);
          }
          print out
        }')"
        [ "$header" = "ID|Descricao|AC|Arquivos esperados|Verificacao|State" ] || \
          error "$(rel "$plan"): task table header must be exactly '| ID | Descricao | AC | Arquivos esperados | Verificacao | State |'"
        continue
      fi
      echo "$line" | grep -qE '^\|[[:space:]]*-+[[:space:]]*\|' && continue
      id="$(printf '%s\n' "$line" | awk -F'|' '{v=$2; gsub(/^[ \t]+|[ \t]+$/, "", v); print v}')"
      state="$(printf '%s\n' "$line" | awk -F'|' '{v=$(NF-1); gsub(/^[ \t]+|[ \t]+$/, "", v); print v}')"
      if echo "$id" | grep -qE '^T[0-9]+$'; then
        task_rows=$((task_rows + 1))
        task_ids+=("$id")
      fi
      echo "$id" | grep -qE '^T[0-9]+$' || error "$(rel "$plan"): task row ID '$id' must match T plus digits (example: T1)"
      valid_in "$state" backlog ready in-progress proof-pending done blocked || \
        error "$(rel "$plan"): invalid task state '$state'"
    done < "$plan"
    [ "$task_rows" -gt 0 ] || error "$(rel "$plan"): missing machine-readable task table with T rows"
    [ "$task_header_found" -eq 1 ] || error "$(rel "$plan"): missing exact task table header '| ID | Descricao | AC | Arquivos esperados | Verificacao | State |'"
    for optional_id in "${optional_ids[@]}"; do
      echo "$optional_id" | grep -qE '^T[0-9]+$' || continue
      optional_exists=0
      for task_id in "${task_ids[@]}"; do
        [ "$optional_id" = "$task_id" ] && optional_exists=1
      done
      [ "$optional_exists" -eq 1 ] || error "$(rel "$plan"): Optional tasks ID '$optional_id' does not exist in the task table"
    done
  done < <(find "$ROOT/ldk/features" -name plan.md -type f)
fi

if [ -d "$ROOT/ldk" ]; then
  while IFS= read -r file; do
    count="$(grep -c '\[VERIFY\]' "$file" 2>/dev/null || true)"
    if [ "$count" -gt 0 ]; then
      echo "INFO  $(rel "$file"): $count [VERIFY]"
    fi
  done < <(find "$ROOT/ldk" -type f -name '*.md')
fi

echo "----------------------------------------"
echo "ldk-check: $ERRORS error(s), $WARNINGS warning(s)."
if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi
exit 0
