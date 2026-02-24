#!/usr/bin/env bash
# Test: ANTs antsRegistration (General-purpose Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsRegistration"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Self-registration with rigid transform for speed
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
output_prefix: "antsreg_"
fixed_image:
  class: File
  path: "${T1_RES}"
moving_image:
  class: File
  path: "${T1_RES}"
metric: "MI[{fixed},{moving},1,16,Regular,0.1]"
transform: "Rigid[0.1]"
convergence: "[20x10x0,1e-6,5]"
shrink_factors: "2x1x1"
smoothing_sigmas: "1x0x0vox"
use_float: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/antsreg_Warped.nii.gz"
verify_nifti_optional "${TOOL_OUT}/antsreg_InverseWarped.nii.gz"
# forward_transforms: affine + optional warp
verify_mat "${TOOL_OUT}/antsreg_0GenericAffine.mat"
verify_nifti_optional "${TOOL_OUT}/antsreg_1Warp.nii.gz"
# inverse_transforms
verify_nifti_optional "${TOOL_OUT}/antsreg_1InverseWarp.nii.gz"
verify_log "$TOOL"
