#!/usr/bin/env bash
# Test: AFNI 3dUnifize (Bias Field Correction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dUnifize"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: ${T1W_2MM}
prefix: "unifize_out"
GM: true
quiet: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
# Note: cwltool does not capture AFNI .BRIK secondary files (known
# limitation with '+' in filenames), so validation uses 3dinfo on
# the .HEAD file which contains full header metadata.
dir="${OUT_DIR}/${TOOL}"
found=0
for f in "$dir"/*.HEAD "$dir"/*.nii "$dir"/*.nii.gz; do
  [[ -f "$f" ]] || continue
  found=1
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  # Header: dimensions, voxel sizes, coordinate space
  info=$(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 | grep -v '^\*\*' || true)
  echo "  3dinfo: ${info}"
  # Verify dimensions are non-zero (ni nj nk > 0)
  ni=$(echo "$info" | awk '{print $1}')
  if [[ -z "$ni" || "$ni" == "0" ]]; then
    echo "  FAIL: invalid dimensions in output"; exit 1
  fi
done
if [[ "$found" -eq 0 ]]; then
  echo "  WARN: no output dataset files found"
fi
verify_log "$TOOL"
