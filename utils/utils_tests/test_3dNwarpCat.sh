#!/usr/bin/env bash
# Test: AFNI 3dNwarpCat (concatenate nonlinear warps)
# Phase 3: requires precomputed AFNI warp(s)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dNwarpCat"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Prepare: need a warp from 3dQwarp ────────────────────────
source "${SCRIPT_DIR}/_common_utils.sh"
generate_qwarp_warp

# ── Test 1: Single warp passthrough ──────────────────────────
cat > "${JOB_DIR}/${TOOL}_single.yml" <<EOF
prefix: nwarpcat_out
warp1:
  class: File
  path: ${QWARP_WARP}
EOF
run_tool "${TOOL}_single" "${JOB_DIR}/${TOOL}_single.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}_single"
for f in "$dir"/*.HEAD "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte: $f"
  else
    echo "  Header: $(docker_afni 3dinfo "$f" 2>&1 | head -3 || true)"
  fi
done
verify_log "${TOOL}_single"
