#!/usr/bin/env bash
# Test: FSL melodic (Multivariate Exploratory Linear Optimized Decomposition into Independent Components)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="melodic"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input_files:
  class: File
  path: "${BOLD}"
output_dir: "melodic_out"
dim: 5
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
