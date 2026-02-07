#!/usr/bin/env bash
# Test: FreeSurfer mris_ca_label (Cortical Atlas Labeling)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mris_ca_label"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

SPHERE_REG="${FS_SUBJECT_DIR}/surf/lh.sphere.reg"
[[ -f "$SPHERE_REG" ]] || die "Missing ${SPHERE_REG}"

if [[ -z "${CLASSIFIER_GCS:-}" || ! -f "${CLASSIFIER_GCS:-}" ]]; then
  echo "SKIP: mris_ca_label — missing classifier GCS file"
  echo -e "mris_ca_label\tSKIP" >>"$SUMMARY_FILE"
  exit 0
fi

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
subject: "${FS_SUBJECT}"
hemi: lh
canonsurf:
  class: File
  path: "${SPHERE_REG}"
classifier:
  class: File
  path: "${CLASSIFIER_GCS}"
output: "lh.aparc.ca.annot"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
