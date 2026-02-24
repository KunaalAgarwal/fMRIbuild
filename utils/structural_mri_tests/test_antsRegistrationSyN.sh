#!/usr/bin/env bash
# Test: ANTs antsRegistrationSyN.sh (SyN Registration — Full)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsRegistrationSyN"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — rigid-only for speed (self-registration)
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
fixed_image:
  class: File
  path: "${T1_RES}"
moving_image:
  class: File
  path: "${T1_RES}"
output_prefix: "syn_"
transform_type: "r"
num_threads: 1
precision: "f"
reproducible: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/syn_Warped.nii.gz"
verify_nifti_optional "${TOOL_OUT}/syn_InverseWarped.nii.gz"
verify_mat "${TOOL_OUT}/syn_0GenericAffine.mat"
verify_nifti_optional "${TOOL_OUT}/syn_1Warp.nii.gz"
verify_nifti_optional "${TOOL_OUT}/syn_1InverseWarp.nii.gz"
verify_log "$TOOL"
