#!/usr/bin/env bash
# Test: FreeSurfer mri_segment (White Matter Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_segment"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

# Dependency: needs normalized volume from mri_normalize
NORM_OUT="${OUT_DIR}/mri_normalize/bert_norm.mgz"
if [[ ! -f "$NORM_OUT" ]]; then
  echo "Running prerequisite: mri_normalize..."
  bash "${SCRIPT_DIR}/test_mri_normalize.sh"
fi
[[ -f "$NORM_OUT" ]] || die "Missing mri_normalize output: ${NORM_OUT}"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
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
  path: "${NORM_OUT}"
output: "bert_segment.mgz"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
