#!/usr/bin/env bash
# Test: FSL fslsplit (Split 4D Image into Volumes)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslsplit"
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
output_basename: "bold_split"
dimension: t
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
