#!/usr/bin/env bash
# Test: ANTs ImageMath (Image Mathematical Operations)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="ImageMath"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Multiply T1 by mask
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
output_image: "imagemath_out.nii.gz"
operation: "m"
input_image:
  class: File
  path: "${T1_RES}"
second_input:
  class: File
  path: "${ANTS_MASK}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/imagemath_out.nii.gz"
verify_log "$TOOL"
