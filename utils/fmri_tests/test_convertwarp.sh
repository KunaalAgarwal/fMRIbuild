#!/usr/bin/env bash
# Test: FSL convertwarp (Convert and Combine Warp Fields)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="convertwarp"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs warp field from fnirt
FNIRT_FIELD="$(first_match "${OUT_DIR}/fnirt/fnirt_field.nii.gz" "${OUT_DIR}/fnirt/fnirt_field.nii" 2>/dev/null || true)"
if [[ -z "$FNIRT_FIELD" ]]; then
  echo "Running prerequisite: fnirt..."
  bash "${SCRIPT_DIR}/test_fnirt.sh"
  FNIRT_FIELD="$(first_match "${OUT_DIR}/fnirt/fnirt_field.nii.gz" "${OUT_DIR}/fnirt/fnirt_field.nii")"
fi

# Dependency: needs affine matrix from flirt
FLIRT_MAT="$(first_match "${OUT_DIR}/flirt/flirt_affine.mat" 2>/dev/null || true)"
if [[ -z "$FLIRT_MAT" ]]; then
  echo "Running prerequisite: flirt..."
  bash "${SCRIPT_DIR}/test_flirt.sh"
  FLIRT_MAT="$(first_match "${OUT_DIR}/flirt/flirt_affine.mat")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
reference:
  class: File
  path: "${STANDARD_REF}"
output: "convertwarp_out"
warp1:
  class: File
  path: "${FNIRT_FIELD}"
premat:
  class: File
  path: "${FLIRT_MAT}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
