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
