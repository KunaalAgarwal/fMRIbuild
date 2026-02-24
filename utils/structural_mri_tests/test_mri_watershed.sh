#!/usr/bin/env bash
# Test: FreeSurfer mri_watershed (Skull Stripping via Watershed)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mri_watershed"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

T1_MGZ="${FS_SUBJECT_DIR}/mri/orig.mgz"
[[ -f "$T1_MGZ" ]] || die "Missing ${T1_MGZ}"

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
  path: "${T1_MGZ}"
output: "bert_watershed.mgz"
EOF

# FreeSurfer container can get OOM-killed due to read-only overlay overhead.
CWLTOOL_ARGS+=("--no-read-only")
run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_mgz "${dir}/bert_watershed.mgz"
# bem_surfaces is nullable — only produced with --surf flag (not used here)
verify_log "$TOOL"
