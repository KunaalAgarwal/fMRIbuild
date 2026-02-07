#!/usr/bin/env bash
# Test: ANTs antsCorticalThickness.sh (Cortical Thickness Pipeline)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsCorticalThickness"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — quick mode, stage 1 only for speed
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
segmentation_priors: "priors%d.nii.gz"
segmentation_priors_dir:
  class: Directory
  basename: "priors"
  location: "file://${ANTS_PRIORS_DIR}"
  listing: []
output_prefix: "cortical_"
quick_registration: true
run_stage: "1"
keep_temporary: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
