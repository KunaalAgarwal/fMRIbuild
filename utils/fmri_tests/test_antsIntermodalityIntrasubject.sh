#!/usr/bin/env bash
# Test: ANTs antsIntermodalityIntrasubject (Cross-modal Intrasubject Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsIntermodalityIntrasubject"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Register BOLD mean to T1 with rigid transform (type 0)
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: "${BOLD_MEAN}"
reference_image:
  class: File
  path: "${T1_RES}"
output_prefix: "intermodal_"
brain_mask:
  class: File
  path: "${ANTS_MASK}"
transform_type: "0"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
