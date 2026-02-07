#!/usr/bin/env bash
# Test: ANTs ImageMath (general-purpose image math operations)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="ImageMath"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Test 1: Morphological erosion ────────────────────────────
cat > "${JOB_DIR}/${TOOL}_erode.yml" <<EOF
dimensionality: 3
output_image: imagemath_erode.nii.gz
operation: ME
input_image:
  class: File
  path: ${ANTS_MASK}
scalar_value: 1.0
EOF
run_tool "${TOOL}_erode" "${JOB_DIR}/${TOOL}_erode.yml" "$CWL"

# ── Test 2: Morphological dilation ───────────────────────────
cat > "${JOB_DIR}/${TOOL}_dilate.yml" <<EOF
dimensionality: 3
output_image: imagemath_dilate.nii.gz
operation: MD
input_image:
  class: File
  path: ${ANTS_MASK}
scalar_value: 1.0
EOF
run_tool "${TOOL}_dilate" "${JOB_DIR}/${TOOL}_dilate.yml" "$CWL"

# ── Test 3: Multiply by scalar ───────────────────────────────
cat > "${JOB_DIR}/${TOOL}_mul.yml" <<EOF
dimensionality: 3
output_image: imagemath_mul.nii.gz
operation: m
input_image:
  class: File
  path: ${T1_RES}
scalar_value: 2.0
EOF
run_tool "${TOOL}_mul" "${JOB_DIR}/${TOOL}_mul.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in erode dilate mul; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
done
