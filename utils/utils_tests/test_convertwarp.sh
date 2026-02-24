#!/usr/bin/env bash
# Test: FSL convertwarp (combine multiple warps/affines into single warp)
# Phase 3: uses FLIRT affine as prerequisite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="convertwarp"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Prepare: generate FLIRT affine ───────────────────────────
AFFINE_MAT="${DERIVED_DIR}/flirt_t1_affine.mat"
if [[ ! -f "$AFFINE_MAT" ]]; then
  echo "Generating FLIRT affine matrix..."
  docker_fsl flirt \
    -in "$T1W_2MM" -ref "$T1W" \
    -omat "$AFFINE_MAT" \
    -dof 6
fi

# ── Test 1: Convert affine to warp field ─────────────────────
cat > "${JOB_DIR}/${TOOL}_affine.yml" <<EOF
reference:
  class: File
  path: ${T1W}
output: convertwarp_out
premat:
  class: File
  path: ${AFFINE_MAT}
EOF
run_tool "${TOOL}_affine" "${JOB_DIR}/${TOOL}_affine.yml" "$CWL"

# ── Non-null & header check ──────────────────────────────────
dir="${OUT_DIR}/${TOOL}_affine"
for f in "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte: $f"
  else
    echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-5]' || true)"
  fi
done
verify_log "${TOOL}_affine"
