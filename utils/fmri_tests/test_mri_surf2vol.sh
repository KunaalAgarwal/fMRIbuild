#!/usr/bin/env bash
# Test: FreeSurfer mri_surf2vol (Surface to Volume Projection)
# Depends on: mri_vol2surf (for surface data input)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_surf2vol"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"

# Run mri_vol2surf first to produce the surface data
DEP_TOOL="mri_vol2surf"
DEP_CWL="${CWL_DIR}/${LIB}/${DEP_TOOL}.cwl"
VOL2SURF_OUT="${OUT_DIR}/${DEP_TOOL}/vol2surf.mgh"

if [[ ! -f "$VOL2SURF_OUT" ]]; then
  cat > "${JOB_DIR}/${DEP_TOOL}.yml" <<EOF
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
  run_tool "$DEP_TOOL" "${JOB_DIR}/${DEP_TOOL}.yml" "$DEP_CWL"
fi

if [[ -f "$VOL2SURF_OUT" ]]; then
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
  path: "${VOL2SURF_OUT}"
hemi: lh
output: "surf2vol.mgz"
identity: "${FS_SUBJECT}"
template:
  class: File
  path: "${BRAIN_MGZ}"
EOF
  run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

  # ── Verify outputs ────────────────────────────────────────────────
  echo "── Verifying ${TOOL} outputs ──"
  dir="${OUT_DIR}/${TOOL}"

  verify_mgz "${dir}/surf2vol.mgz"
  verify_log "$TOOL"
else
  echo "SKIP: ${TOOL} - missing mri_vol2surf output"
  echo -e "${TOOL}\tSKIP" >>"$SUMMARY_FILE"
fi
