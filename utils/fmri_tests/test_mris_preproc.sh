#!/usr/bin/env bash
# Test: FreeSurfer mris_preproc (Surface Preprocessing for Group Analysis)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mris_preproc"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

# Create bert2 as a duplicate subject for group analysis
FS_SUBJECT2="bert2"
FS_SUBJECT_DIR2="${FS_SUBJECTS_DIR}/${FS_SUBJECT2}"
if [[ ! -d "$FS_SUBJECT_DIR2" ]]; then
  cp -a "$FS_SUBJECT_DIR" "$FS_SUBJECT_DIR2"
fi

# Ensure sphere.reg files exist with subject-specific names
SURF_LH_SPHERE_REG="${FS_SUBJECT_DIR}/surf/lh.sphere.reg"
SURF_LH_BERT_SPHERE_REG="${FS_SUBJECT_DIR}/surf/lh.${FS_SUBJECT}.sphere.reg"
SURF_LH_BERT2_SPHERE_REG="${FS_SUBJECT_DIR2}/surf/lh.${FS_SUBJECT2}.sphere.reg"

if [[ -f "$SURF_LH_SPHERE_REG" && ! -f "$SURF_LH_BERT_SPHERE_REG" ]]; then
  cp "$SURF_LH_SPHERE_REG" "$SURF_LH_BERT_SPHERE_REG"
fi
if [[ -f "${FS_SUBJECT_DIR2}/surf/lh.sphere.reg" && ! -f "$SURF_LH_BERT2_SPHERE_REG" ]]; then
  cp "${FS_SUBJECT_DIR2}/surf/lh.sphere.reg" "$SURF_LH_BERT2_SPHERE_REG"
fi

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
output: "mris_preproc.mgh"
target: "${FS_SUBJECT}"
hemi: lh
subjects:
  - "${FS_SUBJECT}"
  - "${FS_SUBJECT2}"
meas: thickness
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
