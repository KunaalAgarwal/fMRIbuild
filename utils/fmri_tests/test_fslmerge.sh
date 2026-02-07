#!/usr/bin/env bash
# Test: FSL fslmerge (Merge Images into 4D)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslmerge"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs split volumes from fslsplit
SPLIT_FILES=( "${OUT_DIR}/fslsplit"/bold_split*.nii* )
if [[ "${#SPLIT_FILES[@]}" -lt 2 ]]; then
  echo "Running prerequisite: fslsplit..."
  bash "${SCRIPT_DIR}/test_fslsplit.sh"
  SPLIT_FILES=( "${OUT_DIR}/fslsplit"/bold_split*.nii* )
fi

if [[ "${#SPLIT_FILES[@]}" -lt 2 ]]; then
  echo "ERROR: fslsplit did not produce enough volumes"
  exit 1
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimension: t
output: "bold_merge"
input_files:
  - class: File
    path: "${SPLIT_FILES[0]}"
  - class: File
    path: "${SPLIT_FILES[1]}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
