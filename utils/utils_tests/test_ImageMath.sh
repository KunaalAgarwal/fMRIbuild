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

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in erode dilate mul; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"
  verify_nifti "${dir}/imagemath_${t}.nii.gz"
  verify_log "${TOOL}_${t}"
done
