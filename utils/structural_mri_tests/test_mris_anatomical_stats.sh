#!/usr/bin/env bash
# Test: FreeSurfer mris_anatomical_stats (Surface Morphometrics)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mris_anatomical_stats"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

APARC_LH="${FS_SUBJECT_DIR}/label/lh.aparc.annot"
[[ -f "$APARC_LH" ]] || die "Missing ${APARC_LH}"

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
annotation:
  class: File
  path: "${APARC_LH}"
tablefile: "anatomical_stats.tsv"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

# stats_table is nullable — produced when --tablefile is specified
verify_file_optional "${dir}/anatomical_stats.tsv"
# stats is nullable — glob matches *.stats
for f in "${dir}"/*.stats; do
  [[ -f "$f" ]] && verify_file "$f"
done
verify_log "$TOOL"
