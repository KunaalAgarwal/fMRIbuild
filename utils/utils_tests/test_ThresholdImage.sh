#!/usr/bin/env bash
# Test: ANTs ThresholdImage (threshold an image — binary or multi-level)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="ThresholdImage"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Test 1: Explicit threshold (binary mask) ─────────────────
cat > "${JOB_DIR}/${TOOL}_explicit.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: ${T1_RES}
output_image: threshold_explicit.nii.gz
threshold_low: 500.0
threshold_high: 100000.0
inside_value: 1.0
outside_value: 0.0
EOF
run_tool "${TOOL}_explicit" "${JOB_DIR}/${TOOL}_explicit.yml" "$CWL"

# ── Test 2: Otsu threshold ───────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_otsu.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: ${T1_RES}
output_image: threshold_otsu.nii.gz
threshold_mode: Otsu
num_thresholds: 1
EOF
run_tool "${TOOL}_otsu" "${JOB_DIR}/${TOOL}_otsu.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in explicit otsu; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"
  verify_nifti "${dir}/threshold_${t}.nii.gz" "INT"
  verify_log "${TOOL}_${t}"
done
