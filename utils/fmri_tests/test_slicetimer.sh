#!/usr/bin/env bash
# Test: FSL slicetimer (Slice Timing Correction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="slicetimer"
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
output: "slicetimer_out"
slice_order:
  interleaved: true
EOF

if [[ -n "${BOLD_TR:-}" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
tr: ${BOLD_TR}
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
