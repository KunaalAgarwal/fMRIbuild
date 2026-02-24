#!/usr/bin/env bash
# Test: FreeSurfer mri_aparc2aseg (Parcellation to Volume Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_aparc2aseg"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

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
output: "aparc2aseg.mgz"
EOF

# mri_aparc2aseg needs ~1.3GB and can get OOM-killed in Docker.
# --no-read-only gives Docker a writable overlay which may reduce
# memory pressure from copy-on-write buffering.
CWLTOOL_ARGS+=("--no-read-only")
run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_mgz "${dir}/aparc2aseg.mgz" "INT"
verify_log "$TOOL"
