#!/usr/bin/env bash
# Test: ANTs DenoiseImage (non-local means denoising)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="DenoiseImage"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default denoising ────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: denoise_default
dimensionality: 3
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: Rician noise model + shrink factor ───────────────
cat > "${JOB_DIR}/${TOOL}_rician.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: denoise_rician
dimensionality: 3
noise_model: Rician
shrink_factor: 2
EOF
run_tool "${TOOL}_rician" "${JOB_DIR}/${TOOL}_rician.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in default rician; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"
  verify_nifti "${dir}/denoise_${t}_denoised.nii.gz"
  verify_nifti_optional "${dir}/denoise_${t}_noise.nii.gz"
  verify_log "${TOOL}_${t}"
done
