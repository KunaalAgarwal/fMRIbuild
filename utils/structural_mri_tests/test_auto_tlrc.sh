#!/usr/bin/env bash
# Test: AFNI @auto_tlrc (Talairach Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="auto_tlrc"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# ── Data prep: extract TT_N27 Talairach template from AFNI image ──
TT_HEAD="${DATA_DIR}/TT_N27+tlrc.HEAD"
TT_BRIK="${DATA_DIR}/TT_N27+tlrc.BRIK"
TT_BRIK_GZ="${DATA_DIR}/TT_N27+tlrc.BRIK.gz"

if [[ ! -f "$TT_HEAD" ]]; then
  echo "Extracting TT_N27 template from AFNI Docker image..."
  copy_from_afni_image "TT_N27+tlrc.HEAD" "$TT_HEAD" || true
  # Try BRIK first, then BRIK.gz
  copy_from_afni_image "TT_N27+tlrc.BRIK" "$TT_BRIK" 2>/dev/null || true
  if [[ ! -f "$TT_BRIK" || ! -s "$TT_BRIK" ]]; then
    copy_from_afni_image "TT_N27+tlrc.BRIK.gz" "$TT_BRIK_GZ" 2>/dev/null || true
  fi
fi

if [[ ! -f "$TT_HEAD" ]]; then
  echo "  SKIP: TT_N27+tlrc template not found in AFNI image"
  echo -e "${TOOL}\tSKIP" >>"$SUMMARY_FILE"
  exit 0
fi

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: ${T1W_2MM_BRAIN}
base:
  class: File
  path: ${TT_HEAD}
no_ss: true
dxyz: 2
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}"
found_output=0
for f in "$dir"/*+tlrc.HEAD "$dir"/*_at.nii "$dir"/*_at.nii.gz; do
  [[ -f "$f" ]] || continue
  found_output=1
  basename_f="$(basename "$f")"
  # Non-zero file size
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  # Header readability + dimensions + voxel sizes + space
  echo "  3dinfo [${basename_f}]: $(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 || true)"
  # Non-zero voxel count
  nz=$(docker_afni 3dBrickStat -non-zero -count "$f" 2>&1 | tail -1 || echo "0")
  echo "  Non-zero voxels [${basename_f}]: ${nz}"
  if [[ "${nz}" =~ ^[[:space:]]*0[[:space:]]*$ ]]; then
    echo "  FAIL: ${basename_f} has zero non-zero voxels"; exit 1
  fi
  # Verify output is in TLRC space
  space=$(docker_afni 3dinfo -space "$f" 2>&1 | tail -1 || echo "")
  echo "  Space [${basename_f}]: ${space}"
done

# Check for BRIK alongside HEAD
for f in "$dir"/*+tlrc.HEAD; do
  [[ -f "$f" ]] || continue
  brik="${f%.HEAD}.BRIK"
  if [[ -f "$brik" && ! -s "$brik" ]]; then
    echo "  FAIL: zero-byte BRIK: $brik"; exit 1
  fi
done

# Verify transform file
xat_found=0
for f in "$dir"/*.Xat.1D; do
  [[ -f "$f" ]] || continue
  xat_found=1
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte transform: $f"; exit 1
  fi
  echo "  Transform: $(wc -l < "$f") lines"
done
if [[ "$xat_found" -eq 0 ]]; then
  echo "  WARN: transform file (.Xat.1D) not found"
fi

if [[ "$found_output" -eq 0 ]]; then
  echo "  WARN: no TLRC output files found"
fi
