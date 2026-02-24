#!/usr/bin/env bash
# Test: FSL invwarp (invert a non-linear warp field)
# Phase 3: generates prerequisite warp via FNIRT (coarse settings for speed)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="invwarp"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Prepare: generate FNIRT warp (T1W_2MM → T1W, coarse) ────
FNIRT_WARP="${DERIVED_DIR}/fnirt_warp.nii.gz"
FNIRT_OUT="${DERIVED_DIR}/fnirt_warped.nii.gz"
AFFINE_MAT="${DERIVED_DIR}/flirt_t1_affine.mat"

if [[ ! -f "$FNIRT_WARP" ]]; then
  echo "Generating FNIRT warp field (coarse, 2mm, for testing)..."
  docker_fsl fnirt \
    --in="$T1W_2MM" --ref="$T1W_2MM" \
    --cout="$FNIRT_WARP" \
    --iout="$FNIRT_OUT" \
    --warpres=20,20,20
fi

# ── Test 1: Invert the warp field ────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
warp:
  class: File
  path: ${FNIRT_WARP}
reference:
  class: File
  path: ${T1W_2MM}
output: invwarp_out
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Non-null & header check ──────────────────────────────────
dir="${OUT_DIR}/${TOOL}_default"
for f in "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte: $f"
  else
    echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
  fi
done
verify_log "${TOOL}_default"
