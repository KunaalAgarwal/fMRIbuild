#!/usr/bin/env bash
# Test: FSL fslmeants (Extract Mean Time Series)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslmeants"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Use BOLD_MASK if available, otherwise fall back to BET mask
USE_MASK="${BOLD_MASK:-}"
if [[ -z "$USE_MASK" || ! -f "$USE_MASK" ]]; then
  BET_MASK="$(first_match "${OUT_DIR}/bet/bet_out_mask.nii.gz" "${OUT_DIR}/bet/bet_out_mask.nii" 2>/dev/null || true)"
  if [[ -z "$BET_MASK" ]]; then
    echo "Running prerequisite: bet..."
    bash "${SCRIPT_DIR}/test_bet.sh"
    BET_MASK="$(first_match "${OUT_DIR}/bet/bet_out_mask.nii.gz" "${OUT_DIR}/bet/bet_out_mask.nii")"
  fi
  USE_MASK="$BET_MASK"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
mask:
  class: File
  path: "${USE_MASK}"
output: "meants.txt"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "meants.txt"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected} ($(wc -l < "$f") timepoints)"
  fi
done

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
