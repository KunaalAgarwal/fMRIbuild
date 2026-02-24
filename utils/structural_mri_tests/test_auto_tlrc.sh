#!/usr/bin/env bash
# Test: AFNI @auto_tlrc (Talairach Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="auto_tlrc"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# @auto_tlrc writes temp files outside /tmp, needs writable container
CWLTOOL_ARGS+=("--no-read-only")

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

# ── Data prep: create ORIG-space copy of the input ─────────────
# MNI152 images are tagged as +tlrc/MNI space, which confuses
# @auto_tlrc (it expects native/ORIG space input). Create a copy
# with the space tag reset to ORIG.
INPUT_ORIG="${DERIVED_DIR}/t1_brain_orig.nii.gz"
if [[ ! -f "$INPUT_ORIG" ]]; then
  echo "Creating ORIG-space copy for @auto_tlrc..."
  cp "$T1W_2MM_BRAIN" "$INPUT_ORIG"
  docker_afni 3drefit -space ORIG "$INPUT_ORIG"
fi

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: ${INPUT_ORIG}
base:
  class: File
  path: ${TT_HEAD}
no_ss: true
dxyz: 2
overwrite: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}"
found=0
for f in "$dir"/*+tlrc.HEAD "$dir"/*_at.nii "$dir"/*_at.nii.gz; do
  [[ -f "$f" ]] || continue
  found=1
  basename_f="$(basename "$f")"
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  # Header: dimensions, voxel sizes, coordinate space
  info=$(docker_afni 3dinfo -n4 -ad3 -space "$f" 2>&1 | grep -v '^\*\*' || true)
  echo "  3dinfo [${basename_f}]: ${info}"
  # Verify dimensions are non-zero
  ni=$(echo "$info" | awk '{print $1}')
  if [[ -z "$ni" || "$ni" == "0" ]]; then
    echo "  FAIL: ${basename_f} has invalid dimensions"; exit 1
  fi
  # Verify output is in TLRC space
  space=$(docker_afni 3dinfo -space "$f" 2>&1 | grep -v '^\*\*' | tail -1 || echo "")
  echo "  Space [${basename_f}]: ${space}"
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

if [[ "$found" -eq 0 ]]; then
  echo "  WARN: no TLRC output files found"
fi
verify_log "$TOOL"
