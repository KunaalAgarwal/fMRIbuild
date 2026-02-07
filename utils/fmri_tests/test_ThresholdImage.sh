#!/usr/bin/env bash
# Test: ANTs ThresholdImage (Image Thresholding)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="ThresholdImage"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Otsu thresholding with 2 classes
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: "${T1_RES}"
output_image: "threshold_out.nii.gz"
threshold_mode: "Otsu"
num_thresholds: 2
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
