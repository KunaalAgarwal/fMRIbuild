#!/usr/bin/env bash
# Test: FreeSurfer bbregister (Boundary-Based EPI-to-T1 Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="bbregister"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
subject: "${FS_SUBJECT}"
source_file:
  class: File
  path: "${BRAIN_MGZ}"
out_reg_file: "bbregister.dat"
contrast_type: t1
init_header: true
no_coreg_ref_mask: true
no_brute2: true
brute1max: 1
brute1delta: 1
subsamp1: 200
subsamp: 200
nmax: 1
tol: 0.1
tol1d: 0.1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
