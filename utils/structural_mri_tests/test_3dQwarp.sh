#!/usr/bin/env bash
# Test: AFNI 3dQwarp (Nonlinear Warping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dQwarp"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# ── Data prep: downsample to 4mm to avoid OOM on WSL ──────────
T1_4MM="${DERIVED_DIR}/t1_4mm.nii.gz"
T1_BRAIN_4MM="${DERIVED_DIR}/t1_brain_4mm.nii.gz"

if [[ ! -f "$T1_4MM" ]]; then
  echo "Downsampling T1 to 4mm for 3dQwarp test..."
  docker_afni 3dresample -dxyz 4 4 4 -prefix "$T1_4MM" -input "$T1W_2MM"
fi
if [[ ! -f "$T1_BRAIN_4MM" ]]; then
  echo "Downsampling T1 brain to 4mm for 3dQwarp test..."
  docker_afni 3dresample -dxyz 4 4 4 -prefix "$T1_BRAIN_4MM" -input "$T1W_2MM_BRAIN"
fi

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
source:
  class: File
  path: ${T1_BRAIN_4MM}
base:
  class: File
  path: ${T1_4MM}
prefix: "qwarp_out"
allinfast: true
minpatch: 9
maxlev: 2
iwarp: true
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
  basename_f="$(basename "$f")"
  # Non-zero file size
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte HEAD: $f"; exit 1
  fi
  if [[ -f "$brik" && ! -s "$brik" ]]; then
    echo "  FAIL: zero-byte BRIK: $brik"; exit 1
  fi
  # Header readability + dimensions + voxel sizes + space
  echo "  3dinfo [${basename_f}]: $(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 || true)"
  # Non-zero voxel count
  nz=$(docker_afni 3dBrickStat -non-zero -count "$f" 2>&1 | tail -1 || echo "0")
  echo "  Non-zero voxels [${basename_f}]: ${nz}"
  if [[ "${nz}" =~ ^[[:space:]]*0[[:space:]]*$ ]]; then
    echo "  FAIL: ${basename_f} has zero non-zero voxels"; exit 1
  fi
done

# Verify warp and inverse warp fields exist
warp_found=0
iwarp_found=0
for suffix in +orig +tlrc; do
  [[ -f "${dir}/qwarp_out_WARP${suffix}.HEAD" ]] && warp_found=1
  [[ -f "${dir}/qwarp_out_WARPINV${suffix}.HEAD" ]] && iwarp_found=1
done
if [[ "$warp_found" -eq 0 ]]; then
  echo "  WARN: warp field (_WARP) not found"
fi
if [[ "$iwarp_found" -eq 0 ]]; then
  echo "  WARN: inverse warp field (_WARPINV) not found"
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
