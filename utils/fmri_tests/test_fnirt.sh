#!/usr/bin/env bash
# Test: FSL fnirt (FMRIB's Non-linear Image Registration Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fnirt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

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
input:
  class: File
  path: "${T1W}"
reference:
  class: File
  path: "${STANDARD_REF}"
cout: "fnirt_coeff"
iout: "fnirt_warped"
fout: "fnirt_field"
EOF

if [[ -n "$FLIRT_MAT" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
affine:
  class: File
  path: "${FLIRT_MAT}"
EOF
fi

if [[ -n "$STANDARD_MASK" && -f "$STANDARD_MASK" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
refmask:
  class: File
  path: "${STANDARD_MASK}"
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
