#!/usr/bin/env bash
# Test: ANTs Atropos (Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="Atropos"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
intensity_image:
  class: File
  path: "${T1_RES}"
mask_image:
  class: File
  path: "${ANTS_MASK}"
output_prefix: "atropos_seg.nii.gz"
initialization: "kmeans[2]"
convergence: "[3,0.001]"
mrf: "[0.1,1x1x1]"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
