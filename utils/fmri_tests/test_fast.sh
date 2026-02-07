#!/usr/bin/env bash
# Test: FSL fast (FMRIB's Automated Segmentation Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fast"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs brain-extracted image from bet
BET_OUT="$(first_match "${OUT_DIR}/bet/bet_out.nii.gz" "${OUT_DIR}/bet/bet_out.nii" 2>/dev/null || true)"
if [[ -z "$BET_OUT" ]]; then
  echo "Running prerequisite: bet..."
  bash "${SCRIPT_DIR}/test_bet.sh"
  BET_OUT="$(first_match "${OUT_DIR}/bet/bet_out.nii.gz" "${OUT_DIR}/bet/bet_out.nii")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BET_OUT}"
output: "fast_out"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
