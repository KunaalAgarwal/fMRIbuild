#!/usr/bin/env bash
# Test: FreeSurfer mri_convert (Format Conversion)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_convert"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"

# Convert brain.mgz to NIfTI format
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${BRAIN_MGZ}"
output: "brain.nii.gz"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
