#!/usr/bin/env bash
# Test: ANTs antsRegistrationSyNQuick (Quick SyN Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsRegistrationSyNQuick"
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

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
