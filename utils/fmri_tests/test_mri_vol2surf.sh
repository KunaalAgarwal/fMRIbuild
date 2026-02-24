#!/usr/bin/env bash
# Test: FreeSurfer mri_vol2surf (Volume to Surface Projection)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_vol2surf"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"

# Project brain.mgz onto bert's left hemisphere surface
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
source_file:
  class: File
  path: "${BRAIN_MGZ}"
hemi: lh
output: "vol2surf.mgh"
reg_header: "${FS_SUBJECT}"
subject: "${FS_SUBJECT}"
projfrac: 0.5
interp: nearest
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_file "${dir}/vol2surf.mgh"
verify_log "$TOOL"
