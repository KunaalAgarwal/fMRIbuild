#!/usr/bin/env bash
# Test: AFNI @SSwarper (Skull-Strip and Warp to Template)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="SSwarper"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# SSwarper needs a base template. Use MNI152 2mm as base.
BASE_TEMPLATE="${DATA_DIR}/MNI152_T1_2mm.nii.gz"
if [[ ! -f "$BASE_TEMPLATE" ]]; then
  prepare_fsl_data
  BASE_TEMPLATE="$T1W_2MM"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
base:
  class: File
  path: "${BASE_TEMPLATE}"
subid: "sub01"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
