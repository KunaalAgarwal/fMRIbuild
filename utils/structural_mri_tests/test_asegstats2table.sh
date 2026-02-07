#!/usr/bin/env bash
# Test: FreeSurfer asegstats2table (Subcortical Statistics to Table)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="asegstats2table"
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
tablefile: "asegstats.tsv"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
