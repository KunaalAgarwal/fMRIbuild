#!/usr/bin/env bash
# Test: FSL applywarp (Apply Warp Field to Image)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="applywarp"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs combined warp field from convertwarp
WARP_FIELD="$(first_match "${OUT_DIR}/convertwarp/convertwarp_out.nii.gz" "${OUT_DIR}/convertwarp/convertwarp_out.nii" 2>/dev/null || true)"
if [[ -z "$WARP_FIELD" ]]; then
  echo "Running prerequisite: convertwarp..."
  bash "${SCRIPT_DIR}/test_convertwarp.sh"
  WARP_FIELD="$(first_match "${OUT_DIR}/convertwarp/convertwarp_out.nii.gz" "${OUT_DIR}/convertwarp/convertwarp_out.nii")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
reference:
  class: File
  path: "${STANDARD_REF}"
output: "applywarp_out"
warp:
  class: File
  path: "${WARP_FIELD}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
