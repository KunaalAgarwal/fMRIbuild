#!/usr/bin/env bash
# Test: ANTs N4BiasFieldCorrection (Bias Field Correction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="N4BiasFieldCorrection"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input_image:
  class: File
  path: "${T1_RES}"
output_prefix: "n4"
dimensionality: 3
shrink_factor: 2
convergence: "[20x10x0,0.0]"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/n4_corrected.nii.gz"
verify_nifti_optional "${TOOL_OUT}/n4_biasfield.nii.gz"
verify_log "$TOOL"
