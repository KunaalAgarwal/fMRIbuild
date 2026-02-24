#!/usr/bin/env bash
# Test: FSL flirt (FMRIB's Linear Image Registration Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="flirt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
reference:
  class: File
  path: "${T1W_2MM}"
output: "flirt_out"
output_matrix: "flirt_affine.mat"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/flirt_out.nii.gz"
verify_mat "${TOOL_OUT}/flirt_affine.mat"
verify_log "$TOOL"
