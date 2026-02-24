#!/usr/bin/env bash
# Test: AFNI 3dAllineate (Affine Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dAllineate"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
source:
  class: File
  path: ${T1W_2MM_BRAIN}
base:
  class: File
  path: ${T1W_2MM}
prefix: "allineate_out"
cost: lpc
autoweight: true
oned_matrix_save: "allineate_out.aff12.1D"
quiet: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}"
found=0
for f in "$dir"/*.HEAD "$dir"/*.nii "$dir"/*.nii.gz; do
  [[ -f "$f" ]] || continue
  # Skip log files captured as HEAD
  [[ "$(basename "$f")" == *.log ]] && continue
  found=1
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  # Header: dimensions, voxel sizes, coordinate space
  info=$(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 | grep -v '^\*\*' || true)
  echo "  3dinfo: ${info}"
  # Verify dimensions are non-zero
  ni=$(echo "$info" | awk '{print $1}')
  if [[ -z "$ni" || "$ni" == "0" ]]; then
    echo "  FAIL: invalid dimensions in output"; exit 1
  fi
done

# Verify transformation matrix was saved
matrix_file="${dir}/allineate_out.aff12.1D"
if [[ -f "$matrix_file" ]]; then
  if [[ ! -s "$matrix_file" ]]; then
    echo "  FAIL: zero-byte transformation matrix"; exit 1
  fi
  echo "  Matrix file: $(wc -l < "$matrix_file") lines"
else
  echo "  WARN: transformation matrix not found at ${matrix_file}"
fi

if [[ "$found" -eq 0 ]]; then
  echo "  WARN: no output dataset files found"
fi
verify_log "$TOOL"
