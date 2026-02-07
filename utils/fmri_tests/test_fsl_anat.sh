#!/usr/bin/env bash
# Test: FSL fsl_anat (Automated Anatomical Pipeline)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fsl_anat"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML (reduced runtime flags)
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
output_dir: "fsl_anat_out"
noreorient: true
nocrop: true
nobias: true
noreg: true
nononlinreg: true
noseg: true
nosubcortseg: true
nocleanup: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
