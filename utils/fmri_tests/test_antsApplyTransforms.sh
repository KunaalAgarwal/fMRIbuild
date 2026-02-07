#!/usr/bin/env bash
# Test: ANTs antsApplyTransforms (Apply Spatial Transforms)
# Depends on: antsRegistrationSyNQuick (for affine transform)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsApplyTransforms"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Run antsRegistrationSyNQuick first to produce the affine transform
DEP_TOOL="antsRegistrationSyNQuick"
DEP_CWL="${CWL_DIR}/${LIB}/${DEP_TOOL}.cwl"
AFFINE_QUICK="${OUT_DIR}/${DEP_TOOL}/synquick_0GenericAffine.mat"

if [[ ! -f "$AFFINE_QUICK" ]]; then
  cat > "${JOB_DIR}/${DEP_TOOL}.yml" <<EOF
dimensionality: 3
fixed_image:
  class: File
  path: "${T1_RES}"
moving_image:
  class: File
  path: "${T1_RES}"
output_prefix: "synquick_"
transform_type: "r"
num_threads: 1
precision: "f"
reproducible: true
EOF
  run_tool "$DEP_TOOL" "${JOB_DIR}/${DEP_TOOL}.yml" "$DEP_CWL"
fi

if [[ -f "$AFFINE_QUICK" ]]; then
  cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: "${T1_RES}"
reference_image:
  class: File
  path: "${T1_RES}"
output_image: "applytransforms_out.nii.gz"
transforms:
  - class: File
    path: "${AFFINE_QUICK}"
EOF
  run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
else
  echo "SKIP: ${TOOL} - missing affine from antsRegistrationSyNQuick"
  echo -e "${TOOL}\tSKIP" >>"$SUMMARY_FILE"
fi
