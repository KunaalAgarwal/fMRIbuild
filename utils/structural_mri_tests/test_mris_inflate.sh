#!/usr/bin/env bash
# Test: FreeSurfer mris_inflate (Surface Inflation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mris_inflate"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

SURF_LH_WHITE="${FS_SUBJECT_DIR}/surf/lh.white"
[[ -f "$SURF_LH_WHITE" ]] || die "Missing ${SURF_LH_WHITE}"

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
  path: "${SURF_LH_WHITE}"
output: "lh.inflated.test"
n: 5
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_surface "${dir}/lh.inflated.test"
# sulc_file is nullable — produced when mris_inflate writes .sulc alongside output
verify_surface_optional "${dir}/lh.inflated.test.sulc"
verify_log "$TOOL"
