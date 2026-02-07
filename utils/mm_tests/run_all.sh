#!/usr/bin/env bash
# Run all multimodal CWL test scripts.
# Usage: utils/mm_tests/run_all.sh [--rerun-passed]
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUMMARY_FILE="${SCRIPT_DIR}/summary.tsv"
PASS=0
FAIL=0
SKIP=0

echo -e "tool\tstatus" > "$SUMMARY_FILE"
echo "=========================================="
echo " Multimodal CWL Test Suite"
echo "=========================================="
echo ""

run_test() {
  local script="$1"; shift
  local name
  name="$(basename "$script" .sh | sed 's/^test_//')"

  if bash "$script" "$@" 2>&1; then
    ((PASS++)) || true
  else
    local rc=$?
    if [[ $rc -eq 0 ]]; then
      ((PASS++)) || true
    else
      if grep -qP "^.*\tSKIP" "$SUMMARY_FILE" 2>/dev/null; then
        ((SKIP++)) || true
      else
        ((FAIL++)) || true
      fi
    fi
  fi
  echo ""
}

# ── Phase 1: Validation ──────────────────────────────────────────

echo "── Phase 1: CWL Validation ──"
echo ""
run_test "${SCRIPT_DIR}/test_00_validate.sh" "$@"

# ── Phase 2: Core transform types ────────────────────────────────

echo "── Phase 2: Core Transform Types ──"
echo ""
run_test "${SCRIPT_DIR}/test_01_rigid.sh" "$@"
run_test "${SCRIPT_DIR}/test_02_affine.sh" "$@"
run_test "${SCRIPT_DIR}/test_03_rigid_deform.sh" "$@"

# ── Phase 3: Optional parameters & different inputs ──────────────

echo "── Phase 3: Optional Parameters & Input Variants ──"
echo ""
run_test "${SCRIPT_DIR}/test_04_with_mask.sh" "$@"
run_test "${SCRIPT_DIR}/test_05_diff_modality.sh" "$@"

# ── Summary ───────────────────────────────────────────────────────

echo "=========================================="
echo " Summary"
echo "=========================================="
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  SKIP: ${SKIP}"
echo ""
echo "  Details: ${SUMMARY_FILE}"
echo "=========================================="

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
