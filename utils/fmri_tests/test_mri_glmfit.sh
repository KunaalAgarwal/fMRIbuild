#!/usr/bin/env bash
# Test: FreeSurfer mri_glmfit (General Linear Model on Surface Data)
# Depends on: mris_preproc (for concatenated surface data)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_glmfit"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

make_template "$CWL" "$TOOL"

# Run mris_preproc first to produce concatenated surface data
DEP_TOOL="mris_preproc"
DEP_CWL="${CWL_DIR}/${LIB}/${DEP_TOOL}.cwl"
PREPROC_OUT="${OUT_DIR}/${DEP_TOOL}/mris_preproc.mgh"

if [[ ! -f "$PREPROC_OUT" ]]; then
  # Set up bert2 for mris_preproc
  FS_SUBJECT2="bert2"
  FS_SUBJECT_DIR2="${FS_SUBJECTS_DIR}/${FS_SUBJECT2}"
  if [[ ! -d "$FS_SUBJECT_DIR2" ]]; then
    cp -a "$FS_SUBJECT_DIR" "$FS_SUBJECT_DIR2"
  fi
  SURF_LH_SPHERE_REG="${FS_SUBJECT_DIR}/surf/lh.sphere.reg"
  SURF_LH_BERT_SPHERE_REG="${FS_SUBJECT_DIR}/surf/lh.${FS_SUBJECT}.sphere.reg"
  SURF_LH_BERT2_SPHERE_REG="${FS_SUBJECT_DIR2}/surf/lh.${FS_SUBJECT2}.sphere.reg"
  if [[ -f "$SURF_LH_SPHERE_REG" && ! -f "$SURF_LH_BERT_SPHERE_REG" ]]; then
    cp "$SURF_LH_SPHERE_REG" "$SURF_LH_BERT_SPHERE_REG"
  fi
  if [[ -f "${FS_SUBJECT_DIR2}/surf/lh.sphere.reg" && ! -f "$SURF_LH_BERT2_SPHERE_REG" ]]; then
    cp "${FS_SUBJECT_DIR2}/surf/lh.sphere.reg" "$SURF_LH_BERT2_SPHERE_REG"
  fi

  cat > "${JOB_DIR}/${DEP_TOOL}.yml" <<EOF
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
  run_tool "$DEP_TOOL" "${JOB_DIR}/${DEP_TOOL}.yml" "$DEP_CWL"
fi

if [[ -f "$PREPROC_OUT" ]]; then
  cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
y:
  class: File
  path: "${PREPROC_OUT}"
glmdir: "mri_glmfit_out"
osgm: true
EOF
  run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
else
  echo "SKIP: ${TOOL} - missing mris_preproc output"
  echo -e "${TOOL}\tSKIP" >>"$SUMMARY_FILE"
fi
