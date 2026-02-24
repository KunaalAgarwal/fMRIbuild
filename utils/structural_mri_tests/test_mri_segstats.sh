#!/usr/bin/env bash
# Test: FreeSurfer mri_segstats (Segmentation Statistics)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_segstats"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

ASEG_MGZ="${FS_SUBJECT_DIR}/mri/aseg.mgz"
[[ -f "$ASEG_MGZ" ]] || die "Missing ${ASEG_MGZ}"

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
seg:
  class: File
  path: "${ASEG_MGZ}"
sum: "segstats.txt"
ctab_default: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_csv "${dir}/segstats.txt" 2
# avgwf_file, avgwfvol_file are nullable — only with --avgwf/--avgwfvol (not used here)
verify_log "$TOOL"
