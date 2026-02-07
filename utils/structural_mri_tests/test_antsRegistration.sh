#!/usr/bin/env bash
# Test: ANTs antsRegistration (General-purpose Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsRegistration"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — self-registration with rigid transform for speed
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
