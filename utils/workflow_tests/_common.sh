#!/usr/bin/env bash
# Shared infrastructure for workflow generation tests.
# Source this file at the top of every test_*.sh script.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FIXTURES_DIR="${SCRIPT_DIR}/fixtures"
GENERATED_DIR="${SCRIPT_DIR}/generated"
LOG_DIR="${SCRIPT_DIR}/logs"
SUMMARY_FILE="${SCRIPT_DIR}/summary.tsv"

CWLTOOL_BIN="${CWLTOOL_BIN:-cwltool}"

die() { echo "ERROR: $1" >&2; exit 1; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Missing required command: $1"
  fi
}

setup_dirs() {
  mkdir -p "$GENERATED_DIR" "$LOG_DIR"
}

validate_workflow() {
  local cwl_file="$1" name="$2"
  local log_file="${LOG_DIR}/${name}_validate.log"

  if "$CWLTOOL_BIN" --validate "$cwl_file" >"$log_file" 2>&1; then
    local warnings
    warnings="$(grep -iE 'WARNING|WARN' "$log_file" 2>/dev/null || true)"
    if [[ -n "$warnings" ]]; then
      echo "  WARN: cwltool warnings (non-fatal):"
      echo "$warnings" | head -5 | sed 's/^/    /'
    fi
    echo "  PASS: ${name}"
    return 0
  else
    echo "  FAIL: ${name} (see ${log_file})"
    return 1
  fi
}

# ── Initialization ──
require_cmd "$CWLTOOL_BIN"
require_cmd node

setup_dirs
