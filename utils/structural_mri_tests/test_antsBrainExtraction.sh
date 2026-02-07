#!/usr/bin/env bash
# Test: ANTs antsBrainExtraction.sh (Brain Extraction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsBrainExtraction"
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
anatomical_image:
  class: File
  path: "${T1_RES}"
template:
  class: File
  path: "${T1_RES}"
brain_probability_mask:
  class: File
  path: "${ANTS_MASK}"
output_prefix: "brainextract_"
use_floatingpoint: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
