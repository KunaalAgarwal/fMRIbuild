#!/usr/bin/env bash
# Test: FSL applywarp (apply warp field and/or affine to an image)
# Phase 3: generates a FLIRT affine as prerequisite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="applywarp"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Prepare: generate FLIRT affine (T1W_2MM → T1W) ──────────
AFFINE_MAT="${DERIVED_DIR}/flirt_t1_affine.mat"
if [[ ! -f "$AFFINE_MAT" ]]; then
  echo "Generating FLIRT affine matrix..."
  docker_fsl flirt \
    -in "$T1W_2MM" -ref "$T1W" \
    -omat "$AFFINE_MAT" \
    -dof 6
fi

# ── Test 1: Apply affine transform ───────────────────────────
cat > "${JOB_DIR}/${TOOL}_affine.yml" <<EOF
input:
  class: File
  path: ${T1W_2MM}
reference:
  class: File
  path: ${T1W}
output: applywarp_affine_out
premat:
  class: File
  path: ${AFFINE_MAT}
interp: trilinear
EOF
run_tool "${TOOL}_affine" "${JOB_DIR}/${TOOL}_affine.yml" "$CWL"

# ── Test 2: Identity (same input and reference, no warp) ─────
cat > "${JOB_DIR}/${TOOL}_identity.yml" <<EOF
input:
  class: File
  path: ${T1W}
reference:
  class: File
  path: ${T1W}
output: applywarp_identity_out
EOF
run_tool "${TOOL}_identity" "${JOB_DIR}/${TOOL}_identity.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in affine identity; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
  verify_log "${TOOL}_${t}"
done
