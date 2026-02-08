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
found_head=0
for f in "$dir"/*.HEAD; do
  [[ -f "$f" ]] || continue
  found_head=1
  brik="${f%.HEAD}.BRIK"
  # Non-zero file size
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte HEAD: $f"; exit 1
  fi
  if [[ -f "$brik" && ! -s "$brik" ]]; then
    echo "  FAIL: zero-byte BRIK: $brik"; exit 1
  fi
  # Header readability + dimensions + voxel sizes + space
  echo "  3dinfo: $(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 || true)"
  # Non-zero voxel count
  nz=$(docker_afni 3dBrickStat -non-zero -count "$f" 2>&1 | tail -1 || echo "0")
  echo "  Non-zero voxels: ${nz}"
  if [[ "${nz}" =~ ^[[:space:]]*0[[:space:]]*$ ]]; then
    echo "  FAIL: output has zero non-zero voxels"; exit 1
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

# Check NIfTI fallback
if [[ "$found_head" -eq 0 ]]; then
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    found_head=1
    if [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte NIfTI: $f"; exit 1
    fi
    echo "  3dinfo: $(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 || true)"
  done
fi
