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

# ── Non-null & header checks ─────────────────────────────────
for t in default rician; do
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
