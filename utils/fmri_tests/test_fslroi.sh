#!/usr/bin/env bash
# Test: FSL fslroi (Extract Region of Interest)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslroi"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
output: "roi_out"
t_min: 0
t_size: 1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
