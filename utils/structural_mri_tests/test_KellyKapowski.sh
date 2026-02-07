#!/usr/bin/env bash
# Test: ANTs KellyKapowski (Cortical Thickness Estimation — DiReCT)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="KellyKapowski"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — uses derived segmentation + GM/WM probability maps
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
segmentation_image:
  class: File
  path: "${ANTS_SEGMENTATION}"
gray_matter_prob:
  class: File
  path: "${ANTS_GM_PROB}"
white_matter_prob:
  class: File
  path: "${ANTS_WM_PROB}"
output_image: "thickness.nii.gz"
convergence: "[5,0.01,10]"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
