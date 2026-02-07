#!/usr/bin/env bash
# Test: ANTs antsMotionCorr (Motion Correction of BOLD timeseries)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsMotionCorr"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
fixed_image:
  class: File
  path: "${BOLD_MEAN}"
moving_image:
  class: File
  path: "${BOLD}"
output_prefix: "motcorr_"
metric: "MI[{fixed},{moving},1,16,Regular,0.1]"
transform: "Rigid[0.1]"
iterations: "20x10x0"
shrink_factors: "2x1x1"
smoothing_sigmas: "1x0x0"
num_images: 5
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
