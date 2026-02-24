#!/usr/bin/env bash
# Test: ANTs N4BiasFieldCorrection (correct intensity inhomogeneity/bias field)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="N4BiasFieldCorrection"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default correction ───────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_default
dimensionality: 3
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: With mask and shrink factor ──────────────────────
cat > "${JOB_DIR}/${TOOL}_masked.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_masked
dimensionality: 3
mask_image:
  class: File
  path: ${ANTS_MASK}
shrink_factor: 4
EOF
run_tool "${TOOL}_masked" "${JOB_DIR}/${TOOL}_masked.yml" "$CWL"

# ── Test 3: With convergence params ──────────────────────────
cat > "${JOB_DIR}/${TOOL}_converge.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_converge
dimensionality: 3
shrink_factor: 4
convergence: "[50x50,0.001]"
EOF
run_tool "${TOOL}_converge" "${JOB_DIR}/${TOOL}_converge.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in default masked converge; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"
  verify_nifti "${dir}/n4_${t}_corrected.nii.gz"
  verify_nifti_optional "${dir}/n4_${t}_biasfield.nii.gz"
  verify_log "${TOOL}_${t}"
done
