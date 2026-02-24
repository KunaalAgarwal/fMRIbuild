#!/usr/bin/env bash
# Test: FreeSurfer mri_label2vol (Label to Volume Conversion)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_label2vol"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

LABEL_LH="${FS_SUBJECT_DIR}/label/lh.cortex.label"
BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"
[[ -f "$LABEL_LH" ]] || die "Missing ${LABEL_LH}"
[[ -f "$BRAIN_MGZ" ]] || die "Missing ${BRAIN_MGZ}"

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
label:
  class: File
  path: "${LABEL_LH}"
temp:
  class: File
  path: "${BRAIN_MGZ}"
output: "label2vol.mgz"
identity: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_mgz "${dir}/label2vol.mgz"
# hits_volume is nullable — only produced with --hits flag (not used here)
verify_log "$TOOL"
