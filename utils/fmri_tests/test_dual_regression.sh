#!/usr/bin/env bash
# Test: FSL dual_regression (Dual Regression for Group ICA)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="dual_regression"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs melodic_IC from melodic
MELODIC_IC="$(first_match \
  "${OUT_DIR}/melodic/melodic_out/melodic_IC.nii.gz" \
  "${OUT_DIR}/melodic/melodic_out/melodic_IC.nii" \
  2>/dev/null || true)"
if [[ -z "$MELODIC_IC" ]]; then
  echo "Running prerequisite: melodic..."
  bash "${SCRIPT_DIR}/test_melodic.sh"
  MELODIC_IC="$(first_match \
    "${OUT_DIR}/melodic/melodic_out/melodic_IC.nii.gz" \
    "${OUT_DIR}/melodic/melodic_out/melodic_IC.nii")"
fi

# Create design matrix and contrast
DUALREG_DESIGN="${DERIVED_DIR}/dualreg.mat"
DUALREG_CON="${DERIVED_DIR}/dualreg.con"
make_design_mat "$DUALREG_DESIGN" 1 1
make_contrast "$DUALREG_CON" 1

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
group_IC_maps:
  class: File
  path: "${MELODIC_IC}"
des_norm: 0
design_mat:
  class: File
  path: "${DUALREG_DESIGN}"
design_con:
  class: File
  path: "${DUALREG_CON}"
n_perm: 10
output_dir: "dualreg_out"
input_files:
  - class: File
    path: "${BOLD}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# dual_regression produces a directory with stage files
DR_DIR="${TOOL_OUT}/dualreg_out"
if [[ ! -d "$DR_DIR" ]]; then
  # Try finding any directory
  DR_DIR="$(find "${TOOL_OUT}" -maxdepth 1 -type d ! -name "${TOOL}" 2>/dev/null | head -1 || true)"
fi

if [[ -z "$DR_DIR" || ! -d "$DR_DIR" ]]; then
  echo "  FAIL: no dual_regression output directory found"
else
  echo "  Output directory: ${DR_DIR}"
  # Check for stage 1 and stage 2 files
  S1_FILES=("${DR_DIR}"/dr_stage1_*.txt)
  S2_FILES=("${DR_DIR}"/dr_stage2_*.nii*)
  echo "  Stage 1 files: ${#S1_FILES[@]}"
  echo "  Stage 2 files: ${#S2_FILES[@]}"

  for nii in "${DR_DIR}"/dr_stage2_*.nii*; do
    [[ -f "$nii" ]] || continue
    verify_nifti "$nii"
  done
fi
verify_log "$TOOL"
