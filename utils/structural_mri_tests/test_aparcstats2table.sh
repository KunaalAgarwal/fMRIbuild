#!/usr/bin/env bash
# Test: FreeSurfer aparcstats2table (Parcellation Statistics to Table)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="aparcstats2table"
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
subjects:
  - "${FS_SUBJECT}"
hemi: lh
tablefile: "aparcstats.tsv"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_csv "${dir}/aparcstats.tsv" 2
verify_log "$TOOL"
