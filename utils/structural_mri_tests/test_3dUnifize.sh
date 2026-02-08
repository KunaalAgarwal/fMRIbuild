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
  # Non-zero voxel count (data isn't all zeros)
  nz=$(docker_afni 3dBrickStat -non-zero -count "$f" 2>&1 | tail -1 || echo "0")
  echo "  Non-zero voxels: ${nz}"
  if [[ "${nz}" =~ ^[[:space:]]*0[[:space:]]*$ ]]; then
    echo "  FAIL: output has zero non-zero voxels"; exit 1
  fi
done
if [[ "$found_head" -eq 0 ]]; then
  # Check for NIfTI fallback
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    found_head=1
    if [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte NIfTI: $f"; exit 1
    fi
    echo "  3dinfo: $(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 || true)"
  done
fi
